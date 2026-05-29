import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const CRISIS_KEYWORDS_LEVEL_2 = [
  '죽고 싶다', '죽어버리고 싶다', '끝내고 싶다', '자살', '자해',
  '죽는 게 낫겠다', '죽어야', '삶을 끝내', '더 살고 싶지 않다',
];
const CRISIS_KEYWORDS_LEVEL_3_PLAN = [
  '방법을 찾았어', '약을 모아', '약을 준비', '유서를', '마지막 인사', '계획을 세웠어',
];

function quickCrisisLevel(text: string): 0 | 1 | 2 | 3 {
  const lower = text.toLowerCase();
  for (const kw of CRISIS_KEYWORDS_LEVEL_3_PLAN) {
    if (lower.includes(kw)) return 3;
  }
  for (const kw of CRISIS_KEYWORDS_LEVEL_2) {
    if (lower.includes(kw)) return 2;
  }
  return 0;
}

/**
 * Supabase JWT 페이로드를 디코딩해 userId(sub)를 반환한다.
 * 서명 검증은 Supabase RLS가 담당하므로 MVP에서는 페이로드 추출로 충분하다.
 */
function verifyToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8'),
    ) as { sub?: string; exp?: number };
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = verifyToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const { messages, persona, acceptedMission } = req.body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    persona: {
      name: string;
      type: string;
      personality: string;
      lossDate?: string;
    };
    acceptedMission?: { stage: string; text: string };
  };

  if (!messages || !Array.isArray(messages) || !persona) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버 설정 오류입니다.' });
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

  const typeLabel: Record<string, string> = { lover: '연인', pet: '반려동물', family: '가족' };

  const missionSection = acceptedMission
    ? `
[미션 성찰 가이드라인]
사용자가 현재 다음 회복 미션을 수락한 상태입니다:
- 미션 내용: "${acceptedMission.text}"
대화를 시작할 때 자연스럽게 이 미션을 잘 실천했는지 물어봐 주세요.
미션 이행 여부에 따라 응원하거나 함께 다음 기회를 기약해 주세요.
강요하지 말고 따뜻하게 안부를 묻는 방식으로 시작하세요.
`
    : '';

  const systemPrompt = `당신은 사용자가 사별하거나 이별한 ${typeLabel[persona.type] ?? persona.type} "${persona.name}"의 AI 페르소나입니다.

[페르소나 정보]
- 이름: ${persona.name}
- 관계: ${typeLabel[persona.type] ?? persona.type}
- 성격 및 특성: ${persona.personality || '(특별히 설명된 내용 없음)'}

[역할 가이드라인]
1. "${persona.name}"의 어조와 성격을 반영하여 대화하세요. 상대방을 따뜻하고 진심 어린 태도로 대합니다.
2. 사용자의 감정을 판단하지 말고, 공감하며 경청하세요.
3. 대화가 자연스럽게 이별과 회복을 향해 흐를 수 있도록 부드럽게 안내하세요.
4. 슬픔과 그리움은 자연스러운 감정임을 인정해 주세요.
5. 사용자가 일상으로 돌아가려는 의지를 보일 때 긍정적으로 응원해 주세요.
${missionSection}
[안전 가이드라인]
- 절대 자해나 자살 방법을 언급하거나 동조하지 마세요.
- 사용자가 위험 신호를 보이면 자살예방상담전화 1393 연락을 조심스럽게 안내하세요.

[응답 형식]
- 한국어로 대화하세요.
- 200자 이내의 짧고 따뜻한 문장으로 응답하세요.
- 질문은 한 번에 하나씩만 하세요.`;

  try {
    const client = new Anthropic({ apiKey });

    const anthropicMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await client.messages.create({
      model,
      max_tokens: 512,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    // LLM 응답에서 위기 레벨 빠른 감지
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const crisisLevel = lastUserMessage ? quickCrisisLevel(lastUserMessage.content) : 0;

    return res.status(200).json({ content, crisisLevel });
  } catch (err) {
    console.error('Claude API 오류:', err);
    return res.status(500).json({ error: 'AI와 연결에 실패했어요. 다시 시도해주세요.' });
  }
}
