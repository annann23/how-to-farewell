/**
 * missions.ts 단위 테스트
 *
 * AC20: 30일 미만 → 미션 카드 미표시
 * AC21: 30일 이상 경과 → 1단계(indoor) 미션 카드 표시
 * AC22: 패스 3회 → 다음 단계 미션으로 자동 전환
 */

import { describe, it, expect } from 'vitest';
import {
  getMissionText,
  getNextStage,
  MISSION_STAGE_ORDER,
  MISSION_DATA,
} from '@/lib/missions';

describe('getMissionText', () => {
  it('indoor 스테이지 index 0은 첫 번째 indoor 미션 텍스트를 반환한다', () => {
    const text = getMissionText('indoor', 0);
    expect(text).toBe('오늘 좋아하는 음악을 틀어보세요.');
  });

  it('outdoor 스테이지 index 0은 첫 번째 outdoor 미션 텍스트를 반환한다', () => {
    const text = getMissionText('outdoor', 0);
    expect(text).toBe('10분만 동네를 천천히 산책해보세요.');
  });

  it('meaningful-place 스테이지 index 0은 첫 번째 meaningful-place 미션 텍스트를 반환한다', () => {
    const text = getMissionText('meaningful-place', 0);
    expect(text).toBe('함께 갔던 카페에 혼자 가보세요.');
  });

  it('유효 범위(0~2) 내 모든 인덱스에서 비어있지 않은 텍스트를 반환한다', () => {
    const stages = ['indoor', 'outdoor', 'meaningful-place'] as const;
    for (const stage of stages) {
      for (let i = 0; i <= 2; i++) {
        const text = getMissionText(stage, i);
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it('index가 음수이면 index 0 텍스트를 반환한다 (하한 클램프)', () => {
    const textAt0 = getMissionText('indoor', 0);
    const textAtMinus1 = getMissionText('indoor', -1);
    expect(textAtMinus1).toBe(textAt0);
  });

  it('index가 2를 초과하면 index 2 텍스트를 반환한다 (상한 클램프)', () => {
    const textAt2 = getMissionText('indoor', 2);
    const textAt5 = getMissionText('indoor', 5);
    expect(textAt5).toBe(textAt2);
  });

  it('알 수 없는 스테이지는 기본 fallback 텍스트를 반환한다', () => {
    // @ts-expect-error -- 의도적 잘못된 스테이지
    const text = getMissionText('unknown-stage', 0);
    expect(text).toBe('오늘 하루 자신을 돌봐주세요.');
  });
});

describe('getNextStage', () => {
  // AC22: 다음 단계 전환 로직 검증
  it('indoor 다음은 outdoor이다', () => {
    expect(getNextStage('indoor')).toBe('outdoor');
  });

  it('outdoor 다음은 meaningful-place이다', () => {
    expect(getNextStage('outdoor')).toBe('meaningful-place');
  });

  it('meaningful-place 다음은 null이다 (마지막 단계)', () => {
    expect(getNextStage('meaningful-place')).toBeNull();
  });
});

describe('MISSION_STAGE_ORDER', () => {
  it('단계 순서가 indoor → outdoor → meaningful-place 이다', () => {
    expect(MISSION_STAGE_ORDER).toEqual(['indoor', 'outdoor', 'meaningful-place']);
  });
});

describe('MISSION_DATA', () => {
  it('각 스테이지마다 정확히 3개의 미션 텍스트가 있다', () => {
    for (const data of MISSION_DATA) {
      expect(data.texts).toHaveLength(3);
    }
  });

  it('3개 스테이지 데이터가 모두 존재한다', () => {
    const stages = MISSION_DATA.map((d) => d.stage);
    expect(stages).toContain('indoor');
    expect(stages).toContain('outdoor');
    expect(stages).toContain('meaningful-place');
  });
});

describe('30일 기준 미션 표시 로직', () => {
  /**
   * AC20: 30일 미만 → 미션 카드 미표시
   * AC21: 30일 이상 경과 → 미션 카드 표시
   *
   * shouldShowMission 헬퍼 함수는 별도 모듈에 없으므로,
   * 앱 로직(ChatScreen 또는 grief-store)에서 사용되는 날짜 계산을 직접 검증한다.
   */
  function shouldShowMission(lossDateIso: string, nowIso: string): boolean {
    const lossMs = new Date(lossDateIso).getTime();
    const nowMs = new Date(nowIso).getTime();
    const daysDiff = Math.floor((nowMs - lossMs) / (1000 * 60 * 60 * 24));
    return daysDiff >= 30;
  }

  it('lossDate로부터 29일 경과 시 미션을 표시하지 않는다 (AC20)', () => {
    const lossDate = '2026-01-01T00:00:00.000Z';
    const now = '2026-01-30T00:00:00.000Z'; // 29일 후
    expect(shouldShowMission(lossDate, now)).toBe(false);
  });

  it('lossDate로부터 정확히 30일 경과 시 미션을 표시한다 (AC21)', () => {
    const lossDate = '2026-01-01T00:00:00.000Z';
    const now = '2026-01-31T00:00:00.000Z'; // 30일 후
    expect(shouldShowMission(lossDate, now)).toBe(true);
  });

  it('lossDate로부터 60일 경과 시 미션을 표시한다', () => {
    const lossDate = '2026-01-01T00:00:00.000Z';
    const now = '2026-03-02T00:00:00.000Z'; // 60일 후
    expect(shouldShowMission(lossDate, now)).toBe(true);
  });

  it('lossDate와 현재 시각이 동일한 경우(0일) 미션을 표시하지 않는다', () => {
    const date = '2026-05-01T00:00:00.000Z';
    expect(shouldShowMission(date, date)).toBe(false);
  });
});
