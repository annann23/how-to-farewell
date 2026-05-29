import type { MissionStage } from '@/lib/schemas';

/**
 * 단계별 미션 텍스트 (하드코딩 초안, 추후 LLM 동적 생성으로 교체 가능)
 */
export type MissionText = {
  stage: MissionStage;
  texts: [string, string, string];
};

export const MISSION_DATA: ReadonlyArray<MissionText> = [
  {
    stage: 'indoor',
    texts: [
      '오늘 좋아하는 음악을 틀어보세요.',
      '따뜻한 차 한 잔을 천천히 마셔보세요.',
      '창문을 열고 5분간 바깥 공기를 느껴보세요.',
    ],
  },
  {
    stage: 'outdoor',
    texts: [
      '10분만 동네를 천천히 산책해보세요.',
      '가까운 편의점이나 마트에 걷어가 보세요.',
      '공원 벤치에 잠시 앉아 하늘을 바라보세요.',
    ],
  },
  {
    stage: 'meaningful-place',
    texts: [
      '함께 갔던 카페에 혼자 가보세요.',
      '좋은 기억이 있는 장소를 방문해보세요.',
      '함께 걸었던 길을 혼자 걸어보세요.',
    ],
  },
];

/**
 * 단계와 인덱스(0~2)로 미션 텍스트를 반환
 */
export function getMissionText(stage: MissionStage, index: number): string {
  const data = MISSION_DATA.find((m) => m.stage === stage);
  if (!data) return '오늘 하루 자신을 돌봐주세요.';
  const safeIndex = Math.max(0, Math.min(2, index));
  return data.texts[safeIndex];
}

/**
 * 단계 순서
 */
export const MISSION_STAGE_ORDER: ReadonlyArray<MissionStage> = [
  'indoor',
  'outdoor',
  'meaningful-place',
];

export function getNextStage(current: MissionStage): MissionStage | null {
  const idx = MISSION_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= MISSION_STAGE_ORDER.length - 1) return null;
  return MISSION_STAGE_ORDER[idx + 1];
}
