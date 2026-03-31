import * as p from "@clack/prompts";
import type { StorageConfig } from "../config/schema.js";
import { resolveDefaultStorageDir, resolvePaperclipInstanceId } from "../config/home.js";

function defaultStorageBaseDir(): string {
  return resolveDefaultStorageDir(resolvePaperclipInstanceId());
}

export function defaultStorageConfig(): StorageConfig {
  return {
    provider: "local_disk",
    localDisk: {
      baseDir: defaultStorageBaseDir(),
    },
    s3: {
      bucket: "paperclip",
      region: "us-east-1",
      endpoint: undefined,
      prefix: "",
      forcePathStyle: false,
    },
  };
}

export async function promptStorage(current?: StorageConfig): Promise<StorageConfig> {
  const base = current ?? defaultStorageConfig();

  const provider = await p.select({
    message: "스토리지 제공자",
    options: [
      {
        value: "local_disk" as const,
        label: "로컬 디스크 (권장)",
        hint: "단일 사용자 로컬 배포에 최적",
      },
      {
        value: "s3" as const,
        label: "S3 호환",
        hint: "클라우드/오브젝트 스토리지 백엔드용",
      },
    ],
    initialValue: base.provider,
  });

  if (p.isCancel(provider)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  if (provider === "local_disk") {
    const baseDir = await p.text({
      message: "로컬 스토리지 기본 디렉토리",
      defaultValue: base.localDisk.baseDir || defaultStorageBaseDir(),
      placeholder: defaultStorageBaseDir(),
      validate: (value) => {
        if (!value || value.trim().length === 0) return "스토리지 기본 디렉토리는 필수입니다";
      },
    });

    if (p.isCancel(baseDir)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }

    return {
      provider: "local_disk",
      localDisk: {
        baseDir: baseDir.trim(),
      },
      s3: base.s3,
    };
  }

  const bucket = await p.text({
    message: "S3 버킷",
    defaultValue: base.s3.bucket || "paperclip",
    placeholder: "paperclip",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "버킷은 필수입니다";
    },
  });

  if (p.isCancel(bucket)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const region = await p.text({
    message: "S3 리전",
    defaultValue: base.s3.region || "us-east-1",
    placeholder: "us-east-1",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "리전은 필수입니다";
    },
  });

  if (p.isCancel(region)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const endpoint = await p.text({
    message: "S3 엔드포인트 (호환 백엔드용, 선택 사항)",
    defaultValue: base.s3.endpoint ?? "",
    placeholder: "https://s3.amazonaws.com",
  });

  if (p.isCancel(endpoint)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const prefix = await p.text({
    message: "오브젝트 키 접두사 (선택 사항)",
    defaultValue: base.s3.prefix ?? "",
    placeholder: "paperclip/",
  });

  if (p.isCancel(prefix)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const forcePathStyle = await p.confirm({
    message: "S3 경로 스타일 URL을 사용하시겠습니까?",
    initialValue: base.s3.forcePathStyle ?? false,
  });

  if (p.isCancel(forcePathStyle)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  return {
    provider: "s3",
    localDisk: base.localDisk,
    s3: {
      bucket: bucket.trim(),
      region: region.trim(),
      endpoint: endpoint.trim() || undefined,
      prefix: prefix.trim(),
      forcePathStyle,
    },
  };
}

