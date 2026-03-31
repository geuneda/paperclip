import fs from "node:fs";
import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";
import { resolveRuntimeLikePath } from "./path-resolver.js";

export function logCheck(config: PaperclipConfig, configPath?: string): CheckResult {
  const logDir = resolveRuntimeLikePath(config.logging.logDir, configPath);
  const reportedDir = logDir;

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(reportedDir, { recursive: true });
  }

  try {
    fs.accessSync(reportedDir, fs.constants.W_OK);
    return {
      name: "로그 디렉토리",
      status: "pass",
      message: `로그 디렉토리에 쓰기 가능: ${reportedDir}`,
    };
  } catch {
    return {
      name: "로그 디렉토리",
      status: "fail",
      message: `로그 디렉토리에 쓸 수 없습니다: ${logDir}`,
      canRepair: false,
      repairHint: "로그 디렉토리의 파일 권한을 확인하세요",
    };
  }
}
