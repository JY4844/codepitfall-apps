import { TaskPriority } from "@/types/task";

export interface PrerequisiteGap {
  concept: string;
  why_needed: string;
  quick_refresher: string;
}

export interface StudyStep {
  step_title: string;
  explanation: string;
  common_pitfall: string;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  related_prerequisite_index?: number;
}

export interface SuggestedTask {
  title: string;
  priority: TaskPriority;
  memo: string;
}

export interface StudyAnalysis {
  topic_title: string;
  summary: string;
  prerequisites: PrerequisiteGap[];
  steps: StudyStep[];
  quiz: QuizQuestion[];
  suggested_tasks: SuggestedTask[];
  next_topics?: string[];
}

export interface StudySession extends StudyAnalysis {
  id: number;
  source_text: string;
  created_at: string;
}
