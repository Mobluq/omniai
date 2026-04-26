import type { ModelCapabilityId } from "@/modules/ai/providers/types";

export type DetectedIntent =
  | "image_generation"
  | "image_editing"
  | "coding"
  | "debugging"
  | "long_form_writing"
  | "business_strategy"
  | "research"
  | "summarization"
  | "data_analysis"
  | "document_analysis"
  | "creative_writing"
  | "business_writing"
  | "general_chat";

export type IntentClassification = {
  intent: DetectedIntent;
  confidence: number;
  requiredCapabilities: ModelCapabilityId[];
};

const intentRules: Array<{
  intent: DetectedIntent;
  patterns: RegExp[];
  requiredCapabilities: ModelCapabilityId[];
}> = [
  {
    intent: "image_generation",
    patterns: [/generate (an? )?image/i, /create (an? )?(illustration|poster|logo|image)/i, /render/i],
    requiredCapabilities: ["image_generation"],
  },
  {
    intent: "image_editing",
    patterns: [/edit (this|the) image/i, /remove background/i, /upscale/i, /inpaint/i],
    requiredCapabilities: ["image_editing"],
  },
  {
    intent: "debugging",
    patterns: [/debug/i, /fix (this|my)? ?(bug|error|component|code)/i, /stack trace/i],
    requiredCapabilities: ["code_generation", "reasoning"],
  },
  {
    intent: "coding",
    patterns: [/write (a|some)? ?(function|component|api|script|code)/i, /refactor/i, /typescript|react|sql|python/i],
    requiredCapabilities: ["code_generation"],
  },
  {
    intent: "document_analysis",
    patterns: [/board document/i, /contract/i, /policy/i, /pdf/i, /document/i],
    requiredCapabilities: ["document_analysis", "long_context"],
  },
  {
    intent: "research",
    patterns: [/research/i, /find sources/i, /compare vendors/i, /latest/i],
    requiredCapabilities: ["research", "long_context"],
  },
  {
    intent: "data_analysis",
    patterns: [/analy[sz]e (this )?(data|csv|spreadsheet)/i, /chart/i, /forecast/i],
    requiredCapabilities: ["data_analysis"],
  },
  {
    intent: "summarization",
    patterns: [/summari[sz]e/i, /tl;dr/i, /brief me/i],
    requiredCapabilities: ["summarization"],
  },
  {
    intent: "business_strategy",
    patterns: [/strategy/i, /go-to-market/i, /pricing/i, /positioning/i, /market/i],
    requiredCapabilities: ["business_writing", "reasoning"],
  },
  {
    intent: "business_writing",
    patterns: [/proposal/i, /corporate email/i, /sales email/i, /memo/i],
    requiredCapabilities: ["business_writing"],
  },
  {
    intent: "creative_writing",
    patterns: [/story/i, /script/i, /creative/i, /brand voice/i],
    requiredCapabilities: ["creative_writing"],
  },
  {
    intent: "long_form_writing",
    patterns: [/long-form/i, /essay/i, /whitepaper/i, /article/i],
    requiredCapabilities: ["business_writing", "long_context"],
  },
];

export class IntentClassifier {
  classify(prompt: string): IntentClassification {
    for (const rule of intentRules) {
      if (rule.patterns.some((pattern) => pattern.test(prompt))) {
        return {
          intent: rule.intent,
          confidence: 0.86,
          requiredCapabilities: rule.requiredCapabilities,
        };
      }
    }

    return {
      intent: "general_chat",
      confidence: 0.62,
      requiredCapabilities: ["text_generation"],
    };
  }
}
