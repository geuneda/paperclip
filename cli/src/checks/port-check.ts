import type { PaperclipConfig } from "../config/schema.js";
import { checkPort } from "../utils/net.js";
import type { CheckResult } from "./index.js";

export async function portCheck(config: PaperclipConfig): Promise<CheckResult> {
  const port = config.server.port;
  const result = await checkPort(port);

  if (result.available) {
    return {
      name: "서버 포트",
      status: "pass",
      message: `포트 ${port}을 사용할 수 있습니다`,
    };
  }

  return {
    name: "서버 포트",
    status: "warn",
    message: result.error ?? `포트 ${port}을 사용할 수 없습니다`,
    canRepair: false,
    repairHint: `포트 ${port}을 사용 중인 프로세스 확인: lsof -i :${port}`,
  };
}
