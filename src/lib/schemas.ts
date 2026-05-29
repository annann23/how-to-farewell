import { z } from 'zod';

export const PersonaTypeSchema = z.enum(['lover', 'pet', 'family']);
export type PersonaType = z.infer<typeof PersonaTypeSchema>;

export const PersonaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: PersonaTypeSchema,
  name: z.string().min(1).max(30),
  photoDataUrl: z.string().optional(), // base64 캐시 (localStorage), 서버에는 generated_image_url만 저장
  generatedImageUrl: z.string().url().optional(), // Supabase Storage URL
  personality: z.string().max(500),
  lossDate: z.string().datetime().optional(), // ISO 8601, 없으면 createdAt 기준
  createdAt: z.string().datetime(),
});
export type Persona = z.infer<typeof PersonaSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant']);

export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string().datetime(),
  crisisLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(0),
});
export type Message = z.infer<typeof MessageSchema>;

export const MissionStageSchema = z.enum(['indoor', 'outdoor', 'meaningful-place']);
export type MissionStage = z.infer<typeof MissionStageSchema>;
export const MissionStatusSchema = z.enum(['pending', 'accepted', 'completed', 'passed']);

export const MissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  stage: MissionStageSchema,
  text: z.string(),
  status: MissionStatusSchema,
  passCount: z.number().int().min(0).max(3).default(0),
  acceptedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});
export type Mission = z.infer<typeof MissionSchema>;

export const ContactLimitSchema = z.object({
  userId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  usedCount: z.number().int().min(0),
  weeksSinceStart: z.number().int().min(0),
});
export type ContactLimit = z.infer<typeof ContactLimitSchema>;

export const DisclaimerSchema = z.object({
  userId: z.string().uuid(),
  agreedAt: z.string().datetime(),
  isAdult: z.boolean(),
});
export type Disclaimer = z.infer<typeof DisclaimerSchema>;

export const LetterSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  personaId: z.string().uuid(),
  content: z.string().min(200).max(400),
  sentAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
});
export type Letter = z.infer<typeof LetterSchema>;

// Supabase DB row 타입 (snake_case)
export const PersonaRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: PersonaTypeSchema,
  name: z.string(),
  personality: z.string(),
  loss_date: z.string().nullable(),
  created_at: z.string(),
  generated_image_url: z.string().nullable(),
});
export type PersonaRow = z.infer<typeof PersonaRowSchema>;

export const ContactLimitRowSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string(),
  used_count: z.number(),
  weeks_since_start: z.number(),
});
export type ContactLimitRow = z.infer<typeof ContactLimitRowSchema>;

export const MissionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  stage: MissionStageSchema,
  text: z.string(),
  status: MissionStatusSchema,
  pass_count: z.number(),
  accepted_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});
export type MissionRow = z.infer<typeof MissionRowSchema>;

export const LetterRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  persona_id: z.string().uuid(),
  content: z.string(),
  sent_at: z.string(),
  read_at: z.string().nullable(),
});
export type LetterRow = z.infer<typeof LetterRowSchema>;

export const DisclaimerRowSchema = z.object({
  user_id: z.string().uuid(),
  agreed_at: z.string(),
  is_adult: z.boolean(),
});
export type DisclaimerRow = z.infer<typeof DisclaimerRowSchema>;

// 유틸 변환 함수
export function personaRowToSchema(row: PersonaRow): Persona {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    name: row.name,
    personality: row.personality,
    lossDate: row.loss_date ?? undefined,
    createdAt: row.created_at,
    generatedImageUrl: row.generated_image_url ?? undefined,
  };
}

export function contactLimitRowToSchema(row: ContactLimitRow): ContactLimit {
  return {
    userId: row.user_id,
    date: row.date,
    usedCount: row.used_count,
    weeksSinceStart: row.weeks_since_start,
  };
}

export function missionRowToSchema(row: MissionRow): Mission {
  return {
    id: row.id,
    userId: row.user_id,
    stage: row.stage,
    text: row.text,
    status: row.status,
    passCount: row.pass_count,
    acceptedAt: row.accepted_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export function letterRowToSchema(row: LetterRow): Letter {
  return {
    id: row.id,
    userId: row.user_id,
    personaId: row.persona_id,
    content: row.content,
    sentAt: row.sent_at,
    readAt: row.read_at,
  };
}
