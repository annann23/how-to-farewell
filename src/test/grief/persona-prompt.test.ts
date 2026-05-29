/**
 * persona-prompt.ts 단위 테스트
 *
 * 시스템 프롬프트 빌더 출력 검증
 * - buildPersonaSystemPrompt: 채팅용 시스템 프롬프트
 * - buildLetterSystemPrompt: 편지 생성용 시스템 프롬프트
 * - acceptedMission 파라미터: iter 2 추가 (AC23 미션 성찰 가이드라인 삽입)
 */

import { describe, it, expect } from 'vitest';
import { buildPersonaSystemPrompt, buildLetterSystemPrompt } from '@/lib/persona-prompt';
import type { AcceptedMission } from '@/lib/persona-prompt';
import type { Persona } from '@/lib/schemas';

const VALID_UUID = '00000000-0000-4000-a000-000000000001';
const VALID_UUID_2 = '00000000-0000-4000-a000-000000000002';
const VALID_DATETIME = '2026-05-29T00:00:00.000Z';

const makePersona = (overrides: Partial<Persona> = {}): Persona => ({
  id: VALID_UUID,
  userId: VALID_UUID_2,
  type: 'lover',
  name: '지원',
  personality: '따뜻하고 다정한 사람이에요.',
  createdAt: VALID_DATETIME,
  ...overrides,
});

describe('buildPersonaSystemPrompt', () => {
  it('페르소나 이름이 시스템 프롬프트에 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona({ name: '민준' }));
    expect(prompt).toContain('민준');
  });

  it('페르소나 성격 텍스트가 시스템 프롬프트에 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(
      makePersona({ personality: '유머 감각이 넘치는 사람' }),
    );
    expect(prompt).toContain('유머 감각이 넘치는 사람');
  });

  it('lover 타입은 "연인" 레이블로 변환된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona({ type: 'lover' }));
    expect(prompt).toContain('연인');
  });

  it('pet 타입은 "반려동물" 레이블로 변환된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona({ type: 'pet' }));
    expect(prompt).toContain('반려동물');
  });

  it('family 타입은 "가족" 레이블로 변환된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona({ type: 'family' }));
    expect(prompt).toContain('가족');
  });

  it('안전 가이드라인에 1393 전화번호가 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona());
    expect(prompt).toContain('1393');
  });

  it('한국어 응답 지시가 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona());
    expect(prompt).toContain('한국어');
  });

  it('자해/자살 언급 금지 안전 가이드라인이 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona());
    expect(prompt).toMatch(/자해|자살/);
  });

  it('personality가 없는 경우 기본 텍스트로 대체된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona({ personality: '' }));
    expect(prompt).toContain('특별히 설명된 내용 없음');
  });
});

describe('buildLetterSystemPrompt', () => {
  it('페르소나 이름이 편지 프롬프트에 포함된다', () => {
    const prompt = buildLetterSystemPrompt(makePersona({ name: '다은' }));
    expect(prompt).toContain('다은');
  });

  it('200~400자 분량 가이드라인이 포함된다', () => {
    const prompt = buildLetterSystemPrompt(makePersona());
    expect(prompt).toContain('200');
    expect(prompt).toContain('400');
  });

  it('한국어 작성 지시가 포함된다', () => {
    const prompt = buildLetterSystemPrompt(makePersona());
    expect(prompt).toContain('한국어');
  });

  it('자해/자살 관련 표현 금지 가이드라인이 포함된다', () => {
    const prompt = buildLetterSystemPrompt(makePersona());
    expect(prompt).toMatch(/자해|자살/);
  });

  it('pet 타입은 "반려동물" 레이블로 변환된다', () => {
    const prompt = buildLetterSystemPrompt(makePersona({ type: 'pet' }));
    expect(prompt).toContain('반려동물');
  });

  it('편지 프롬프트는 채팅 프롬프트와 다른 내용을 가진다', () => {
    const persona = makePersona();
    const chatPrompt = buildPersonaSystemPrompt(persona);
    const letterPrompt = buildLetterSystemPrompt(persona);
    expect(chatPrompt).not.toBe(letterPrompt);
  });
});

// iter 2 신규 — AC23: acceptedMission 파라미터에 따른 미션 성찰 섹션 삽입 검증
describe('buildPersonaSystemPrompt — acceptedMission 파라미터 (AC23)', () => {
  const mission: AcceptedMission = {
    stage: 'indoor',
    text: '오늘 좋아하는 음악을 틀어보세요',
  };

  it('acceptedMission 전달 시 미션 성찰 가이드라인 섹션이 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona(), mission);
    expect(prompt).toContain('미션 성찰 가이드라인');
  });

  it('acceptedMission 전달 시 미션 텍스트가 시스템 프롬프트에 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona(), mission);
    expect(prompt).toContain('오늘 좋아하는 음악을 틀어보세요');
  });

  it('acceptedMission 없을 때 미션 성찰 가이드라인 섹션이 포함되지 않는다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona());
    expect(prompt).not.toContain('미션 성찰 가이드라인');
  });

  it('acceptedMission 없을 때와 있을 때 프롬프트가 다르다', () => {
    const withoutMission = buildPersonaSystemPrompt(makePersona());
    const withMission = buildPersonaSystemPrompt(makePersona(), mission);
    expect(withMission).not.toBe(withoutMission);
    expect(withMission.length).toBeGreaterThan(withoutMission.length);
  });

  it('acceptedMission 전달 시 미션 수락 안내 문구가 포함된다', () => {
    const prompt = buildPersonaSystemPrompt(makePersona(), mission);
    expect(prompt).toContain('수락한 상태');
  });
});
