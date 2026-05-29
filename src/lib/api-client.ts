import { z } from 'zod';
import type { Persona, Message } from '@/lib/schemas';
import type { AcceptedMission } from '@/lib/persona-prompt';

export type ChatRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  persona: Persona;
  acceptedMission?: AcceptedMission;
};

export const ChatResponseSchema = z.object({
  content: z.string(),
  crisisLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const GenerateImageResponseSchema = z.object({
  generatedImageBase64: z.string(),
});
export type GenerateImageResponse = z.infer<typeof GenerateImageResponseSchema>;

export type GenerateImageRequest = {
  imageBase64: string;
  mimeType: string;
};

async function getAuthHeader(): Promise<Record<string, string>> {
  // Supabase 세션에서 JWT 토큰을 가져온다
  const { supabase } = await import('@/lib/supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해 주세요.');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function callChat(
  messages: Message[],
  persona: Persona,
  acceptedMission?: AcceptedMission,
): Promise<ChatResponse> {
  const authHeader = await getAuthHeader();

  const body: ChatRequest = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    persona,
    ...(acceptedMission ? { acceptedMission } : {}),
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat API 오류 (${res.status}): ${text}`);
  }

  const data: unknown = await res.json();
  return ChatResponseSchema.parse(data);
}

export async function callGenerateImage(
  imageBase64: string,
  mimeType: string,
): Promise<GenerateImageResponse> {
  const authHeader = await getAuthHeader();

  const body: GenerateImageRequest = { imageBase64, mimeType };

  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Image API 오류 (${res.status}): ${text}`);
  }

  const data: unknown = await res.json();
  return GenerateImageResponseSchema.parse(data);
}
