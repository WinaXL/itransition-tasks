import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import Toolbar from '../components/Toolbar';
import UserTable from '../components/UserTable';

export default function Dashboard() {
  const { user, logout, kick } = useAuth();
  const navigate = useNavigate();

  const [users,       setUsers]       = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,       setToast]       = useState({ message: '', type: '' });

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3500);
  }

  // Intercept 401/403 with kicked:true and redirect to login.
  const handleApiError = useCallback((err) => {
    const data = err.response?.data;
    if (data?.kicked || err.response?.status === 401 || err.response?.status === 403) {
      kick(data?.message);
      navigate('/login', { replace: true });
    } else {
      showToast(data?.message || 'Something went wrong.', 'error');
    }
  }, [kick, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
      // Clear selections that no longer exist.
      setSelectedIds((prev) => prev.filter((id) => data.some((u) => u.id === id)));
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleSelectAll(checked) {
    setSelectedIds(checked ? users.map((u) => u.id) : []);
  }

  function handleSelectOne(id, checked) {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  }

  async function bulkAction(endpoint, method, successMsg) {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await api({ method, url: `/users${endpoint}`, data: { ids: selectedIds } });
      showToast(successMsg);
      setSelectedIds([]);
      await fetchUsers();
    } catch (err) {
      handleApiError(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleVerify(id) {
    setActionLoading(true);
    try {
      await api.patch(`/users/${id}/verify`);
      showToast('Email verified successfully.');
      await fetchUsers();
    } catch (err) {
      handleApiError(err);
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-800">User Management</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:block">
              Logged in as <span className="font-semibold">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Toast notification */}
      {toast.message && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">All Users</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {users.length} user{users.length !== 1 ? 's' : ''} · sorted by last login
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Toolbar
            selectedIds={selectedIds}
            loading={actionLoading}
            onBlock={()   => bulkAction('/block',   'patch',  'Selected users have been blocked.')}
            onUnblock={()  => bulkAction('/unblock', 'patch',  'Selected users have been unblocked.')}
            onDelete={()   => bulkAction('',         'delete', 'Selected users have been deleted.')}
          />
          <UserTable
            users={users}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onVerify={handleVerify}
            loading={loading}
            currentUserId={user?.id}
          />
        </div>
      </main>
    </div>
  );
}
