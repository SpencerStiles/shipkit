'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your team and account settings.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Team</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Team Name</label>
          <input
            type="text"
            defaultValue="My Team"
            className="mt-1 block w-full max-w-md rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Save Changes
        </button>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Default Model</h2>
        <select className="block w-full max-w-md rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
          <option>gpt-4o</option>
          <option>gpt-4o-mini</option>
          <option>claude-sonnet-4-20250514</option>
          <option>claude-3-haiku-20240307</option>
        </select>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        <p className="text-sm text-red-600">
          Deleting your team will permanently remove all data, API keys, and usage history.
        </p>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
          Delete Team
        </button>
      </div>
    </div>
  );
}
