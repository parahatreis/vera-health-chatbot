/// <reference types="expo/types" />

// Allow importing image files
declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}

declare module '*.webp' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}

// Phase 2 Types
export type SectionType = 'answer' | 'guideline' | 'drug' | 'think' | 'unknown';

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  isCollapsed: boolean;
}

export interface ProgressStep {
  text: string;
  isActive?: boolean;
  isCompleted?: boolean;
  extraInfo?: string;
}

export type NodeType = 'STREAM' | 'SEARCH_STEPS' | 'SEARCH_REASONING' | 'SUGGEST';

export interface QAPair {
  id: string;
  question: string;
  sections: Section[];
  progressSteps: ProgressStep[];
}

