import { cn } from "../lib/utils";
import { statusBadge, statusBadgeDefault } from "../lib/status-colors";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        statusBadge[status] ?? statusBadgeDefault
      )}
    >
      {({
      backlog: "백로그",
      todo: "할 일",
      in_progress: "진행 중",
      in_review: "검토 중",
      done: "완료",
      cancelled: "취소됨",
      blocked: "차단됨",
      planned: "계획됨",
      completed: "완료",
      active: "활성",
      paused: "일시정지",
      terminated: "종료됨",
      idle: "대기",
      running: "실행 중",
      archived: "보관됨",
      cleanup_failed: "정리 실패",
    } as Record<string, string>)[status] ?? status.replace("_", " ")}
    </span>
  );
}
