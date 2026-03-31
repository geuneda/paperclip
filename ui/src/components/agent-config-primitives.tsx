import { useState, useRef, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";

/* ---- Help text for (?) tooltips ---- */
export const help: Record<string, string> = {
  name: "이 Agent의 표시 이름입니다.",
  title: "조직도에 표시되는 직함입니다.",
  role: "조직 내 역할입니다. 위치와 권한을 결정합니다.",
  reportsTo: "조직 계층에서 이 Agent가 보고하는 상위 Agent입니다.",
  capabilities: "이 Agent가 할 수 있는 작업을 설명합니다. 조직도에 표시되며 작업 라우팅에 사용됩니다.",
  adapterType: "이 Agent의 실행 방식: 로컬 CLI (Claude/Codex/OpenCode), OpenClaw Gateway, 생성된 프로세스, 또는 일반 HTTP 웹훅.",
  cwd: "로컬 Adapter용 사용 중단된 레거시 작업 디렉터리 대체값입니다. 기존 Agent는 이 값을 가질 수 있지만, 새 구성은 Project Workspace를 사용해야 합니다.",
  promptTemplate: "매 Heartbeat마다 전송됩니다. 작고 동적으로 유지하세요. 대규모 정적 지시가 아닌 현재 작업 프레이밍에 사용합니다. {{ agent.id }}, {{ agent.name }}, {{ agent.role }} 등의 템플릿 변수를 지원합니다.",
  model: "Adapter가 사용하는 기본 모델을 재정의합니다.",
  thinkingEffort: "모델의 추론 깊이를 제어합니다. 지원되는 값은 Adapter/모델에 따라 다릅니다.",
  chrome: "--chrome 플래그를 전달하여 Claude의 Chrome 통합을 활성화합니다.",
  dangerouslySkipPermissions: "지원되는 경우 Adapter 권한 프롬프트를 자동 승인하여 무인 실행합니다.",
  dangerouslyBypassSandbox: "샌드박스 제한 없이 Codex를 실행합니다. 파일시스템/네트워크 접근에 필요합니다.",
  search: "실행 중 Codex 웹 검색 기능을 활성화합니다.",
  workspaceStrategy: "이 Agent의 실행 Workspace를 Paperclip이 구현하는 방식입니다. 일반 cwd 실행에는 project_primary를, Issue 범위 격리 체크아웃에는 git_worktree를 사용합니다.",
  workspaceBaseRef: "Worktree 브랜치 생성 시 사용하는 기본 Git ref입니다. 비워두면 해석된 Workspace ref 또는 HEAD를 사용합니다.",
  workspaceBranchTemplate: "파생 브랜치 이름 지정 템플릿입니다. {{issue.identifier}}, {{issue.title}}, {{agent.name}}, {{project.id}}, {{workspace.repoRef}}, {{slug}}를 지원합니다.",
  worktreeParentDir: "파생 Worktree가 생성될 디렉터리입니다. 절대 경로, ~접두사 경로, 저장소 상대 경로를 지원합니다.",
  runtimeServicesJson: "선택적 Workspace 런타임 서비스 정의입니다. 공유 앱 서버, 워커 또는 Workspace에 연결된 장기 실행 컴패니언 프로세스에 사용합니다.",
  maxTurnsPerRun: "Heartbeat 실행당 최대 에이전트 턴(도구 호출) 수입니다.",
  command: "실행할 명령어입니다 (예: node, python).",
  localCommand: "Adapter가 호출할 CLI 명령어의 경로를 재정의합니다 (예: /usr/local/bin/claude, codex, opencode).",
  args: "명령줄 인수이며, 쉼표로 구분합니다.",
  extraArgs: "로컬 Adapter용 추가 CLI 인수이며, 쉼표로 구분합니다.",
  envVars: "Adapter 프로세스에 주입되는 환경 변수입니다. 일반 값 또는 시크릿 참조를 사용합니다.",
  bootstrapPrompt: "Paperclip이 새 세션을 시작할 때만 전송됩니다. 매 Heartbeat마다 반복되지 않아야 하는 안정적인 설정 지침에 사용합니다.",
  payloadTemplateJson: "Paperclip이 표준 wake 및 Workspace 필드를 추가하기 전에 원격 Adapter 요청 페이로드에 병합되는 선택적 JSON입니다.",
  webhookUrl: "Agent가 호출될 때 POST 요청을 수신하는 URL입니다.",
  heartbeatInterval: "타이머로 이 Agent를 자동 실행합니다. 새 작업 확인과 같은 주기적 작업에 유용합니다.",
  intervalSec: "자동 Heartbeat 호출 간 초 단위 간격입니다.",
  timeoutSec: "실행이 종료되기 전 최대 초 수입니다. 0은 타임아웃 없음을 의미합니다.",
  graceSec: "인터럽트 전송 후 프로세스를 강제 종료하기 전 대기하는 초 수입니다.",
  wakeOnDemand: "배정, API 호출, UI 작업 또는 자동화 시스템에 의해 이 Agent를 깨울 수 있도록 합니다.",
  cooldownSec: "연속 Heartbeat 실행 간 최소 초 수입니다.",
  maxConcurrentRuns: "이 Agent에 대해 동시에 실행할 수 있는 최대 Heartbeat 실행 수입니다.",
  budgetMonthlyCents: "월별 지출 한도(센트 단위)입니다. 0은 제한 없음을 의미합니다.",
};

export const adapterLabels: Record<string, string> = {
  claude_local: "Claude (local)",
  codex_local: "Codex (local)",
  gemini_local: "Gemini CLI (local)",
  opencode_local: "OpenCode (local)",
  openclaw_gateway: "OpenClaw Gateway",
  cursor: "Cursor (local)",
  hermes_local: "Hermes Agent",
  process: "Process",
  http: "HTTP",
};

export const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

/* ---- Primitive components ---- */

export function HintIcon({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      {children}
    </div>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
  toggleTestId,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  toggleTestId?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hint && <HintIcon text={hint} />}
      </div>
      <button
        data-slot="toggle"
        data-testid={toggleTestId}
        type="button"
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-green-600" : "bg-muted"
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function ToggleWithNumber({
  label,
  hint,
  checked,
  onCheckedChange,
  number,
  onNumberChange,
  numberLabel,
  numberHint,
  numberPrefix,
  showNumber,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  number: number;
  onNumberChange: (v: number) => void;
  numberLabel: string;
  numberHint?: string;
  numberPrefix?: string;
  showNumber: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {hint && <HintIcon text={hint} />}
        </div>
        <button
          data-slot="toggle"
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
            checked ? "bg-green-600" : "bg-muted"
          )}
          onClick={() => onCheckedChange(!checked)}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
              checked ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
      {showNumber && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {numberPrefix && <span>{numberPrefix}</span>}
          <input
            type="number"
            className="w-16 rounded-md border border-border px-2 py-0.5 bg-transparent outline-none text-xs font-mono text-center"
            value={number}
            onChange={(e) => onNumberChange(Number(e.target.value))}
          />
          <span>{numberLabel}</span>
          {numberHint && <HintIcon text={numberHint} />}
        </div>
      )}
    </div>
  );
}

export function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  bordered,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(bordered && "border-t border-border")}>
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function AutoExpandTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{ minHeight }}
    />
  );
}

/**
 * Text input that manages internal draft state.
 * Calls `onCommit` on blur (and optionally on every change if `immediate` is set).
 */
export function DraftInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className">) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      {...props}
    />
  );
}

/**
 * Auto-expanding textarea with draft state and blur-commit.
 */
export function DraftTextarea({
  value,
  onCommit,
  immediate,
  placeholder,
  minRows,
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  placeholder?: string;
  minRows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [draft, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      style={{ minHeight }}
    />
  );
}

/**
 * Number input with draft state and blur-commit.
 */
export function DraftNumberInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: number;
  onCommit: (v: number) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className" | "type">) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(Number(e.target.value) || 0);
      }}
      onBlur={() => {
        const num = Number(draft) || 0;
        if (num !== value) onCommit(num);
      }}
      {...props}
    />
  );
}

/**
 * "Choose" button that opens a dialog explaining the user must manually
 * type the path due to browser security limitations.
 */
export function ChoosePathButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
        onClick={() => setOpen(true)}
      >
        선택
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>경로를 수동으로 지정</DialogTitle>
            <DialogDescription>
              브라우저 보안으로 인해 파일 선택기를 통한 전체 로컬 경로 읽기가 차단됩니다.
              절대 경로를 복사하여 입력란에 붙여넣으세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section className="space-y-1.5">
              <p className="font-medium">macOS (Finder)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Finder에서 폴더를 찾습니다.</li>
                <li><kbd>Option</kbd>을 누른 채 폴더를 우클릭합니다.</li>
                <li>"&lt;폴더 이름&gt;의 경로명 복사"를 클릭합니다.</li>
                <li>결과를 경로 입력란에 붙여넣습니다.</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                /Users/yourname/Documents/project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">Windows (파일 탐색기)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>파일 탐색기에서 폴더를 찾습니다.</li>
                <li><kbd>Shift</kbd>를 누른 채 폴더를 우클릭합니다.</li>
                <li>"경로로 복사"를 클릭합니다.</li>
                <li>결과를 경로 입력란에 붙여넣습니다.</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                C:\Users\yourname\Documents\project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">터미널 대안 (macOS/Linux)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li><code>cd /path/to/folder</code>를 실행합니다.</li>
                <li><code>pwd</code>를 실행합니다.</li>
                <li>출력을 복사하여 경로 입력란에 붙여넣습니다.</li>
              </ol>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Label + input rendered on the same line (inline layout for compact fields).
 */
export function InlineField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      <div className="w-24 ml-auto">{children}</div>
    </div>
  );
}
