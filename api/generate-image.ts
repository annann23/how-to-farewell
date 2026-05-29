import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

async function verifyToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = await verifyToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const { imageBase64, mimeType } = req.body as {
    imageBase64: string;
    mimeType: string;
  };

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: '이미지 데이터가 필요합니다.' });
  }

  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버 설정 오류입니다.' });
  }

  try {
    // Google Imagen API (Gemini) 호출
    // 참조: https://ai.google.dev/api/generate-content
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: '이 사람의 모습을 부드럽고 따뜻한 느낌의 일러스트레이션 스타일로 변환해주세요. 원본 인물의 특징을 유지하면서 온화하고 친근한 느낌으로 표현해주세요.',
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Imagen API 오류:', errText);
      return res.status(502).json({ error: '이미지 생성에 실패했습니다.' });
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { data?: string; mime_type?: string };
          }>;
        };
      }>;
    };

    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p) => p.inline_data?.data,
    );

    if (!imagePart?.inline_data?.data) {
      return res.status(502).json({ error: '이미지 생성 결과가 없습니다.' });
    }

    return res.status(200).json({
      generatedImageBase64: imagePart.inline_data.data,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: '이미지 생성 시간이 초과되었습니다.' });
    }
    console.error('이미지 생성 오류:', err);
    return res.status(500).json({ error: '이미지 생성 중 오류가 발생했습니다.' });
  }
}
