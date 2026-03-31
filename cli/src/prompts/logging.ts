import * as p from "@clack/prompts";
import type { LoggingConfig } from "../config/schema.js";
import { resolveDefaultLogsDir, resolvePaperclipInstanceId } from "../config/home.js";

export async function promptLogging(): Promise<LoggingConfig> {
  const defaultLogDir = resolveDefaultLogsDir(resolvePaperclipInstanceId());
  const mode = await p.select({
    message: "로깅 모드",
    options: [
      { value: "file" as const, label: "파일 기반 로깅", hint: "권장" },
      { value: "cloud" as const, label: "클라우드 로깅", hint: "출시 예정" },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  if (mode === "file") {
    const logDir = await p.text({
      message: "로그 디렉토리",
      defaultValue: defaultLogDir,
      placeholder: defaultLogDir,
    });

    if (p.isCancel(logDir)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }

    return { mode: "file", logDir: logDir || defaultLogDir };
  }

  p.note("클라우드 로깅은 곧 출시됩니다. 현재는 파일 기반 로깅을 사용합니다.");
  return { mode: "file", logDir: defaultLogDir };
}
