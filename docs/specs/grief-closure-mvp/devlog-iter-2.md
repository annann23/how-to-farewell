# Devlog — iter 2

> Slug: grief-closure-mvp
> Date: 2026-05-29

## 이 iteration의 의도

iter 1 Reviewer가 지적한 FAIL 6건을 모두 수정한다. Tester는 PASS였으므로 테스트 파일은 변경하지 않는다.

## 변경 파일

- `src/lib/persona-prompt.ts` — 수정: `AcceptedMission` 타입 export, `buildPersonaSystemPrompt`에 `acceptedMission` 파라미터 추가 및 미션 성찰 가이드라인 섹션 삽입
- `src/lib/api-client.ts` — 수정: `ChatResponseSchema`, `GenerateImageResponseSchema` Zod 스키마 추가; `ChatRequest`에 `acceptedMission?` 필드 추가; `callChat`에 `acceptedMission` 파라미터 추가; 타입 단언(`as`) 제거 후 `schema.parse()` 적용
- `api/chat.ts` — 수정: 요청 바디에서 `acceptedMission` 수신; 미션 성찰 섹션을 시스템 프롬프트에 조건부 삽입
- `src/stores/grief-store.ts` — 수정: `dbError: string | null` 상태 추가; `setDisclaimer`/`setPersona`에서 Supabase 오류 시 로컬 상태 롤백 + `throw`로 에러 전파; `clearDbError` 액션 추가; `sendMessage`/`retryLastMessage`에서 `accepted` 상태 미션을 `callChat`에 전달; `partialize`에서 `persona`와 `disclaimer` 제거
- `supabase/migrations/001_initial.sql` — 수정: `letters_insert_service` 정책(`WITH CHECK (true)`) 제거, 주석으로 이유 명시
- `api/letters/generate.ts` — 수정: `CRON_SECRET` 미설정 시 즉시 401 반환(fail-closed); Supabase 토큰 fallback 검증 로직 제거

## 결정 요지

1. **AC23 — 미션 성찰**: `persona-prompt.ts`의 `buildPersonaSystemPrompt`에 `acceptedMission` 파라미터를 추가해 단일 출처로 프롬프트를 관리했다. `api/chat.ts`는 클라이언트 프롬프트 빌더를 import할 수 없는 서버 환경이므로 동일한 미션 섹션 로직을 `api/chat.ts`에도 인라인으로 작성했다. (두 파일의 미션 섹션 문구를 동기화하는 것은 devlog 미해결에 기록.)

2. **RLS letters INSERT 정책**: service_role_key로 RLS를 우회하는 Cron Job은 INSERT 정책이 없어도 동작한다. 일반 클라이언트에게 INSERT를 열어 두는 것은 순수 보안 결함이므로 정책 자체를 제거하는 방향을 선택했다.

3. **Zustand persist에서 persona/disclaimer 제거**: 두 필드는 Supabase가 진실의 원천이며, 앱 초기화 시 `fetchPersona` 액션(기존 `src/routes/index.tsx`에서 호출)이 Supabase에서 패치하므로 localStorage 캐시가 불필요하다. `photoDataUrl`(이미지 base64)은 이미 별도 `persona_image_${id}` 키로 localStorage에 저장되고 있어 영향 없다.

## 자가 점검 결과

- `pnpm typecheck`: ✅
- `pnpm lint`: ✅ (기존 shadcn/ui 파일 warning 2건 — 이번 수정 범위 외)

## 피드백 반영

- Reviewer Blocker #1 (AC23 미충족) → `persona-prompt.ts`에 `AcceptedMission` 타입 및 미션 섹션 추가; `api-client.ts` `ChatRequest`에 `acceptedMission?` 필드 추가; `api/chat.ts`에 미션 성찰 프롬프트 삽입; `grief-store.ts` `sendMessage`/`retryLastMessage`에서 `accepted` 미션 전달
- Reviewer Blocker #2 (letters RLS `WITH CHECK (true)`) → `001_initial.sql`에서 `letters_insert_service` 정책 제거
- Reviewer Major #3 (Zod 검증 없음) → `api-client.ts`에 `ChatResponseSchema`, `GenerateImageResponseSchema` 추가; `callChat`/`callGenerateImage` 반환 시 `.parse()` 적용
- Reviewer Major #4 (Zustand persist 서버 상태 혼재) → `partialize`에서 `persona`, `disclaimer` 제거
- Reviewer Major #5 (Cron Job fail-open) → `CRON_SECRET` 없으면 즉시 401; Supabase 토큰 fallback 제거
- Reviewer Major #6 (setDisclaimer/setPersona 에러 무시) → Supabase 오류 시 로컬 상태 롤백 + `throw err`; `dbError` 상태 추가로 UI에서 toast 처리 가능

## 미해결 / 향후 작업

- `api/chat.ts`의 미션 섹션 텍스트와 `src/lib/persona-prompt.ts`의 미션 섹션 텍스트가 두 곳에 분산되어 있다. 서버 환경(`api/`)이 `src/lib/`를 직접 import하기 어려운 구조이므로, 추후 공유 모듈(`lib/` 하위 서버 공용 폴더)로 통합하는 것을 검토.
- `dbError` 상태가 추가되었으나, UI 레이어(ChatScreen 등)에서 toast로 표시하는 연결 작업은 이번 iter 범위 밖이므로 미해결로 남긴다.
