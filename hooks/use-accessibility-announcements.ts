import { APP_CONFIG } from '@/constants/app-config';
import { useCallback, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

// Rate-limited accessibility announcements (max 1 per throttle period)
export function useAccessibilityAnnouncements() {
  const lastAnnouncementRef = useRef<number>(0);

  const announce = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastAnnouncementRef.current >= APP_CONFIG.ACCESSIBILITY_ANNOUNCEMENT_THROTTLE_MS) {
      AccessibilityInfo.announceForAccessibility(message);
      lastAnnouncementRef.current = now;
    }
  }, []);

  return announce;
}

