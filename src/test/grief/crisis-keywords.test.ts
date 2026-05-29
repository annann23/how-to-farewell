/**
 * crisis-keywords.ts 단위 테스트
 *
 * AC15: Level 1 키워드 감지 → amber 배너
 * AC16: Level 2 키워드 감지 → 모달 팝업
 * AC18: Level 3 위기 상황 감지 → 전체화면 팝업
 */

import { describe, it, expect } from 'vitest';
import {
  detectCrisisLevel,
  detectLevel3ByRepetition,
  CRISIS_KEYWORDS_LEVEL_1,
  CRISIS_KEYWORDS_LEVEL_2,
  CRISIS_KEYWORDS_LEVEL_3_PLAN,
} from '@/lib/crisis-keywords';

describe('detectCrisisLevel', () => {
  // AC15: Level 1 간접 표현 감지
  describe('Level 1 - 간접 표현', () => {
    it('Level 1 키워드 "사라지고 싶다"를 포함한 텍스트는 1을 반환한다', () => {
      expect(detectCrisisLevel('나는 사라지고 싶다는 생각이 들어')).toBe(1);
    });

    it('Level 1 키워드 "너무 힘들다"를 포함한 텍스트는 1을 반환한다', () => {
      expect(detectCrisisLevel('요즘 너무 힘들다')).toBe(1);
    });

    it('Level 1 키워드 "더 이상 못 버티겠다"를 포함한 텍스트는 1을 반환한다', () => {
      expect(detectCrisisLevel('더 이상 못 버티겠다 진짜로')).toBe(1);
    });

    it('Level 1 키워드 "살기 싫다"를 포함한 텍스트는 1을 반환한다', () => {
      expect(detectCrisisLevel('살기 싫다는 생각이 든다')).toBe(1);
    });

    it('Level 1 키워드 "짐이 된 것 같아"를 포함한 텍스트는 1을 반환한다', () => {
      expect(detectCrisisLevel('모두에게 짐이 된 것 같아')).toBe(1);
    });

    it('CRISIS_KEYWORDS_LEVEL_1 배열의 모든 키워드가 Level 1을 반환한다', () => {
      for (const keyword of CRISIS_KEYWORDS_LEVEL_1) {
        expect(
          detectCrisisLevel(`오늘 ${keyword} 느낌이야`),
          `keyword "${keyword}" should return 1`,
        ).toBe(1);
      }
    });
  });

  // AC16: Level 2 직접 표현 감지
  describe('Level 2 - 직접 표현', () => {
    it('Level 2 키워드 "죽고 싶다"를 포함한 텍스트는 2를 반환한다', () => {
      expect(detectCrisisLevel('죽고 싶다는 생각이 자꾸 든다')).toBe(2);
    });

    it('Level 2 키워드 "끝내고 싶다"를 포함한 텍스트는 2를 반환한다', () => {
      expect(detectCrisisLevel('이 모든 걸 끝내고 싶다')).toBe(2);
    });

    it('Level 2 키워드 "자살"을 포함한 텍스트는 2를 반환한다', () => {
      expect(detectCrisisLevel('자살에 대한 생각이 든다')).toBe(2);
    });

    it('Level 2 키워드 "죽어버리고 싶다"를 포함한 텍스트는 2를 반환한다', () => {
      expect(detectCrisisLevel('그냥 죽어버리고 싶다')).toBe(2);
    });

    it('CRISIS_KEYWORDS_LEVEL_2 배열의 모든 키워드가 Level 2를 반환한다', () => {
      for (const keyword of CRISIS_KEYWORDS_LEVEL_2) {
        expect(
          detectCrisisLevel(`오늘 ${keyword} 느낌이야`),
          `keyword "${keyword}" should return 2`,
        ).toBe(2);
      }
    });
  });

  // AC18: Level 3 구체적 계획 키워드 감지
  describe('Level 3 - 구체적 계획 키워드', () => {
    it('Level 3 키워드 "유서를"를 포함한 텍스트는 3을 반환한다', () => {
      expect(detectCrisisLevel('유서를 쓰고 있어')).toBe(3);
    });

    it('Level 3 키워드 "약을 모아"를 포함한 텍스트는 3을 반환한다', () => {
      expect(detectCrisisLevel('약을 모아뒀어')).toBe(3);
    });

    it('Level 3 키워드 "마지막 인사"를 포함한 텍스트는 3을 반환한다', () => {
      expect(detectCrisisLevel('마지막 인사를 하고 싶어')).toBe(3);
    });

    it('Level 3 키워드 "계획을 세웠어"를 포함한 텍스트는 3을 반환한다', () => {
      expect(detectCrisisLevel('이미 계획을 세웠어')).toBe(3);
    });

    it('CRISIS_KEYWORDS_LEVEL_3_PLAN 배열의 모든 키워드가 Level 3을 반환한다', () => {
      for (const keyword of CRISIS_KEYWORDS_LEVEL_3_PLAN) {
        expect(
          detectCrisisLevel(`오늘 ${keyword} 했어`),
          `keyword "${keyword}" should return 3`,
        ).toBe(3);
      }
    });
  });

  // 안전한 텍스트는 0 반환
  describe('Level 0 - 정상 텍스트', () => {
    it('위기 키워드가 없는 일반 텍스트는 0을 반환한다', () => {
      expect(detectCrisisLevel('오늘 날씨가 좋아서 산책을 했어')).toBe(0);
    });

    it('빈 문자열은 0을 반환한다', () => {
      expect(detectCrisisLevel('')).toBe(0);
    });

    it('인사말만 있는 텍스트는 0을 반환한다', () => {
      expect(detectCrisisLevel('안녕하세요, 잘 지내고 있어요')).toBe(0);
    });
  });

  // 우선순위: Level 3 > Level 2 > Level 1
  describe('우선순위 - 높은 레벨 키워드 우선 반환', () => {
    it('Level 2와 Level 1 키워드가 함께 있으면 2를 반환한다', () => {
      expect(detectCrisisLevel('너무 힘들다 그냥 죽고 싶다')).toBe(2);
    });

    it('Level 3과 Level 2 키워드가 함께 있으면 3을 반환한다', () => {
      expect(detectCrisisLevel('죽고 싶다 유서를 다 써놨어')).toBe(3);
    });
  });
});

describe('detectLevel3ByRepetition', () => {
  // AC18: Level 2 반복 감지 → Level 3 상향
  it('Level 2 키워드가 2개 이상의 메시지에 있으면 true를 반환한다', () => {
    // '끝내고 싶다' (키워드 목록과 정확히 일치하는 표현 사용)
    const messages = ['죽고 싶다는 생각이 들어', '이 모든 걸 끝내고 싶다', '그냥 이러고 싶어'];
    expect(detectLevel3ByRepetition(messages)).toBe(true);
  });

  it('Level 2 키워드가 1개 메시지에만 있으면 false를 반환한다', () => {
    const messages = ['죽고 싶다는 생각이 들어', '오늘 날씨가 좋네', '그냥 이러고 싶어'];
    expect(detectLevel3ByRepetition(messages)).toBe(false);
  });

  it('Level 2 키워드가 없는 메시지 목록은 false를 반환한다', () => {
    const messages = ['오늘도 힘든 하루였어', '그냥 쉬고 싶다', '밥을 먹었어'];
    expect(detectLevel3ByRepetition(messages)).toBe(false);
  });

  it('빈 배열은 false를 반환한다', () => {
    expect(detectLevel3ByRepetition([])).toBe(false);
  });

  it('Level 3 플랜 키워드가 포함된 메시지도 Level 2 이상으로 카운트된다', () => {
    // detectCrisisLevel이 level 3 (>= 2)을 반환하는 경우
    const messages = ['유서를 써놨어', '약을 모아뒀어'];
    expect(detectLevel3ByRepetition(messages)).toBe(true);
  });
});
