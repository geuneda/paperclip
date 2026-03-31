import * as p from "@clack/prompts";
import pc from "picocolors";
import { readConfig, writeConfig, configExists, resolveConfigPath } from "../config/store.js";
import type { PaperclipConfig } from "../config/schema.js";
import { ensureLocalSecretsKeyFile } from "../config/secrets-key.js";
import { promptDatabase } from "../prompts/database.js";
import { promptLlm } from "../prompts/llm.js";
import { promptLogging } from "../prompts/logging.js";
import { defaultSecretsConfig, promptSecrets } from "../prompts/secrets.js";
import { defaultStorageConfig, promptStorage } from "../prompts/storage.js";
import { promptServer } from "../prompts/server.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { printPaperclipCliBanner } from "../utils/banner.js";

type Section = "llm" | "database" | "logging" | "server" | "storage" | "secrets";

const SECTION_LABELS: Record<Section, string> = {
  llm: "LLM 제공자",
  database: "데이터베이스",
  logging: "로깅",
  server: "서버",
  storage: "스토리지",
  secrets: "Secrets",
};

function defaultConfig(): PaperclipConfig {
  const instanceId = resolvePaperclipInstanceId();
  return {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: resolveDefaultBackupDir(instanceId),
      },
    },
    logging: {
      mode: "file",
      logDir: resolveDefaultLogsDir(instanceId),
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      host: "127.0.0.1",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    storage: defaultStorageConfig(),
    secrets: defaultSecretsConfig(),
  };
}

export async function configure(opts: {
  config?: string;
  section?: string;
}): Promise<void> {
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip configure ")));
  const configPath = resolveConfigPath(opts.config);

  if (!configExists(opts.config)) {
    p.log.error("설정 파일을 찾을 수 없습니다. 먼저 `paperclipai onboard`를 실행하세요.");
    p.outro("");
    return;
  }

  let config: PaperclipConfig;
  try {
    config = readConfig(opts.config) ?? defaultConfig();
  } catch (err) {
    p.log.message(
      pc.yellow(
        `기존 설정이 유효하지 않습니다. 지금 수정할 수 있도록 기본값을 로드합니다.\n${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    config = defaultConfig();
  }

  let section: Section | undefined = opts.section as Section | undefined;

  if (section && !SECTION_LABELS[section]) {
    p.log.error(`알 수 없는 섹션: ${section}. 다음 중에서 선택하세요: ${Object.keys(SECTION_LABELS).join(", ")}`);
    p.outro("");
    return;
  }

  // Section selection loop
  let continueLoop = true;
  while (continueLoop) {
    if (!section) {
      const choice = await p.select({
        message: "어떤 섹션을 설정하시겠습니까?",
        options: Object.entries(SECTION_LABELS).map(([value, label]) => ({
          value: value as Section,
          label,
        })),
      });

      if (p.isCancel(choice)) {
        p.cancel("설정이 취소되었습니다.");
        return;
      }

      section = choice;
    }

    p.log.step(pc.bold(SECTION_LABELS[section]));

    switch (section) {
      case "database":
        config.database = await promptDatabase(config.database);
        break;
      case "llm": {
        const llm = await promptLlm();
        if (llm) {
          config.llm = llm;
        } else {
          delete config.llm;
        }
        break;
      }
      case "logging":
        config.logging = await promptLogging();
        break;
      case "server":
        {
          const { server, auth } = await promptServer({
            currentServer: config.server,
            currentAuth: config.auth,
          });
          config.server = server;
          config.auth = auth;
        }
        break;
      case "storage":
        config.storage = await promptStorage(config.storage);
        break;
      case "secrets":
        config.secrets = await promptSecrets(config.secrets);
        {
          const keyResult = ensureLocalSecretsKeyFile(config, configPath);
          if (keyResult.status === "created") {
            p.log.success(`${pc.dim(keyResult.path)}에 로컬 시크릿 키 파일을 생성했습니다`);
          } else if (keyResult.status === "existing") {
            p.log.message(pc.dim(`${keyResult.path}의 기존 로컬 시크릿 키 파일을 사용합니다`));
          } else if (keyResult.status === "skipped_provider") {
            p.log.message(pc.dim("로컬이 아닌 제공자를 사용하므로 로컬 키 파일 관리를 건너뜁니다"));
          } else {
            p.log.message(pc.dim("PAPERCLIP_SECRETS_MASTER_KEY가 설정되어 있으므로 로컬 키 파일 관리를 건너뜁니다"));
          }
        }
        break;
    }

    config.$meta.updatedAt = new Date().toISOString();
    config.$meta.source = "configure";

    writeConfig(config, opts.config);
    p.log.success(`${SECTION_LABELS[section]} 설정이 업데이트되었습니다.`);

    // If section was provided via CLI flag, don't loop
    if (opts.section) {
      continueLoop = false;
    } else {
      const another = await p.confirm({
        message: "다른 섹션도 설정하시겠습니까?",
        initialValue: false,
      });

      if (p.isCancel(another) || !another) {
        continueLoop = false;
      } else {
        section = undefined; // Reset to show picker again
      }
    }
  }

  p.outro("설정이 저장되었습니다.");
}
