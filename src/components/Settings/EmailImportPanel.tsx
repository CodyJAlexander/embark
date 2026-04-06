import { useState, useRef } from 'react';
import { useClientContext } from '../../context/ClientContext';
import { parseEmailInput, groupEmailsByDomain, parseDomain, findExistingClientByDomain, extractEmailsFromSpreadsheet } from '../../utils/emailImport';
import { generateId } from '../../utils/helpers';
import type { Client } from '../../types';

type Stage = 'paste' | 'preview' | 'confirm';

interface ContactDraft {
  email: string;
  name: string;
  isPrimary: boolean;
}

interface DomainGroup {
  domain: string;
  clientName: string;
  contacts: ContactDraft[];
  existingClient: Client | undefined;
}

export function EmailImportPanel() {
  const { clients, addClient, addContact } = useClientContext();

  const [stage, setStage] = useState<Stage>('paste');
  const [rawInput, setRawInput] = useState('');
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [groups, setGroups] = useState<DomainGroup[]>([]);
  const [summary, setSummary] = useState<{ newClients: number; addedContacts: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File upload ─────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const emails = await extractEmailsFromSpreadsheet(file);
      setRawInput(emails.join('\n'));
      setUploadedFile({ name: file.name, count: emails.length });
    } catch {
      setUploadError('Could not read the file. Make sure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setUploading(false);
    }
  }

  // ── Stage 1: Parse ─────────────────────────────────────────────────────────
  function handleParse() {
    const { valid, invalid } = parseEmailInput(rawInput);
    setInvalidEmails(invalid);

    const byDomain = groupEmailsByDomain(valid);
    const newGroups: DomainGroup[] = [];

    byDomain.forEach((emails, domain) => {
      const { clientName } = parseDomain(emails[0]);
      const existing = findExistingClientByDomain(clients, domain);
      newGroups.push({
        domain,
        clientName,
        contacts: emails.map((email, idx) => ({ email, name: '', isPrimary: idx === 0 })),
        existingClient: existing,
      });
    });

    setGroups(newGroups);
    setStage('preview');
  }

  // ── Preview mutations ────────────────────────────────────────────────────────
  function setGroupClientName(domain: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.domain === domain ? { ...g, clientName: name } : g)));
  }

  function setContactName(domain: string, email: string, name: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.domain === domain
          ? { ...g, contacts: g.contacts.map((c) => (c.email === email ? { ...c, name } : c)) }
          : g
      )
    );
  }

  function setPrimary(domain: string, email: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.domain === domain
          ? {
              ...g,
              contacts: g.contacts.map((c) => ({ ...c, isPrimary: c.email === email })),
            }
          : g
      )
    );
  }

  // ── Stage 3: Confirm ────────────────────────────────────────────────────────
  function handleConfirm() {
    let newClientsCount = 0;
    let addedContactsCount = 0;

    for (const group of groups) {
      if (group.existingClient) {
        // Add contacts to existing client
        for (const contact of group.contacts) {
          addContact(group.existingClient.id, {
            name: contact.name || contact.email,
            email: contact.email,
            isPrimary: contact.isPrimary,
          });
          addedContactsCount++;
        }
      } else {
        // Create new client with contacts
        const newClient = addClient({
          name: group.clientName,
          email: group.contacts.find((c) => c.isPrimary)?.email ?? group.contacts[0]?.email ?? '',
          phone: '',
          assignedTo: '',
          status: 'active',
          priority: 'none',
          contacts: group.contacts.map((c) => ({
            id: generateId(),
            name: c.name || c.email,
            email: c.email,
            isPrimary: c.isPrimary,
            createdAt: new Date().toISOString(),
          })),
        });
        void newClient; // used for side effects
        newClientsCount++;
        addedContactsCount += group.contacts.length;
      }
    }

    setSummary({ newClients: newClientsCount, addedContacts: addedContactsCount });
    setStage('confirm');
  }

  function handleReset() {
    setStage('paste');
    setRawInput('');
    setInvalidEmails([]);
    setGroups([]);
    setSummary(null);
    setUploadedFile(null);
    setUploadError(null);
  }

  const newCount = groups.filter((g) => !g.existingClient).length;
  const existingCount = groups.filter((g) => g.existingClient).length;
  const contactCount = groups.reduce((acc, g) => acc + g.contacts.length, 0);
  const allNamed = groups.every((g) => g.contacts.every((c) => c.name.trim().length > 0));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Bulk Import</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Paste email addresses to automatically group them into clients by domain.
        </p>
      </div>

      {/* ── Stage 1: Paste ── */}
      {stage === 'paste' && (
        <div className="space-y-3">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] text-gray-700 dark:text-gray-300 hover:border-zinc-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? 'Reading file…' : 'Upload Spreadsheet'}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">.xlsx, .xls, .csv</span>
          </div>

          {uploadedFile && (
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              ✓ {uploadedFile.name} — {uploadedFile.count} email{uploadedFile.count !== 1 ? 's' : ''} found
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
            <span>or paste manually</span>
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
          </div>

          <textarea
            value={rawInput}
            onChange={(e) => { setRawInput(e.target.value); setUploadedFile(null); }}
            rows={6}
            placeholder="calexander@interworks.com, jsmith@acme.com&#10;jdoe@acme.com; another@corp.io"
            className="w-full px-3 py-2 text-sm border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-zinc-900 dark:focus:border-white resize-none font-mono"
          />
          <button
            onClick={handleParse}
            disabled={!rawInput.trim()}
            className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[4px] border-2 border-zinc-900 dark:border-white shadow-[2px_2px_0_0_#18181b] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse Emails
          </button>
        </div>
      )}

      {/* ── Stage 2: Preview ── */}
      {stage === 'preview' && (
        <div className="space-y-4">
          {/* Invalid email warnings */}
          {invalidEmails.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-[4px]">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                {invalidEmails.length} invalid email{invalidEmails.length !== 1 ? 's' : ''} skipped:
              </p>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 font-mono">
                {invalidEmails.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {groups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No valid emails found.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found <strong>{groups.length}</strong> domain{groups.length !== 1 ? 's' : ''} with{' '}
                <strong>{contactCount}</strong> contact{contactCount !== 1 ? 's' : ''}. Fill in contact names, then confirm.
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {groups.map((group) => (
                  <div
                    key={group.domain}
                    className="border-2 border-zinc-200 dark:border-zinc-700 rounded-[4px] p-3 space-y-3"
                  >
                    {/* Client name row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={group.clientName}
                        onChange={(e) => setGroupClientName(group.domain, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm font-semibold border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                        placeholder="Client name"
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                        {group.domain}
                      </span>
                      {group.existingClient && (
                        <span className="text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-400 px-2 py-0.5 rounded shrink-0">
                          EXISTS — add to: {group.existingClient.name}
                        </span>
                      )}
                    </div>

                    {/* Contact rows */}
                    <div className="space-y-2">
                      {group.contacts.map((contact) => (
                        <div key={contact.email} className="flex items-center gap-2">
                          {/* Primary radio */}
                          <input
                            type="radio"
                            name={`primary-${group.domain}`}
                            checked={contact.isPrimary}
                            onChange={() => setPrimary(group.domain, contact.email)}
                            title="Mark as primary contact"
                            className="shrink-0"
                          />
                          {/* Email (read-only) */}
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-48 shrink-0 truncate">
                            {contact.email}
                          </span>
                          {/* Name input */}
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => setContactName(group.domain, contact.email, e.target.value)}
                            placeholder="Contact name (required)"
                            className="flex-1 px-2 py-1 text-sm border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStage('paste')}
                  className="px-3 py-2 text-sm font-medium border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] text-gray-600 dark:text-gray-400 hover:border-zinc-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!allNamed || groups.length === 0}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[4px] border-2 border-zinc-900 dark:border-white shadow-[2px_2px_0_0_#18181b] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {newCount > 0 && existingCount > 0
                    ? `Create ${newCount} client${newCount !== 1 ? 's' : ''} / Add ${existingCount === 1 ? groups.find(g => g.existingClient)!.contacts.length : existingCount} contacts to existing`
                    : newCount > 0
                    ? `Create ${newCount} client${newCount !== 1 ? 's' : ''}`
                    : `Add contacts to ${existingCount} existing client${existingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Stage 3: Success ── */}
      {stage === 'confirm' && summary && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-[4px]">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">Import complete!</p>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-0.5">
              {summary.newClients > 0 && (
                <li>• {summary.newClients} new client{summary.newClients !== 1 ? 's' : ''} created</li>
              )}
              <li>• {summary.addedContacts} contact{summary.addedContacts !== 1 ? 's' : ''} added</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] text-gray-600 dark:text-gray-400 hover:border-zinc-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Import More
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Emit a navigation event — the app uses a custom view system
                window.dispatchEvent(new CustomEvent('embark:navigate', { detail: { view: 'clients' } }));
              }}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[4px] border-2 border-zinc-900 dark:border-white shadow-[2px_2px_0_0_#18181b] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
            >
              Go to Clients →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
