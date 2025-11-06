import { DEFAULT_COLLAPSE_STATE, SECTION_CONFIG, STREAM_TAGS } from '@/constants/section-types';
import { NodeType, ProgressStep, Section } from '@/types';

const SECTION_TITLE_MAP = SECTION_CONFIG;

function getSectionTitle(type: Section['type'], rawTag: string): string {
  if (type === 'unknown') {
    return rawTag.charAt(0).toUpperCase() + rawTag.slice(1);
  }

  return SECTION_TITLE_MAP[type]?.title ?? rawTag;
}

// Convert DOI references to clickable markdown links
function convertDOIsToLinks(text: string): string {
  const doiRegex = /\[doi:\s*([^\]]+)\]/gi;
  
  return text.replace(doiRegex, (match, doiIdentifier) => {
    const trimmedDoi = doiIdentifier.trim();
    return `[doi: ${trimmedDoi}](https://doi.org/${trimmedDoi})`;
  });
}

// Ensures all opening tags have corresponding closing tags
function ensureBalancedStreamingTags(text: string): string {
  let balanced = text;

  STREAM_TAGS.forEach((tag) => {
    const openRegex = new RegExp(`<${tag}>`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');
    const openCount = (balanced.match(openRegex) || []).length;
    const closeCount = (balanced.match(closeRegex) || []).length;
    const diff = openCount - closeCount;

    if (diff > 0) {
      balanced += `</${tag}>`.repeat(diff);
    }
  });

  return balanced;
}

// Removes incomplete tags from the end of streaming text
function sanitizeStreamingText(text: string): string {
  if (!text) {
    return text;
  }

  const partialTagMatch = text.match(/<\/?([a-zA-Z]+)?$/);

  if (partialTagMatch) {
    const partialName = (partialTagMatch[1] || '').toLowerCase();
    const matchesKnown = STREAM_TAGS.some((tag) => tag.startsWith(partialName));

    if (matchesKnown && typeof partialTagMatch.index === 'number') {
      return text.slice(0, partialTagMatch.index);
    }
  }

  return text;
}

/**
 * Parse tagged content into sections.
 * Extracts <guideline>, <drug>, and unknown tags, plus untagged "Answer" section.
 * Preserves order of appearance.
 */
export function parseTaggedContent(text: string): Section[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sections: Section[] = [];
  let lastIndex = 0;
  const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  
  interface TagMatch {
    tagName: string;
    content: string;
    startIndex: number;
    endIndex: number;
  }
  
  const tagMatches: TagMatch[] = [];
  let match: RegExpExecArray | null;
  
  // Find all tag matches
  while ((match = tagRegex.exec(text)) !== null) {
    tagMatches.push({
      tagName: match[1],
      content: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  // Process text in order: untagged content followed by tagged sections
  tagMatches.forEach((tagMatch, index) => {
    // Add any untagged content before this tag
    if (tagMatch.startIndex > lastIndex) {
      const untrackedContent = text.substring(lastIndex, tagMatch.startIndex).trim();
      if (untrackedContent) {
        sections.push({
          id: `answer-${sections.length}`,
          type: 'answer',
          title: 'Answer',
          content: convertDOIsToLinks(untrackedContent),
          isCollapsed: false, // Answer sections start open
        });
      }
    }
    
    // Add the tagged section
    const tagLower = tagMatch.tagName.toLowerCase();
    const mapping = SECTION_TITLE_MAP[tagLower];
    const sectionType = mapping?.type ?? 'unknown';
    const title = mapping?.title ?? getSectionTitle(sectionType, tagMatch.tagName);
    
    sections.push({
      id: `${sectionType}-${sections.length}`,
      type: sectionType,
      title,
      content: convertDOIsToLinks(tagMatch.content),
      isCollapsed: DEFAULT_COLLAPSE_STATE[sectionType],
    });
    
    lastIndex = tagMatch.endIndex;
  });
  
  // Add any remaining untagged content after the last tag
  if (lastIndex < text.length) {
    const remainingContent = text.substring(lastIndex).trim();
    if (remainingContent) {
      sections.push({
        id: `answer-${sections.length}`,
        type: 'answer',
        title: 'Answer',
        content: convertDOIsToLinks(remainingContent),
        isCollapsed: false,
      });
    }
  }
  
  // If no tags were found, treat entire text as Answer
  if (sections.length === 0 && text.trim()) {
    sections.push({
      id: 'answer-0',
      type: 'answer',
      title: 'Answer',
      content: convertDOIsToLinks(text.trim()),
      isCollapsed: false,
    });
  }
  
  return sections;
}

// Parses streaming text, handling partial/unbalanced tags
export function parseStreamingSections(text: string): Section[] {
  const sanitized = sanitizeStreamingText(text);

  if (!sanitized || sanitized.trim().length === 0) {
    return [];
  }

  const balanced = ensureBalancedStreamingTags(sanitized);

  return parseTaggedContent(balanced);
}

/**
 * Parse SSE node data into structured format.
 * Handles STREAM, SEARCH_STEPS, SEARCH_REASONING, and SUGGEST nodes.
 */
export function parseSSENode(data: any): { type: NodeType; content: any } | null {
  try {
    // Handle different SSE response formats
    if (!data) return null;
    
    // Check if it's a NodeChunk format
    if (data.type === 'NodeChunk' && data.content?.nodeName) {
      const nodeName = data.content.nodeName as NodeType;
      
      switch (nodeName) {
        case 'STREAM':
          // STREAM content is plain text to append
          return {
            type: 'STREAM',
            content: data.content.content || '',
          };
          
        case 'SEARCH_STEPS':
          // Progress steps format: array of {text, isActive, isCompleted, extraInfo?}
          const steps = data.content.content || [];
          const progressSteps: ProgressStep[] = Array.isArray(steps)
            ? steps.map((step: any) => ({
                text: step.text || '',
                isActive: step.isActive || false,
                isCompleted: step.isCompleted || false,
                extraInfo: step.info || step.extraInfo,
              }))
            : [];
          return {
            type: 'SEARCH_STEPS',
            content: progressSteps,
          };
        
        case 'SEARCH_REASONING':
          // SEARCH_REASONING is streamed content, not progress steps
          return {
            type: 'STREAM',
            content: data.content.content || '',
          };
          
        case 'SUGGEST':
          // Suggestions for future use
          return {
            type: 'SUGGEST',
            content: data.content.content || [],
          };
          
        default:
          return null;
      }
    }
    
    // Fallback: treat as plain text stream content
    if (data.content || data.text || data.chunk) {
      return {
        type: 'STREAM',
        content: data.content || data.text || data.chunk || '',
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing SSE node:', error);
    return null;
  }
}

/**
 * Merge new sections with existing ones during streaming.
 * Preserves collapse state and updates content.
 */
export function mergeSections(
  existingSections: Section[],
  newSections: Section[]
): Section[] {
  if (existingSections.length === 0) {
    return newSections;
  }
  
  // Create a map of existing sections by type for O(1) lookup
  const existingMap = new Map<string, Section>();
  existingSections.forEach(section => {
    const key = `${section.type}-${section.title}`;
    existingMap.set(key, section);
  });
  
  // Merge new sections, preserving collapse state
  return newSections.map(newSection => {
    const key = `${newSection.type}-${newSection.title}`;
    const existing = existingMap.get(key);
    
    if (existing) {
      // Preserve collapse state from existing section
      return {
        ...newSection,
        isCollapsed: existing.isCollapsed,
      };
    }
    
    return newSection;
  });
}

