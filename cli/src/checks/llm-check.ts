import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";

export async function llmCheck(config: PaperclipConfig): Promise<CheckResult> {
  if (!config.llm) {
    return {
      name: "LLM 제공자",
      status: "pass",
      message: "LLM 제공자가 설정되지 않았습니다 (선택 사항)",
    };
  }

  if (!config.llm.apiKey) {
    return {
      name: "LLM 제공자",
      status: "pass",
      message: `${config.llm.provider}가 설정되었지만 API 키가 없습니다 (선택 사항)`,
    };
  }

  try {
    if (config.llm.provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.llm.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok || res.status === 400) {
        return { name: "LLM 제공자", status: "pass", message: "Claude API 키가 유효합니다" };
      }
      if (res.status === 401) {
        return {
          name: "LLM 제공자",
          status: "fail",
          message: "Claude API 키가 유효하지 않습니다 (401)",
          canRepair: false,
          repairHint: "`paperclipai configure --section llm`을 실행하세요",
        };
      }
      return {
        name: "LLM 제공자",
        status: "warn",
        message: `Claude API가 상태 ${res.status}을 반환했습니다`,
      };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${config.llm.apiKey}` },
      });
      if (res.ok) {
        return { name: "LLM 제공자", status: "pass", message: "OpenAI API 키가 유효합니다" };
      }
      if (res.status === 401) {
        return {
          name: "LLM 제공자",
          status: "fail",
          message: "OpenAI API 키가 유효하지 않습니다 (401)",
          canRepair: false,
          repairHint: "`paperclipai configure --section llm`을 실행하세요",
        };
      }
      return {
        name: "LLM 제공자",
        status: "warn",
        message: `OpenAI API가 상태 ${res.status}을 반환했습니다`,
      };
    }
  } catch {
    return {
      name: "LLM 제공자",
      status: "warn",
      message: "API에 연결하여 키를 검증할 수 없습니다",
    };
  }
}
