# 프로젝트 컨텍스트 — React MVP Template

## 스택 요약

| 영역 | 선택 |
|---|---|
| 프레임워크 | React 19 |
| 번들러 | Vite 6 |
| 라우팅 | TanStack Router (file-based) |
| 데이터 페칭 | TanStack Query |
| 전역 상태 | Zustand |
| UI | Tailwind CSS v4 + shadcn/ui (new-york) |
| 폼 | React Hook Form + Zod |
| 테스트 | Vitest + Testing Library |
| 패키지 매니저 | pnpm |

## 레이어드 아키텍처 (의존성 방향 엄수)

```
Routes     src/routes/              # file-based, TanStack Router
  ↓
Components src/components/
  ├─ ui/                            # shadcn — 직접 편집 최소화
  └─ <feature>/                     # 비즈니스 컴포넌트
  ↓
Hooks      src/hooks/
  ↓
Stores     src/stores/  (Zustand)   Queries  src/lib/queries/  (TanStack Query)
  ↓
API Client src/lib/api/             Schemas  src/lib/schemas/  (Zod)
```

**의존성은 항상 위 → 아래. 역방향 import 금지.**

## 개발 명령어

```bash
pnpm dev          # 개발 서버 (포트 5173)
pnpm build        # 타입체크 + 빌드
pnpm typecheck    # 타입체크만
pnpm lint         # ESLint
pnpm test         # Vitest watch
pnpm test:run     # Vitest 1회 실행
pnpm preview      # 빌드 결과 미리보기 (포트 4173, E2E용)
```

shadcn 컴포넌트 추가:
```bash
pnpm dlx shadcn@latest add <component>
```

## 코딩 컨벤션

- **환경 변수**: `src/env.ts`의 Zod 스키마를 통해서만 접근. `import.meta.env.*` 직접 참조 금지.
- **라우트 파일**: TanStack Router file-based — `src/routes/` 아래 파일명이 곧 URL 경로.
- **shadcn 컴포넌트**: `src/components/ui/`에 위치. 직접 수정보다 래핑 컴포넌트 작성 권장.
- **스타일**: Tailwind 유틸리티 클래스 우선. CSS 파일 추가는 전역 토큰 정의 목적에만.
- **폼**: React Hook Form + Zod resolver. `useForm` + `zodResolver` 조합.
- **서버 상태**: TanStack Query. Zustand는 클라이언트 전용 UI 상태에만.
- **타입**: `any` 금지. 외부 API 응답은 Zod 스키마로 파싱.
- **주석**: WHY가 비명백한 경우에만. 코드 설명 주석 금지.

## 바이브 코딩 워크플로우

새 기능 요구사항은 `vibe-feature` 스킬이 자동 오케스트레이션:

```
Planner → (사용자 승인) → Developer → Reviewer ∥ Tester → [E2E]
```

- 산출물 위치: `docs/specs/<slug>/`
- E2E 필요 여부는 spec의 `needsE2E` 플래그로 제어
- 단순 버그픽스/단일 파일 수정은 메인 에이전트가 직접 처리

## 배포

- **Vercel**: 저장소 연결 시 `vercel.json` 자동 적용. 환경 변수는 대시보드에서 `VITE_*` 로 등록.
- **Docker + nginx**: `docker compose up --build -d` (8080 포트). 빌드 타임 env 주입.
- **헬스체크**: `GET /healthz` → `200 ok`
