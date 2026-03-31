import {
  ensureAgentJwtSecret,
  readAgentJwtSecretFromEnv,
  readAgentJwtSecretFromEnvFile,
  resolveAgentJwtEnvFile,
} from "../config/env.js";
import type { CheckResult } from "./index.js";

export function agentJwtSecretCheck(configPath?: string): CheckResult {
  if (readAgentJwtSecretFromEnv(configPath)) {
    return {
      name: "Agent JWT secret",
      status: "pass",
      message: "PAPERCLIP_AGENT_JWT_SECRET이 환경 변수에 설정되어 있습니다",
    };
  }

  const envPath = resolveAgentJwtEnvFile(configPath);
  const fileSecret = readAgentJwtSecretFromEnvFile(envPath);

  if (fileSecret) {
    return {
      name: "Agent JWT secret",
      status: "warn",
      message: `PAPERCLIP_AGENT_JWT_SECRET이 ${envPath}에 있지만 환경에 로드되지 않았습니다`,
      repairHint: `Paperclip 서버를 시작하기 전에 셸에서 ${envPath}의 값을 설정하세요`,
    };
  }

  return {
    name: "Agent JWT secret",
    status: "fail",
    message: `PAPERCLIP_AGENT_JWT_SECRET이 환경 변수와 ${envPath}에 없습니다`,
    canRepair: true,
    repair: () => {
      ensureAgentJwtSecret(configPath);
    },
    repairHint: `--repair로 실행하여 PAPERCLIP_AGENT_JWT_SECRET이 포함된 ${envPath}를 생성하세요`,
  };
}
