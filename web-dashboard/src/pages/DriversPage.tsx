import { useEffect, useState } from 'react';
import { useDriversStore, type Driver } from '../store/driversStore';
import { Plus, Edit2, Trash2, Phone, Mail, DollarSign, Truck, ShieldAlert, CheckCircle, ShieldX } from 'lucide-react';

export default function DriversPage() {
  const { drivers, isLoading, fetchDrivers, createDriver, updateDriver, deleteDriver } = useDriversStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openAddModal = () => {
    setEditingDriver(null);
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setHourlyRate('');
    setVehicleType('');
    setModalOpen(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingDriver(d);
    setName(d.name);
    setPhone(d.phone);
    setEmail(d.user_email || '');
    setPassword(''); // No password change here
    setHourlyRate(d.hourly_rate ? String(d.hourly_rate) : '');
    setVehicleType(d.vehicle_type || '');
    setModalOpen(true);
  };

  const handleStatusToggle = async (d: Driver) => {
    const nextStatus = d.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDriver(d.driver_id, { status: nextStatus });
    } catch {
      // Error handled by store
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name,
      phone,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      vehicle_type: vehicleType || undefined,
    };

    if (email) data.email = email;

    try {
      if (editingDriver) {
        await updateDriver(editingDriver.driver_id, data);
      } else {
        if (!password) return;
        data.password = password;
        await createDriver(data);
      }
      setModalOpen(false);
    } catch {
      // Error handled
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await deleteDriver(deactivateId);
      setDeactivateId(null);
    } catch {
      // Error handled
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Active Crew Directory</h2>
          <p className="text-sm text-slate-400">Add heavy machinery operators, update rates, and manage active duty rosters</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Crew Member
        </button>
      </div>

      {/* Roster Grid */}
      {isLoading && drivers.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-semibold animate-pulse">
          Synchronizing driver roster...
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
          No operators registered. Click "Add Crew Member" to expand the crew.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((d) => (
            <div
              key={d.driver_id}
              className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-64 bg-slate-900 shadow-lg relative group overflow-hidden ${
                d.status === 'active'
                  ? 'border-slate-800 hover:border-brand-500/30'
                  : 'border-slate-800/40 opacity-70 hover:opacity-100 hover:border-slate-700/60'
              }`}
            >
              {/* Background gradient hint */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-800/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-300"></div>

              <div>
                {/* Header Profile Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-extrabold text-brand-400 shadow-md">
                      {d.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight group-hover:text-brand-400 transition-colors">
                        {d.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">ID: {d.driver_id.slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* Active/Inactive Status Toggle Pill */}
                  <button
                    onClick={() => handleStatusToggle(d)}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-full border transition-all cursor-pointer ${
                      d.status === 'active'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/5'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-850 hover:text-slate-400'
                    }`}
                  >
                    {d.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Details Section */}
                <div className="mt-5 space-y-2 text-xs font-semibold text-slate-350">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{d.phone}</span>
                  </div>
                  {d.user_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="truncate max-w-[200px]">{d.user_email}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-brand-500/60" />
                      <span className="truncate">{d.vehicle_type || 'No vehicle'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-brand-500/60" />
                      <span>{d.hourly_rate ? `${d.hourly_rate}/hr` : 'No rate'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4">
                <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">
                  Role: driver
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(d)}
                    className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-slate-800 transition-all cursor-pointer"
                    title="Edit Operator Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeactivateId(d.driver_id)}
                    className="p-1.5 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-950/35 transition-all cursor-pointer"
                    title="Deactivate Operator"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 animate-slide-in space-y-6">
            <h3 className="text-xl font-bold text-white">
              {editingDriver ? 'Modify Operator Profile' : 'Enlist Crew Member'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marcus Miller"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 555-0144"
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
                    placeholder="marcus@plow.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              </div>

              {!editingDriver && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="e.g. Ford F-350 V-Plow"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Hourly rate ($)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
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
                  {isLoading ? 'Saving...' : editingDriver ? 'Update Profile' : 'Enlist Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Operator Dialog */}
      {deactivateId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/75" onClick={() => setDeactivateId(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <ShieldX className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white font-sans">Deactivate Driver?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              This will soft-delete the driver from PlowPath. They will no longer be able to log into the mobile app, receive routes, or transmit live GPS signals.
            </p>
            <div className="flex justify-end gap-2.5 font-sans">
              <button
                onClick={() => setDeactivateId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Keep Active
              </button>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
