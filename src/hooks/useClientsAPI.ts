/**
 * API-backed client hook (Phase 2 migration).
 *
 * Currently delegates to the localStorage-based useClients hook.
 * Future: replace with direct API calls once the backend is stable.
 */
export { useClients as useClientsAPI } from './useClients';
