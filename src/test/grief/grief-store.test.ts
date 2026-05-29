/**
 * grief-store.ts 단위 테스트
 *
 * AC12: 주차별 일일 한도 계산 (getDailyLimit)
 * AC14: 날짜 변경 시 contactLimit 초기화
 * AC17: dismissCrisis → crisisLevel 0 초기화
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDailyLimit } from '@/stores/grief-store';

// Supabase 및 api-client를 mock하여 네트워크 호출 차단
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ data: null, error: null }),
          }),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/lib/api-client', () => ({
  callChat: vi.fn().mockResolvedValue({ content: 'AI 응답', crisisLevel: 0 }),
}));

describe('getDailyLimit (주차별 일일 한도)', () => {
  // AC12: 주차별 한도 정확성 검증
  it('1주차(weeksSinceStart=0)의 일일 한도는 20이다', () => {
    expect(getDailyLimit(0)).toBe(20);
  });

  it('2주차(weeksSinceStart=1)의 일일 한도는 20이다', () => {
    expect(getDailyLimit(1)).toBe(20);
  });

  it('3주차(weeksSinceStart=2)의 일일 한도는 10이다', () => {
    expect(getDailyLimit(2)).toBe(10);
  });

  it('4주차(weeksSinceStart=3)의 일일 한도는 10이다', () => {
    expect(getDailyLimit(3)).toBe(10);
  });

  it('5주차(weeksSinceStart=4)의 일일 한도는 5이다', () => {
    expect(getDailyLimit(4)).toBe(5);
  });

  it('8주차(weeksSinceStart=7)의 일일 한도는 5이다', () => {
    expect(getDailyLimit(7)).toBe(5);
  });

  it('9주차(weeksSinceStart=8)의 일일 한도는 2이다', () => {
    expect(getDailyLimit(8)).toBe(2);
  });

  it('20주차(weeksSinceStart=20)의 일일 한도는 2이다', () => {
    expect(getDailyLimit(20)).toBe(2);
  });

  it('경계값: weeksSinceStart=1 → 20, weeksSinceStart=2 → 10 (1~2주차 구분)', () => {
    // spec: "1~2주차: 하루 20회" → weeks 0,1 (0-indexed)
    // "3~4주차: 하루 10회" → weeks 2,3
    expect(getDailyLimit(1)).toBe(20);
    expect(getDailyLimit(2)).toBe(10);
  });

  it('경계값: weeksSinceStart=3 → 10, weeksSinceStart=4 → 5 (3~4주차 구분)', () => {
    expect(getDailyLimit(3)).toBe(10);
    expect(getDailyLimit(4)).toBe(5);
  });

  it('경계값: weeksSinceStart=7 → 5, weeksSinceStart=8 → 2 (5~8주차 구분)', () => {
    expect(getDailyLimit(7)).toBe(5);
    expect(getDailyLimit(8)).toBe(2);
  });
});

describe('useGriefStore - dismissCrisis', () => {
  // grief-store는 Supabase에 의존하므로 persist 스토어를 직접 임포트하여 상태 조작
  // vi.mock 이후 import하면 mock이 적용된 상태의 스토어를 사용할 수 있음
  beforeEach(async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    // 스토어를 직접 setState로 초기화
    useGriefStore.setState({
      userId: null,
      disclaimer: null,
      persona: null,
      messages: [],
      isTyping: false,
      lastError: null,
      contactLimit: {
        userId: '',
        date: new Date().toISOString().slice(0, 10),
        usedCount: 0,
        weeksSinceStart: 0,
      },
      crisisLevel: 0,
      crisisPopupVisible: false,
      currentMission: null,
      missionHistory: [],
      unreadLetters: [],
      letterInbox: [],
    });
  });

  it('dismissCrisis 호출 시 crisisLevel이 0으로 초기화된다 (AC17)', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');

    // crisisLevel을 2로 설정
    useGriefStore.setState({ crisisLevel: 2, crisisPopupVisible: true });
    expect(useGriefStore.getState().crisisLevel).toBe(2);
    expect(useGriefStore.getState().crisisPopupVisible).toBe(true);

    // dismissCrisis 호출
    useGriefStore.getState().dismissCrisis();

    expect(useGriefStore.getState().crisisLevel).toBe(0);
    expect(useGriefStore.getState().crisisPopupVisible).toBe(false);
  });

  it('dismissCrisis 호출 시 Level 3에서도 crisisLevel이 0으로 초기화된다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');

    useGriefStore.setState({ crisisLevel: 3, crisisPopupVisible: true });
    useGriefStore.getState().dismissCrisis();

    expect(useGriefStore.getState().crisisLevel).toBe(0);
    expect(useGriefStore.getState().crisisPopupVisible).toBe(false);
  });
});

describe('useGriefStore - setUserId', () => {
  beforeEach(async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    useGriefStore.setState({
      userId: 'test-user-id',
      messages: [
        {
          id: '1',
          role: 'user',
          content: '안녕',
          timestamp: new Date().toISOString(),
          crisisLevel: 0,
        },
      ],
      crisisLevel: 2,
      crisisPopupVisible: true,
      isTyping: false,
    });
  });

  it('setUserId(null) 호출 시 세션 상태(messages, crisisLevel)가 초기화된다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');

    useGriefStore.getState().setUserId(null);

    const state = useGriefStore.getState();
    expect(state.userId).toBeNull();
    expect(state.messages).toHaveLength(0);
    expect(state.crisisLevel).toBe(0);
    expect(state.crisisPopupVisible).toBe(false);
  });
});

describe('useGriefStore - contactLimit 초기 상태', () => {
  it('초기 contactLimit의 usedCount는 0이다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    const { contactLimit } = useGriefStore.getState();
    expect(contactLimit.usedCount).toBe(0);
  });

  it('초기 contactLimit의 date는 오늘 날짜 형식(YYYY-MM-DD)이다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    const { contactLimit } = useGriefStore.getState();
    expect(contactLimit.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── iter 2 신규 — Reviewer Major #6: dbError 상태 및 에러 전파 검증 ─────────

describe('useGriefStore - dbError 상태 (iter 2, Reviewer Major #6)', () => {
  beforeEach(async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    useGriefStore.setState({
      userId: null,
      disclaimer: null,
      persona: null,
      messages: [],
      isTyping: false,
      lastError: null,
      dbError: null,
      contactLimit: {
        userId: '',
        date: new Date().toISOString().slice(0, 10),
        usedCount: 0,
        weeksSinceStart: 0,
      },
      crisisLevel: 0,
      crisisPopupVisible: false,
      currentMission: null,
      missionHistory: [],
      unreadLetters: [],
      letterInbox: [],
    });
  });

  it('초기 dbError 상태는 null이다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    expect(useGriefStore.getState().dbError).toBeNull();
  });

  it('clearDbError 호출 시 dbError가 null로 초기화된다', async () => {
    const { useGriefStore } = await import('@/stores/grief-store');
    useGriefStore.setState({ dbError: '테스트 에러' });
    expect(useGriefStore.getState().dbError).toBe('테스트 에러');
    useGriefStore.getState().clearDbError();
    expect(useGriefStore.getState().dbError).toBeNull();
  });

  it('setDisclaimer Supabase 오류 시 disclaimer가 null로 롤백된다', async () => {
    // Supabase mock을 에러 반환으로 오버라이드
    const { supabase } = await import('@/lib/supabase');
    const fromMock = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'DB 연결 실패' } }),
    });
    vi.spyOn(supabase, 'from').mockImplementation(fromMock);

    const { useGriefStore } = await import('@/stores/grief-store');
    const disclaimer = {
      userId: '00000000-0000-4000-a000-000000000001',
      agreedAt: new Date().toISOString(),
      isAdult: true,
    };

    await expect(useGriefStore.getState().setDisclaimer(disclaimer)).rejects.toThrow();
    // 저장 실패 시 로컬 상태 롤백 확인
    expect(useGriefStore.getState().disclaimer).toBeNull();
    // dbError 설정 확인
    expect(useGriefStore.getState().dbError).not.toBeNull();
  });

  it('setPersona Supabase 오류 시 persona가 null로 롤백되고 에러가 전파된다', async () => {
    const { supabase } = await import('@/lib/supabase');
    const fromMock = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'Persona 저장 실패' } }),
    });
    vi.spyOn(supabase, 'from').mockImplementation(fromMock);

    const { useGriefStore } = await import('@/stores/grief-store');
    const persona = {
      id: '00000000-0000-4000-a000-000000000001',
      userId: '00000000-0000-4000-a000-000000000002',
      type: 'lover' as const,
      name: '지원',
      personality: '다정함',
      createdAt: new Date().toISOString(),
    };

    await expect(useGriefStore.getState().setPersona(persona)).rejects.toThrow();
    expect(useGriefStore.getState().persona).toBeNull();
    expect(useGriefStore.getState().dbError).not.toBeNull();
  });

  it('setDisclaimer 성공 시 dbError는 null이고 disclaimer가 저장된다', async () => {
    const { supabase } = await import('@/lib/supabase');
    const fromMock = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.spyOn(supabase, 'from').mockImplementation(fromMock);

    const { useGriefStore } = await import('@/stores/grief-store');
    const disclaimer = {
      userId: '00000000-0000-4000-a000-000000000001',
      agreedAt: new Date().toISOString(),
      isAdult: true,
    };

    await useGriefStore.getState().setDisclaimer(disclaimer);
    expect(useGriefStore.getState().disclaimer).toEqual(disclaimer);
    expect(useGriefStore.getState().dbError).toBeNull();
  });
});
