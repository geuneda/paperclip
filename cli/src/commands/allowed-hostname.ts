import * as p from "@clack/prompts";
import pc from "picocolors";
import { normalizeHostnameInput } from "../config/hostnames.js";
import { readConfig, resolveConfigPath, writeConfig } from "../config/store.js";

export async function addAllowedHostname(host: string, opts: { config?: string }): Promise<void> {
  const configPath = resolveConfigPath(opts.config);
  const config = readConfig(opts.config);

  if (!config) {
    p.log.error(`${configPath}에서 설정을 찾을 수 없습니다. 먼저 ${pc.cyan("paperclip onboard")}를 실행하세요.`);
    return;
  }

  const normalized = normalizeHostnameInput(host);
  const current = new Set((config.server.allowedHostnames ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
  const existed = current.has(normalized);
  current.add(normalized);

  config.server.allowedHostnames = Array.from(current).sort();
  config.$meta.updatedAt = new Date().toISOString();
  config.$meta.source = "configure";
  writeConfig(config, opts.config);

  if (existed) {
    p.log.info(`호스트명 ${pc.cyan(normalized)}은(는) 이미 허용되어 있습니다.`);
  } else {
    p.log.success(`허용된 호스트명 추가됨: ${pc.cyan(normalized)}`);
    p.log.message(
      pc.dim("이 변경 사항을 적용하려면 Paperclip 서버를 재시작하세요."),
    );
  }

  if (!(config.server.deploymentMode === "authenticated" && config.server.exposure === "private")) {
    p.log.message(
      pc.dim("참고: 허용된 호스트명은 authenticated/private 모드에서만 적용됩니다."),
    );
  }
}

