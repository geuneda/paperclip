import * as p from "@clack/prompts";
import type { DatabaseConfig } from "../config/schema.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";

export async function promptDatabase(current?: DatabaseConfig): Promise<DatabaseConfig> {
  const instanceId = resolvePaperclipInstanceId();
  const defaultEmbeddedDir = resolveDefaultEmbeddedPostgresDir(instanceId);
  const defaultBackupDir = resolveDefaultBackupDir(instanceId);
  const base: DatabaseConfig = current ?? {
    mode: "embedded-postgres",
    embeddedPostgresDataDir: defaultEmbeddedDir,
    embeddedPostgresPort: 54329,
    backup: {
      enabled: true,
      intervalMinutes: 60,
      retentionDays: 30,
      dir: defaultBackupDir,
    },
  };

  const mode = await p.select({
    message: "데이터베이스 모드",
    options: [
      { value: "embedded-postgres" as const, label: "내장 PostgreSQL (로컬 관리)", hint: "권장" },
      { value: "postgres" as const, label: "PostgreSQL (외부 서버)" },
    ],
    initialValue: base.mode,
  });

  if (p.isCancel(mode)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  let connectionString: string | undefined = base.connectionString;
  let embeddedPostgresDataDir = base.embeddedPostgresDataDir || defaultEmbeddedDir;
  let embeddedPostgresPort = base.embeddedPostgresPort || 54329;

  if (mode === "postgres") {
    const value = await p.text({
      message: "PostgreSQL 연결 문자열",
      defaultValue: base.connectionString ?? "",
      placeholder: "postgres://user:pass@localhost:5432/paperclip",
      validate: (val) => {
        if (!val) return "PostgreSQL 모드에는 연결 문자열이 필수입니다";
        if (!val.startsWith("postgres")) return "postgres:// 또는 postgresql:// URL이어야 합니다";
      },
    });

    if (p.isCancel(value)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }

    connectionString = value;
  } else {
    const dataDir = await p.text({
      message: "내장 PostgreSQL 데이터 디렉토리",
      defaultValue: base.embeddedPostgresDataDir || defaultEmbeddedDir,
      placeholder: defaultEmbeddedDir,
    });

    if (p.isCancel(dataDir)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }

    embeddedPostgresDataDir = dataDir || defaultEmbeddedDir;

    const portValue = await p.text({
      message: "내장 PostgreSQL 포트",
      defaultValue: String(base.embeddedPostgresPort || 54329),
      placeholder: "54329",
      validate: (val) => {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 1 || n > 65535) return "포트는 1에서 65535 사이의 정수여야 합니다";
      },
    });

    if (p.isCancel(portValue)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }

    embeddedPostgresPort = Number(portValue || "54329");
    connectionString = undefined;
  }

  const backupEnabled = await p.confirm({
    message: "자동 데이터베이스 백업을 활성화하시겠습니까?",
    initialValue: base.backup.enabled,
  });
  if (p.isCancel(backupEnabled)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const backupDirInput = await p.text({
    message: "백업 디렉토리",
    defaultValue: base.backup.dir || defaultBackupDir,
    placeholder: defaultBackupDir,
    validate: (val) => (!val || val.trim().length === 0 ? "백업 디렉토리는 필수입니다" : undefined),
  });
  if (p.isCancel(backupDirInput)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const backupIntervalInput = await p.text({
    message: "백업 간격 (분)",
    defaultValue: String(base.backup.intervalMinutes || 60),
    placeholder: "60",
    validate: (val) => {
      const n = Number(val);
      if (!Number.isInteger(n) || n < 1) return "간격은 양의 정수여야 합니다";
      if (n > 10080) return "간격은 10080분 (7일) 이하여야 합니다";
      return undefined;
    },
  });
  if (p.isCancel(backupIntervalInput)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const backupRetentionInput = await p.text({
    message: "백업 보관 기간 (일)",
    defaultValue: String(base.backup.retentionDays || 30),
    placeholder: "30",
    validate: (val) => {
      const n = Number(val);
      if (!Number.isInteger(n) || n < 1) return "보관 기간은 양의 정수여야 합니다";
      if (n > 3650) return "보관 기간은 3650일 이하여야 합니다";
      return undefined;
    },
  });
  if (p.isCancel(backupRetentionInput)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  return {
    mode,
    connectionString,
    embeddedPostgresDataDir,
    embeddedPostgresPort,
    backup: {
      enabled: backupEnabled,
      intervalMinutes: Number(backupIntervalInput || "60"),
      retentionDays: Number(backupRetentionInput || "30"),
      dir: backupDirInput || defaultBackupDir,
    },
  };
}
