import { z } from 'zod';

/**
 * 클라이언트에 노출되는 환경 변수의 단일 출처(SSOT).
 * 빌드/런타임 양쪽에서 누락된 값이 있으면 즉시 실패시킨다.
 * 서버 전용 변수(ANTHROPIC_API_KEY, GOOGLE_IMAGEN_API_KEY)는 API Route에서 process.env로 직접 참조.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('Closure'),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables. See .env.example.');
}

export const env = parsed.data;
export type Env = typeof env;
