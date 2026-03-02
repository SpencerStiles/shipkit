'use client';

import { useState } from 'react';

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
}

interface Props {
  initialKeys: ApiKeyItem[];
}

export default function ApiKeysClient({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create key');
      }
      const data = await res.json();
      // Show the full key once — it cannot be retrieved again
      setRevealedKey(data.key);
      setKeys((prev) => [
        {
          id: data.id,
          name: data.name,
          prefix: data.prefix,
          createdAt: new Date(data.createdAt).toISOString().split('T')[0],
          lastUsed: null,
        },
        ...prev,
      ]);
      setNewKeyName('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke key');
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa]">API Keys</h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Manage API keys for programmatic access to AI endpoints.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-[#22d3ee] px-4 py-2 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] transition-colors"
        >
          Create Key
        </button>
      </div>

      {/* Revealed key banner — shown once after creation */}
      {revealedKey && (
        <div className="rounded-md border border-[#14532d] bg-[#052e16] p-4 space-y-2">
          <p className="text-sm font-medium text-[#86efac]">
            Key created — copy it now, it will not be shown again.
          </p>
          <code className="block break-all rounded-md bg-[#09090b] border border-[#2d2d35] px-3 py-2 text-sm text-[#22d3ee] font-mono">
            {revealedKey}
          </code>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-[#4ade80] underline hover:text-[#86efac] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1c0a0a] p-3 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa]">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API"
              className="mt-1 block w-full rounded-md border border-[#2d2d35] bg-[#1e1e24] px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="rounded-md bg-[#22d3ee] px-4 py-2 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] disabled:opacity-50 transition-colors"
            >
              {creating ? 'Generating\u2026' : 'Generate'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(null); }}
              className="rounded-md border border-[#2d2d35] px-4 py-2 text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#52525b] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-md border border-[#2d2d35] bg-[#111114]">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#71717a]">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d2d35] text-left text-xs font-medium text-[#71717a]">
                <th className="p-4">Name</th>
                <th className="p-4">Key</th>
                <th className="p-4">Created</th>
                <th className="p-4">Last Used</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-[#2d2d35] last:border-0 text-sm">
                  <td className="p-4 font-medium text-[#fafafa]">{key.name}</td>
                  <td className="p-4">
                    <code className="rounded-md bg-[#1e1e24] border border-[#2d2d35] px-2 py-0.5 text-xs text-[#a1a1aa] font-mono">
                      {key.prefix}&hellip;
                    </code>
                  </td>
                  <td className="p-4 text-[#a1a1aa]">{key.createdAt}</td>
                  <td className="p-4 text-[#a1a1aa]">{key.lastUsed ?? 'Never'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-sm text-[#ef4444] hover:text-[#f87171] transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
