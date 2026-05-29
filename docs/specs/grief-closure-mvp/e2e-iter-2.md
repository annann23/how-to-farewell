# E2E Test — iter 2

> Verdict: FAIL
> Tested by: e2e-tester subagent
> Date: 2026-05-29
> Browser: N/A (Playwright MCP 미등록 — 코드 정적 분석 + 서버 기동 확인으로 대체)

---

## 전제 조건

- needsE2E: true ✅
- 빌드: ✅ (경고 1건: `index-CPZwZ0ft.js` 636kb > 500kb, 청크 분할 권고 — 빌드 실패 아님)
- preview 서버: http://localhost:4173 (PID 22914) ✅ ready
- Playwright MCP: ❌ 미등록

### Playwright MCP 미등록 경위

`.mcp.json` 파일이 프로젝트 루트에 존재하지 않으며,
`~/.claude/settings.json`의 `mcpServers`에 `playwright` 항목이 없습니다.
이 전제 조건 불충족으로 실제 브라우저 자동화 검증이 불가능했습니다.

대신 빌드된 앱 서버 기동 확인 + 소스 코드 정적 분석으로 각 시나리오의
구현 충족 여부를 판정했습니다. 스크린샷은 없습니다.

---

## 시나리오 결과

| ID | 시나리오 (요약) | 매핑 AC | 결과 |
|----|----------------|---------|------|
| E2E1 | 온보딩 전체 플로우 + 새로고침 복원 | AC1, AC2, AC3, AC5 | SKIP (Supabase 미연동) |
| E2E2 | 이미지 생성 플로우 | AC6, AC7, AC8 | SKIP (Imagen API 미연동) |
| E2E3 | 대화 전송 + 일일 한도 | AC9, AC10, AC11, AC12 | SKIP (Anthropic API 미연동) |
| E2E4 | 위기 감지 팝업 | AC15, AC16, AC17, AC18, AC19 | ✅ (코드 분석 기반 검증) |
| E2E5 | 미션 카드 | AC20, AC21, AC22, AC23 | ✅ (코드 분석 기반 검증) |
| E2E6 | 편지 수신 | AC27, AC28, AC29 | SKIP (Supabase 미연동) |

---

## 코드 정적 분석 결과 (시나리오별)

### E2E1 — 온보딩 전체 플로우 + 새로고침 복원

**SKIP** — Supabase Auth 미연동 환경에서는 앱 진입 즉시 `/auth`로 리다이렉트됨.
`__root.tsx`에서 `supabase.auth.getSession()`이 null을 반환하면 `navigate('/auth')`를 호출하는 로직이 확인됨.

코드 분석으로 확인된 구현 상태:

- **AC1 (고지 화면)**: `DisclaimerScreen.tsx` — "전문 치료를 대체하지 않는 보조 도구임을 이해했으며" 체크박스 + "만 18세 이상임을 확인합니다" 체크박스 두 개 모두 구현. `canProceed = isAdult && isUnderstood`이고 Button에 `disabled={!canProceed}` 적용 ✅
- **AC2 (유형 선택 없이 다음 불가)**: `OnboardingTypeSelect.tsx` — `disabled={selected === null}` + `selected === null` 일 때 에러 문구 표시 ✅
- **AC3 (이름 미입력 에러)**: `OnboardingPersonaForm.tsx` — `z.string().min(1, '이름을 입력해주세요.')` + `errors.name` 메시지 표시 ✅
- **AC5 (새로고침 복원)**: `index.tsx`에서 `supabase.from('personas').select('*').eq('user_id', userId)` 조회 후 복원 로직 ✅ (Supabase 연동 시)

### E2E2 — 이미지 생성 플로우

**SKIP** — `/api/generate-image` 엔드포인트가 Google Imagen API를 호출하므로 미연동 환경에서는 실패.

코드 분석으로 확인된 구현 상태:

- **AC6 (로딩 오버레이)**: `OnboardingPersonaForm.tsx` — `setIsGenerating(true)` → `<ImageGeneratingOverlay visible={isGenerating} />` 표시. `ImageGeneratingOverlay.tsx`에 "이미지를 생성하고 있어요" 문구 ✅
- **AC7 (fallback)**: `catch` 블록에서 `setPhotoDataUrl(originalDataUrl)` + `toast.error('이미지 생성에 실패했어요. 원본 사진을 사용합니다.')` ✅
- **AC8 (원본 삭제)**: `fileInputRef.current.value = ''` 로 file input 초기화. 단, `originalDataUrl` 변수 자체는 catch 분기에서 fallback으로 사용되고 이후 scope를 벗어남. localStorage에는 생성 이미지만 저장하는 구조 ✅

### E2E3 — 대화 전송 + 일일 한도

**SKIP** — `/api/chat` 엔드포인트가 Anthropic Claude API를 호출하므로 미연동 환경에서는 응답 불가.

코드 분석으로 확인된 구현 상태:

- **AC9 (타이핑 인디케이터)**: `sendMessage`에서 `set({ isTyping: true })` 즉시 적용, `ChatScreen.tsx`의 `{isTyping && <TypingIndicator />}` ✅
- **AC10 (Enter 전송 / Shift+Enter 줄바꿈)**: `handleKeyDown`에서 `e.key === 'Enter' && !e.shiftKey`일 때 `handleSend()` 호출, 아닐 때는 기본 동작(줄바꿈) ✅
- **AC11 (에러 배너 + 재시도)**: `lastError` 상태 시 에러 배너 + "재시도" 버튼 + `retryLastMessage()` 구현 ✅
- **AC12 (한도 소진 시 비활성화)**: `isLimitReached`가 true일 때 입력창 대신 "내일 오전 00:00부터 다시 대화할 수 있어요" 문구로 교체 ✅

### E2E4 — 위기 감지 팝업

**코드 분석 기반 PASS**

- **AC15 (Level 1 amber 배너)**: `CrisisPopup.tsx` Level 1 분기 — `role="alert"`, `bg-amber-50 border-amber-200` 적용, "많이 힘드시죠." + 1393 링크 포함 ✅
- **AC16 (Level 2 모달 + 1393 버튼)**: Level 2 분기 — `Dialog` 컴포넌트, `<a href="tel:1393">자살예방상담전화 1393 전화하기</a>` 버튼 ✅
- **AC17 ("괜찮아요" 선택 시 대화 재개)**: "괜찮아요, 대화를 계속할게요" 버튼의 `onClick={onDismiss}`, `dismissCrisis()`에서 `crisisPopupVisible: false, crisisLevel: 0` 설정 ✅
- **AC18 (Level 3 닫기 버튼 없음)**: `AlertDialog`(닫기 버튼 없음), "1393 전화하기" + "일단 대화 계속하기" 두 버튼만 제공 ✅
- **AC19 (의료 행위 아님 고지)**: 모든 레벨에서 `CRISIS_NOTICE = '이 기능은 의료 행위가 아닙니다...'` 하단 표시 ✅

키워드 감지 로직 (`crisis-keywords.ts`):
- "사라지고 싶다" → CRISIS_KEYWORDS_LEVEL_1에 포함 → Level 1 ✅
- "죽고 싶다" → CRISIS_KEYWORDS_LEVEL_2에 포함 → Level 2 ✅
- Level 2 키워드 2회 이상 반복 → `detectLevel3ByRepetition()` → Level 3 ✅

### E2E5 — 미션 카드

**코드 분석 기반 PASS**

- **AC20 (30일 미만 시 미션 카드 미표시)**: `ChatScreen.tsx`의 `showMission` 계산 — `days >= 30` 조건이 false면 `MissionCard` 렌더링 안 됨 ✅
- **AC21 (30일 이상 시 미션 카드 표시)**: `days >= 30` 이고 `currentMission`이 있으면 카드 표시. `MissionCard.tsx`의 미션 텍스트 `text-2xl font-medium` (초대형 폰트) ✅
- **AC22 ("오늘은 패스" 3회 → 다음 단계 전환)**: `passMission()`에서 `newPassCount >= 3`이면 `getNextStage()`로 다음 단계 미션 생성. 버튼에 `disabled={passesLeft <= 0}` ✅
- **AC23 (수락 후 AI 성찰 대화)**: `sendMessage()`에서 `acceptedMission`을 `callChat()`에 전달하여 시스템 프롬프트에 반영 — 실제 동작은 API 응답 의존이므로 구조적으로 구현됨 ✅

### E2E6 — 편지 수신

**SKIP** — Supabase `letters` 테이블에 테스트 데이터 삽입 불가 (미연동 환경).

코드 분석으로 확인된 구현 상태:

- **AC28 (편지 도착 배너)**: `ChatScreen.tsx` — `unreadLetters.length > 0`이면 `<LetterBanner>` 표시. `LetterBanner.tsx`에 "편지가 도착했어요" 문구 ✅
- **AC29 (배너 클릭 → 모달 + read_at 업데이트)**: `handleLetterBannerClick()` → `handleLetterClick()` → `markLetterAsRead(letter.id)`, Supabase `update({ read_at: ... })` ✅

---

## 발견된 잠재 이슈 (코드 분석 기반)

### 이슈 1: getDailyLimit export 불일치
- **위치**: `grief-store.ts` 27번째 줄
- **설명**: `getDailyLimit` 함수가 파일 내부에 `function getDailyLimit(...)` 으로 선언되어 있으나, 파일 맨 아래 `export { getDailyLimit };`로도 내보내지고 있음. `ChatScreen.tsx`에서 `import { useGriefStore, getDailyLimit } from '@/stores/grief-store'`로 named import하는 방식은 정상이나, 빌드 경고의 원인 중 하나일 수 있음. (동작에는 문제없음)

### 이슈 2: Level 3 위기 팝업 닫기 가능성
- **위치**: `CrisisPopup.tsx` 105번째 줄
- **설명**: Level 3에서 `AlertDialog`를 사용하지만, `AlertDialogAction`("일단 대화 계속하기") 클릭 시 `onDismiss()`가 호출되어 `crisisLevel: 0`으로 리셋됨. 이후 동일한 Level 3 키워드를 다시 입력하면 팝업이 재노출되는 구조는 spec Assumption 12와 일치하나, Level 3 이후에도 Level 2 키워드 반복 횟수 카운터가 리셋되지 않는지 확인 필요. `dismissCrisis()`는 `crisisLevel: 0`으로 리셋하지만 메시지 히스토리는 유지되므로 다음 `sendMessage()` 시 `detectLevel3ByRepetition()` 재판정이 일어날 수 있음.

### 이슈 3: 빌드 청크 크기 경고
- **위치**: `dist/assets/index-CPZwZ0ft.js` (636.86 kB)
- **설명**: Vite 권고치(500 kB)를 초과. 런타임 오류는 아니나 초기 로딩 성능에 영향. `build.rollupOptions.output.manualChunks` 또는 동적 import 적용 권고.

### 이슈 4: Supabase 미연동 시 무한 리다이렉트 가능성
- **위치**: `__root.tsx` + `index.tsx`
- **설명**: Supabase URL/ANON_KEY가 설정되지 않은 경우, `supabase.auth.getSession()` 호출 자체가 오류를 던질 수 있음. 현재 코드에서는 이 경우 catch가 없어 `/auth`로 리다이렉트 후, `AuthPage`에서 다시 Supabase를 호출하는 루프가 발생할 수 있음. `.env` 파일 존재 여부에 따라 다름.

---

## 콘솔 / 네트워크 이슈

실제 브라우저 콘솔 확인 불가 (Playwright MCP 미등록). 빌드 출력 기준:
- 빌드 경고 1건: 청크 크기 (이슈 3 참조)
- 빌드 에러: 0건

---

## 권고

### Playwright MCP 등록 방법
```json
// 프로젝트 루트 .mcp.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```
등록 후 iter 3에서 실제 브라우저 자동화 재실행 필요.

### 향후 추가하면 좋을 시나리오
- E2E 전용 Supabase 프로젝트(또는 로컬 Supabase) 환경 구성 후 전체 플로우 자동화
- 위기 감지 키워드 입력 → 실제 팝업 렌더링 브라우저 검증 (AC15~19는 코드 분석으로만 확인)
- `passMission()` 3회 클릭 후 store 상태 변화 브라우저 검증 (AC22)
- 한도 소진 시 입력창 비활성화 상태 스크린샷 확보

### 안정성 개선 포인트
- Supabase 미설정 환경에서의 graceful fallback (이슈 4)
- Level 3 dismiss 후 반복 감지 로직 명세화 (이슈 2)
- 번들 청크 분할 적용 (이슈 3)
