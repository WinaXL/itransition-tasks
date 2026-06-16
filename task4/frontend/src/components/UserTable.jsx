import { formatDistanceToNow } from '../utils/time';

const STATUS_STYLES = {
  Active:      'bg-emerald-100 text-emerald-700',
  Blocked:     'bg-red-100 text-red-700',
  Unverified:  'bg-amber-100 text-amber-700',
};

export default function UserTable({
  users,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onVerify,
  loading,
  currentUserId,
}) {
  const allSelected =
    users.length > 0 && users.every((u) => selectedIds.includes(u.id));
  const someSelected = !allSelected && users.some((u) => selectedIds.includes(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading users…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const isSelected    = selectedIds.includes(user.id);

            return (
              <tr
                key={user.id}
                className={`transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'} ${isCurrentUser ? 'ring-1 ring-inset ring-indigo-200' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => onSelectOne(user.id, e.target.checked)}
                  />
                </td>

                <td className="px-4 py-3 font-medium text-slate-800">
                  {user.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
                  )}
                </td>

                <td className="px-4 py-3 text-slate-600">{user.email}</td>

                <td className="px-4 py-3 text-slate-500">
                  {user.last_login
                    ? formatDistanceToNow(new Date(user.last_login))
                    : <span className="italic text-slate-400">Never</span>}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[user.status] || 'bg-slate-100 text-slate-600'}`}>
                    {user.status}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {user.status === 'Unverified' && (
                    <button
                      onClick={() => onVerify(user.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium"
                    >
                      Verify Email
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
