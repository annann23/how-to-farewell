import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Disclaimer,
  Persona,
  Message,
  ContactLimit,
  Mission,
  Letter,
} from '@/lib/schemas';
import {
  ContactLimitRowSchema,
  LetterRowSchema,
  MissionRowSchema,
  PersonaRowSchema,
  contactLimitRowToSchema,
  letterRowToSchema,
  missionRowToSchema,
} from '@/lib/schemas';
import { callChat } from '@/lib/api-client';
import { detectCrisisLevel, detectLevel3ByRepetition } from '@/lib/crisis-keywords';
import { supabase } from '@/lib/supabase';
import { getNextStage, getMissionText, MISSION_STAGE_ORDER } from '@/lib/missions';

// 주차별 일일 한도
function getDailyLimit(weeksSinceStart: number): number {
  if (weeksSinceStart < 2) return 20;
  if (weeksSinceStart < 4) return 10;
  if (weeksSinceStart < 8) return 5;
  return 2;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * personas 테이블의 created_at 기준으로 경과 주차를 계산한다.
 */
async function computeWeeksSinceStart(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('personas')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) return 0;

    const parsed = PersonaRowSchema.pick({ created_at: true }).safeParse(data);
    if (!parsed.success) return 0;

    const start = new Date(parsed.data.created_at).getTime();
    const now = Date.now();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.floor(days / 7);
  } catch {
    return 0;
  }
}

type GriefState = {
  // 인증
  userId: string | null;

  // 온보딩/페르소나
  disclaimer: Disclaimer | null;
  persona: Persona | null;

  // 대화
  messages: Message[];
  isTyping: boolean;
  lastError: string | null;
  dbError: string | null;

  // 연락 제한
  contactLimit: ContactLimit;

  // 위기 감지
  crisisLevel: 0 | 1 | 2 | 3;
  crisisPopupVisible: boolean;

  // 미션
  currentMission: Mission | null;
  missionHistory: Mission[];

  // 편지
  unreadLetters: Letter[];
  letterInbox: Letter[];

  // Actions
  setUserId: (id: string | null) => void;
  setDisclaimer: (d: Disclaimer) => Promise<void>;
  setPersona: (p: Persona) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  dismissCrisis: () => void;
  acceptMission: () => Promise<void>;
  passMission: () => Promise<void>;
  completeMission: () => Promise<void>;
  markLetterAsRead: (letterId: string) => Promise<void>;
  fetchUnreadLetters: () => Promise<void>;
  fetchAllLetters: () => Promise<void>;
  fetchContactLimit: () => Promise<void>;
  fetchCurrentMission: () => Promise<void>;
  clearError: () => void;
  clearDbError: () => void;
};

export const useGriefStore = create<GriefState>()(
  persist(
    (set, get) => ({
      userId: null,
      disclaimer: null,
      persona: null,
      messages: [],
      isTyping: false,
      lastError: null,
      dbError: null,
      contactLimit: {
        userId: '',
        date: todayStr(),
        usedCount: 0,
        weeksSinceStart: 0,
      },
      crisisLevel: 0,
      crisisPopupVisible: false,
      currentMission: null,
      missionHistory: [],
      unreadLetters: [],
      letterInbox: [],

      setUserId: (id) => {
        set({ userId: id });
        if (!id) {
          set({
            messages: [],
            isTyping: false,
            crisisLevel: 0,
            crisisPopupVisible: false,
          });
        }
      },

      setDisclaimer: async (d) => {
        set({ disclaimer: d, dbError: null });
        try {
          const { error } = await supabase.from('disclaimers').upsert({
            user_id: d.userId,
            agreed_at: d.agreedAt,
            is_adult: d.isAdult,
          });
          if (error) throw error;
        } catch (err) {
          // 저장 실패 시 로컬 상태를 롤백하고 에러를 전파한다
          set({ disclaimer: null, dbError: err instanceof Error ? err.message : 'Disclaimer 저장에 실패했습니다.' });
          throw err;
        }
      },

      setPersona: async (p) => {
        set({ persona: p, dbError: null });
        try {
          const { error } = await supabase.from('personas').upsert({
            id: p.id,
            user_id: p.userId,
            type: p.type,
            name: p.name,
            personality: p.personality,
            loss_date: p.lossDate ?? null,
            created_at: p.createdAt,
            generated_image_url: p.generatedImageUrl ?? null,
          });
          if (error) throw error;
        } catch (err) {
          // 저장 실패 시 로컬 상태를 롤백하고 에러를 전파한다
          set({ persona: null, dbError: err instanceof Error ? err.message : 'Persona 저장에 실패했습니다.' });
          throw err;
        }
      },

      sendMessage: async (content) => {
        const state = get();
        const { persona, contactLimit, userId } = state;

        if (!persona || !userId) return;

        const today = todayStr();
        let limit = contactLimit;

        // 날짜가 바뀌었으면 리셋
        if (limit.date !== today || limit.userId !== userId) {
          const weeksSinceStart = await computeWeeksSinceStart(userId);
          limit = { userId, date: today, usedCount: 0, weeksSinceStart };
          set({ contactLimit: limit });
          try {
            await supabase.from('contact_limits').upsert({
              user_id: userId,
              date: today,
              used_count: 0,
              weeks_since_start: weeksSinceStart,
            });
          } catch (err) {
            console.error('ContactLimit 초기화 실패:', err);
          }
        }

        const dailyLimit = getDailyLimit(limit.weeksSinceStart);
        if (limit.usedCount >= dailyLimit) return;

        const userMessage: Message = {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          crisisLevel: 0,
        };

        const updatedMessages = [...state.messages, userMessage];
        set({ messages: updatedMessages, isTyping: true, lastError: null });

        // 클라이언트 1차 위기 감지
        let detectedLevel = detectCrisisLevel(content);
        const recentUserTexts = updatedMessages
          .filter((m) => m.role === 'user')
          .slice(-5)
          .map((m) => m.content);
        if (detectLevel3ByRepetition(recentUserTexts)) {
          detectedLevel = 3;
        }

        // 연락 횟수 차감
        const newUsedCount = limit.usedCount + 1;
        const updatedLimit = { ...limit, usedCount: newUsedCount };
        set({ contactLimit: updatedLimit });

        try {
          await supabase.from('contact_limits').upsert({
            user_id: userId,
            date: today,
            used_count: newUsedCount,
            weeks_since_start: limit.weeksSinceStart,
          });
        } catch (err) {
          console.error('ContactLimit 저장 실패:', err);
        }

        if (detectedLevel > 0) {
          set({ crisisLevel: detectedLevel, crisisPopupVisible: true });
        }

        try {
          const { currentMission: mission } = get();
          const acceptedMission =
            mission?.status === 'accepted'
              ? { stage: mission.stage, text: mission.text }
              : undefined;
          const resp = await callChat(updatedMessages, persona, acceptedMission);
          const finalLevel = Math.max(detectedLevel, resp.crisisLevel) as 0 | 1 | 2 | 3;

          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: resp.content,
            timestamp: new Date().toISOString(),
            crisisLevel: finalLevel,
          };

          set((s) => ({
            messages: [...s.messages, assistantMessage],
            isTyping: false,
            crisisLevel: finalLevel > 0 ? finalLevel : s.crisisLevel,
            crisisPopupVisible: finalLevel > 0 ? true : s.crisisPopupVisible,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : '알 수 없는 오류';
          set({ isTyping: false, lastError: message });
        }
      },

      retryLastMessage: async () => {
        const state = get();
        const lastUserIdx = [...state.messages]
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => m.role === 'user')
          .at(-1);
        if (!lastUserIdx || !state.persona) return;

        const messagesUpToUser = state.messages.slice(0, lastUserIdx.i + 1);
        set({ messages: messagesUpToUser, lastError: null, isTyping: true });

        try {
          const retryAcceptedMission =
            state.currentMission?.status === 'accepted'
              ? { stage: state.currentMission.stage, text: state.currentMission.text }
              : undefined;
          const resp = await callChat(messagesUpToUser, state.persona, retryAcceptedMission);
          const finalLevel = resp.crisisLevel;
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: resp.content,
            timestamp: new Date().toISOString(),
            crisisLevel: finalLevel,
          };
          set((s) => ({
            messages: [...s.messages, assistantMessage],
            isTyping: false,
            crisisLevel: finalLevel > 0 ? finalLevel : s.crisisLevel,
            crisisPopupVisible: finalLevel > 0 ? true : s.crisisPopupVisible,
          }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류';
          set({ isTyping: false, lastError: msg });
        }
      },

      dismissCrisis: () => {
        set({ crisisPopupVisible: false, crisisLevel: 0 });
      },

      acceptMission: async () => {
        const { currentMission, userId } = get();
        if (!currentMission || !userId) return;

        const updated: Mission = {
          ...currentMission,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
        };
        set({ currentMission: updated });

        try {
          await supabase
            .from('missions')
            .update({ status: 'accepted', accepted_at: updated.acceptedAt })
            .eq('id', updated.id);
        } catch (err) {
          console.error('Mission accept 저장 실패:', err);
        }
      },

      passMission: async () => {
        const { currentMission, userId } = get();
        if (!currentMission || !userId) return;

        const newPassCount = currentMission.passCount + 1;

        if (newPassCount >= 3) {
          const nextStage = getNextStage(currentMission.stage);
          const targetStage = nextStage ?? currentMission.stage;
          const stageIndex = MISSION_STAGE_ORDER.indexOf(targetStage);
          const nextMission: Mission = {
            id: uuidv4(),
            userId,
            stage: targetStage,
            text: getMissionText(targetStage, stageIndex),
            status: 'pending',
            passCount: 0,
          };

          const passedMission: Mission = {
            ...currentMission,
            status: 'passed',
            passCount: newPassCount,
          };

          set((s) => ({
            currentMission: nextStage ? nextMission : null,
            missionHistory: [...s.missionHistory, passedMission],
          }));

          try {
            await supabase
              .from('missions')
              .update({ status: 'passed', pass_count: newPassCount })
              .eq('id', currentMission.id);
            if (nextStage) {
              await supabase.from('missions').insert({
                id: nextMission.id,
                user_id: userId,
                stage: nextMission.stage,
                text: nextMission.text,
                status: 'pending',
                pass_count: 0,
              });
            }
          } catch (err) {
            console.error('Mission pass 저장 실패:', err);
          }
        } else {
          const updated: Mission = { ...currentMission, passCount: newPassCount };
          set({ currentMission: updated });
          try {
            await supabase
              .from('missions')
              .update({ pass_count: newPassCount })
              .eq('id', currentMission.id);
          } catch (err) {
            console.error('Mission pass count 저장 실패:', err);
          }
        }
      },

      completeMission: async () => {
        const { currentMission, userId } = get();
        if (!currentMission || !userId) return;

        const completed: Mission = {
          ...currentMission,
          status: 'completed',
          completedAt: new Date().toISOString(),
        };

        set((s) => ({
          currentMission: null,
          missionHistory: [...s.missionHistory, completed],
        }));

        try {
          await supabase
            .from('missions')
            .update({ status: 'completed', completed_at: completed.completedAt })
            .eq('id', completed.id);
        } catch (err) {
          console.error('Mission complete 저장 실패:', err);
        }
      },

      markLetterAsRead: async (letterId) => {
        const readAt = new Date().toISOString();
        set((s) => ({
          unreadLetters: s.unreadLetters.filter((l) => l.id !== letterId),
          letterInbox: s.letterInbox.map((l) =>
            l.id === letterId ? { ...l, readAt } : l,
          ),
        }));

        try {
          await supabase.from('letters').update({ read_at: readAt }).eq('id', letterId);
        } catch (err) {
          console.error('Letter read 업데이트 실패:', err);
        }
      },

      fetchUnreadLetters: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const { data, error } = await supabase
            .from('letters')
            .select('*')
            .eq('user_id', userId)
            .is('read_at', null)
            .order('sent_at', { ascending: false });

          if (error) throw error;

          const letters: Letter[] = (data ?? [])
            .map((row: unknown) => {
              const parsed = LetterRowSchema.safeParse(row);
              if (!parsed.success) return null;
              return letterRowToSchema(parsed.data);
            })
            .filter((l): l is Letter => l !== null);

          set({ unreadLetters: letters });
        } catch (err) {
          console.error('Unread letters 조회 실패:', err);
        }
      },

      fetchAllLetters: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const { data, error } = await supabase
            .from('letters')
            .select('*')
            .eq('user_id', userId)
            .order('sent_at', { ascending: false });

          if (error) throw error;

          const letters: Letter[] = (data ?? [])
            .map((row: unknown) => {
              const parsed = LetterRowSchema.safeParse(row);
              if (!parsed.success) return null;
              return letterRowToSchema(parsed.data);
            })
            .filter((l): l is Letter => l !== null);

          set({ letterInbox: letters });
        } catch (err) {
          console.error('Letters 조회 실패:', err);
        }
      },

      fetchContactLimit: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const today = todayStr();
          const { data, error } = await supabase
            .from('contact_limits')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const parsed = ContactLimitRowSchema.safeParse(data);
            if (parsed.success) {
              set({ contactLimit: contactLimitRowToSchema(parsed.data) });
            }
          } else {
            const weeksSinceStart = await computeWeeksSinceStart(userId);
            const limit: ContactLimit = {
              userId,
              date: today,
              usedCount: 0,
              weeksSinceStart,
            };
            set({ contactLimit: limit });
            await supabase.from('contact_limits').upsert({
              user_id: userId,
              date: today,
              used_count: 0,
              weeks_since_start: weeksSinceStart,
            });
          }
        } catch (err) {
          console.error('ContactLimit 조회 실패:', err);
        }
      },

      fetchCurrentMission: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const { data, error } = await supabase
            .from('missions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['pending', 'accepted'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const parsed = MissionRowSchema.safeParse(data);
            if (parsed.success) {
              set({ currentMission: missionRowToSchema(parsed.data) });
            }
          }
        } catch (err) {
          console.error('Mission 조회 실패:', err);
        }
      },

      clearError: () => set({ lastError: null }),
      clearDbError: () => set({ dbError: null }),
    }),
    {
      name: 'grief-store',
      partialize: (state) => ({
        // persona와 disclaimer는 Supabase가 진실의 원천이므로 localStorage에 저장하지 않는다.
        // 이미지 base64 캐시는 별도 'persona_image_${id}' 키로 localStorage에 유지된다.
        userId: state.userId,
        contactLimit: state.contactLimit,
      }),
    },
  ),
);

export { getDailyLimit };
