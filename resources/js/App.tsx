import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from './api';
import { User, PurchaseRequest, CreateRequestPayload } from './types';
import Navbar from './components/Navbar';
import Login from './components/Login';
import RequestList from './components/RequestList';
import RequestDetail from './components/RequestDetail';
import RequestFormModal from './components/RequestFormModal';
import Toast from './components/Toast';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Data states
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<string>('ALL');

  // Navigation states
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Form modal states
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [formInitialData, setFormInitialData] = useState<PurchaseRequest | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Action states
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogout = useCallback(async () => {
    try {
      if (localStorage.getItem('auth_token')) {
        await api.logout();
      }
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setSelectedRequest(null);
    setCurrentView('list');
  }, []);

  const handleApiError = useCallback(
    (err: unknown, defaultMessage: string) => {
      if (err instanceof ApiError && err.status === 401) {
        handleLogout();
        return;
      }
      const message = err instanceof Error ? err.message : defaultMessage;
      showToast(message, 'error');
    },
    [handleLogout]
  );

  // Monitor auth token & unauthorized events
  useEffect(() => {
    const handleAuthEvent = () => {
      handleLogout();
    };

    const checkTokenStorage = () => {
      if (currentUser && !localStorage.getItem('auth_token')) {
        handleLogout();
      }
    };

    window.addEventListener('auth:unauthorized', handleAuthEvent);
    window.addEventListener('storage', checkTokenStorage);
    window.addEventListener('focus', checkTokenStorage);

    const interval = setInterval(checkTokenStorage, 1000);

    return () => {
      window.removeEventListener('auth:unauthorized', handleAuthEvent);
      window.removeEventListener('storage', checkTokenStorage);
      window.removeEventListener('focus', checkTokenStorage);
      clearInterval(interval);
    };
  }, [currentUser, handleLogout]);

  // Verify auth session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api
      .getMe()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const fetchRequests = useCallback(
    async (filter = currentFilter) => {
      if (!localStorage.getItem('auth_token')) {
        handleLogout();
        return;
      }
      setLoadingRequests(true);
      try {
        const res = await api.getRequests(filter);
        setRequests(res.data || []);
      } catch (err: unknown) {
        handleApiError(err, 'Gagal mengambil data request.');
      } finally {
        setLoadingRequests(false);
      }
    },
    [currentFilter, handleApiError, handleLogout]
  );

  useEffect(() => {
    if (currentUser) {
      fetchRequests(currentFilter);
    }
  }, [currentUser, currentFilter, fetchRequests]);

  const loadRequestDetail = async (id: number) => {
    try {
      const data = await api.getRequest(id);
      setSelectedRequest(data);
      setCurrentView('detail');
    } catch (err: unknown) {
      handleApiError(err, 'Gagal memuat detail request.');
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('list');
    showToast(`Selamat datang, ${user.name}!`);
  };

  const handleFilterChange = (newFilter: string) => {
    setCurrentFilter(newFilter);
  };

  const handleCreateOpen = () => {
    setFormInitialData(null);
    setShowFormModal(true);
  };

  const handleEditOpen = (req: PurchaseRequest) => {
    setFormInitialData(req);
    setShowFormModal(true);
  };

  const handleSaveForm = async (formData: CreateRequestPayload) => {
    setFormLoading(true);
    try {
      if (formInitialData) {
        // Edit existing Draft
        const updated = await api.updateRequest(formInitialData.id, formData);
        setShowFormModal(false);
        showToast('Draft purchase request berhasil diperbarui.');
        if (currentView === 'detail') {
          setSelectedRequest(updated);
        }
        fetchRequests(currentFilter);
      } else {
        // Create new Draft
        const created = await api.createRequest(formData);
        setShowFormModal(false);
        showToast(`Purchase request ${created.number} berhasil dibuat sebagai Draft.`);
        fetchRequests(currentFilter);
        loadRequestDetail(created.id);
      }
    } catch (err: unknown) {
      handleApiError(err, 'Gagal menyimpan purchase request.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitRequest = async (id: number) => {
    setLoadingAction(true);
    try {
      const updated = await api.submitRequest(id);
      setSelectedRequest(updated);
      showToast(`Purchase request ${updated.number} berhasil diajukan.`);
      fetchRequests(currentFilter);
    } catch (err: unknown) {
      handleApiError(err, 'Gagal men-submit request.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleApproveRequest = async (id: number, comment?: string) => {
    setLoadingAction(true);
    try {
      const updated = await api.approveRequest(id, comment);
      setSelectedRequest(updated);
      showToast(`Purchase request ${updated.number} telah disetujui.`);
      fetchRequests(currentFilter);
    } catch (err: unknown) {
      handleApiError(err, 'Gagal menyetujui request.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectRequest = async (id: number, comment: string) => {
    setLoadingAction(true);
    try {
      const updated = await api.rejectRequest(id, comment);
      setSelectedRequest(updated);
      showToast(`Purchase request ${updated.number} telah ditolak.`);
      fetchRequests(currentFilter);
    } catch (err: unknown) {
      handleApiError(err, 'Gagal menolak request.');
    } finally {
      setLoadingAction(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#005696] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f6f9] flex flex-col font-sans">
      <Navbar user={currentUser} onLogout={handleLogout} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 w-full px-6 sm:px-8 py-6">
        {currentView === 'list' && (
          <RequestList
            requests={requests}
            loading={loadingRequests}
            currentUser={currentUser}
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
            onSelectRequest={loadRequestDetail}
            onCreateClick={handleCreateOpen}
          />
        )}

        {currentView === 'detail' && selectedRequest && (
          <RequestDetail
            request={selectedRequest}
            currentUser={currentUser}
            onBack={() => {
              setCurrentView('list');
              fetchRequests(currentFilter);
            }}
            onEdit={handleEditOpen}
            onSubmit={handleSubmitRequest}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            loadingAction={loadingAction}
          />
        )}
      </main>

      <RequestFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveForm}
        initialData={formInitialData}
        loading={formLoading}
      />
    </div>
  );
}
