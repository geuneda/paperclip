import { useState } from "react";
import { Apple, Monitor, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Platform = "mac" | "windows" | "linux";

const platforms: { id: Platform; label: string; icon: typeof Apple }[] = [
  { id: "mac", label: "macOS", icon: Apple },
  { id: "windows", label: "Windows", icon: Monitor },
  { id: "linux", label: "Linux", icon: Terminal },
];

const instructions: Record<Platform, { steps: string[]; tip?: string }> = {
  mac: {
    steps: [
      "Finder를 열고 폴더로 이동합니다.",
      "폴더를 우클릭(또는 Control-클릭)합니다.",
      "Option(⌥) 키를 누르면 \"복사\"가 \"경로명 복사\"로 변경됩니다.",
      "\"경로명 복사\"를 클릭한 후 여기에 붙여넣으세요.",
    ],
    tip: "터미널을 열고 cd를 입력한 후 폴더를 터미널 창으로 드래그하고 Enter를 누를 수도 있습니다. 그런 다음 pwd를 입력하여 전체 경로를 확인하세요.",
  },
  windows: {
    steps: [
      "파일 탐색기를 열고 폴더로 이동합니다.",
      "상단 주소 표시줄을 클릭하면 전체 경로가 나타납니다.",
      "경로를 복사한 후 여기에 붙여넣으세요.",
    ],
    tip: "또는 Shift를 누른 채 폴더를 우클릭한 후 \"경로로 복사\"를 선택하세요.",
  },
  linux: {
    steps: [
      "터미널을 열고 cd로 디렉터리로 이동합니다.",
      "pwd를 실행하여 전체 경로를 출력합니다.",
      "출력을 복사한 후 여기에 붙여넣으세요.",
    ],
    tip: "대부분의 파일 관리자에서 Ctrl+L을 누르면 주소 표시줄에 전체 경로가 표시됩니다.",
  },
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

interface PathInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PathInstructionsModal({
  open,
  onOpenChange,
}: PathInstructionsModalProps) {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);

  const current = instructions[platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">전체 경로를 얻는 방법</DialogTitle>
          <DialogDescription>
            절대 경로(예:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/Users/you/project</code>
            )를 입력란에 붙여넣으세요.
          </DialogDescription>
        </DialogHeader>

        {/* Platform tabs */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                platform === p.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
              onClick={() => setPlatform(p.id)}
            >
              <p.icon className="h-3.5 w-3.5" />
              {p.label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <ol className="space-y-2 text-sm">
          {current.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0">
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {current.tip && (
          <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
            {current.tip}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Small "Choose" button that opens the PathInstructionsModal.
 * Drop-in replacement for the old showDirectoryPicker buttons.
 */
export function ChoosePathButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        선택
      </button>
      <PathInstructionsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
