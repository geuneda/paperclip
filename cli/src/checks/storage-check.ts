import fs from "node:fs";
import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";
import { resolveRuntimeLikePath } from "./path-resolver.js";

export function storageCheck(config: PaperclipConfig, configPath?: string): CheckResult {
  if (config.storage.provider === "local_disk") {
    const baseDir = resolveRuntimeLikePath(config.storage.localDisk.baseDir, configPath);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    try {
      fs.accessSync(baseDir, fs.constants.W_OK);
      return {
        name: "스토리지",
        status: "pass",
        message: `로컬 디스크 스토리지에 쓰기 가능: ${baseDir}`,
      };
    } catch {
      return {
        name: "스토리지",
        status: "fail",
        message: `로컬 스토리지 디렉토리에 쓸 수 없습니다: ${baseDir}`,
        canRepair: false,
        repairHint: "storage.localDisk.baseDir의 파일 권한을 확인하세요",
      };
    }
  }

  const bucket = config.storage.s3.bucket.trim();
  const region = config.storage.s3.region.trim();
  if (!bucket || !region) {
    return {
      name: "스토리지",
      status: "fail",
      message: "S3 스토리지에는 비어있지 않은 버킷과 리전이 필요합니다",
      canRepair: false,
      repairHint: "`paperclipai configure --section storage`를 실행하세요",
    };
  }

  return {
    name: "스토리지",
    status: "warn",
    message: `S3 스토리지 설정됨 (bucket=${bucket}, region=${region}). doctor에서 연결 가능성 검사는 생략됩니다.`,
    canRepair: false,
    repairHint: "배포 환경에서 자격 증명과 엔드포인트를 확인하세요",
  };
}

