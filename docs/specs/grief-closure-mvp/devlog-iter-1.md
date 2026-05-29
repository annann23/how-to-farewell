# Devlog — iter 1

> Slug: grief-closure-mvp
> Date: 2026-05-29

## 이 iteration의 의도

Grief Closure MVP의 핵심 플로우 전체를 구현한다. 인증 → 고지 → 온보딩(유형 선택 + 페르소나 입력 + 이미지 생성) → 대화 화면(연락 제한, 위기 감지, 미션, 편지)으로 이어지는 완전한 사용자 여정을 코드로 표현한다.

## 변경 파일

### 신규 생성
- `src/env.ts` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가, `VITE_API_BASE_URL` 제거
- `src/lib/supabase.ts` — Supabase 클라이언트 초기화
- `src/lib/schemas.ts` — Persona, Message, Mission, ContactLimit, Disclaimer, Letter Zod 스키마 + DB row 변환 유틸
- `src/lib/crisis-keywords.ts` — Level 1/2/3 위기 키워드 + detectCrisisLevel / detectLevel3ByRepetition
- `src/lib/missions.ts` — indoor/outdoor/meaningful-place 각 3개 미션 텍스트 + 단계 헬퍼
- `src/lib/persona-prompt.ts` — Claude system 프롬프트 빌더 (chat + 편지 생성용)
- `src/lib/api-client.ts` — `/api/chat`, `/api/generate-image` fetch 래퍼 (Supabase JWT 첨부)
- `src/stores/grief-store.ts` — GriefState 전체 구현 (persist 미들웨어, Supabase 연동 액션)
- `api/chat.ts` — Anthropic Claude Messages API 프록시 (인증 검증, 위기 레벨 반환)
- `api/generate-image.ts` — Google Imagen API 프록시 (30초 타임아웃)
- `api/letters/generate.ts` — 편지 생성 Cron Job (조건 체크, 위기 키워드 필터, Supabase 저장)
- `src/routes/auth.tsx` — 로그인/회원가입 화면 (Supabase Auth, 이메일)
- `src/routes/onboarding.tsx` — 3단계 온보딩 플로우 (DisclaimerScreen → TypeSelect → PersonaForm)
- `src/components/grief/DisclaimerScreen.tsx` — 고지 + 성인 확인 체크박스
- `src/components/grief/OnboardingTypeSelect.tsx` — 대상 유형 카드 선택
- `src/components/grief/OnboardingPersonaForm.tsx` — 이름/사진/성격 입력 폼 + 이미지 생성 트리거
- `src/components/grief/ImageGeneratingOverlay.tsx` — 이미지 생성 중 풀스크린 오버레이
- `src/components/grief/ChatScreen.tsx` — 메인 대화 화면 (ContactLimitBanner, ChatBubble, TypingIndicator 통합)
- `src/components/grief/CrisisPopup.tsx` — Level 1 amber 배너, Level 2 Dialog, Level 3 AlertDialog (닫기 없음)
- `src/components/grief/MissionCard.tsx` — 미션 제안 카드
- `src/components/grief/LetterBanner.tsx` — 읽지 않은 편지 도착 배너
- `src/components/grief/LetterModal.tsx` — 편지 전문 모달 (serif 폰트)
- `src/components/grief/LetterInbox.tsx` — 편지 보관함 목록
- `supabase/migrations/001_initial.sql` — personas, contact_limits, missions, letters, disclaimers + RLS 정책
- `vitest.config.ts` — vitest 설정 분리 (vite.config.ts에서 이전)

### 수정
- `src/env.ts` — 환경변수 스키마 업데이트
- `src/routes/__root.tsx` — Supabase Auth 세션 체크 + onAuthStateChange 구독, Sonner Toaster 추가
- `src/routes/index.tsx` — 홈 화면을 ChatScreen으로 교체, 온보딩 미완료 시 리다이렉트
- `vite.config.ts` — test 설정 제거 (vitest.config.ts로 분리)
- `tsconfig.node.json` — `api/` 디렉토리 include, vitest.config.ts include
- `vercel.json` — API Routes rewrite 추가, Cron Job 추가 (UTC 00:00 = KST 09:00)

## 결정 요지

### 1. API Routes 인증: Supabase JWT 검증
모든 API Route에서 `supabase.auth.getUser(token)`으로 JWT를 검증한다. 서비스 롤 키(SUPABASE_SERVICE_ROLE_KEY)로 검증하여 클라이언트 Supabase SDK에서 얻은 access_token이 유효한지 확인한다. API 키가 클라이언트에 노출되는 것을 완전히 차단한다.

### 2. 이미지 생성 원본 삭제 처리
클라이언트에서 파일을 읽어 base64로 변환 후 API 호출, 완료 후 `input.value = ''`로 파일 참조를 제거한다. 생성된 이미지(또는 fallback 원본)는 `localStorage.setItem(`persona_image_${id}`, dataUrl)`로 캐시하여 오프라인 지원과 프라이버시를 동시에 달성한다. Zustand store에는 `photoDataUrl`이 persist되지 않도록 `partialize`로 제외하고 `id`만 저장한다. (실제로는 onboarding.tsx에서 localStorage에 직접 저장하는 방식 사용)

### 3. CrisisPopup Level 3 닫기 버튼 없음
`AlertDialog`의 `open` prop에 `onOpenChange`를 연결하지 않고, 오직 "1393 전화하기"와 "일단 대화 계속하기" 두 액션만 제공한다. "일단 대화 계속하기"는 `dismissCrisis()`를 호출하여 크라이시스 레벨을 0으로 초기화하나, 동일한 Level 3 메시지 재감지 시 팝업이 재노출된다.

## 자가 점검 결과
- `pnpm typecheck`: ✅
- `pnpm lint`: ✅ (경고 2개는 shadcn ui 생성 파일의 pre-existing 이슈)

## 미해결 / 향후 작업

- **편지 trigger_type 컬럼**: `001_initial.sql`의 `letters` 테이블에 `trigger_type` 컬럼이 추가되어 있으나, `LetterSchema`(Zod)에는 포함되지 않음. API Route에서만 사용하는 서버 전용 컬럼이라 스키마 불일치가 발생하지 않도록 관리 필요.
- **Google Imagen API 엔드포인트**: `gemini-2.0-flash-preview-image-generation` 모델 경로는 GA 이전 preview API로, 모델명/경로가 변경될 수 있음.
- **편지 Cron Job CRON_SECRET**: `vercel.json` cron 트리거에 Vercel이 자동으로 헤더를 추가하는 방식(`x-vercel-cron-signature`)은 별도 검증 코드 필요. 현재는 `CRON_SECRET` 환경변수로 단순 Bearer 방식 구현.
- **메시지 히스토리 세션 초기화**: Spec 명세대로 새로고침 시 메시지가 초기화된다. `partialize`에서 `messages`는 제외됨.
- **counter-store.ts**: 기존 템플릿 파일이며, 이번 spec과 무관하므로 유지(scope out).
- **환경변수 .env.example**: 신규 환경변수(VITE_SUPABASE_URL 등)에 맞는 `.env.example` 업데이트 필요.
