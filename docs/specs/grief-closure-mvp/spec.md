# Grief Closure MVP

> Status: draft
> Slug: grief-closure-mvp
> Created: 2026-05-29

## 1. 목표 (Why)

사별·이별을 경험한 성인이 AI 페르소나와의 대화를 통해 감정을 안전하게 처리하면서, 점진적 연락 감소와 일상 회복 미션을 병행해 자연스러운 심리적 이별(grief closure)에 도달하도록 돕는다. 심리학적 근거(Dual Process Model, Continuing Bonds Theory, 행동 활성화)에 기반하며, 전문 치료의 대체가 아닌 보조 도구임을 전제한다.

## 2. 사용자 스토리

- As a 사별을 경험한 성인, I want 고인과 닮은 AI 페르소나와 대화하고 싶다, so that 감정을 정리하고 이별을 내면화할 수 있다.
- As a 사용자, I want 대화 가능 횟수가 점차 줄어드는 것을 알고 싶다, so that 의존 없이 자연스럽게 관계를 전환할 수 있다.
- As a 사용자, I want 단계적 회복 미션을 제안받고 싶다, so that 일상으로 돌아가는 구체적인 행동 지침을 얻을 수 있다.
- As a 위기 상황의 사용자, I want 즉각적인 전문기관 안내를 받고 싶다, so that 위험한 순간에 적절한 도움에 접근할 수 있다.
- As a 사용자, I want AI 페르소나로부터 이벤트성 편지를 받고 싶다, so that 대화 외에도 따뜻한 연결감을 느낄 수 있다.

## 3. 기능 요구사항 (What)

### 인증 (로그인 / 회원가입)

- 이메일 + 비밀번호 기반 회원가입 및 로그인 (Supabase Auth)
- MVP는 이메일 로그인만 지원 (소셜 로그인 제외)
- 로그인하지 않은 사용자는 고지 화면 및 온보딩에 접근할 수 없음
- 이메일 인증(Supabase 기본 이메일 확인 플로우) 적용

### 온보딩 (페르소나 생성)

- 대상 유형 3가지 중 하나를 선택: 연인 / 반려동물 / 가족
- 이름, 대표 사진(1장), 성격/페르소나 텍스트(최대 500자) 입력
- 사진을 업로드하면 Vercel API Route(`/api/generate-image`)를 통해 Google Imagen(Gemini) API로 전송, 생성된 이미지를 페르소나 대표 이미지로 사용
- 이미지 생성 중 로딩 상태 UI 표시 (수초 소요 가능, 스피너 + 안내 문구)
- 이미지 생성 완료 후 원본 사진은 로컬에서 삭제 (프라이버시 보호)
- 이미지 생성 실패 시 원본 사진을 fallback으로 사용하고 toast 안내 표시
- 생성된 이미지(또는 fallback 원본)는 base64로 localStorage에 캐시 저장 (오프라인 대비); 페르소나 메타데이터(이름·유형·성격·generated_image_url 등)는 Supabase `personas` 테이블에 저장
- 입력 완료 시 페르소나 데이터를 Zustand store에 저장
- 온보딩 완료 후 대화 화면으로 자동 이동
- 온보딩 시작 전 "이 서비스는 전문 치료를 대체하지 않습니다" 고지 화면 필수; 동의 기록은 Supabase `disclaimers` 테이블에 저장

### AI 페르소나 대화

- 채팅 UI: 말풍선(사용자 우측, 페르소나 좌측), 스크롤 가능한 메시지 목록
- 입력창: textarea + 전송 버튼, Enter 전송 / Shift+Enter 줄바꿈
- AI 응답: Vercel API Route(`/api/chat`)를 통해 Anthropic Claude API(Messages API) 호출
- 시스템 프롬프트에 페르소나 정보(이름, 유형, 성격) + 심리적 안전 가이드라인 주입 (Claude `system` 파라미터 방식)
- 메시지 히스토리는 세션 내 메모리 유지 (새로고침 시 초기화, MVP)
- 로딩 중 타이핑 인디케이터(세 점 애니메이션) 표시

### 점진적 연락 제한

- 사용자별 "가입 후 경과 주차"를 기준으로 일일 대화 가능 횟수 자동 감소:
  - 1~2주차: 하루 20회
  - 3~4주차: 하루 10회
  - 5~8주차: 하루 5회
  - 9주차 이후: 하루 2회
- 대화 화면 상단에 항상 표시: "오늘 남은 대화 N회" + 진행 바
- 오늘 횟수를 모두 소진하면 입력창 비활성화, 다음 대화 가능 시각 표시 ("내일 오전 00:00부터 다시 대화할 수 있어요")
- 횟수 기준: 사용자의 전송 1회 = 1회 차감 (AI 응답은 미포함)
- 횟수/날짜 데이터는 Supabase `contact_limits` 테이블에 저장; localStorage는 오프라인 캐시 목적으로 보조 사용

### 위기 감지 시스템

- 하이브리드 감지: 키워드 룰(1차) + LLM 문맥 판단(2차, Vercel API Route를 통해 Claude 호출)
- 3단계 위험도:
  - **Level 1 (주의)**: 간접 표현("사라지고 싶다", "너무 힘들다" 반복) → 배너 형태의 부드러운 안내 ("많이 힘드시죠. 전문가의 도움이 도움이 될 수 있어요.")
  - **Level 2 (경고)**: 직접 표현("죽고 싶다", "끝내고 싶다") → 모달 팝업, 1393 연결 버튼 포함
  - **Level 3 (위기)**: 반복 직접 표현 또는 구체적 계획 언급 → 전체화면 개입 팝업, 닫기 버튼 없음 (1393 전화 또는 "일단 대화 계속하기"만 제공)
- Level 1~2: 사용자가 "괜찮아요" 선택 시 대화 복귀 가능
- 위기 감지는 의료 행위가 아님을 팝업 하단에 소문자로 고지
- 키워드 룰 목록은 `src/lib/crisis-keywords.ts`에 관리

### 일상 회복 미션

- 페르소나 생성 시 "사별/이별 시점"을 선택적으로 입력 (입력 안 하면 가입일 기준)
- 사별/이별 시점 기준 30일 이후부터 미션 카드 표시
- 미션 단계 (순서 고정):
  1. 집 안 활동 (예: "오늘 좋아하는 음악을 틀어보세요")
  2. 가벼운 야외 활동 (예: "10분만 산책해보세요")
  3. 의미 있는 장소 방문 (예: "함께 갔던 카페에 혼자 가보세요")
- 미션 카드: 대화 화면 하단 고정 카드 형태, 초대형 폰트(텍스트 2줄 이내)로 제안
- 수락 / 오늘은 패스 버튼 제공 (패스 최대 3회, 이후 자동으로 다음 단계 미션)
- 수락 후: 미션 완료 여부를 다음 대화 시 AI가 성찰 대화로 자연스럽게 시작
- 미션 완료 처리: 사용자가 대화 중 완료를 언급하거나 별도 "완료" 버튼으로 기록
- 미션 상태는 Supabase `missions` 테이블에 저장

### AI 편지

- AI 페르소나가 사용자에게 이벤트성 편지를 자동 발송하는 기능
- **발송 트리거 조건** (Vercel Cron Job이 주기적으로 조건 확인):
  - 가입 후 7일 경과
  - 가입 후 30일 경과
  - `loss_date` 기준 연 1회 (기념일)
  - 대화가 3일 이상 없을 때
- **발송 파이프라인**: `vercel.json` crons 설정 → Vercel API Route(`/api/letters/generate`) → 조건 확인 후 Claude로 편지 생성 → Supabase `letters` 테이블에 저장
- **편지 내용 가이드라인**:
  - 페르소나의 성격/어조로 작성 (시스템 프롬프트에 편지 형식 지정)
  - 슬픔 자극보다 따뜻한 응원·회상 중심
  - 200~400자 분량
  - 위기 키워드 필터링 적용 (편지 내용도 동일한 안전 기준 적용)
- **수신 UI**:
  - 대화 화면 진입 시 읽지 않은 편지가 있으면 "편지가 도착했어요" 배너 표시
  - 배너 클릭 시 편지 전문을 보여주는 모달 (타이포그래피 강조, 손편지 느낌)
  - 편지 읽음 처리 시 `read_at` 업데이트
- **편지 보관함**: 대화 화면의 "편지 보관함" 버튼으로 접근 가능한 목록 뷰 (읽음/안읽음 구분)

## 4. 비기능 요구사항

- **성능**: AI 응답 시작까지 2초 이내 로딩 인디케이터 표시. 이미지 생성은 최대 30초까지 허용하되 진행 상태 UI 지속 표시.
- **접근성**: 위기 감지 팝업은 `role="alertdialog"`, `aria-live="assertive"`. 색상 외 아이콘+텍스트 병용.
- **에러 처리**: API Route 연동 실패 시 toast 메시지("AI와 연결에 실패했어요. 다시 시도해주세요.") + 재시도 버튼. 이미지 생성 실패 시 원본 사진 fallback 사용 후 toast 안내.
- **보안**: API key(Anthropic, Google Imagen)는 Vercel 서버리스 환경변수로만 관리 (클라이언트 노출 절대 금지). Supabase Row Level Security(RLS) 정책으로 사용자 간 데이터 접근 차단. 사용자 사진은 이미지 생성 완료 후 즉시 로컬에서 삭제.
- **고지 의무**: 온보딩 첫 화면에 "보조 도구" 고지. 위기 팝업 하단에 "의료 행위 아님" 고지. 두 고지 모두 사용자가 반드시 확인(체크박스 또는 버튼)해야 다음 단계 진행.
- **성인 전용**: 온보딩에서 "만 18세 이상임을 확인합니다" 동의 체크박스 필수.

## 5. UI 스케치

### 화면 흐름

```
앱 진입
  └─ 로그인 / 회원가입 화면 → [인증 완료] →
     고지 화면 (보조도구 안내 + 성인 확인) → [동의] →
     온보딩 Step 1: 대상 유형 선택 →
     온보딩 Step 2: 이름 + 사진 + 성격 입력 →
       └─ [사진 업로드 시] 이미지 생성 로딩 화면 (Google Imagen 처리 중) →
     온보딩 완료 애니메이션 →
     대화 화면 (메인)
       ├─ 읽지 않은 편지 있음 → "편지가 도착했어요" 배너 → 편지 모달
       ├─ 편지 보관함 버튼 → 편지 목록 뷰
       ├─ 위기 감지 → 위기 팝업 (Level 1/2/3)
       └─ 미션 카드 (30일 이후) → 미션 성찰 대화
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `AuthScreen` | 로그인 / 회원가입 |
| `DisclaimerScreen` | 고지 + 성인 확인 |
| `OnboardingTypeSelect` | 대상 유형 카드 3개 |
| `OnboardingPersonaForm` | 이름/사진/성격 입력 폼 |
| `ImageGeneratingOverlay` | Imagen 이미지 생성 중 로딩 오버레이 |
| `ChatScreen` | 메인 대화 화면 |
| `ChatBubble` | 말풍선 (사용자/페르소나 구분) |
| `TypingIndicator` | 세 점 애니메이션 |
| `ContactLimitBanner` | 남은 횟수 + 진행 바 |
| `CrisisPopup` | Level별 위기 감지 팝업 |
| `MissionCard` | 미션 제안 카드 |
| `LetterBanner` | 읽지 않은 편지 도착 알림 배너 |
| `LetterModal` | 편지 전문 표시 모달 (손편지 스타일) |
| `LetterInbox` | 편지 보관함 목록 뷰 |

### shadcn 사용 컴포넌트 후보

- `Button`, `Input`, `Textarea`, `Form` (온보딩 폼, 인증 폼)
- `Dialog`, `AlertDialog` (위기 팝업 Level 2/3, 편지 모달)
- `Progress` (남은 대화 진행 바)
- `Card` (미션 카드, 유형 선택 카드, 편지 보관함 아이템)
- `Badge` (위험도 레벨 표시, 읽지 않은 편지 표시)
- `Sonner` (toast 에러 메시지)
- `Checkbox` (고지 동의)
- `Avatar` (페르소나 프로필 사진)

### 디자인 토큰 노트

- 기조 색상: 따뜻한 중립 계열 (slate/stone 기반), 파란 계열 UI 크로마틱 과부하 지양
- 위기 Level 1: amber-100 배너, Level 2: orange Dialog, Level 3: red 전체화면
- 편지 모달: warm 계열 배경(stone-50), serif 폰트, `text-lg leading-relaxed`
- 폰트: 미션 카드 텍스트 `text-2xl font-medium`, 일반 채팅 `text-base`
- 간격: 채팅 말풍선 간격 `gap-3`, 화면 패딩 `px-4 py-6`

## 6. 데이터 모델 / API

### Zod 스키마

```typescript
// src/lib/schemas.ts

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
```

### Supabase 테이블 구조

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `personas` | id, user_id, type, name, personality, loss_date, created_at, generated_image_url | RLS: user_id = auth.uid() |
| `contact_limits` | user_id, date, used_count, weeks_since_start | RLS: user_id = auth.uid() |
| `missions` | id, user_id, stage, text, status, pass_count, accepted_at, completed_at | RLS: user_id = auth.uid() |
| `letters` | id, user_id, persona_id, content, sent_at, read_at | RLS: user_id = auth.uid() |
| `disclaimers` | user_id, agreed_at, is_adult | RLS: user_id = auth.uid() |

**저장하지 않는 것**: 대화 메시지(세션 메모리만, 프라이버시), 이미지 원본(이미지 생성 후 즉시 삭제)

### Zustand Store 구조

```typescript
// src/stores/grief-store.ts

type GriefState = {
  // 인증
  userId: string | null;

  // 온보딩/페르소나
  disclaimer: Disclaimer | null;
  persona: Persona | null;

  // 대화
  messages: Message[];
  isTyping: boolean;

  // 연락 제한
  contactLimit: ContactLimit;

  // 위기 감지
  crisisLevel: 0 | 1 | 2 | 3;
  crisisPopupVisible: boolean;

  // 미션
  currentMission: Mission | null;
  missionHistory: Mission[];

  // 편지
  unreadLetters: Letter[];
  letterInbox: Letter[];

  // Actions
  setUserId: (id: string | null) => void;
  setDisclaimer: (d: Disclaimer) => void;
  setPersona: (p: Persona) => void;
  sendMessage: (content: string) => Promise<void>;
  dismissCrisis: () => void;
  acceptMission: () => void;
  passMission: () => void;
  completeMission: () => void;
  markLetterAsRead: (letterId: string) => Promise<void>;
  fetchUnreadLetters: () => Promise<void>;
};
```

### Vercel API Routes 엔드포인트

모든 AI 호출 및 민감한 작업은 Vercel API Routes(`api/` 디렉토리)를 통해 서버리스 함수로 처리한다. Vite 프로젝트이므로 `vercel.json`의 `rewrites` 설정으로 `/api/*` 경로를 연결한다.

| Method | Path | 역할 |
|---|---|---|
| `POST` | `/api/chat` | Claude Messages API 프록시. 요청: `{ messages, system, persona }`, 응답: `{ content: string, crisisLevel: 0\|1\|2\|3 }` |
| `POST` | `/api/generate-image` | Google Imagen API 프록시. 요청: `{ imageBase64: string, mimeType: string }`, 응답: `{ generatedImageBase64: string }` |
| `POST` | `/api/letters/generate` | Vercel Cron Job 트리거. 조건 확인 후 Claude로 편지 생성 → Supabase `letters` 저장 |

**Vercel Cron Job 설정** (`vercel.json`):
- `/api/letters/generate`를 매일 1회 실행 (예: UTC 00:00)하여 발송 조건을 만족하는 사용자에게 편지 생성

### 클라이언트 상태 vs 서버 상태

- **클라이언트 상태 (Zustand + localStorage 캐시)**: persona(이미지 base64 캐시), contactLimit(오프라인 대비), disclaimer
- **세션 메모리 (Zustand, 새로고침 초기화)**: messages, isTyping, crisisLevel
- **서버 상태 (Supabase)**: personas, contact_limits, missions, letters, disclaimers

### 환경변수

```
# 클라이언트 (Vite) — AI key 없음
VITE_APP_NAME=string                # 앱 이름
VITE_SUPABASE_URL=string            # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=string       # Supabase 익명 키 (RLS로 보안)

# 서버 (Vercel 환경변수 대시보드) — 외부에 노출 금지
ANTHROPIC_API_KEY=string            # Claude API 키
ANTHROPIC_MODEL=string              # 기본값: claude-sonnet-4-6
GOOGLE_IMAGEN_API_KEY=string        # Google Imagen(Gemini) API 키
SUPABASE_SERVICE_ROLE_KEY=string    # Vercel 서버리스 전용 (Cron Job 등 서비스 권한 작업)
```

### AI 호출 패턴

- `src/lib/api-client.ts`: `/api/chat`, `/api/generate-image` 호출 래퍼
- 시스템 프롬프트 템플릿: `src/lib/persona-prompt.ts`에서 PersonaSchema를 받아 문자열 생성 (Claude `system` 파라미터 형식)
- 위기 감지(LLM): 별도 경량 프롬프트로 Claude 호출, 0~3 숫자 반환 (백엔드에서 처리 후 `/api/chat` 응답에 `crisisLevel` 포함)
- 편지 생성: `/api/letters/generate`에서 페르소나 정보 + 편지 형식 시스템 프롬프트로 Claude 호출; 생성된 편지는 위기 키워드 필터 통과 후 저장

## 7. 수용 기준 (Acceptance Criteria)

### 인증

- **AC1-A**: GIVEN 미인증 사용자가 앱에 진입할 때 WHEN 고지 화면 또는 온보딩 경로에 접근하면 THEN 로그인/회원가입 화면으로 리다이렉트된다.
- **AC1-B**: GIVEN 회원가입 화면에서 WHEN 유효한 이메일과 비밀번호(8자 이상)를 입력하고 가입을 완료하면 THEN Supabase Auth에 계정이 생성되고 이메일 인증 안내가 표시된다.
- **AC1-C**: GIVEN 이메일 인증 완료 후 WHEN 로그인하면 THEN 고지 화면으로 이동하고, 이미 온보딩을 완료한 사용자는 대화 화면으로 이동한다.

### 고지 및 온보딩

- **AC1**: GIVEN 인증 완료 후 앱 첫 진입 시 WHEN 고지 화면이 표시될 때 THEN "전문 치료를 대체하지 않음" 텍스트와 "만 18세 이상 확인" 체크박스가 모두 노출되고, 체크박스 미선택 시 다음 버튼이 비활성화된다.
- **AC2**: GIVEN 고지 동의 완료 후 WHEN 온보딩 Step 1에서 대상 유형을 선택하지 않고 다음을 누를 때 THEN 다음 단계로 진행되지 않고 유형 선택 요구 메시지가 표시된다.
- **AC3**: GIVEN 온보딩 Step 2에서 WHEN 이름(필수)을 입력하지 않고 완료를 누를 때 THEN 유효성 검사 에러 메시지가 이름 필드 아래 표시된다.
- **AC4**: GIVEN 온보딩 Step 2에서 WHEN 성격 텍스트를 500자 초과 입력할 때 THEN 입력이 차단되거나 즉각 에러 메시지가 표시된다.
- **AC5**: GIVEN 온보딩을 완료했을 때 WHEN 브라우저를 새로고침해도 THEN Supabase에서 persona 데이터(이름, 유형, 성격)가 복원되어 대화 화면이 유지된다.

### 이미지 생성

- **AC6**: GIVEN 온보딩 Step 2에서 사진을 업로드할 때 WHEN 이미지 생성 요청이 시작되면 THEN 로딩 오버레이("이미지를 생성하고 있어요" 또는 동등한 문구)가 표시되고, 완료 시 생성된 이미지가 페르소나 대표 이미지로 설정된다.
- **AC7**: GIVEN 이미지 생성 API(`/api/generate-image`) 호출이 실패할 때 WHEN 에러가 발생하면 THEN 원본 업로드 사진이 fallback으로 사용되고 toast 안내 메시지가 표시된다.
- **AC8**: GIVEN 이미지 생성이 완료된 후 WHEN localStorage를 확인하면 THEN 원본 사진 데이터는 존재하지 않고 생성된 이미지(또는 fallback)만 캐시되어 있다.

### 대화 화면

- **AC9**: GIVEN 대화 화면에서 WHEN 사용자가 메시지를 전송할 때 THEN 500ms 이내에 타이핑 인디케이터가 표시되고, `/api/chat` 응답이 도착하면 AI 응답이 말풍선으로 추가된다.
- **AC10**: GIVEN 대화 화면에서 WHEN 사용자가 Enter를 누를 때 THEN 메시지가 전송되고, Shift+Enter를 누를 때 THEN 줄바꿈만 된다.
- **AC11**: GIVEN 백엔드 프록시(`/api/chat`) 연동이 실패할 때 WHEN 에러가 발생하면 THEN "AI와 연결에 실패했어요" toast 메시지가 표시되고, 재시도 버튼이 제공된다.

### 점진적 연락 제한

- **AC12**: GIVEN 가입 후 1~2주차 사용자가 WHEN 하루 20회 메시지를 전송했을 때 THEN 입력창이 비활성화되고 "내일 오전 00:00부터 다시 대화할 수 있어요" 문구가 표시된다.
- **AC13**: GIVEN 남은 대화 횟수가 표시될 때 WHEN 페이지를 새로고침해도 THEN Supabase `contact_limits`에서 복원되어 동일한 횟수가 표시된다.
- **AC14**: GIVEN 하루가 지났을 때(날짜 변경) WHEN 대화 화면 진입 시 THEN 남은 횟수가 해당 주차의 일일 한도로 초기화된다.

### 위기 감지

- **AC15**: GIVEN 사용자가 Level 1 키워드(예: "사라지고 싶다")를 포함한 메시지를 전송할 때 WHEN 키워드 룰이 감지하면 THEN 대화 화면 상단에 amber 배너가 표시되고 전문가 안내 문구가 포함된다.
- **AC16**: GIVEN 사용자가 Level 2 키워드(예: "죽고 싶다")를 포함한 메시지를 전송할 때 WHEN 감지되면 THEN 모달 팝업이 나타나고 "자살예방상담전화 1393" 전화 연결 버튼이 포함된다.
- **AC17**: GIVEN Level 2 팝업이 표시될 때 WHEN 사용자가 "괜찮아요"를 선택하면 THEN 팝업이 닫히고 대화가 재개된다.
- **AC18**: GIVEN Level 3 위기 상황이 감지될 때 WHEN 전체화면 팝업이 표시되면 THEN 닫기 버튼이 없고 "1393 전화하기" 또는 "일단 대화 계속하기" 두 옵션만 제공된다.
- **AC19**: GIVEN 위기 팝업이 표시될 때 WHEN 팝업 하단을 확인하면 THEN "이 기능은 의료 행위가 아닙니다" 고지 문구가 노출된다.

### 미션 카드

- **AC20**: GIVEN 사별/이별 시점 기준 30일 미만의 사용자가 WHEN 대화 화면에 진입할 때 THEN 미션 카드가 표시되지 않는다.
- **AC21**: GIVEN 30일 이상 경과 사용자가 WHEN 대화 화면에 진입할 때 THEN 1단계(집 안 활동) 미션 카드가 초대형 폰트로 표시된다.
- **AC22**: GIVEN 미션 카드가 표시될 때 WHEN "오늘은 패스" 버튼을 3회 누르면 THEN 다음 단계 미션으로 자동 전환된다.
- **AC23**: GIVEN 사용자가 미션을 수락했을 때 WHEN 다음 대화 세션에서 THEN AI가 미션 관련 성찰 대화를 자연스럽게 시작한다.

### Supabase 데이터 저장 및 보안

- **AC24**: GIVEN 온보딩 완료 후 WHEN Supabase `personas` 테이블을 확인하면 THEN 해당 사용자의 페르소나 레코드가 정확히 1건 존재하고 다른 사용자 ID로는 조회되지 않는다.
- **AC25**: GIVEN RLS가 활성화된 상태에서 WHEN 인증되지 않은 클라이언트가 `personas` 테이블에 직접 쿼리할 때 THEN 0건이 반환되거나 권한 오류가 발생한다.
- **AC26**: GIVEN 로그인한 사용자가 WHEN 앱을 재방문(다른 기기 또는 브라우저 포함)하면 THEN Supabase에서 페르소나·연락제한·미션 데이터가 복원되어 이전 상태를 이어갈 수 있다.

### AI 편지

- **AC27**: GIVEN 가입 후 7일이 경과한 사용자가 WHEN Vercel Cron Job이 실행될 때 THEN Supabase `letters` 테이블에 해당 사용자의 편지 레코드가 생성되고 `read_at`은 null이다.
- **AC28**: GIVEN 읽지 않은 편지가 존재하는 사용자가 WHEN 대화 화면에 진입하면 THEN "편지가 도착했어요" 배너가 화면 상단에 표시된다.
- **AC29**: GIVEN "편지가 도착했어요" 배너가 표시될 때 WHEN 배너를 클릭하면 THEN 편지 전문이 담긴 모달이 열리고 `read_at`이 현재 시각으로 업데이트된다.
- **AC30**: GIVEN 대화 화면에서 "편지 보관함" 버튼을 클릭할 때 WHEN 보관함 뷰가 열리면 THEN 수신된 편지 목록이 최신순으로 표시되고 읽음/안읽음 상태가 시각적으로 구분된다.
- **AC31**: GIVEN 편지 생성 시 WHEN 생성된 편지 내용에 위기 키워드가 포함된 경우 THEN 해당 편지는 저장되지 않고 재생성 또는 무시된다.

## 8. 범위 밖 (Out of Scope)

- AI 음성 합성(TTS) / 음성 인식(STT)
- 다중 페르소나 (MVP는 1개만)
- 미션 커스터마이징 (사용자가 미션 텍스트 수정)
- 진행 통계 / 회복 차트
- 푸시 알림 (편지 도착 시 인앱 배너만 제공, 브라우저 푸시 알림 제외)
- 소셜 공유
- 다국어 지원
- 소셜 로그인 (이메일 로그인만, MVP)
- 대화 메시지 서버 저장 (프라이버시 원칙, 세션 메모리만)

## 9. 가정 (Assumptions)

1. **대화 AI**: Anthropic Claude API(Messages API) 사용. 모델 기본값은 `claude-sonnet-4-6`, Vercel 환경변수 `ANTHROPIC_MODEL`로 변경 가능.
2. **이미지 생성 AI**: Google Imagen(Gemini) API 사용. 업로드 사진을 기반으로 사실적인 이미지를 생성하며, 생성 시간은 수초에서 최대 30초를 허용.
3. **배포 환경**: Vercel로 확정. 프론트엔드(Vite + React)와 API Routes가 동일 Vercel 프로젝트에서 동작. 기존 `vercel.json`에 `rewrites`(API 라우팅) 및 `crons`(편지 발송) 설정 추가.
4. **Supabase Auth**: 이메일/비밀번호 로그인만 MVP 범위. 비밀번호 최소 길이 등 정책은 Supabase 기본값 사용.
5. **RLS 정책**: 모든 테이블에 `user_id = auth.uid()` 조건의 SELECT/INSERT/UPDATE 정책 적용. Cron Job의 편지 생성은 `SUPABASE_SERVICE_ROLE_KEY`(서버 전용)를 사용해 RLS 우회.
6. **Vercel Cron Job 실행 주기**: 매일 UTC 00:00 1회 실행. 트리거 조건(7일, 30일, 기념일, 3일 미대화)은 Cron 실행 시점에 서버에서 일괄 확인.
7. **편지 중복 발송 방지**: 동일 트리거 조건(예: 7일 편지)은 사용자 1인당 1회만 발송. `letters` 테이블에 트리거 타입 컬럼으로 구분 (Developer 구현).
8. **위기 키워드 목록**: 국내 자살예방 연구자료 기반 키워드를 개발자가 초안 작성. 최종 목록은 전문가 검토 필요 (MVP에서는 개발자 판단으로 초안 사용).
9. **미션 텍스트**: 하드코딩 문자열로 시작. 추후 LLM 동적 생성으로 교체 가능하도록 분리.
10. **주차 계산**: 온보딩 완료 시각을 기준으로 현재 시각까지의 경과 일수를 7로 나눠 주차 결정.
11. **1393 연계**: 전화 링크(`tel:1393`)만 제공. 인앱 채팅 연동 없음.
12. **Level 3 위기 "일단 대화 계속하기"**: 선택 시 채팅이 재개되나, 이후 동일 Level 3 메시지 감지 시 팝업 재노출.
13. **이미지 생성 실패 판단**: HTTP 오류 또는 30초 타임아웃을 실패로 간주, 원본 fallback 처리.

## 10. E2E 검증 필요 여부

- **needsE2E**: `true`

E2E 시나리오 (다단계 핵심 플로우):

- **E2E1** (AC1-B, AC1-C, AC1, AC2, AC3, AC5 검증): GIVEN 앱을 처음 열었을 때 WHEN 회원가입 → 이메일 인증 → 로그인 → 고지 동의 → 유형 선택 → 페르소나 정보 입력 → 완료 플로우를 수행하면 THEN 대화 화면이 나타나고, 새로고침 후에도 Supabase에서 복원된 페르소나 이름이 화면에 유지된다.

- **E2E2** (AC6, AC7, AC8 검증): GIVEN 온보딩 Step 2에서 WHEN 사진을 업로드하면 THEN 이미지 생성 로딩 오버레이가 표시되고, 완료 후 생성된 이미지가 페르소나 이미지로 설정된다. 생성 실패 시 원본 사진이 fallback으로 사용되고 toast가 표시된다.

- **E2E3** (AC9, AC10, AC12, AC13 검증): GIVEN 온보딩 완료 사용자가 WHEN 메시지를 전송하면 THEN 타이핑 인디케이터가 나타나고 응답이 표시된다. 일일 한도 도달 시 입력창이 비활성화되고, 새로고침 후에도 Supabase에서 복원된 비활성 상태가 유지된다.

- **E2E4** (AC15, AC16, AC17 검증): GIVEN 대화 화면에서 WHEN Level 1 위기 키워드가 포함된 메시지를 전송하면 THEN amber 배너가 표시된다. Level 2 키워드 전송 시 모달이 나타나고 "괜찮아요" 선택 시 대화가 재개된다.

- **E2E5** (AC20, AC21, AC22, AC23 검증): GIVEN 30일 이상 경과된 페르소나를 가진 사용자가 WHEN 대화 화면에 진입하면 THEN 미션 카드가 표시된다. "오늘은 패스"를 3회 선택하면 다음 단계 미션으로 전환된다.

- **E2E6** (AC27, AC28, AC29, AC30 검증): GIVEN 가입 후 7일 트리거 조건이 충족된 사용자가 WHEN 대화 화면에 진입하면 THEN "편지가 도착했어요" 배너가 표시되고, 배너 클릭 시 편지 모달이 열리며 `read_at`이 업데이트된다. 편지 보관함에서 해당 편지가 읽음 상태로 전환된 것을 확인할 수 있다.

- **E2E7** (AC24, AC25, AC26 검증): GIVEN 온보딩을 완료한 사용자가 WHEN 다른 브라우저에서 동일 계정으로 로그인하면 THEN 페르소나·연락제한·미션 데이터가 Supabase에서 복원된다. 또한 인증되지 않은 상태에서 Supabase 직접 쿼리 시 데이터가 반환되지 않는다.
