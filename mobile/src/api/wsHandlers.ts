import type { ClientPushFrame } from '../../../shared/contracts/types';

/**
 * Shared mutable array of in-app WebSocket frame handlers.
 * Kept in a standalone module to avoid circular imports between main.tsx and Layout.tsx.
 */
export const wsHandlers: Array<(frame: ClientPushFrame) => void> = [];
