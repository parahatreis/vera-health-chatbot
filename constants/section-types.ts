import { SectionType } from '@/types';

export const SECTION_TAGS = {
  GUIDELINE: 'guideline',
  DRUG: 'drug',
  THINK: 'think',
} as const;

interface SectionConfig {
  type: SectionType;
  title: string;
  defaultCollapsed: boolean;
}

export const SECTION_CONFIG: Record<string, SectionConfig> = {
  [SECTION_TAGS.GUIDELINE]: {
    type: 'guideline',
    title: 'Guidelines',
    defaultCollapsed: false,
  },
  [SECTION_TAGS.DRUG]: {
    type: 'drug',
    title: 'Drug Information',
    defaultCollapsed: false,
  },
  [SECTION_TAGS.THINK]: {
    type: 'think',
    title: 'Reasoning',
    defaultCollapsed: false,
  },
};

export const DEFAULT_COLLAPSE_STATE: Record<SectionType, boolean> = {
  answer: false,
  guideline: false,
  drug: false,
  think: false,
  unknown: true,
};

export const STREAM_TAGS = [
  SECTION_TAGS.GUIDELINE,
  SECTION_TAGS.DRUG,
  SECTION_TAGS.THINK,
] as const;

