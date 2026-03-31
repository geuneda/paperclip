import * as p from "@clack/prompts";
import type { AuthConfig, ServerConfig } from "../config/schema.js";
import { parseHostnameCsv } from "../config/hostnames.js";

export async function promptServer(opts?: {
  currentServer?: Partial<ServerConfig>;
  currentAuth?: Partial<AuthConfig>;
}): Promise<{ server: ServerConfig; auth: AuthConfig }> {
  const currentServer = opts?.currentServer;
  const currentAuth = opts?.currentAuth;

  const deploymentModeSelection = await p.select({
    message: "배포 모드",
    options: [
      {
        value: "local_trusted",
        label: "로컬 신뢰 모드",
        hint: "로컬 설정에 가장 쉬움 (로그인 불필요, localhost만)",
      },
      {
        value: "authenticated",
        label: "인증 모드",
        hint: "로그인 필수; 사설 네트워크 또는 공개 호스팅용",
      },
    ],
    initialValue: currentServer?.deploymentMode ?? "local_trusted",
  });

  if (p.isCancel(deploymentModeSelection)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }
  const deploymentMode = deploymentModeSelection as ServerConfig["deploymentMode"];

  let exposure: ServerConfig["exposure"] = "private";
  if (deploymentMode === "authenticated") {
    const exposureSelection = await p.select({
      message: "노출 프로필",
      options: [
        {
          value: "private",
          label: "사설 네트워크",
          hint: "사설 접근 (예: Tailscale), 설정이 간편함",
        },
        {
          value: "public",
          label: "공개 인터넷",
          hint: "인터넷 대면 배포, 더 엄격한 요구 사항",
        },
      ],
      initialValue: currentServer?.exposure ?? "private",
    });
    if (p.isCancel(exposureSelection)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }
    exposure = exposureSelection as ServerConfig["exposure"];
  }

  const hostDefault = deploymentMode === "local_trusted" ? "127.0.0.1" : "0.0.0.0";
  const hostStr = await p.text({
    message: "바인드 호스트",
    defaultValue: currentServer?.host ?? hostDefault,
    placeholder: hostDefault,
    validate: (val) => {
      if (!val.trim()) return "호스트는 필수입니다";
    },
  });

  if (p.isCancel(hostStr)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const portStr = await p.text({
    message: "서버 포트",
    defaultValue: String(currentServer?.port ?? 3100),
    placeholder: "3100",
    validate: (val) => {
      const n = Number(val);
      if (isNaN(n) || n < 1 || n > 65535 || !Number.isInteger(n)) {
        return "1에서 65535 사이의 정수여야 합니다";
      }
    },
  });

  if (p.isCancel(portStr)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  let allowedHostnames: string[] = [];
  if (deploymentMode === "authenticated" && exposure === "private") {
    const allowedHostnamesInput = await p.text({
      message: "허용된 호스트명 (쉼표로 구분, 선택 사항)",
      defaultValue: (currentServer?.allowedHostnames ?? []).join(", "),
      placeholder: "dotta-macbook-pro, your-host.tailnet.ts.net",
      validate: (val) => {
        try {
          parseHostnameCsv(val);
          return;
        } catch (err) {
          return err instanceof Error ? err.message : "유효하지 않은 호스트명 목록";
        }
      },
    });

    if (p.isCancel(allowedHostnamesInput)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }
    allowedHostnames = parseHostnameCsv(allowedHostnamesInput);
  }

  const port = Number(portStr) || 3100;
  let auth: AuthConfig = { baseUrlMode: "auto", disableSignUp: false };
  if (deploymentMode === "authenticated" && exposure === "public") {
    const urlInput = await p.text({
      message: "공개 기본 URL",
      defaultValue: currentAuth?.publicBaseUrl ?? "",
      placeholder: "https://paperclip.example.com",
      validate: (val) => {
        const candidate = val.trim();
        if (!candidate) return "공개 노출에는 공개 기본 URL이 필수입니다";
        try {
          const url = new URL(candidate);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "URL은 http:// 또는 https://로 시작해야 합니다";
          }
          return;
        } catch {
          return "유효한 URL을 입력하세요";
        }
      },
    });
    if (p.isCancel(urlInput)) {
      p.cancel("설정이 취소되었습니다.");
      process.exit(0);
    }
    auth = {
      baseUrlMode: "explicit",
      disableSignUp: false,
      publicBaseUrl: urlInput.trim().replace(/\/+$/, ""),
    };
  } else if (currentAuth?.baseUrlMode === "explicit" && currentAuth.publicBaseUrl) {
    auth = {
      baseUrlMode: "explicit",
      disableSignUp: false,
      publicBaseUrl: currentAuth.publicBaseUrl,
    };
  }

  return {
    server: {
      deploymentMode,
      exposure,
      host: hostStr.trim(),
      port,
      allowedHostnames,
      serveUi: currentServer?.serveUi ?? true,
    },
    auth,
  };
}
