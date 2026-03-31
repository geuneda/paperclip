# Paperclip - Local Fork

## Overview

Paperclip은 AI 에이전트 회사를 오케스트레이션하는 오픈소스 컨트롤 플레인이다.
이 저장소는 `https://github.com/paperclipai/paperclip` (upstream)의 로컬 포크이며,
우리 환경에 맞게 커스터마이징하고 주기적으로 upstream 변경사항을 머지한다.

## Upstream Sync Strategy

### Git Remote 구성

- `upstream`: `https://github.com/paperclipai/paperclip` (원본, master 브랜치)
- `origin`: 우리 자체 원격 저장소 (설정 시 추가)

### Upstream 동기화 절차

```bash
# 1. upstream 최신 변경사항 가져오기
git fetch upstream

# 2. upstream/master 기준으로 현재 상태 확인
git log --oneline main..upstream/master

# 3. 머지 (충돌 시 우리 커스텀 변경 우선)
git merge upstream/master

# 4. 충돌 해결 후 빌드 검증
pnpm -r typecheck && pnpm test:run && pnpm build
```

### 동기화 주기

- 최소 주 1회 upstream fetch + 변경사항 확인
- 주요 릴리스 태그(v0.x.x) 발견 시 즉시 머지 검토
- 머지 전 반드시 `UPSTREAM_SYNC.md`에 동기화 기록 남길 것

### 커스텀 변경 관리 원칙

- 우리 커스텀 코드는 별도 브랜치(`custom/*`)에서 작업 후 main에 머지
- upstream 파일 직접 수정 최소화 -- 가능하면 확장/오버라이드 방식 사용
- 커스텀 변경 파일은 커밋 메시지에 `[custom]` 접두사 사용
- CLAUDE.md, .env 등 로컬 전용 파일은 .gitignore에 추가하지 않되, upstream 머지 시 충돌 주의

## Tech Stack

- **Backend**: Node.js 20+ / Express 5 / TypeScript
- **Frontend**: React 19 / Vite / Tailwind v4 / shadcn/ui
- **Database**: PostgreSQL 17+ (dev: Embedded PGlite)
- **ORM**: Drizzle
- **Auth**: Better Auth
- **Package Manager**: pnpm 9.15+ (monorepo workspaces)
- **Testing**: Vitest / Playwright (E2E)

## Monorepo Structure

```
server/              # Express REST API + orchestration
ui/                  # React Vite frontend
cli/                 # CLI tool (paperclipai 명령)
packages/
  db/                # Drizzle schema + migrations (61 tables)
  shared/            # types, constants, Zod validators
  adapter-utils/     # adapter 공통 유틸
  adapters/          # 7개 agent adapter (claude, codex, cursor, gemini, openclaw, opencode, pi)
  plugins/           # plugin SDK + examples
doc/                 # 운영/제품 문서
scripts/             # 빌드/유틸 스크립트
```

## Dev Setup

```bash
pnpm install
pnpm dev          # API(3100) + UI + Embedded PG 자동 시작
```

- `DATABASE_URL` 미설정 시 Embedded PGlite 자동 사용
- Health check: `curl http://localhost:3100/api/health`
- DB 리셋: `rm -rf data/pglite && pnpm dev`

## Verification

모든 변경 후 반드시 실행:

```bash
pnpm -r typecheck
pnpm test:run
pnpm build
```

## Key Rules

1. **Company-scoped**: 모든 도메인 엔티티는 company 범위로 격리
2. **Contract sync**: schema 변경 시 db -> shared -> server -> ui 전체 동기화 필수
3. **Control-plane invariants**: single-assignee, atomic checkout, approval gates, budget hard-stop 유지
4. **Database changes**: schema 수정 -> `pnpm db:generate` -> typecheck
5. **Upstream docs**: `doc/SPEC.md`, `doc/SPEC-implementation.md` 함부로 덮어쓰지 말 것

## Commit Convention

`<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci)
- upstream 머지: `chore: sync upstream/master (YYYY-MM-DD)`
- 커스텀 변경: `[custom] <type>: <description>`

## Korean Localization (한글화)

전체 UI/CLI/서버의 사용자 대면 텍스트가 한국어로 번역됨 (2026-03-31).

### 번역 원칙

- 기술 용어 영어 유지: Agent, Issue, Project, Goal, Routine, Budget, Heartbeat, Dashboard, Inbox, Plugin, Workspace, Adapter, Skills, Board, CEO, CTO, Engineer
- 동사/설명/도움말/버튼/placeholder/빈 상태 메시지: 한국어 번역
- 상태 표시: 백로그, 할 일, 진행 중, 검토 중, 완료, 취소됨, 차단됨
- 우선순위 표시: 긴급, 높음, 보통, 낮음
- 날짜 포맷: ko-KR 로케일 사용
- 코드 식별자, 변수명, API 경로, enum 값: 변경 없음

### 번역 범위 (117개 파일)

- UI 네비게이션: Sidebar, BreadcrumbBar, MobileBottomNav, CommandPalette
- UI 페이지: Dashboard, Issues, Agents, Projects, Goals, Routines, Approvals, Inbox, Costs, Activity, Settings 등 전체
- UI 공통 컴포넌트: 다이얼로그, 폼, 속성 패널, 댓글, 상태 배지, 온보딩 위자드
- 실시간 알림: Toast 메시지, Activity 액션 라벨
- CLI: onboard, run, doctor, configure 커맨드 + 모든 프롬프트 + 헬스체크
- 서버: 모든 라우트의 사용자 대면 에러 메시지 + 시작 배너

### Upstream 머지 시 한글화 충돌 주의

upstream 동기화 시 번역된 파일에서 충돌이 발생할 수 있다.
충돌 해결 시 upstream의 새 텍스트를 한국어로 번역하여 반영할 것.

## Current State

- Upstream version: v0.3.1 (2026-03-31 기준 master)
- Fork 시작일: 2026-03-31
- 커스텀 변경: 전체 한글화 완료 (117개 파일, 2026-03-31)
