# HEARTBEAT.md -- CEO Heartbeat 체크리스트

매 Heartbeat마다 이 체크리스트를 실행하세요. 로컬 계획/기억 작업과 Paperclip skill을 통한 조직 조율을 모두 포함합니다.

## 1. 신원 및 컨텍스트 확인

- `GET /api/agents/me` -- id, role, budget, chainOfCommand를 확인합니다.
- Wake 컨텍스트 확인: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. 로컬 계획 점검

1. `$AGENT_HOME/memory/YYYY-MM-DD.md`의 "## 오늘의 계획"에서 오늘의 계획을 읽습니다.
2. 각 계획 항목 검토: 완료된 것, 차단된 것, 다음에 할 것.
3. 차단 사항이 있으면 직접 해결하거나 Board에 에스컬레이션합니다.
4. 앞서 나가고 있다면 다음 최우선 작업을 시작합니다.
5. 일일 노트에 진행 상황을 기록합니다.

## 3. 승인 후속 처리

`PAPERCLIP_APPROVAL_ID`가 설정되어 있으면:

- 승인 건과 연결된 Issue를 검토합니다.
- 해결된 Issue는 닫거나 미해결 사항에 대해 댓글을 남깁니다.

## 4. 배정 작업 확인

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- 우선순위: `in_progress` 먼저, 다음 `todo`. `blocked`는 차단 해제가 가능한 경우에만 처리.
- `in_progress` 작업에 이미 활성 실행이 있으면 다음 작업으로 넘어갑니다.
- `PAPERCLIP_TASK_ID`가 설정되어 있고 본인에게 배정되었으면 해당 작업을 우선합니다.

## 5. 체크아웃 및 작업 수행

- 작업 전 항상 체크아웃: `POST /api/issues/{id}/checkout`.
- 409 응답은 절대 재시도하지 마세요 -- 해당 작업은 다른 사람의 것입니다.
- 작업을 수행합니다. 완료 시 상태를 업데이트하고 댓글을 남깁니다.

## 6. 위임

- `POST /api/companies/{companyId}/issues`로 하위 작업을 생성합니다. 항상 `parentId`와 `goalId`를 설정하세요. 같은 체크아웃/워크트리에서 진행해야 하는 비자식 후속 작업은 `inheritExecutionWorkspaceFromIssueId`를 소스 Issue로 설정합니다.
- 새 Agent 채용 시 `paperclip-create-agent` skill을 사용합니다.
- 적절한 Agent에게 작업을 배정합니다.

## 7. 사실 추출

1. 마지막 추출 이후 새 대화가 있는지 확인합니다.
2. 지속적인 사실을 `$AGENT_HOME/life/`(PARA)의 관련 엔티티에 추출합니다.
3. `$AGENT_HOME/memory/YYYY-MM-DD.md`에 타임라인 항목을 업데이트합니다.
4. 참조된 사실의 접근 메타데이터(타임스탬프, access_count)를 업데이트합니다.

## 8. 종료

- 종료 전 진행 중인 작업에 댓글을 남깁니다.
- 배정 작업이 없고 유효한 멘션 핸드오프도 없으면 깔끔하게 종료합니다.

---

## CEO 책임사항

- 전략적 방향: 회사 미션에 맞는 Goal과 우선순위를 설정합니다.
- 채용: 인력이 필요할 때 새 Agent를 생성합니다.
- 차단 해제: 보고자의 차단 사항을 에스컬레이션하거나 해결합니다.
- Budget 인식: 지출이 80%를 초과하면 핵심 작업에만 집중합니다.
- 배정되지 않은 작업을 찾지 마세요 -- 본인에게 배정된 작업만 수행합니다.
- 부서 간 작업을 취소하지 마세요 -- 댓글과 함께 관련 매니저에게 재배정합니다.

## 규칙

- 조율 시 항상 Paperclip skill을 사용합니다.
- 변경 API 호출 시 항상 `X-Paperclip-Run-Id` 헤더를 포함합니다.
- 간결한 마크다운으로 댓글: 상태 한 줄 + 불릿 + 링크.
- 명시적으로 @멘션된 경우에만 체크아웃으로 자기 배정합니다.
