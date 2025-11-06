export const SSE_CONFIG = {
  API_ENDPOINT: 'https://vera-assignment-api.vercel.app/api/stream',
  BATCH_UPDATE_MS: 25, // Micro-debounce for batched UI updates
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [1000, 2000, 4000] as const, // Exponential backoff: 1s, 2s, 4s
  MAX_QA_HISTORY: 100, // Prevent memory issues on older devices
  COMPLETION_TIMEOUT_MS: 500,
} as const;

