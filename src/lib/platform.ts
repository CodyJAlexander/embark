/**
 * Platform detection for Tauri vs browser environments.
 *
 * Usage:
 *   import { isTauri } from '../lib/platform'
 *   if (isTauri) { /* native-only behavior *\/ }
 */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
