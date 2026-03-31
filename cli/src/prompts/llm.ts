import * as p from "@clack/prompts";
import type { LlmConfig } from "../config/schema.js";

export async function promptLlm(): Promise<LlmConfig | undefined> {
  const configureLlm = await p.confirm({
    message: "지금 LLM 제공자를 설정하시겠습니까?",
    initialValue: false,
  });

  if (p.isCancel(configureLlm)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  if (!configureLlm) return undefined;

  const provider = await p.select({
    message: "LLM 제공자",
    options: [
      { value: "claude" as const, label: "Claude (Anthropic)" },
      { value: "openai" as const, label: "OpenAI" },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  const apiKey = await p.password({
    message: `${provider === "claude" ? "Anthropic" : "OpenAI"} API 키`,
    validate: (val) => {
      if (!val) return "API 키는 필수입니다";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("설정이 취소되었습니다.");
    process.exit(0);
  }

  return { provider, apiKey };
}
