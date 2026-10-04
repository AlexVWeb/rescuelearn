export { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./gemini/client";
export { buildPrompt, generateQuizFromPdf } from "./gemini/quiz";
export {
  buildLearningCardPrompt,
  generateLearningCardsFromPdf,
} from "./gemini/learning-card";
export {
  buildSNVScenarioPrompt,
  generateSNVScenarioFromPdf,
} from "./gemini/snv";
export {
  buildProgressionPrompt,
  generateProgressionNodeFromPdf,
  generateEntireTreeFromPdf,
} from "./gemini/progression";
export {
  SUGGESTED_FORMATS,
  buildChapterPlanPrompt,
  buildTopicsPrompt,
  analyzeChapterPlan,
  analyzeChapterTopics,
} from "./gemini/analysis";
export type { AnalyzedTopic } from "./gemini/analysis";
