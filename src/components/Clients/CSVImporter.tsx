import { useState, useRef, useCallback } from 'react';
import { useClientContext } from '../../context/ClientContext';
import { useToast } from '../UI/Toast';
import { Button } from '../UI/Button';
import type { ClientFormData } from '../../types';

interface FieldMapping {
  csvHeader: string;
  appField: string; // '' means unmapped
}

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<ClientFormData>;
  issues: string[];
}

const APP_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: 'name', label: 'Name', required: true },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'assignedTo', label: 'Assigned To' },
  { value: 'status', label: 'Status (active/completed/on-hold)' },
  { value: 'priority', label: 'Priority (high/medium/low/none)' },
  { value: 'targetGoLiveDate', label: 'Go-Live Date (YYYY-MM-DD)' },
  { value: 'mrr', label: 'MRR (cents)' },
];

// Best-effort auto-detection of which CSV header maps to which app field
function autoDetectMapping(headers: string[]): FieldMapping[] {
  const SYNONYMS: Record<string, string[]> = {
    name:             ['name', 'client', 'company', 'client name', 'company name', 'account'],
    email:            ['email', 'e-mail', 'email address', 'contact email'],
    phone:            ['phone', 'telephone', 'mobile', 'phone number'],
    assignedTo:       ['assigned to', 'assigned', 'owner', 'csm', 'account manager', 'rep'],
    status:           ['status', 'state'],
    priority:         ['priority', 'urgency'],
    targetGoLiveDate: ['go-live', 'go live', 'golive', 'launch date', 'go-live date', 'target date'],
    mrr:              ['mrr', 'monthly recurring revenue', 'revenue', 'arr'],
  };

  return headers.map(header => {
    const h = header.toLowerCase().trim();
    for (const [field, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.some(s => h === s || h.includes(s))) {
        return { csvHeader: header, appField: field };
      }
    }
    return { csvHeader: header, appField: '' };
  });
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Simple CSV parser (handles quoted fields)
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });

  return { headers, rows };
}

function buildClientData(
  row: Record<string, string>,
  mappings: FieldMapping[],
  existingNames: Set<string>
): ParsedRow {
  const issues: string[] = [];
  const raw = row;
  const mapped: Record<string, unknown> = {};

  for (const { csvHeader, appField } of mappings) {
    if (!appField) continue;
    const val = row[csvHeader]?.trim() ?? '';
    if (!val) continue;

    if (appField === 'status') {
      const normalized = val.toLowerCase().replace(/\s+/g, '-') as 'active' | 'completed' | 'on-hold';
      if (['active', 'completed', 'on-hold'].includes(normalized)) {
        mapped.status = normalized;
      } else {
        issues.push(`Unknown status "${val}" — will use "active"`);
      }
    } else if (appField === 'priority') {
      const normalized = val.toLowerCase() as 'high' | 'medium' | 'low' | 'none';
      if (['high', 'medium', 'low', 'none'].includes(normalized)) {
        mapped.priority = normalized;
      } else {
        issues.push(`Unknown priority "${val}" — will use "none"`);
      }
    } else if (appField === 'mrr') {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      if (!isNaN(num)) {
        mapped.account = { mrr: Math.round(num * 100) }; // store in cents
      }
    } else if (appField === 'targetGoLiveDate') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        mapped.targetGoLiveDate = val;
      } else {
        // Try parsing other date formats
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          mapped.targetGoLiveDate = d.toISOString().split('T')[0];
        } else {
          issues.push(`Cannot parse date "${val}"`);
        }
      }
    } else {
      mapped[appField] = val;
    }
  }

  // Validate required fields
  if (!mapped.name) {
    issues.push('Missing required field: name');
  } else if (existingNames.has((mapped.name as string).toLowerCase())) {
    issues.push(`Duplicate: "${mapped.name}" already exists`);
  }

  const clientData: Partial<ClientFormData> = {
    name: (mapped.name as string) || '',
    email: (mapped.email as string) || '',
    phone: (mapped.phone as string) || '',
    assignedTo: (mapped.assignedTo as string) || 'Unassigned',
    status: (mapped.status as 'active' | 'completed' | 'on-hold') || 'active',
    priority: (mapped.priority as 'high' | 'medium' | 'low' | 'none') || 'none',
    ...(mapped.targetGoLiveDate ? { targetGoLiveDate: mapped.targetGoLiveDate as string } : {}),
    ...(mapped.account ? { account: mapped.account as ClientFormData['account'] } : {}),
  };

  return { raw, mapped: clientData, issues };
}

interface CSVImporterProps {
  onClose: () => void;
}

export function CSVImporter({ onClose }: CSVImporterProps) {
  const { clients, importClients } = useClientContext();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const existingNames = new Set(clients.map(c => c.name.toLowerCase()));

  const parsedRows: ParsedRow[] = rawRows.map(row =>
    buildClientData(row, mappings, existingNames)
  );
  const validRows = parsedRows.filter(r => r.issues.length === 0 || r.issues.every(i => !i.startsWith('Missing') && !i.startsWith('Duplicate')));
  const errorRows = parsedRows.filter(r => r.issues.some(i => i.startsWith('Missing') || i.startsWith('Duplicate')));

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a CSV file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows } = parseCSV(text);
      if (h.length === 0) {
        showToast('Could not parse CSV — check format', 'error');
        return;
      }
      setHeaders(h);
      setRawRows(rows);
      setMappings(autoDetectMapping(h));
      setStep('map');
    };
    reader.readAsText(file);
  }, [showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = () => {
    const toImport = validRows.map(r => r.mapped as ClientFormData);
    importClients(toImport);
    showToast(
      `${toImport.length} client${toImport.length !== 1 ? 's' : ''} imported${errorRows.length > 0 ? `, ${errorRows.length} skipped` : ''}`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white shadow-[6px_6px_0_0_#18181b] dark:shadow-[6px_6px_0_0_#ffffff] rounded-[4px] w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Import Clients from CSV</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {['Upload', 'Map Fields', 'Preview'].map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <span>›</span>}
                <span className={step === ['upload', 'map', 'preview'][i] ? 'font-bold text-violet-600 dark:text-yellow-400' : ''}>{s}</span>
              </span>
            ))}
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-[4px] p-12 text-center transition-colors ${
                isDragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <svg className="w-12 h-12 mx-auto mb-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Drop a CSV file here</p>
              <p className="text-xs text-zinc-500 mb-4">or click to browse</p>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Step 2: Map fields */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Found <strong>{rawRows.length}</strong> rows. Map your CSV columns to Embark fields:
              </p>
              <div className="space-y-2">
                {headers.map((header, i) => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="w-40 text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded truncate flex-shrink-0">{header}</span>
                    <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <select
                      value={mappings[i]?.appField ?? ''}
                      onChange={e => {
                        const updated = [...mappings];
                        updated[i] = { csvHeader: header, appField: e.target.value };
                        setMappings(updated);
                      }}
                      className="flex-1 text-sm border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-[4px] px-2 py-1 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">— skip —</option>
                      {APP_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {mappings[i]?.appField && (
                      <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded font-semibold">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {validRows.length} will be imported
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {errorRows.length} will be skipped
                  </span>
                )}
              </div>
              <div className="border-2 border-zinc-200 dark:border-zinc-700 rounded-[4px] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {parsedRows.slice(0, 20).map((row, i) => (
                      <tr
                        key={i}
                        className={row.issues.some(iss => iss.startsWith('Missing') || iss.startsWith('Duplicate'))
                          ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                      >
                        <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{row.mapped.name || '—'}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.mapped.email || '—'}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.mapped.status || 'active'}</td>
                        <td className="px-3 py-2">
                          {row.issues.length > 0 ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400">{row.issues[0]}</span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 20 && (
                  <div className="px-3 py-2 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 text-center">
                    …and {parsedRows.length - 20} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <div className="flex items-center gap-2">
            {step === 'map' && (
              <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>← Back</Button>
            )}
            {step === 'preview' && (
              <Button variant="secondary" size="sm" onClick={() => setStep('map')}>← Back</Button>
            )}
            {step === 'upload' && null}
            {step === 'map' && (
              <Button
                size="sm"
                onClick={() => setStep('preview')}
                disabled={!mappings.some(m => m.appField === 'name')}
              >
                Preview →
              </Button>
            )}
            {step === 'preview' && (
              <Button size="sm" onClick={handleImport} disabled={validRows.length === 0}>
                Import {validRows.length} Client{validRows.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
