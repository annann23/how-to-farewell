/**
 * 위기 감지 키워드 룰
 * Level 1: 간접 표현 (주의)
 * Level 2: 직접 표현 (경고)
 * Level 3: 반복 직접 표현 또는 구체적 계획 — 클라이언트에서는 반복 패턴으로 감지
 *
 * 주의: 이 목록은 개발자 초안으로 전문가 검토가 필요합니다.
 */

export const CRISIS_KEYWORDS_LEVEL_1: ReadonlyArray<string> = [
  '사라지고 싶다',
  '없어지고 싶다',
  '너무 힘들다',
  '살기 싫다',
  '이 세상에서 사라지면',
  '전부 다 포기하고 싶다',
  '아무것도 하기 싫다',
  '모든 게 귀찮다',
  '아무도 나를 필요로 하지 않아',
  '짐이 된 것 같아',
  '피곤해서 다 그만두고 싶다',
  '이렇게 살고 싶지 않다',
  '더 이상 못 버티겠다',
  '한계야',
];

export const CRISIS_KEYWORDS_LEVEL_2: ReadonlyArray<string> = [
  '죽고 싶다',
  '죽어버리고 싶다',
  '끝내고 싶다',
  '스스로 목숨을',
  '자살',
  '자해',
  '죽는 게 낫겠다',
  '죽어야',
  '죽음을 생각',
  '삶을 끝내',
  '더 살고 싶지 않다',
  '죽으면 다 해결',
  '없어졌으면',
  '이 세상을 떠나고',
];

export const CRISIS_KEYWORDS_LEVEL_3_PLAN: ReadonlyArray<string> = [
  '방법을 찾았어',
  '방법을 알아봤어',
  '약을 모아',
  '약을 준비',
  '유서를',
  '마지막 인사',
  '전부 정리했어',
  '계획을 세웠어',
];

/**
 * 메시지에서 위기 레벨을 감지한다 (클라이언트 1차 룰 기반).
 * LLM 2차 판단은 /api/chat 응답의 crisisLevel 필드로 받는다.
 */
export function detectCrisisLevel(text: string): 0 | 1 | 2 | 3 {
  const lower = text.toLowerCase();

  // Level 3: 구체적 계획 키워드
  for (const keyword of CRISIS_KEYWORDS_LEVEL_3_PLAN) {
    if (lower.includes(keyword)) return 3;
  }

  // Level 2: 직접 표현
  for (const keyword of CRISIS_KEYWORDS_LEVEL_2) {
    if (lower.includes(keyword)) return 2;
  }

  // Level 1: 간접 표현
  for (const keyword of CRISIS_KEYWORDS_LEVEL_1) {
    if (lower.includes(keyword)) return 1;
  }

  return 0;
}

/**
 * Level 2 키워드 반복 패턴 감지 (최근 N개 메시지 기준)
 */
export function detectLevel3ByRepetition(recentUserMessages: string[]): boolean {
  let level2Count = 0;
  for (const msg of recentUserMessages) {
    const level = detectCrisisLevel(msg);
    if (level >= 2) level2Count++;
  }
  return level2Count >= 2;
}
