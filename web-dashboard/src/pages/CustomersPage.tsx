import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCustomersStore, type Customer } from '../store/customersStore';
import { customerSchema, type CustomerInput } from '../schemas/customer.schema';
import { api } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useTranslation } from '../services/i18n';
import {
  Search, Plus, Edit2, Trash2, Home, Landmark, CheckCircle,
  AlertTriangle, Eye, ChevronLeft, ChevronRight, Coins,
  Calendar, User, FileText, ArrowRight, Upload, Download
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import CustomSelect from '../components/CustomSelect';

// Map utility component to update view when address geocoding resolves
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14);
  }, [coords, map]);
  return null;
}

const previewIcon = L.divIcon({
  className: 'plowpath-preview-marker',
  html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: #e11d48; border: 3px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function CustomersPage() {
  const { t, formatCurrency, formatDate } = useTranslation();
  const {
    customers, page, total, perPage, search, statusFilter, isLoading,
    fetchCustomers, setFilters, createCustomer, updateCustomer, deleteCustomer, geocodePreview
  } = useCustomersStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Geocoding preview state
  const [previewCoords, setPreviewCoords] = useState<[number, number] | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Customer Drill-in History & Payments state
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'service' | 'payments'>('service');

  // New Payment Form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'check' | 'card' | 'ach' | 'other'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Bulk Import state
  const [importCsvText, setImportCsvText] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const blankCustomer: CustomerInput = {
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'active',
    property_type: 'residential',
    driveway_type: '',
    access_notes: '',
    notify_sms: true,
    notify_voice: false,
    outstanding_balance: 0,
    payment_status: 'pending',
    sign_status: 'removed',
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: blankCustomer,
  });

  const addressValue = watch('address');

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch History and Payments when historyCustomer changes
  useEffect(() => {
    if (!historyCustomer) return;
    setIsLoadingHistory(true);

    const loadHistory = api.get(`/customers/${historyCustomer.customer_id}/history`)
      .then(({ data }) => setHistoryData(data))
      .catch(() => {});

    const loadPayments = api.get(`/customers/${historyCustomer.customer_id}/payments`)
      .then(({ data }) => setPaymentsData(data))
      .catch(() => {});

    Promise.all([loadHistory, loadPayments]).finally(() => {
      setIsLoadingHistory(false);
    });
  }, [historyCustomer]);

  const openAddModal = () => {
    setEditingCustomer(null);
    reset(blankCustomer);
    setPreviewCoords(null);
    setPreviewName(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    reset({
      name: c.name,
      address: c.address,
      phone: c.phone || '',
      email: c.email || '',
      status: c.status,
      property_type: c.property_type,
      driveway_type: c.driveway_type || '',
      access_notes: c.access_notes || '',
      notify_sms: c.notify_sms !== false,
      notify_voice: c.notify_voice === true,
      outstanding_balance: Number(c.outstanding_balance || 0),
      payment_status: c.payment_status || 'pending',
      sign_status: c.sign_status || 'removed',
    });
    setPreviewCoords([c.lat, c.lon]);
    setPreviewName(c.address);
    setModalOpen(true);
  };

  const handleVerifyAddress = async () => {
    if (!addressValue?.trim()) return;
    setIsVerifying(true);
    try {
      const res = await geocodePreview(addressValue);
      setPreviewCoords([res.lat, res.lon]);
      setPreviewName(res.displayName || addressValue);
    } catch {
      // Handled by store toast
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (values: CustomerInput) => {
    const data = {
      name: values.name,
      address: values.address,
      phone: values.phone || null,
      email: values.email || null,
      status: values.status,
      property_type: values.property_type,
      driveway_type: values.driveway_type || null,
      access_notes: values.access_notes || null,
      notify_sms: values.notify_sms,
      notify_voice: values.notify_voice,
      outstanding_balance: Number(values.outstanding_balance || 0),
      payment_status: values.payment_status,
      sign_status: values.sign_status,
      ...(previewCoords ? { lat: previewCoords[0], lon: previewCoords[1] } : {}),
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.customer_id, data as Partial<Customer>);
      } else {
        await createCustomer(data as Parameters<typeof createCustomer>[0]);
      }
      setModalOpen(false);
    } catch {
      // Handled by store
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      setDeleteId(null);
    } catch {
      // Handled
    }
  };

  // Submit Payment logging inside drill-in modal
  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyCustomer || !payAmount || isNaN(Number(payAmount))) return;
    setIsSavingPayment(true);
    try {
      const amount = Number(payAmount);
      await api.post(`/customers/${historyCustomer.customer_id}/payments`, {
        amount,
        method: payMethod,
        notes: payNotes || null,
      });

      useToastStore.getState().addToast(t('Payment recorded successfully'), 'success');

      // Refresh records
      const { data: updatedPayments } = await api.get(`/customers/${historyCustomer.customer_id}/payments`);
      setPaymentsData(updatedPayments);

      // Re-fetch customer metrics on page
      fetchCustomers();

      // Update drill-in aggregate metrics locally
      setHistoryCustomer({
        ...historyCustomer,
        outstanding_balance: Math.max(0, (historyCustomer.outstanding_balance || 0) - amount),
        payment_status: (historyCustomer.outstanding_balance || 0) - amount <= 0 ? 'paid' : 'pending',
      });

      setPayAmount('');
      setPayNotes('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? t('Failed to log payment');
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await api.get('/customers/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plowpath_customers_billing.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      useToastStore.getState().addToast(t('Failed to export CSV'), 'error');
    }
  };

  // Handle Import CSV
  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) return;
    setIsImporting(true);
    try {
      const { data } = await api.post('/customers/import', { csv: importCsvText });
      useToastStore.getState().addToast(t('Successfully imported {{count}} customers! Errors: {{errors}}', { count: data.imported_count, errors: data.errors_count }), 'success');
      if (data.errors && data.errors.length > 0) {
        console.error('Import Warnings:', data.errors);
      }
      setImportCsvText('');
      setImportModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? t('Failed to import CSV');
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t('Customer Accounts')}</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">{t('Manage servicing properties, geocodes, and service decisions')}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/40 font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
            title={t('Export Roster as CSV')}
          >
            <Download className="w-4 h-4" />
            {t('Export CSV')}
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/40 font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
            title={t('Import Roster via CSV')}
          >
            <Upload className="w-4 h-4" />
            {t('Import CSV')}
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
          >
            <Plus className="w-4 h-4" />
            {t('Add Customer')}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-4 glass-card rounded-2xl flex flex-col md:flex-row gap-4 items-center animate-slide-up relative z-50">
        {/* Search */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
          <input
            type="text"
            placeholder={t('Search by name, address, or phone...')}
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-600 font-medium"
          />
        </div>
        {/* Status Filter */}
        <div className="w-full md:w-48">
          <CustomSelect
            options={[
              { value: '', label: t('All Statuses') },
              { value: 'active', label: t('Active'), colorDot: '#10b981' },
              { value: 'inactive', label: t('Inactive'), colorDot: '#64748b' },
              { value: 'prospect', label: t('Prospect'), colorDot: '#f59e0b' },
            ]}
            value={statusFilter}
            onChange={(val) => setFilters({ statusFilter: val })}
            placeholder={t('All Statuses')}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-450 text-[11px] font-bold uppercase tracking-wider bg-slate-900/20">
                <th className="px-6 py-4">{t('Customer')}</th>
                <th className="px-6 py-4">{t('Property info')}</th>
                <th className="px-6 py-4">{t('Alerts')}</th>
                <th className="px-6 py-4">{t('Decision')}</th>
                <th className="px-6 py-4">{t('Sign Status')}</th>
                <th className="px-6 py-4">{t('Payment Balance')}</th>
                <th className="px-6 py-4">{t('Status')}</th>
                <th className="px-6 py-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                      {t('Retrieving customer database...')}
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-medium">
                    {t('No customers found matching the criteria.')}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-450 truncate max-w-xs sm:max-w-sm mt-0.5">{c.address}</div>
                      <div className="mt-1.5">
                        {c.email ? (
                          <span
                            title={c.email}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[10px] font-bold cursor-default"
                          >
                            ✉ {c.email}
                          </span>
                        ) : (
                          <span
                            title={t('No email on file — click Edit to add one')}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/15 text-rose-400/70 text-[10px] font-bold cursor-default"
                          >
                            ✉ {t('No email')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {c.property_type === 'residential' ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/15 rounded-md text-[11px] text-sky-400 font-bold">
                            <Home className="w-3.5 h-3.5" /> {t('Residential')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/15 rounded-md text-[11px] text-indigo-400 font-bold">
                            <Landmark className="w-3.5 h-3.5" /> {t('Commercial')}
                          </span>
                        )}
                        {c.driveway_type && (
                          <span className="text-[11px] text-slate-450 font-medium">({c.driveway_type})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <span className={`flex items-center gap-1.5 ${c.notify_sms !== false ? 'text-emerald-400 font-bold' : 'text-slate-500 line-through'}`}>
                          <span className="text-xs select-none">💬</span>
                          <span>{t('SMS')}: {c.notify_sms !== false ? t('On') : t('Off')}</span>
                        </span>
                        <span className={`flex items-center gap-1.5 ${c.notify_voice ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                          <span className="text-xs select-none">📞</span>
                          <span>{t('Voice')}: {c.notify_voice ? t('On') : t('Off')}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.next_service_decision === 'confirm' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs font-bold">
                          <span>{t('Confirm')}</span>
                          <span className="text-[11px] select-none">✅</span>
                        </span>
                      )}
                      {c.next_service_decision === 'skip' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/15 text-rose-400 text-xs font-bold">
                          <span>{t('Skip')}</span>
                          <span className="text-[11px] select-none">❌</span>
                        </span>
                      )}
                      {!c.next_service_decision && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/40 text-slate-450 text-xs font-bold">
                          <span>{t('None')}</span>
                          <span className="text-[11px] select-none">⏳</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.sign_status === 'installed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[11px] font-extrabold rounded-full">
                          {t('Installed')}
                        </span>
                      ) : c.sign_status === 'needs_service' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/15 text-amber-400 text-[11px] font-extrabold rounded-full animate-pulse">
                          {t('Needs Service')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/40 border border-slate-700/40 text-slate-450 text-[11px] font-extrabold rounded-full">
                          {t('Removed')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{formatCurrency(Number(c.outstanding_balance || 0))}</span>
                        <span className={`text-[10px] font-extrabold tracking-wider uppercase mt-0.5 ${c.payment_status === 'paid' ? 'text-emerald-400' : c.payment_status === 'overdue' ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                          {t(c.payment_status || 'pending')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[11px] font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {t('Active')}
                        </span>
                      )}
                      {c.status === 'inactive' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/40 border border-slate-700/40 text-slate-450 text-[11px] font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {t('Inactive')}
                        </span>
                      )}
                      {c.status === 'prospect' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/15 text-amber-400 text-[11px] font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {t('Prospect')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryCustomer(c)}
                          className="p-1.5 hover:bg-brand-500/10 text-slate-500 hover:text-brand-400 rounded-lg border border-transparent hover:border-brand-500/15 transition-all cursor-pointer animate-pulse-subtle"
                          title={t('View Service & Billing History')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-lg border border-transparent hover:border-slate-700/50 transition-all cursor-pointer"
                          title={t('Edit Customer')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.customer_id)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/15 transition-all cursor-pointer"
                          title={t('Delete Customer')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/30 bg-slate-900/10 text-sm">
            <span className="text-slate-450 font-medium">
              {t('Showing page')}{' '}
              <strong className="text-slate-200">{page}</strong>{' '}
              {t('of')}{' '}
              <strong className="text-slate-200">{totalPages}</strong>{' '}
              ({total} {t('total')})
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setFilters({ page: page - 1 })}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold rounded-lg cursor-pointer transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('Previous')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setFilters({ page: page + 1 })}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold rounded-lg cursor-pointer transition-all"
              >
                {t('Next')} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Drill-In Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryCustomer(null)}></div>

          <div className="relative glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-scale-up gradient-border flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-800/40 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-400" />
                  {historyCustomer.name} - {t('Profile Dashboard')}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">{historyCustomer.address}</p>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold border border-slate-800/80 bg-slate-900/30 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                {t('Close')}
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">{t('Outstanding Balance')}</div>
                <div className="text-xl font-black text-slate-100 mt-1">{formatCurrency(Number(historyCustomer.outstanding_balance || 0))}</div>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">{t('Payment Status')}</div>
                <div className="text-sm font-extrabold uppercase mt-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${historyCustomer.payment_status === 'paid' ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/15 text-amber-400'}`}>
                    {t(historyCustomer.payment_status || 'pending')}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">{t('Sign Inventory')}</div>
                <div className="text-sm font-extrabold uppercase mt-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${historyCustomer.sign_status === 'installed' ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400' : 'bg-slate-800/40 border border-slate-700/40 text-slate-450'}`}>
                    {t(historyCustomer.sign_status || 'removed')}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800/40 mb-6">
              <button
                onClick={() => setActiveTab('service')}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'service' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
              >
                {t('Servicing History')} ({historyData.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'payments' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
              >
                {t('Payment & Billing History')} ({paymentsData.length})
              </button>
            </div>

            {/* Tab content */}
            {isLoadingHistory ? (
              <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                {t('Querying customer logs...')}
              </div>
            ) : activeTab === 'service' ? (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {historyData.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm font-medium">{t('No historical service logs found for this customer.')}</p>
                ) : (
                  historyData.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-800/40 rounded-xl flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-500" />
                          {item.storm_name} ({t('Pass')} {item.pass_number})
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {t('Driver')}: <strong className="text-slate-300 font-bold">{item.driver_name}</strong> · {t('Route')}: <span className="text-slate-300">{item.route_name}</span>
                        </div>
                        {item.notes && (
                          <div className="text-xs bg-slate-900/40 p-2 border border-slate-800/30 rounded text-slate-400 mt-2 font-medium italic">
                            &quot;{item.notes}&quot;
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${item.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/15 text-amber-400'}`}>
                          {t(item.status)}
                        </span>
                        {item.completion_time && (
                          <div className="text-[9px] text-slate-500 mt-1 font-mono font-medium">
                            {formatDate(new Date(item.completion_time))} {new Date(item.completion_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment History List */}
                <div className="lg:col-span-2 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">{t('Chronological Records')}</h4>
                  {paymentsData.length === 0 ? (
                    <p className="py-8 text-center text-slate-500 text-xs font-medium">{t('No logged payment history found.')}</p>
                  ) : (
                    paymentsData.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-800/40 rounded-xl flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-extrabold text-slate-200">
                            {t('Logged Payment')}: <span className="text-brand-400 font-black">{formatCurrency(Number(item.amount))}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            {t('Method')}: <strong className="text-slate-350 font-bold uppercase">{t(item.method)}</strong> · {t('Date')}: {formatDate(new Date(item.paid_at))}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 font-medium mt-1">&quot;{item.notes}&quot;</p>
                          )}
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-black px-2 py-0.5 rounded">
                          {t('Cleared')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Log Payment Form */}
                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl flex flex-col justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider mb-3">{t('Record A Payment')}</h4>
                  <form onSubmit={handleLogPayment} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Payment Amount')} ($)
                      </label>
                      <input
                        type="number"
                        placeholder={t('0.00')}
                        step="0.01"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Method')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'cash', label: t('Cash / Handheld') },
                          { value: 'check', label: t('Check') },
                          { value: 'card', label: t('Credit Card') },
                          { value: 'ach', label: t('ACH Transfer') },
                          { value: 'other', label: t('Other Method') },
                        ]}
                        value={payMethod}
                        onChange={(val: any) => setPayMethod(val)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Internal Notes')}
                      </label>
                      <textarea
                        placeholder={t('Log reference number...')}
                        rows={2}
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-2 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingPayment || !payAmount}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all disabled:opacity-40"
                    >
                      {isSavingPayment ? t('Processing...') : t('Apply Payment')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          <div className="relative glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-scale-up gradient-border">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingCustomer ? t('Modify Customer Profile') : t('Register New Customer Property')}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Customer name')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('e.g. John Doe, Buffalo Mall')}
                      aria-invalid={errors.name ? 'true' : 'false'}
                      {...register('name')}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                    {errors.name && <p className="text-xs text-red-400 font-semibold mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Service address')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('e.g. 125 Main St, Buffalo NY')}
                        aria-invalid={errors.address ? 'true' : 'false'}
                        {...register('address')}
                        className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyAddress}
                        disabled={isVerifying || !addressValue}
                        className="px-4 bg-slate-800/60 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700/40 text-slate-200 text-xs font-bold rounded-xl transition-all btn-press cursor-pointer"
                      >
                        {isVerifying ? t('Verifying...') : t('Verify')}
                      </button>
                    </div>
                    {errors.address && <p className="text-xs text-red-400 font-semibold mt-1">{errors.address.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Phone number')}
                      </label>
                      <input
                        type="tel"
                        placeholder={t('555-0199')}
                        {...register('phone')}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Email Address')}
                      </label>
                      <input
                        type="email"
                        placeholder={t('john@example.com')}
                        aria-invalid={errors.email ? 'true' : 'false'}
                        {...register('email')}
                        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      />
                      {errors.email && <p className="text-xs text-red-400 font-semibold mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  {/* Phase 3.5 Specific Fields inside Form */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Sign Inventory')}
                      </label>
                      <Controller
                        name="sign_status"
                        control={control}
                        render={({ field }) => (
                          <CustomSelect
                            options={[
                              { value: 'installed', label: t('Installed'), colorDot: '#10b981' },
                              { value: 'removed', label: t('Removed'), colorDot: '#64748b' },
                              { value: 'needs_service', label: t('Needs Service'), colorDot: '#f59e0b' },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Balance')} ($)
                      </label>
                      <input
                        type="number"
                        placeholder={t('0.00')}
                        step="0.01"
                        {...register('outstanding_balance', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Payment Status')}
                      </label>
                      <Controller
                        name="payment_status"
                        control={control}
                        render={({ field }) => (
                          <CustomSelect
                            options={[
                              { value: 'paid', label: t('Paid'), colorDot: '#10b981' },
                              { value: 'pending', label: t('Pending'), colorDot: '#f59e0b' },
                              { value: 'overdue', label: t('Overdue'), colorDot: '#ef4444' },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Status')}
                      </label>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <CustomSelect
                            options={[
                              { value: 'active', label: t('Active'), colorDot: '#10b981' },
                              { value: 'inactive', label: t('Inactive'), colorDot: '#64748b' },
                              { value: 'prospect', label: t('Prospect'), colorDot: '#f59e0b' },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('Property type')}
                      </label>
                      <Controller
                        name="property_type"
                        control={control}
                        render={({ field }) => (
                          <CustomSelect
                            options={[
                              { value: 'residential', label: t('Residential') },
                              { value: 'commercial', label: t('Commercial') },
                            ]}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                      <input
                        type="checkbox"
                        id="notifySms"
                        {...register('notify_sms')}
                        className="w-4 h-4 text-brand-600 border-slate-800 rounded bg-slate-950 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                      <label htmlFor="notifySms" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                        {t('Enable SMS Alerts')} 💬
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                      <input
                        type="checkbox"
                        id="notifyVoice"
                        {...register('notify_voice')}
                        className="w-4 h-4 text-brand-600 border-slate-800 rounded bg-slate-950 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                      <label htmlFor="notifyVoice" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                        {t('Enable Voice IVR')} 📞
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Driveway type')} ({t('Optional')})
                    </label>
                    <input
                      type="text"
                      placeholder={t('e.g. 2-car asphalt, gravel, steep slope')}
                      {...register('driveway_type')}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Access notes')} ({t('Optional')})
                    </label>
                    <textarea
                      placeholder={t('Gate code 4082, beware of dog on back lot')}
                      rows={3}
                      {...register('access_notes')}
                      className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Right Side Map Preview */}
                <div className="flex flex-col h-full border border-slate-800/50 rounded-2xl overflow-hidden min-h-[300px] md:min-h-0 bg-slate-950/40">
                  <div className="p-3 bg-slate-900/40 border-b border-slate-800/40 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-brand-400" /> {t('Geolocation preview')}
                    </span>
                    {previewCoords ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3" /> {t('Geocoded')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> {t('Unverified')}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 relative w-full h-full min-h-[250px] bg-slate-950/60">
                    {previewCoords ? (
                      <MapContainer
                        center={previewCoords}
                        zoom={14}
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                      >
                        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={previewCoords} icon={previewIcon} />
                        <ChangeMapView coords={previewCoords} />
                      </MapContainer>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                        <div className="w-12 h-12 rounded-full border border-slate-800/50 flex items-center justify-center text-slate-600 bg-slate-900/30">
                          <Eye className="w-5 h-5 animate-pulse" />
                        </div>
                        <p className="text-xs font-medium">{t('Verify address to preview coordinates on the map.')}</p>
                        <p className="text-[10px] text-slate-600 max-w-[200px]">
                          {t('Nominatim maps the address description to evolutionary spatial points.')}
                        </p>
                      </div>
                    )}
                  </div>

                  {previewCoords && (
                    <div className="p-3 bg-slate-900/30 border-t border-slate-800/30 text-[10px] font-mono text-slate-450 space-y-1">
                      <div><span className="text-slate-550">{t('Latitude')}:</span> {previewCoords[0].toFixed(6)}</div>
                      <div><span className="text-slate-550">{t('Longitude')}:</span> {previewCoords[1].toFixed(6)}</div>
                      <div className="truncate"><span className="text-slate-550">{t('Matched')}:</span> {previewName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-330 font-semibold text-sm rounded-xl transition-all cursor-pointer border border-slate-700/40"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
                >
                  {isSubmitting ? t('Saving...') : editingCustomer ? t('Update Profile') : t('Register Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import CSV Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setImportModalOpen(false)}></div>
          <div className="relative glass-card rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-up gradient-border">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-400" />
              {t('Bulk Import Customer Roster')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {t('Copy and paste raw comma-separated CSV text directly. Missing coordinates are geocoded automatically with 1.1s sequential query pacing to Nominatim.')}
            </p>
            <div className="text-[10px] bg-slate-900/60 border border-slate-800 p-2.5 rounded font-mono text-slate-400">
              {t('Headers')}: <strong className="text-brand-400">{t('Name, Address, Phone, Email, Property Type, Outstanding Balance, Sign Status')}</strong><br />
              Example: Acme Towers, 100 Main St Buffalo NY, +17165550001, admin@acme.com, commercial, 250.00, needs_service
            </div>
            <form onSubmit={handleImportCsvSubmit} className="space-y-4">
              <textarea
                placeholder={t('Name,Address,Phone,Email,Property Type,Outstanding Balance,Sign Status...')}
                rows={8}
                required
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-brand-500/50 focus:ring-2"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer border border-slate-700/40"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importCsvText}
                  className="px-5 py-2 bg-gradient-to-r from-brand-500 to-indigo-500 text-white font-semibold text-xs rounded-xl shadow cursor-pointer transition-all disabled:opacity-40"
                >
                  {isImporting ? t('Importing & Geocoding...') : t('Submit Roster')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
          <div className="relative glass-card rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center ring-4 ring-red-500/5">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">{t('Soft-Delete Customer?')}</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('This will mark the customer as deleted. They will no longer be included in storm routing lists, but historical routes and GPS logs will remain intact.')}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer border border-slate-700/40"
              >
                {t('Keep Active')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer ring-1 ring-white/10"
              >
                {t('Delete Profile')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
