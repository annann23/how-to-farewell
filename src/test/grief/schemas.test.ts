/**
 * schemas.ts 단위 테스트
 *
 * AC3: 이름(필수) 유효성 검사 — 빈 값 → 에러
 * AC4: 성격 텍스트 500자 초과 → 에러
 * Zod 스키마 경계값 및 변환 유틸 검증
 */

import { describe, it, expect } from 'vitest';
import {
  PersonaSchema,
  PersonaTypeSchema,
  MessageSchema,
  MissionSchema,
  ContactLimitSchema,
  DisclaimerSchema,
  LetterSchema,
  personaRowToSchema,
  contactLimitRowToSchema,
  missionRowToSchema,
  letterRowToSchema,
  type PersonaRow,
  type ContactLimitRow,
  type MissionRow,
  type LetterRow,
} from '@/lib/schemas';

const VALID_UUID = '00000000-0000-4000-a000-000000000001';
const VALID_UUID_2 = '00000000-0000-4000-a000-000000000002';
const VALID_DATETIME = '2026-05-29T00:00:00.000Z';

describe('PersonaTypeSchema', () => {
  it('유효한 타입 lover/pet/family를 허용한다', () => {
    expect(PersonaTypeSchema.parse('lover')).toBe('lover');
    expect(PersonaTypeSchema.parse('pet')).toBe('pet');
    expect(PersonaTypeSchema.parse('family')).toBe('family');
  });

  it('유효하지 않은 타입은 에러를 반환한다', () => {
    const result = PersonaTypeSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });
});

describe('PersonaSchema', () => {
  const validPersona = {
    id: VALID_UUID,
    userId: VALID_UUID_2,
    type: 'lover' as const,
    name: '지원',
    personality: '따뜻하고 다정한 사람',
    createdAt: VALID_DATETIME,
  };

  it('유효한 페르소나 데이터를 통과시킨다', () => {
    const result = PersonaSchema.safeParse(validPersona);
    expect(result.success).toBe(true);
  });

  // AC3: 이름 필수 검사
  it('이름이 빈 문자열이면 유효성 검사에 실패한다 (AC3)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, name: '' });
    expect(result.success).toBe(false);
  });

  it('이름이 1자이면 통과한다 (min=1 경계값)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, name: '가' });
    expect(result.success).toBe(true);
  });

  it('이름이 30자이면 통과한다 (max=30 경계값)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, name: 'a'.repeat(30) });
    expect(result.success).toBe(true);
  });

  it('이름이 31자이면 유효성 검사에 실패한다 (max=30 초과)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, name: 'a'.repeat(31) });
    expect(result.success).toBe(false);
  });

  // AC4: 성격 500자 제한
  it('성격 텍스트가 500자이면 통과한다 (max=500 경계값)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, personality: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('성격 텍스트가 501자이면 유효성 검사에 실패한다 (AC4)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, personality: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('성격 텍스트가 빈 문자열이면 통과한다 (max 제약만 있음)', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, personality: '' });
    expect(result.success).toBe(true);
  });

  it('id가 UUID 형식이 아니면 유효성 검사에 실패한다', () => {
    const result = PersonaSchema.safeParse({ ...validPersona, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('lossDate는 선택적 필드이며 없어도 통과한다', () => {
    const { lossDate: _ld, ...withoutLossDate } = { ...validPersona, lossDate: undefined };
    const result = PersonaSchema.safeParse(withoutLossDate);
    expect(result.success).toBe(true);
  });
});

describe('MessageSchema', () => {
  const validMessage = {
    id: VALID_UUID,
    role: 'user' as const,
    content: '안녕하세요',
    timestamp: VALID_DATETIME,
  };

  it('유효한 메시지 데이터를 통과시킨다', () => {
    const result = MessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it('crisisLevel 기본값은 0이다', () => {
    const result = MessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crisisLevel).toBe(0);
    }
  });

  it('crisisLevel 0,1,2,3은 모두 허용된다', () => {
    for (const level of [0, 1, 2, 3] as const) {
      const result = MessageSchema.safeParse({ ...validMessage, crisisLevel: level });
      expect(result.success).toBe(true);
    }
  });

  it('crisisLevel 4는 허용되지 않는다', () => {
    const result = MessageSchema.safeParse({ ...validMessage, crisisLevel: 4 });
    expect(result.success).toBe(false);
  });

  it('role이 user 또는 assistant가 아니면 실패한다', () => {
    const result = MessageSchema.safeParse({ ...validMessage, role: 'system' });
    expect(result.success).toBe(false);
  });
});

describe('MissionSchema', () => {
  const validMission = {
    id: VALID_UUID,
    userId: VALID_UUID_2,
    stage: 'indoor' as const,
    text: '오늘 좋아하는 음악을 틀어보세요.',
    status: 'pending' as const,
    passCount: 0,
  };

  it('유효한 미션 데이터를 통과시킨다', () => {
    const result = MissionSchema.safeParse(validMission);
    expect(result.success).toBe(true);
  });

  it('passCount 기본값은 0이다', () => {
    const { passCount: _pc, ...withoutPassCount } = validMission;
    const result = MissionSchema.safeParse(withoutPassCount);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passCount).toBe(0);
    }
  });

  // AC22: passCount max=3 경계값
  it('passCount가 3이면 통과한다 (max=3 경계값)', () => {
    const result = MissionSchema.safeParse({ ...validMission, passCount: 3 });
    expect(result.success).toBe(true);
  });

  it('passCount가 4이면 유효성 검사에 실패한다 (max=3 초과)', () => {
    const result = MissionSchema.safeParse({ ...validMission, passCount: 4 });
    expect(result.success).toBe(false);
  });

  it('passCount가 음수이면 유효성 검사에 실패한다 (min=0)', () => {
    const result = MissionSchema.safeParse({ ...validMission, passCount: -1 });
    expect(result.success).toBe(false);
  });

  it('유효한 status 값들을 모두 허용한다', () => {
    for (const status of ['pending', 'accepted', 'completed', 'passed'] as const) {
      const result = MissionSchema.safeParse({ ...validMission, status });
      expect(result.success).toBe(true);
    }
  });
});

describe('ContactLimitSchema', () => {
  const validLimit = {
    userId: VALID_UUID,
    date: '2026-05-29',
    usedCount: 0,
    weeksSinceStart: 0,
  };

  it('유효한 ContactLimit 데이터를 통과시킨다', () => {
    const result = ContactLimitSchema.safeParse(validLimit);
    expect(result.success).toBe(true);
  });

  it('usedCount가 음수이면 유효성 검사에 실패한다 (min=0)', () => {
    const result = ContactLimitSchema.safeParse({ ...validLimit, usedCount: -1 });
    expect(result.success).toBe(false);
  });

  it('weeksSinceStart가 음수이면 유효성 검사에 실패한다 (min=0)', () => {
    const result = ContactLimitSchema.safeParse({ ...validLimit, weeksSinceStart: -1 });
    expect(result.success).toBe(false);
  });
});

describe('DisclaimerSchema', () => {
  const validDisclaimer = {
    userId: VALID_UUID,
    agreedAt: VALID_DATETIME,
    isAdult: true,
  };

  it('유효한 Disclaimer 데이터를 통과시킨다', () => {
    const result = DisclaimerSchema.safeParse(validDisclaimer);
    expect(result.success).toBe(true);
  });

  it('isAdult가 boolean이 아니면 유효성 검사에 실패한다', () => {
    const result = DisclaimerSchema.safeParse({ ...validDisclaimer, isAdult: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('LetterSchema', () => {
  const validLetter = {
    id: VALID_UUID,
    userId: VALID_UUID_2,
    personaId: VALID_UUID,
    content: 'a'.repeat(200),
    sentAt: VALID_DATETIME,
    readAt: null,
  };

  it('유효한 Letter 데이터를 통과시킨다', () => {
    const result = LetterSchema.safeParse(validLetter);
    expect(result.success).toBe(true);
  });

  it('content가 200자 미만이면 유효성 검사에 실패한다 (min=200)', () => {
    const result = LetterSchema.safeParse({ ...validLetter, content: 'a'.repeat(199) });
    expect(result.success).toBe(false);
  });

  it('content가 200자이면 통과한다 (min=200 경계값)', () => {
    const result = LetterSchema.safeParse({ ...validLetter, content: 'a'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('content가 400자이면 통과한다 (max=400 경계값)', () => {
    const result = LetterSchema.safeParse({ ...validLetter, content: 'a'.repeat(400) });
    expect(result.success).toBe(true);
  });

  it('content가 401자이면 유효성 검사에 실패한다 (max=400 초과)', () => {
    const result = LetterSchema.safeParse({ ...validLetter, content: 'a'.repeat(401) });
    expect(result.success).toBe(false);
  });

  it('readAt이 null이면 통과한다', () => {
    const result = LetterSchema.safeParse({ ...validLetter, readAt: null });
    expect(result.success).toBe(true);
  });

  it('readAt이 유효한 datetime 문자열이면 통과한다', () => {
    const result = LetterSchema.safeParse({ ...validLetter, readAt: VALID_DATETIME });
    expect(result.success).toBe(true);
  });
});

describe('Row 변환 유틸 함수', () => {
  it('personaRowToSchema가 snake_case를 camelCase로 올바르게 변환한다', () => {
    const row: PersonaRow = {
      id: VALID_UUID,
      user_id: VALID_UUID_2,
      type: 'family',
      name: '엄마',
      personality: '따뜻한 분',
      loss_date: null,
      created_at: VALID_DATETIME,
      generated_image_url: null,
    };
    const persona = personaRowToSchema(row);
    expect(persona.userId).toBe(VALID_UUID_2);
    expect(persona.lossDate).toBeUndefined();
    expect(persona.generatedImageUrl).toBeUndefined();
  });

  it('personaRowToSchema가 loss_date 값을 lossDate로 변환한다', () => {
    const row: PersonaRow = {
      id: VALID_UUID,
      user_id: VALID_UUID_2,
      type: 'family',
      name: '엄마',
      personality: '따뜻한 분',
      loss_date: VALID_DATETIME,
      created_at: VALID_DATETIME,
      generated_image_url: 'https://example.com/image.png',
    };
    const persona = personaRowToSchema(row);
    expect(persona.lossDate).toBe(VALID_DATETIME);
    expect(persona.generatedImageUrl).toBe('https://example.com/image.png');
  });

  it('contactLimitRowToSchema가 snake_case를 camelCase로 올바르게 변환한다', () => {
    const row: ContactLimitRow = {
      user_id: VALID_UUID,
      date: '2026-05-29',
      used_count: 5,
      weeks_since_start: 3,
    };
    const limit = contactLimitRowToSchema(row);
    expect(limit.userId).toBe(VALID_UUID);
    expect(limit.usedCount).toBe(5);
    expect(limit.weeksSinceStart).toBe(3);
  });

  it('missionRowToSchema가 snake_case를 camelCase로 올바르게 변환한다', () => {
    const row: MissionRow = {
      id: VALID_UUID,
      user_id: VALID_UUID_2,
      stage: 'outdoor',
      text: '산책을 해보세요',
      status: 'accepted',
      pass_count: 1,
      accepted_at: VALID_DATETIME,
      completed_at: null,
    };
    const mission = missionRowToSchema(row);
    expect(mission.userId).toBe(VALID_UUID_2);
    expect(mission.passCount).toBe(1);
    expect(mission.acceptedAt).toBe(VALID_DATETIME);
    expect(mission.completedAt).toBeUndefined();
  });

  it('letterRowToSchema가 snake_case를 camelCase로 올바르게 변환한다', () => {
    const row: LetterRow = {
      id: VALID_UUID,
      user_id: VALID_UUID_2,
      persona_id: VALID_UUID,
      content: 'a'.repeat(200),
      sent_at: VALID_DATETIME,
      read_at: null,
    };
    const letter = letterRowToSchema(row);
    expect(letter.userId).toBe(VALID_UUID_2);
    expect(letter.personaId).toBe(VALID_UUID);
    expect(letter.readAt).toBeNull();
  });
});
