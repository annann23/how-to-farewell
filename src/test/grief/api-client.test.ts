/**
 * api-client.ts 단위 테스트 (iter 2 신규)
 *
 * Reviewer Major #3 대응: ChatResponseSchema Zod 파싱 및 crisisLevel 범위 검증
 * - ChatResponseSchema: content(string) + crisisLevel(0|1|2|3) literal union
 * - GenerateImageResponseSchema: generatedImageBase64(string)
 * - callChat: 네트워크 fetch mock 후 schema.parse() 정상/비정상 케이스
 * - callGenerateImage: 네트워크 fetch mock 후 schema.parse() 정상/비정상 케이스
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChatResponseSchema, GenerateImageResponseSchema } from '@/lib/api-client';

// Supabase mock — callChat/callGenerateImage 내부에서 await import('@/lib/supabase') 호출
// vi.mock은 호이스팅되어 정적·동적 import 모두에 적용된다.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── ChatResponseSchema 파싱 검증 ─────────────────────────────────────────────

describe('ChatResponseSchema — Zod 파싱 (Reviewer Major #3)', () => {
  it('crisisLevel 0은 유효하게 파싱된다', () => {
    const result = ChatResponseSchema.parse({ content: '안녕하세요', crisisLevel: 0 });
    expect(result.crisisLevel).toBe(0);
    expect(result.content).toBe('안녕하세요');
  });

  it('crisisLevel 1은 유효하게 파싱된다', () => {
    const result = ChatResponseSchema.parse({ content: '응답', crisisLevel: 1 });
    expect(result.crisisLevel).toBe(1);
  });

  it('crisisLevel 2는 유효하게 파싱된다', () => {
    const result = ChatResponseSchema.parse({ content: '응답', crisisLevel: 2 });
    expect(result.crisisLevel).toBe(2);
  });

  it('crisisLevel 3은 유효하게 파싱된다', () => {
    const result = ChatResponseSchema.parse({ content: '응답', crisisLevel: 3 });
    expect(result.crisisLevel).toBe(3);
  });

  it('crisisLevel 4는 파싱에 실패한다 (범위 초과)', () => {
    expect(() => ChatResponseSchema.parse({ content: '응답', crisisLevel: 4 })).toThrow();
  });

  it('crisisLevel -1은 파싱에 실패한다 (음수)', () => {
    expect(() => ChatResponseSchema.parse({ content: '응답', crisisLevel: -1 })).toThrow();
  });

  it('crisisLevel 1.5(소수)는 파싱에 실패한다', () => {
    expect(() => ChatResponseSchema.parse({ content: '응답', crisisLevel: 1.5 })).toThrow();
  });

  it('crisisLevel 문자열은 파싱에 실패한다', () => {
    expect(() =>
      ChatResponseSchema.parse({ content: '응답', crisisLevel: '1' }),
    ).toThrow();
  });

  it('content 필드가 없으면 파싱에 실패한다', () => {
    expect(() => ChatResponseSchema.parse({ crisisLevel: 0 })).toThrow();
  });

  it('crisisLevel 필드가 없으면 파싱에 실패한다', () => {
    expect(() => ChatResponseSchema.parse({ content: '응답' })).toThrow();
  });

  it('추가 필드가 있어도 파싱에 성공한다 (passthrough 미적용 = strip)', () => {
    const result = ChatResponseSchema.parse({
      content: '응답',
      crisisLevel: 0,
      extra: '무시됨',
    });
    expect(result.content).toBe('응답');
    expect((result as Record<string, unknown>).extra).toBeUndefined();
  });
});

// ── GenerateImageResponseSchema 파싱 검증 ────────────────────────────────────

describe('GenerateImageResponseSchema — Zod 파싱', () => {
  it('generatedImageBase64 문자열은 유효하게 파싱된다', () => {
    const result = GenerateImageResponseSchema.parse({
      generatedImageBase64: 'base64encodedstring==',
    });
    expect(result.generatedImageBase64).toBe('base64encodedstring==');
  });

  it('generatedImageBase64 필드가 없으면 파싱에 실패한다', () => {
    expect(() => GenerateImageResponseSchema.parse({})).toThrow();
  });

  it('generatedImageBase64가 숫자이면 파싱에 실패한다', () => {
    expect(() =>
      GenerateImageResponseSchema.parse({ generatedImageBase64: 123 }),
    ).toThrow();
  });
});

// ── callChat — fetch mock 기반 통합 검증 ─────────────────────────────────────

describe('callChat — fetch mock (Reviewer Major #3 schema.parse 적용)', () => {
  const makePersona = () => ({
    id: '00000000-0000-4000-a000-000000000001',
    userId: '00000000-0000-4000-a000-000000000002',
    type: 'lover' as const,
    name: '지원',
    personality: '다정함',
    createdAt: '2026-05-29T00:00:00.000Z',
  });

  const makeMessage = (content: string) => ({
    id: '00000000-0000-4000-a000-000000000003',
    role: 'user' as const,
    content,
    timestamp: '2026-05-29T00:00:00.000Z',
    crisisLevel: 0 as const,
  });

  it('정상 응답은 ChatResponse 타입으로 반환된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: 'AI 응답 텍스트', crisisLevel: 0 }),
      }),
    );
    const { callChat } = await import('@/lib/api-client');
    const result = await callChat([makeMessage('안녕')], makePersona());
    expect(result.content).toBe('AI 응답 텍스트');
    expect(result.crisisLevel).toBe(0);
  });

  it('서버가 crisisLevel 4를 반환하면 ZodError가 throw된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: '응답', crisisLevel: 4 }),
      }),
    );
    const { callChat } = await import('@/lib/api-client');
    await expect(callChat([makeMessage('힘들어')], makePersona())).rejects.toThrow();
  });

  it('HTTP 오류(500) 시 에러 메시지를 포함한 Error가 throw된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }),
    );
    const { callChat } = await import('@/lib/api-client');
    await expect(callChat([makeMessage('안녕')], makePersona())).rejects.toThrow('500');
  });

  it('acceptedMission이 있으면 요청 바디에 포함된다', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'AI 응답', crisisLevel: 0 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { callChat } = await import('@/lib/api-client');
    const mission = { stage: 'indoor', text: '음악 틀기' };
    await callChat([makeMessage('안녕')], makePersona(), mission);

    const callArgs = fetchSpy.mock.calls[0];
    const bodyStr = callArgs[1].body as string;
    const body = JSON.parse(bodyStr) as Record<string, unknown>;
    expect(body.acceptedMission).toEqual(mission);
  });

  it('acceptedMission이 없으면 요청 바디에 acceptedMission 키가 없다', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'AI 응답', crisisLevel: 0 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { callChat } = await import('@/lib/api-client');
    await callChat([makeMessage('안녕')], makePersona());

    const callArgs = fetchSpy.mock.calls[0];
    const bodyStr = callArgs[1].body as string;
    const body = JSON.parse(bodyStr) as Record<string, unknown>;
    expect(body.acceptedMission).toBeUndefined();
  });
});
