export interface LearnResult {
  title: string;
  repo_summary: string;
  reading_order: { file_path: string; role: string; beginner_tip: string }[];
  key_concepts: { term: string; plain_explanation: string }[];
  quiz: {
    question: string;
    choices: string[];
    correct_index: number;
    explanation: string;
  }[];
  suggested_tasks: { title: string; priority: "high" | "medium" | "low"; memo: string }[];
}

export interface PublishResult {
  title: string;
  summary: string;
  safety_checks: { item: string; why_important: string; how_to_fix: string }[];
  publish_steps: { step_title: string; command: string; meaning: string }[];
  common_errors: { error_pattern: string; recovery: string }[];
  suggested_tasks: { title: string; priority: "high" | "medium" | "low"; memo: string }[];
}
