import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const CRISIS_KEYWORDS = [
  '죽고 싶다', '죽어버리고 싶다', '끝내고 싶다', '자살', '자해',
  '방법을 찾았어', '약을 모아', '유서를',
];

function containsCrisisKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

type PersonaRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  personality: string;
  loss_date: string | null;
  created_at: string;
};

type LetterTrigger = 'week7' | 'week30' | 'anniversary' | 'inactive3days';

function determineTrigger(
  persona: PersonaRow,
  letterTypes: string[],
  lastMessageAt: string | null,
): LetterTrigger | null {
  const now = new Date();
  const created = new Date(persona.created_at);
  const daysSinceJoin = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  // 3일 이상 대화 없을 때
  if (lastMessageAt) {
    const lastMsg = new Date(lastMessageAt);
    const daysSinceMsg = Math.floor((now.getTime() - lastMsg.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceMsg >= 3 && !letterTypes.includes('inactive3days')) {
      return 'inactive3days';
    }
  }

  // 가입 후 7일
  if (daysSinceJoin >= 7 && !letterTypes.includes('week7')) {
    return 'week7';
  }

  // 가입 후 30일
  if (daysSinceJoin >= 30 && !letterTypes.includes('week30')) {
    return 'week30';
  }

  // 기념일 (loss_date 기준 연 1회)
  if (persona.loss_date) {
    const lossDate = new Date(persona.loss_date);
    const anniversaryThisYear = new Date(now.getFullYear(), lossDate.getMonth(), lossDate.getDate());
    const daysDiff = Math.abs(Math.floor((now.getTime() - anniversaryThisYear.getTime()) / (1000 * 60 * 60 * 24)));
    const anniversaryKey = `anniversary_${now.getFullYear()}`;
    if (daysDiff <= 1 && !letterTypes.includes(anniversaryKey)) {
      return 'anniversary';
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron Job 인증 검증 — CRON_SECRET은 필수 환경변수
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET이 설정되지 않은 경우 즉시 401 반환 (fail-closed)
  if (!cronSecret) {
    return res.status(401).json({ error: 'CRON_SECRET 환경변수가 설정되지 않았습니다.' });
  }

  // Vercel Cron Job은 CRON_SECRET으로 검증
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: '서버 설정 오류입니다.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });

  try {
    // 모든 페르소나 조회
    const { data: personas, error: personaError } = await supabase
      .from('personas')
      .select('*');

    if (personaError) throw personaError;
    if (!personas || personas.length === 0) {
      return res.status(200).json({ message: '처리할 페르소나가 없습니다.' });
    }

    const results: Array<{ userId: string; trigger: string; success: boolean }> = [];

    for (const persona of personas as PersonaRow[]) {
      try {
        // 이미 발송된 편지 타입 확인
        const { data: existingLetters } = await supabase
          .from('letters')
          .select('trigger_type')
          .eq('user_id', persona.user_id);

        const letterTypes: string[] = (existingLetters ?? []).map(
          (l: { trigger_type?: string }) => l.trigger_type ?? '',
        );

        // 마지막 대화 시각은 이번 MVP에서는 null로 처리 (대화 저장 안 함)
        const trigger = determineTrigger(persona, letterTypes, null);
        if (!trigger) continue;

        const typeLabel: Record<string, string> = {
          lover: '연인',
          pet: '반려동물',
          family: '가족',
        };

        const systemPrompt = `당신은 사용자가 사별하거나 이별한 ${typeLabel[persona.type] ?? persona.type} "${persona.name}"입니다.
사용자에게 따뜻한 편지를 써주세요.

[편지 가이드라인]
1. 슬픔을 자극하기보다 따뜻한 응원과 아름다운 회상을 중심으로 써주세요.
2. 사용자가 잘 지내고 있는지 걱정하며, 일상으로 돌아가길 진심으로 응원하는 내용을 담으세요.
3. 200~400자 분량으로 작성하세요.
4. ${persona.name}의 어조와 성격(${persona.personality || '따뜻하고 친근함'})을 반영하세요.
5. 한국어로 작성하세요.
6. 절대 자해·자살과 관련된 표현을 사용하지 마세요.`;

        const triggerContext: Record<LetterTrigger, string> = {
          week7: '가입한 지 일주일이 지났어요. 사용자가 잘 지내고 있는지 안부를 전해주세요.',
          week30: '가입한 지 한 달이 지났어요. 조금씩 일상을 회복하고 있을 사용자에게 응원의 편지를 써주세요.',
          anniversary: '오늘은 이별한 날과 비슷한 날짜예요. 사용자를 따뜻하게 위로하는 편지를 써주세요.',
          inactive3days: '3일 동안 대화가 없었어요. 걱정이 되어 안부를 전하는 편지를 써주세요.',
        };

        // 편지 생성 (최대 2번 시도)
        let letterContent = '';
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await client.messages.create({
            model,
            max_tokens: 512,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: triggerContext[trigger],
              },
            ],
          });

          const content =
            response.content[0]?.type === 'text' ? response.content[0].text : '';

          // 위기 키워드 필터
          if (!containsCrisisKeyword(content)) {
            letterContent = content;
            break;
          }
        }

        if (!letterContent) {
          console.warn(`편지 생성 실패 (위기 키워드 포함): userId=${persona.user_id}`);
          continue;
        }

        const triggerKey =
          trigger === 'anniversary' ? `anniversary_${new Date().getFullYear()}` : trigger;

        await supabase.from('letters').insert({
          id: uuidv4(),
          user_id: persona.user_id,
          persona_id: persona.id,
          content: letterContent,
          sent_at: new Date().toISOString(),
          read_at: null,
          trigger_type: triggerKey,
        });

        results.push({ userId: persona.user_id, trigger, success: true });
      } catch (personaErr) {
        console.error(`편지 생성 오류 (userId=${persona.user_id}):`, personaErr);
        results.push({ userId: persona.user_id, trigger: 'unknown', success: false });
      }
    }

    return res.status(200).json({ processed: results });
  } catch (err) {
    console.error('편지 생성 Cron 오류:', err);
    return res.status(500).json({ error: '편지 생성 중 오류가 발생했습니다.' });
  }
}
