import type {
  AiClient,
  GeneratedReport,
  GeneratedReportResult,
  RankedEventInput,
  ReportEventInput
} from "@/server/ai/types";
import {
  estimateUsageFromText,
  stringifyReportForUsage
} from "@/server/ai/token-usage";

interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  keepAlive: string;
  maxReportEvents: number;
  maxSourcesPerEvent: number;
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripThinkingBlocks(value: string) {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJsonText(value: string) {
  const cleaned = stripThinkingBlocks(value);
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const startCandidates = [firstBrace, firstBracket].filter((index) => index >= 0);

  if (startCandidates.length === 0) {
    return cleaned;
  }

  const start = Math.min(...startCandidates);
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);

  if (end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned.slice(start);
}

function needsEditorialRewrite(content: string) {
  const trimmed = content.trim();

  if (trimmed.length < 900) {
    return true;
  }

  if (!trimmed.includes("ZH: 结论")) {
    return true;
  }

  return /(^|\n)\s*(#{1,6}\s|\d+\.\s)/.test(trimmed);
}

export class OllamaClient implements AiClient {
  constructor(private readonly config: OllamaConfig) {}

  private get generateUrl() {
    return `${this.config.baseUrl.replace(/\/+$/, "")}/api/generate`;
  }

  private async runPrompt(prompt: string, format: "json" | undefined) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;

    try {
      response = await fetch(this.generateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          format,
          keep_alive: this.config.keepAlive
        }),
        signal: controller.signal
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Ollama timed out after ${this.config.timeoutMs}ms for model ${this.config.model}.`
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Ollama request failed for model ${this.config.model}: ${response.status} ${body || response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      response?: string;
      error?: string;
    };

    if (payload.error) {
      throw new Error(`Ollama request failed for model ${this.config.model}: ${payload.error}`);
    }

    const content = payload.response?.trim();

    if (!content) {
      throw new Error("Ollama returned an empty response.");
    }

    return content;
  }

  private async chatJson<T>(system: string, user: string) {
    const raw = await this.runPrompt(
      [
        system,
        "",
        user
      ].join("\n"),
      "json"
    );

    return JSON.parse(extractJsonText(raw)) as T;
  }

  private async chatText(system: string, user: string) {
    const raw = await this.runPrompt(
      [
        system,
        "",
        user
      ].join("\n"),
      undefined
    );

    return stripThinkingBlocks(raw).trim();
  }

  private async rewriteLongFormContent(
    draftContent: string,
    eventBlock: string
  ): Promise<string> {
    const rewritten = await this.chatText(
      [
        "Rewrite the provided draft into a polished bilingual pre-market finance column.",
        "Return plain text only, not JSON.",
        "The output must include these exact section markers in this order:",
        "EN: Morning Note",
        "ZH: 盘前晨报",
        "ZH: 结论",
        "EN: Evidence trail used for this draft:",
        "Target roughly 900 to 1200 Chinese characters before the conclusions and evidence trail.",
        "Write the main article in full paragraphs, not markdown headings, not numbered lists, and no separators like '---'.",
        "Under 'ZH: 结论', provide 3 to 5 bullet lines starting with '- ' in a decisive conclusion-style tone.",
        "Use a calm editorial morning-note voice with natural transitions and fewer templates.",
        "Keep the English section concise and place most of the detail in the Chinese section.",
        "Preserve factual grounding in the provided event block and draft. Do not invent new facts."
      ].join(" "),
      [
        "Event block:",
        eventBlock,
        "",
        "Draft to rewrite:",
        draftContent
      ].join("\n")
    );

    return rewritten;
  }

  private buildEditorialLongForm(events: ReportEventInput[]) {
    const topEvents = events.slice(0, 6);
    const topTitles = topEvents.map((event) => event.title);
    const sectorLabels = Array.from(new Set(topEvents.flatMap((event) => event.sectors))).slice(0, 6);
    const tickerLabels = Array.from(new Set(topEvents.flatMap((event) => event.tickers))).slice(0, 6);

    const englishParagraphs = [
      `EN: Morning Note`,
      `Overnight trade left investors balancing three linked questions before the U.S. open: whether geopolitical stress can stay contained, whether the recent AI-led pullback is becoming a broader growth reset, and whether softer macro momentum will change the tone of rate expectations.`,
      `The current news stack is being led by ${topTitles.slice(0, 3).join(", ")}, with sector pressure most visible in ${sectorLabels.join(", ") || "macro-sensitive groups"}. Traders are also watching ${tickerLabels.join(", ") || "the highest-beta names in the tape"} for clues about leadership at the open.`
    ];

    const chineseParagraphs = [
      `ZH: 盘前晨报`,
      `从隔夜到盘前这一段时间，市场并没有形成单一主线，而是在几条风险线索之间来回拉扯。一方面，地缘政治相关的 headline 仍在影响能源、航运与大宗商品预期；另一方面，围绕人工智能产业链的估值回吐还在继续，成长板块的风险偏好因此受到压制。与此同时，宏观数据并没有提供足够明确的新方向，这让今天的开盘更像是一场围绕情绪、仓位和板块强弱重新定价的交易。`,
      `如果把今天的新闻流压缩成一句话，那就是资金正在从“想象力驱动的高弹性故事”回到“现金流、成本和现实约束”。这一点在 AI 相关个股和基础设施链条上体现得尤其明显。市场不再只讨论技术叙事本身，而开始更直接地追问需求兑现、资本开支强度、能源消耗以及盈利承压的问题。对于此前涨幅已经很大的成长资产来说，这种讨论方式的变化往往意味着波动率会先于基本面修复。`,
      `从板块角度看，${sectorLabels.slice(0, 4).join("、") || "几个核心主题板块"} 是今天最值得先看强弱排序的区域。它们之所以重要，不只是因为 headline 数量更多，而是因为这些板块恰好连接了宏观、政策、供需和风险偏好的几条主线。只要其中某一条线在盘前出现新的价格指引，就可能带动市场对其他板块的风险补偿要求一起变化，进而影响指数层面的节奏。`,
      topEvents[0]
        ? `最值得关注的第一条主线仍然是“${topEvents[0].title}”。从目前的信息组合看，这件事的意义并不局限于单一新闻本身，而在于它重新提醒市场：当情绪已经处于高位、估值也不便宜时，任何能够改变预期斜率的消息，都会迅速变成资金减仓或换仓的理由。尤其是当同类事件在多家媒体间反复出现时，交易层面会更倾向于先做风险收缩，而不是等待更完整的验证。`
        : "",
      topEvents[1]
        ? `第二条主线来自“${topEvents[1].title}”。这类事件更像是对市场风险偏好的补充解释，它未必会单独决定指数方向，但会决定资金愿不愿意在开盘后追高、是否愿意重新回到高弹性资产，以及是否会把仓位重新向更防御或更现金流导向的方向移动。对短线交易来说，这往往比单一数据点本身更重要。`
        : "",
      topEvents[2]
        ? `第三条主线是“${topEvents[2].title}”。这条线索把宏观、行业和个股连接在了一起，也让今天的盘前解读不能只停留在“消息利多还是利空”的层面。更关键的是，这类消息会不会改变市场对接下来几周盈利预期、行业景气度和资本流向的判断。如果答案是会，那么盘中资金通常会优先在龙头和高波动标的上给出反馈。`
        : "",
      tickerLabels.length > 0
        ? `落到个股观察层面，${tickerLabels.slice(0, 4).join("、")} 是今天最值得盯住的几个名字。它们之所以重要，不仅因为被新闻流反复点名，还因为这些个股往往代表了各自主线中最容易被资金当作表达观点的交易载体。若这些名字在开盘后的第一轮波动里持续走弱，通常意味着市场选择了更谨慎的解释框架；反过来，如果它们能够在利空或不确定性下快速企稳，也说明买盘并未完全退出。`
        : "",
      `从交易应对上看，今天更适合先看板块和龙头，再决定是否扩展到更分散的个股。原因很简单：当市场缺少单一确定性催化时，最可靠的信号往往来自资金是否愿意在核心资产上持续表态。对于盘前已经显著走弱的方向，不宜仅凭“跌多了”去做逆向判断；而对于具备基本面支撑、但受整体风险偏好拖累的板块，则更适合观察量价和开盘后承接是否改善。`,
      `整体而言，今天的晨报并不指向一个绝对单边的结论，而是提示我们开盘后的市场很可能围绕“风险是否继续外溢、成长是否继续被重估、能源与宏观线索是否进一步强化”这三件事展开。只要这三条线中有一条在盘中走出更清晰的价格信号，市场就会很快从犹豫转向选择。因此，比预测所有结果更重要的，是先识别哪一条主线正在真正获得资金确认。`
    ].filter(Boolean);

    const evidenceLines = [
      `ZH: 结论`,
      `- 市场当前仍以主线确认而非全面扩张为主，盘中应优先跟踪最强板块与龙头反馈。`,
      `- 成长、能源与宏观敏感资产之间的轮动决定今天的风险偏好方向。`,
      `- 若核心高弹性标的无法快速企稳，指数层面的反弹持续性也会受到质疑。`,
      `EN: Evidence trail used for this draft:`,
      ...topEvents.flatMap((event) =>
        event.sources.slice(0, 2).map((source) => `- ${source.sourceName}: ${source.title}`)
      )
    ];

    return [...englishParagraphs, "", ...chineseParagraphs, "", ...evidenceLines].join("\n\n");
  }

  async scoreEvents(events: RankedEventInput[]) {
    return [...events].sort((left, right) => right.importanceScore - left.importanceScore);
  }

  async generateReport(events: ReportEventInput[]): Promise<GeneratedReportResult> {
    if (events.length === 0) {
      throw new Error("Cannot generate a report without ranked events.");
    }

    const topEvents = events.slice(0, this.config.maxReportEvents).map((event) => ({
      ...event,
      summary: event.summary.slice(0, 320),
      sources: event.sources.slice(0, this.config.maxSourcesPerEvent).map((source) => ({
        ...source,
        title: source.title.slice(0, 180),
        summary: source.summary.slice(0, 220)
      }))
    }));

    const compactEventBlock = topEvents
      .map((event, index) => {
        const firstSource = event.sources[0];

        return [
          `Event ${index + 1}`,
          `Title: ${event.title}`,
          `Summary: ${event.summary}`,
          `Sentiment: ${event.sentiment}`,
          `Sectors: ${event.sectors.join(", ")}`,
          `Tickers: ${event.tickers.join(", ") || "None"}`,
          `Source: ${firstSource ? `${firstSource.sourceName} | ${firstSource.title} | ${firstSource.summary}` : "No source snippet"}`
        ].join("\n");
      })
      .join("\n\n");

    const generated = await this.chatJson<GeneratedReport>(
      [
        "Return strict JSON only.",
        "Write a polished bilingual pre-market finance column from the provided events.",
        "Required JSON keys: title, summary, contentZhEn, sentimentSummary, sectorView, tradingView, stockFocuses, riskWarning, disclaimer.",
        "contentZhEn must be plain text, not markdown headings, and must include these exact section markers in order:",
        "EN: Morning Note",
        "ZH: 盘前晨报",
        "ZH: 结论",
        "EN: Evidence trail used for this draft:",
        "The Chinese section should read like a professional market morning note written by an editor, not a template or outline.",
        "Target roughly 900 to 1200 Chinese characters before the conclusions and evidence trail.",
        "Use 5 to 7 connected paragraphs overall, with smoother transitions and less repetitive sentence structure.",
        "Cover these ideas naturally in prose: overnight market setup, the dominant macro theme, sector rotation, key tickers to watch, and what traders should monitor into the open.",
        "Keep the English section concise, with 2 to 3 short orienting paragraphs. Put the detail and depth mainly in the Chinese section.",
        "Do not use markdown headings, numbered lists, separators like '---', or label-value formatting anywhere before the evidence trail.",
        "Write full paragraphs only before the conclusions, with natural editorial transitions between paragraphs.",
        "Do not sound robotic, do not repeat the same clause pattern, and avoid generic filler like 'investors should pay attention' unless it adds specific context.",
        "Every point must remain grounded in the provided events and source snippets.",
        "Under 'ZH: 结论', provide 3 to 5 short bullet lines starting with '- ' and use a decisive, conclusion-oriented tone.",
        "After the Chinese section, add the evidence trail section with lines starting '- ' and include the source name plus source title on each line.",
        "stockFocuses must be an array of at most 3 objects with keys symbol, company, thesis.",
        "Use only the provided events and source snippets."
      ].join(" "),
      [
        "Generate the daily pre-market column from these top ranked events.",
        "Favor a newsroom voice: analytical, calm, and specific.",
        "Good style reference: a polished morning market column that flows like one article, not like notes pasted from a dashboard.",
        "Bad style to avoid: bullets, repeated mini-headings, templated list language, or rigid section-by-section outlines.",
        compactEventBlock
      ].join("\n\n")
    );

    if (typeof generated.contentZhEn === "string" && needsEditorialRewrite(generated.contentZhEn)) {
      const rewritten = await this.rewriteLongFormContent(
        generated.contentZhEn,
        compactEventBlock
      );

      generated.contentZhEn = needsEditorialRewrite(rewritten)
        ? this.buildEditorialLongForm(topEvents)
        : rewritten;
    }

    const report = {
      ...generated,
      stockFocuses: (generated.stockFocuses ?? []).slice(0, 3)
    };

    return {
      report,
      usage: estimateUsageFromText(compactEventBlock, stringifyReportForUsage(report))
    };
  }
}
