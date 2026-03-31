import * as p from "@clack/prompts";
import type { SecretProvider } from "@paperclipai/shared";
import type { SecretsConfig } from "../config/schema.js";
import { resolveDefaultSecretsKeyFilePath, resolvePaperclipInstanceId } from "../config/home.js";

function defaultKeyFilePath(): string {
  return resolveDefaultSecretsKeyFilePath(resolvePaperclipInstanceId());
}

export function defaultSecretsConfig(): SecretsConfig {
  const keyFilePath = defaultKeyFilePath();
  return {
    provider: "local_encrypted",
    strictMode: false,
    localEncrypted: {
      keyFilePath,
    },
  };
}

export async function promptSecrets(current?: SecretsConfig): Promise<SecretsConfig> {
  const base = current ?? defaultSecretsConfig();

  const provider = await p.select({
    message: "Secrets 제공자",
    options: [
      {
        value: "local_encrypted" as const,
        label: "로컬 암호화 (권장)",
        hint: "단일 개발자 설치에 최적",
      },
      {
        value: "aws_secrets_manager" as const,
        label: "AWS Secrets Manager",
        hint: "외부 Adapter 통합 필요",
      },
      {
        value: "gcp_secret_manager" as const,
        label: "GCP Secret Manager",
        hint: "외부 Adapter 통합 필요",
      },
      {
        value: "vault" as const,
        label: "HashiCorp Vault",
        hint: "외부 Adapter 통합 필요",
      },
    ],
    initialValue: base.provider,
  });

  if (p.isCancel(provider)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const strictMode = await p.confirm({
    message: "민감한 환경 변수에 시크릿 참조를 필수로 하시겠습니까?",
    initialValue: base.strictMode,
  });

  if (p.isCancel(strictMode)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const fallbackDefault = defaultKeyFilePath();
  let keyFilePath = base.localEncrypted.keyFilePath || fallbackDefault;
  if (provider === "local_encrypted") {
    const keyPath = await p.text({
      message: "로컬 암호화 키 파일 경로",
      defaultValue: keyFilePath,
      placeholder: fallbackDefault,
      validate: (value) => {
        if (!value || value.trim().length === 0) return "키 파일 경로는 필수입니다";
      },
    });

    if (p.isCancel(keyPath)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }
    keyFilePath = keyPath.trim();
  }

  if (provider !== "local_encrypted") {
    p.note(
      `${provider}는 이 빌드에서 아직 완전히 연결되지 않았습니다. 해당 Adapter를 직접 구현하는 경우가 아니라면 local_encrypted를 유지하세요.`,
      "참고",
    );
  }

  return {
    provider: provider as SecretProvider,
    strictMode,
    localEncrypted: {
      keyFilePath,
    },
  };
}
