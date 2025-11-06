import { NodeType, ProgressStep, Section } from '@/types';

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
          content: untrackedContent,
          isCollapsed: false, // Answer sections start open
        });
      }
    }
    
    // Add the tagged section
    const tagLower = tagMatch.tagName.toLowerCase();
    const sectionType = ['guideline', 'drug', 'think'].includes(tagLower)
      ? (tagLower as 'guideline' | 'drug' | 'think')
      : 'unknown';
    
    const title = 
      sectionType === 'guideline' ? 'Guidelines' :
      sectionType === 'drug' ? 'Drug Information' :
      sectionType === 'think' ? 'Reasoning' :
      tagMatch.tagName.charAt(0).toUpperCase() + tagMatch.tagName.slice(1);
    
    sections.push({
      id: `${sectionType}-${sections.length}`,
      type: sectionType,
      title,
      content: tagMatch.content,
      isCollapsed: true, // Tagged sections start collapsed
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
        content: remainingContent,
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
      content: text.trim(),
      isCollapsed: false,
    });
  }
  
  return sections;
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

