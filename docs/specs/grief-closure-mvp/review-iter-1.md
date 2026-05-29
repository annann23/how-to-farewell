# Review — iter 1

> Verdict: FAIL
> Reviewed by: reviewer subagent
> Date: 2026-05-29

## 수용 기준 매핑

- AC1-A → `src/routes/__root.tsx:19-26` ✅ 미인증 시 `/auth` 리다이렉트
- AC1-B → `src/routes/auth.tsx:37-44` ✅ Supabase signUp + 이메일 인증 안내 toast
- AC1-C → `src/routes/index.tsx:27-51` 부분 충족. 로그인 후 persona 유무로 온보딩/홈 분기 동작하나, 이미 온보딩 완료한 사용자가 `/auth` 로그인 후 `/` → `ChatScreen`으로 이동하는 경로는 작동함. ✅
- AC1 → `src/components/grief/DisclaimerScreen.tsx:13,67` ✅ "전문 치료 대체 안 함" 텍스트, 성인 확인 체크박스, 미선택 시 버튼 비활성화
- AC2 → `src/components/grief/OnboardingTypeSelect.tsx:72-83` ✅ 미선택 시 다음 버튼 disabled + 안내 문구
- AC3 → `src/components/grief/OnboardingPersonaForm.tsx:13-14` ✅ Zod min(1) 검증, 에러 메시지 표시
- AC4 → `src/components/grief/OnboardingPersonaForm.tsx:15, 183` ✅ Zod max(500) + maxLength 속성 동시 적용
- AC5 → `src/routes/index.tsx:27-51` ✅ Supabase에서 persona 복원 후 ChatScreen 유지
- AC6 → `src/components/grief/OnboardingPersonaForm.tsx:71-90` + `src/components/grief/ImageGeneratingOverlay.tsx` ✅ 생성 중 오버레이 표시, 완료 시 photoDataUrl 설정
- AC7 → `src/components/grief/OnboardingPersonaForm.tsx:77-83` ✅ 실패 시 원본 fallback + toast
- AC8 → `src/components/grief/OnboardingPersonaForm.tsx:85-89` + `src/routes/onboarding.tsx:72-73` ✅ input.value 초기화, localStorage에 생성 이미지만 저장
- AC9 → `src/stores/grief-store.ts:214` + `src/components/grief/ChatScreen.tsx:220` ✅ isTyping → TypingIndicator 표시, 응답 후 메시지 추가
- AC10 → `src/components/grief/ChatScreen.tsx:101-106` ✅ Enter 전송, Shift+Enter 줄바꿈
- AC11 → `src/components/grief/ChatScreen.tsx:226-247` ✅ "AI와 연결에 실패했어요" 배너 + 재시도 버튼
- AC12 → `src/stores/grief-store.ts:202-203` + `src/components/grief/ChatScreen.tsx:263-265` ✅ 한도 초과 시 입력창 비활성화, "내일 오전 00:00부터" 문구
- AC13 → `src/stores/grief-store.ts:484-521` ✅ fetchContactLimit이 Supabase에서 복원
- AC14 → `src/stores/grief-store.ts:186-199` ✅ 날짜 변경 감지 후 usedCount 초기화
- AC15 → `src/lib/crisis-keywords.ts:59-78` + `src/stores/grief-store.ts:217` + `src/components/grief/CrisisPopup.tsx:30-63` ✅ Level 1 amber 배너
- AC16 → `src/components/grief/CrisisPopup.tsx:65-100` ✅ Level 2 모달 + 1393 전화 버튼
- AC17 → `src/components/grief/CrisisPopup.tsx:89-93` ✅ "괜찮아요" 선택 시 onDismiss 호출
- AC18 → `src/components/grief/CrisisPopup.tsx:104-139` ✅ Level 3 AlertDialog, 닫기 버튼 없음, 두 옵션만 제공
- AC19 → `src/components/grief/CrisisPopup.tsx:25, 51, 97, 136` ✅ 모든 레벨 하단 고지 문구 포함
- AC20 → `src/components/grief/ChatScreen.tsx:85-92` ✅ 30일 미만 시 showMission = false
- AC21 → `src/components/grief/ChatScreen.tsx:85-92, 250` ✅ 30일 이상 시 MissionCard 표시, `text-2xl font-medium`
- AC22 → `src/stores/grief-store.ts:334-388` ✅ passCount >= 3 시 다음 단계 전환
- AC23 → `api/chat.ts:72-93` 부분 충족. 시스템 프롬프트에 미션 수락 정보가 주입되지 않아 AI가 성찰 대화를 시작하기 어려움. ❌ 미충족 (사유: sendMessage 호출 시 currentMission.status가 'accepted'인 경우 시스템 프롬프트에 미션 정보를 포함하는 로직 없음)
- AC24 → `supabase/migrations/001_initial.sql:14` (`UNIQUE (user_id)`) + RLS SELECT 정책 ✅
- AC25 → `supabase/migrations/001_initial.sql:17-29` ✅ RLS 활성화, auth.uid() 조건
- AC26 → `src/routes/index.tsx:27-51` ✅ Supabase에서 persona/disclaimer 복원
- AC27 → `api/letters/generate.ts:47-50` ✅ 7일 경과 조건 체크, letters 테이블 저장, read_at=null
- AC28 → `src/components/grief/ChatScreen.tsx:144-146` ✅ unreadLetters.length > 0 시 LetterBanner 표시
- AC29 → `src/components/grief/ChatScreen.tsx:108-113` + `src/stores/grief-store.ts:415-429` ✅ 클릭 시 모달 열기 + read_at 업데이트
- AC30 → `src/components/grief/LetterInbox.tsx:38-79` ✅ 최신순 목록, 읽음/안읽음 구분
- AC31 → `api/letters/generate.ts:157-183` ✅ 위기 키워드 포함 시 재시도(최대 2회), 그래도 포함 시 저장 안 함

## 통과 항목 (요약)

- A. spec 부합성: 부분 (AC23 미충족)
- B. 아키텍처: 부분 (api-client.ts에서 Zod 파싱 없음)
- C. 코드 품질: 부분 (letters_insert_service RLS 보안 이슈, grieveStore 서버 상태 혼재)
- D. 보안: 부분 (letters INSERT 정책 취약점, Cron 인증 로직 불안전)

---

## 실패 항목

### 1. AC23 미충족 — 미션 수락 후 AI 성찰 대화 미구현

- 위치: `api/chat.ts:72-93`, `src/stores/grief-store.ts:246`
- 문제: 스펙에서 "미션 수락 후 다음 대화 세션에서 AI가 미션 관련 성찰 대화로 자연스럽게 시작"하도록 요구한다. 그러나 `callChat`을 호출할 때 `currentMission`의 상태(`accepted`)가 시스템 프롬프트에 전혀 전달되지 않는다. `api/chat.ts`의 시스템 프롬프트 빌더는 페르소나 정보만 사용하고 미션 정보를 받지 않는다.
- 어떻게 고쳐야 하나: `ChatRequest`에 `acceptedMission?: { stage: string; text: string }` 필드를 추가하고, `api/chat.ts` 시스템 프롬프트에 "사용자가 현재 다음 미션을 수락한 상태입니다: {text}. 대화를 시작할 때 자연스럽게 미션 이행 여부를 물어봐 주세요." 구문을 삽입한다.
- 심각도: **blocker** (AC23 명시적 미충족)

---

### 2. `letters` INSERT RLS 정책이 모든 사용자에게 열려 있음

- 위치: `supabase/migrations/001_initial.sql:91-93`
- 문제: `letters_insert_service` 정책이 `WITH CHECK (true)`로 설정되어 있어, 인증된 일반 사용자도 다른 사용자의 `user_id`로 편지를 직접 삽입할 수 있다. Cron Job은 service_role_key로 RLS를 우회하므로 이 정책은 사실상 일반 클라이언트에게 무제한 쓰기를 허용하는 것과 같다.
- 어떻게 고쳐야 하나: 해당 INSERT 정책을 `WITH CHECK (user_id = auth.uid())`로 바꾸거나, 정책 자체를 삭제한다. Cron Job은 service_role_key를 사용하므로 RLS를 우회해 정상 삽입이 가능하다. 클라이언트가 letters를 직접 삽입하는 경로는 없으므로 INSERT 정책은 존재하지 않아도 된다.
- 심각도: **blocker** (보안 결함: 타 사용자 데이터 위조 가능)

---

### 3. `api-client.ts`에서 API 응답에 Zod 검증 없음

- 위치: `src/lib/api-client.ts:56-65`, `src/lib/api-client.ts:86-95`
- 문제: `callChat` 및 `callGenerateImage` 응답을 `data as ChatResponse` / `data as GenerateImageResponse`로 타입 단언한다. 수동으로 필드 존재 여부를 확인하지만 Zod 스키마 파싱을 사용하지 않아, `crisisLevel`이 올바른 `0|1|2|3` 범위인지, `content`가 실제 string인지 런타임에 보장되지 않는다. 아키텍처 원칙 "외부 데이터 → Zod 검증"에 위반된다.
- 어떻게 고쳐야 하나: `schemas.ts`에 `ChatResponseSchema = z.object({ content: z.string(), crisisLevel: z.union([...]) })` 등을 정의하고, `ChatResponseSchema.parse(data)`로 교체한다.
- 심각도: **major**

---

### 4. Zustand에 서버 상태(`persona`, `disclaimer`) 혼재

- 위치: `src/stores/grief-store.ts:554-558`
- 문제: `partialize`로 persist되는 항목에 `persona`와 `disclaimer`가 포함된다. 이 데이터들은 Supabase에 저장된 서버 상태이므로 Zustand persist(= localStorage)에 넣는 것은 아키텍처 원칙 "서버 상태가 Zustand에 들어가지 않음"에 위반된다. spec 섹션 6에서도 `persona`의 이미지 base64 캐시만 localStorage에 보관하도록 명시하고, personas 메타데이터는 Supabase 서버 상태임을 분리하고 있다.
- 어떻게 고쳐야 하나: `persona`와 `disclaimer`는 `partialize`에서 제외하고, 앱 진입 시 Supabase에서 항상 패치(TanStack Query 또는 현재의 `fetchPersona` 방식)하도록 한다. localStorage에는 `persona_image_${id}` 키로 이미지 base64만 유지한다.
- 심각도: **major**

---

### 5. Cron Job 인증 로직 — `CRON_SECRET` 미설정 시 완전히 비인증

- 위치: `api/letters/generate.ts:73-89`
- 문제: `CRON_SECRET` 환경변수가 설정되지 않은 경우(`cronSecret`이 falsy), if 블록 자체가 건너뛰어져 아무런 인증 검사 없이 엔드포인트가 실행된다. 누구든 POST 요청을 보내면 모든 사용자의 편지 생성이 트리거된다. 이는 환경변수 누락 시 보안이 완전히 해제되는 fail-open 패턴이다.
- 어떻게 고쳐야 하나: `if (!cronSecret)` 분기에서 즉시 401을 반환하는 방어 코드를 추가한다. `CRON_SECRET`은 필수 환경변수로 처리해야 한다.
- 심각도: **major**

---

### 6. `grief-store.ts`에서 `setDisclaimer`/`setPersona` Supabase 오류를 무시

- 위치: `src/stores/grief-store.ts:145-156`, `src/stores/grief-store.ts:158-174`
- 문제: `setDisclaimer`와 `setPersona` 모두 Supabase upsert 실패를 `console.error`만으로 처리하고 호출자에게 에러를 전파하지 않는다. 네트워크 오류 시 Zustand에는 데이터가 설정되었지만 Supabase에는 저장되지 않아, 새로고침 후 데이터가 사라지는 불일치가 발생한다. `onboarding.tsx`에서는 이 에러를 catch하지 못한다.
- 어떻게 고쳐야 하나: catch 블록에서 `throw err`를 추가하거나, 저장 실패 시 `toast.error`로 사용자에게 알리고 Zustand 상태도 롤백한다.
- 심각도: **major**

---

## 권고 (선택 — FAIL과 무관)

1. **`api/chat.ts`의 위기 감지 중복 구현**: `quickCrisisLevel` 함수가 `src/lib/crisis-keywords.ts`의 키워드 목록과 별도로 관리된다. 키워드가 두 곳에 분산되어 동기화가 깨질 수 있다. 서버 측에서도 `crisis-keywords.ts`를 공유 모듈로 import하거나, 서버 전용 모듈로 분리하여 단일 출처를 유지할 것을 권고한다.

2. **`LetterSchema`와 DB `trigger_type` 컬럼 불일치**: devlog에서도 미해결로 기록된 사항이다. `letters` 테이블에 `trigger_type` 컬럼이 있고 Cron Job에서 저장하지만 `LetterRowSchema`에는 없다. 클라이언트에서 `LetterRowSchema.safeParse`로 파싱 시 `trigger_type`이 무시되는 것은 허용 범위이나, 향후 확장을 위해 `LetterRowSchema`에 `trigger_type: z.string().optional()`를 추가할 것을 권고한다.

3. **`OnboardingTypeSelect`에서 유형 미선택 에러 메시지 타이밍**: 최초 진입 시에도 `selected === null`이라 "유형을 선택해주세요." 문구가 즉시 노출된다. 사용자가 아무것도 하지 않은 상태에서 에러처럼 보이는 텍스트가 바로 보이는 것은 UX 저하 요인이다. "다음" 버튼 클릭 시도 후에만 에러 문구를 표시하도록 touched 상태를 관리할 것을 권고한다.

4. **`Level 1 CrisisPopup` 접근성**: spec 비기능 요구사항에서 위기 팝업은 `role="alertdialog"`, `aria-live="assertive"`로 지정한다. Level 1 배너는 현재 `role="alert"`, `aria-live="polite"`로 구현되어 있다. Level 1이 상대적으로 낮은 위험도인 점을 감안해도, spec 명시 요구사항과 다르므로 확인 후 통일이 필요하다.

5. **`inactive3days` 트리거 — 대화 저장 없음으로 항상 미동작**: `api/letters/generate.ts:129`에서 `lastMessageAt`이 항상 `null`로 전달되므로, "3일 이상 대화 없을 때" 트리거는 실제로 발동되지 않는다. spec Assumption 12에서 대화 메시지는 서버에 저장하지 않는다고 명시했으므로 현재 MVP 한계이나, 보고서에 명시하여 추후 개선 시 인지할 수 있도록 한다.
