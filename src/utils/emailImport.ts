import type { Client } from '../types';

// Common TLD suffixes to strip when deriving a display name
const STRIP_SUFFIXES = [
  '.co.uk', '.co.nz', '.co.za', '.co.jp', '.co.in',
  '.com', '.org', '.net', '.io', '.co', '.gov', '.edu',
  '.biz', '.info', '.app', '.dev', '.ai',
];

/**
 * Given an email address, returns the base domain and a human-readable client name.
 * e.g. calexander@interworks.com → { domain: 'interworks.com', clientName: 'InterWorks' }
 *      user@mail.acme.co.uk     → { domain: 'acme.co.uk',    clientName: 'Acme' }
 */
export function parseDomain(email: string): { domain: string; clientName: string } {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) throw new Error(`Invalid email: ${email}`);

  const fullDomain = email.slice(atIndex + 1).toLowerCase().trim();

  // Try to strip known compound TLDs first, then single TLDs
  let nameSegment = fullDomain;
  for (const suffix of STRIP_SUFFIXES) {
    if (fullDomain.endsWith(suffix)) {
      nameSegment = fullDomain.slice(0, fullDomain.length - suffix.length);
      break;
    }
  }

  // If there are subdomains (e.g. mail.acme), take the last segment
  const parts = nameSegment.split('.');
  const baseName = parts[parts.length - 1] || nameSegment;

  // Capitalize: split on hyphens/underscores, capitalize each word
  const clientName = baseName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // Derive the display domain: everything after the last subdomain prefix
  // e.g. mail.acme.co.uk → acme.co.uk
  const domainParts = fullDomain.split('.');
  // Find where baseName appears in domainParts to reconstruct the minimal domain
  const baseIdx = domainParts.findIndex((p) => p === baseName.toLowerCase());
  const domain = baseIdx >= 0 ? domainParts.slice(baseIdx).join('.') : fullDomain;

  return { domain, clientName };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Groups a list of valid emails by their base domain.
 * Returns a Map from domain → email[]
 */
export function groupEmailsByDomain(emails: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const email of emails) {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) continue;
    const { domain } = parseDomain(trimmed);
    const existing = map.get(domain) ?? [];
    map.set(domain, [...existing, trimmed]);
  }
  return map;
}

/**
 * Finds an existing client that already has a contact with the given domain.
 */
export function findExistingClientByDomain(clients: Client[], domain: string): Client | undefined {
  return clients.find((client) => {
    // Check contacts array
    if (client.contacts && client.contacts.length > 0) {
      return client.contacts.some((contact) => {
        try {
          return parseDomain(contact.email).domain === domain;
        } catch {
          return false;
        }
      });
    }
    // Fallback: check legacy email field
    if (client.email) {
      try {
        return parseDomain(client.email).domain === domain;
      } catch {
        return false;
      }
    }
    return false;
  });
}

/**
 * Parse a raw text blob into individual email strings.
 * Accepts newlines, commas, and semicolons as separators.
 */
export function parseEmailInput(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    if (isValidEmail(token)) {
      valid.push(token.toLowerCase());
    } else {
      invalid.push(token);
    }
  }

  // Deduplicate valid emails
  const deduped = [...new Set(valid)];

  return { valid: deduped, invalid };
}
