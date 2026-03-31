import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";
import { resolveRuntimeLikePath } from "./path-resolver.js";

function decodeMasterKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // ignored
  }

  if (Buffer.byteLength(trimmed, "utf8") === 32) {
    return Buffer.from(trimmed, "utf8");
  }
  return null;
}

function withStrictModeNote(
  base: Pick<CheckResult, "name" | "status" | "message" | "canRepair" | "repair" | "repairHint">,
  config: PaperclipConfig,
): CheckResult {
  const strictModeDisabledInDeployedSetup =
    config.database.mode === "postgres" && config.secrets.strictMode === false;
  if (!strictModeDisabledInDeployedSetup) return base;

  if (base.status === "fail") return base;
  return {
    ...base,
    status: "warn",
    message: `${base.message}; PostgreSQL 배포에서 엄격 시크릿 모드가 비활성화되어 있습니다`,
    repairHint: base.repairHint
      ? `${base.repairHint}. secrets.strictMode 활성화를 고려하세요`
      : "secrets.strictMode 활성화를 고려하세요",
  };
}

export function secretsCheck(config: PaperclipConfig, configPath?: string): CheckResult {
  const provider = config.secrets.provider;
  if (provider !== "local_encrypted") {
    return {
      name: "Secrets Adapter",
      status: "fail",
      message: `${provider}가 설정되었지만 이 빌드는 local_encrypted만 지원합니다`,
      canRepair: false,
      repairHint: "`paperclipai configure --section secrets`를 실행하고 제공자를 local_encrypted로 설정하세요",
    };
  }

  const envMasterKey = process.env.PAPERCLIP_SECRETS_MASTER_KEY;
  if (envMasterKey && envMasterKey.trim().length > 0) {
    if (!decodeMasterKey(envMasterKey)) {
      return {
        name: "Secrets Adapter",
        status: "fail",
        message:
          "PAPERCLIP_SECRETS_MASTER_KEY가 유효하지 않습니다 (32바이트 base64, 64자 hex, 또는 32자 원시 문자열 필요)",
        canRepair: false,
        repairHint: "PAPERCLIP_SECRETS_MASTER_KEY를 유효한 키로 설정하거나 키 파일을 사용하려면 해제하세요",
      };
    }

    return withStrictModeNote(
      {
        name: "Secrets Adapter",
        status: "pass",
        message: "PAPERCLIP_SECRETS_MASTER_KEY를 통해 로컬 암호화 제공자가 설정되었습니다",
      },
      config,
    );
  }

  const keyFileOverride = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
  const configuredPath =
    keyFileOverride && keyFileOverride.trim().length > 0
      ? keyFileOverride.trim()
      : config.secrets.localEncrypted.keyFilePath;
  const keyFilePath = resolveRuntimeLikePath(configuredPath, configPath);

  if (!fs.existsSync(keyFilePath)) {
    return withStrictModeNote(
      {
        name: "Secrets Adapter",
        status: "warn",
        message: `시크릿 키 파일이 아직 존재하지 않습니다: ${keyFilePath}`,
        canRepair: true,
        repair: () => {
          fs.mkdirSync(path.dirname(keyFilePath), { recursive: true });
          fs.writeFileSync(keyFilePath, randomBytes(32).toString("base64"), {
            encoding: "utf8",
            mode: 0o600,
          });
          try {
            fs.chmodSync(keyFilePath, 0o600);
          } catch {
            // best effort
          }
        },
        repairHint: "--repair로 실행하여 로컬 암호화 시크릿 키 파일을 생성하세요",
      },
      config,
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(keyFilePath, "utf8");
  } catch (err) {
    return {
      name: "Secrets Adapter",
      status: "fail",
      message: `시크릿 키 파일을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`,
      canRepair: false,
      repairHint: "파일 권한을 확인하거나 PAPERCLIP_SECRETS_MASTER_KEY를 설정하세요",
    };
  }

  if (!decodeMasterKey(raw)) {
    return {
      name: "Secrets Adapter",
      status: "fail",
      message: `${keyFilePath}에 유효하지 않은 키 자료가 있습니다`,
      canRepair: false,
      repairHint: "유효한 키 자료로 교체하거나 삭제 후 doctor --repair를 실행하세요",
    };
  }

  return withStrictModeNote(
    {
      name: "Secrets Adapter",
      status: "pass",
      message: `키 파일 ${keyFilePath}로 로컬 암호화 제공자가 설정되었습니다`,
    },
    config,
  );
}
