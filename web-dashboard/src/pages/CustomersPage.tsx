import { useEffect, useState } from 'react';
import { useCustomersStore, type Customer } from '../store/customersStore';
import { Search, Plus, Edit2, Trash2, Home, Landmark, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

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
  const {
    customers, page, total, perPage, search, statusFilter, isLoading,
    fetchCustomers, setFilters, createCustomer, updateCustomer, deleteCustomer, geocodePreview
  } = useCustomersStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'prospect'>('active');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [drivewayType, setDrivewayType] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [notifySms, setNotifySms] = useState(true);
  const [notifyVoice, setNotifyVoice] = useState(false);
  
  // Geocoding preview state
  const [previewCoords, setPreviewCoords] = useState<[number, number] | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setStatus('active');
    setPropertyType('residential');
    setDrivewayType('');
    setAccessNotes('');
    setNotifySms(true);
    setNotifyVoice(false);
    setPreviewCoords(null);
    setPreviewName(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setAddress(c.address);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setStatus(c.status);
    setPropertyType(c.property_type);
    setDrivewayType(c.driveway_type || '');
    setAccessNotes(c.access_notes || '');
    setNotifySms(c.notify_sms !== false);
    setNotifyVoice(c.notify_voice === true);
    setPreviewCoords([c.lat, c.lon]);
    setPreviewName(c.address);
    setModalOpen(true);
  };

  const handleVerifyAddress = async () => {
    if (!address.trim()) return;
    setIsVerifying(true);
    try {
      const res = await geocodePreview(address);
      setPreviewCoords([res.lat, res.lon]);
      setPreviewName(res.displayName || address);
    } catch {
      // Error handled by store toast
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name,
      address,
      phone: phone || null,
      email: email || null,
      status,
      property_type: propertyType,
      driveway_type: drivewayType || null,
      access_notes: accessNotes || null,
      notify_sms: notifySms,
      notify_voice: notifyVoice,
    };

    if (previewCoords) {
      data.lat = previewCoords[0];
      data.lon = previewCoords[1];
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.customer_id, data);
      } else {
        await createCustomer(data);
      }
      setModalOpen(false);
    } catch {
      // Error handled by store
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Customer Accounts</h2>
          <p className="text-sm text-slate-400">Manage servicing properties, geocodes, and service decisions</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Filters Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-lg">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, address, or phone..."
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-slate-600"
          />
        </div>
        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setFilters({ statusFilter: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50 transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-900/50">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Property info</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Alerts</th>
                <th className="px-6 py-4">Decision</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 font-semibold animate-pulse">
                    Retrieving customer database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    No customers found matching the criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="px-6 py-4.5">
                      <div className="font-bold text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs sm:max-w-sm mt-0.5">{c.address}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        {c.property_type === 'residential' ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md text-xs text-sky-400 font-bold">
                            <Home className="w-3.5 h-3.5" /> Residential
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-400 font-bold">
                            <Landmark className="w-3.5 h-3.5" /> Commercial
                          </span>
                        )}
                        {c.driveway_type && (
                          <span className="text-xs text-slate-400 font-medium">({c.driveway_type})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-sm space-y-0.5">
                      <div className="text-slate-200 font-medium">{c.phone || '—'}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{c.email || ''}</div>
                    </td>
                    <td className="px-6 py-4.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className={c.notify_sms !== false ? 'text-emerald-400 font-semibold' : 'text-slate-500 line-through'}>
                          💬 SMS: {c.notify_sms !== false ? 'On' : 'Off'}
                        </span>
                        <span className={c.notify_voice ? 'text-indigo-400 font-semibold' : 'text-slate-500'}>
                          📞 Voice: {c.notify_voice ? 'On' : 'Off'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      {c.next_service_decision === 'confirm' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          Confirm ✅
                        </span>
                      )}
                      {c.next_service_decision === 'skip' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                          Skip ❌
                        </span>
                      )}
                      {!c.next_service_decision && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold">
                          None ⏳
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      {c.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      )}
                      {c.status === 'inactive' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Inactive
                        </span>
                      )}
                      {c.status === 'prospect' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Prospect
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.customer_id)}
                          className="p-1.5 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-950/35 transition-all cursor-pointer"
                          title="Delete Customer"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/40 text-sm">
            <span className="text-slate-400">
              Showing page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setFilters({ page: page - 1 })}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setFilters({ page: page + 1 })}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingCustomer ? 'Modify Customer Profile' : 'Register New Customer Property'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      Customer name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe, Buffalo Mall"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      Service address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 125 Main St, Buffalo NY"
                        className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyAddress}
                        disabled={isVerifying || !address}
                        className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        Phone number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="555-0199"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50 cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="prospect">Prospect</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        Property type
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50 cursor-pointer"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                      <input
                        type="checkbox"
                        id="notifySms"
                        checked={notifySms}
                        onChange={(e) => setNotifySms(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-800 rounded bg-slate-950 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer animate-fade-in"
                      />
                      <label htmlFor="notifySms" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                        Enable SMS Alerts 💬
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                      <input
                        type="checkbox"
                        id="notifyVoice"
                        checked={notifyVoice}
                        onChange={(e) => setNotifyVoice(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-800 rounded bg-slate-950 focus:ring-brand-500 focus:ring-offset-slate-900 cursor-pointer animate-fade-in"
                      />
                      <label htmlFor="notifyVoice" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                        Enable Voice IVR 📞
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      Driveway type (Optional)
                    </label>
                    <input
                      type="text"
                      value={drivewayType}
                      onChange={(e) => setDrivewayType(e.target.value)}
                      placeholder="e.g. 2-car asphalt, gravel, steep slope"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      Access notes (Optional)
                    </label>
                    <textarea
                      value={accessNotes}
                      onChange={(e) => setAccessNotes(e.target.value)}
                      placeholder="Gate code 4082, beware of dog on back lot"
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                </div>

                {/* Right Side Map Preview */}
                <div className="flex flex-col h-full border border-slate-800 rounded-2xl overflow-hidden min-h-[300px] md:min-h-0 bg-slate-950">
                  <div className="p-3 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-brand-400" /> Geolocation preview
                    </span>
                    {previewCoords ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3" /> Geocoded
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </div>

                  <div className="flex-1 relative w-full h-full min-h-[250px] bg-slate-950">
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
                        <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-slate-600 bg-slate-900/30">
                          <Eye className="w-5 h-5 animate-pulse" />
                        </div>
                        <p className="text-xs font-medium">Verify address to preview coordinates on the map.</p>
                        <p className="text-[10px] text-slate-600 max-w-[200px]">
                          Nominatim maps the address description to evolutionary spatial points.
                        </p>
                      </div>
                    )}
                  </div>

                  {previewCoords && (
                    <div className="p-3 bg-slate-900/50 border-t border-slate-850 text-[10px] font-mono text-slate-400 space-y-1">
                      <div><span className="text-slate-500">Lat:</span> {previewCoords[0].toFixed(6)}</div>
                      <div><span className="text-slate-500">Lon:</span> {previewCoords[1].toFixed(6)}</div>
                      <div className="truncate"><span className="text-slate-500">Matched:</span> {previewName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  {isLoading ? 'Saving...' : editingCustomer ? 'Update Profile' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-slate-950/75" onClick={() => setDeleteId(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Soft-Delete Customer?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will mark the customer as deleted. They will no longer be included in storm routing lists, but historical routes and GPS logs will remain intact.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Keep Active
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
