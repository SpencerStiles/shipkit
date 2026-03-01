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
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage API keys for programmatic access to AI endpoints.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Create Key
        </button>
      </div>

      {/* Revealed key banner — shown once after creation */}
      {revealedKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">
            Key created — copy it now, it will not be shown again.
          </p>
          <code className="block break-all rounded bg-green-100 px-3 py-2 text-sm text-green-900 font-mono">
            {revealedKey}
          </code>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-green-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? 'Generating…' : 'Generate'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(null); }}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-lg border bg-white">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-gray-500">
                <th className="p-4">Name</th>
                <th className="p-4">Key</th>
                <th className="p-4">Created</th>
                <th className="p-4">Last Used</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b last:border-0 text-sm">
                  <td className="p-4 font-medium text-gray-900">{key.name}</td>
                  <td className="p-4">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {key.prefix}…
                    </code>
                  </td>
                  <td className="p-4 text-gray-600">{key.createdAt}</td>
                  <td className="p-4 text-gray-600">{key.lastUsed ?? 'Never'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-sm text-red-600 hover:text-red-700"
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
