import { useEffect, useState } from 'react';
import { useStormsStore, type StormEvent } from '../store/stormsStore';
import { Plus, CloudSnow, Play, CheckCircle2, XCircle, Calendar, Snowflake, BarChart3 } from 'lucide-react';

export default function StormsPage() {
  const { storms, isLoading, fetchStorms, createStorm, updateStorm, deleteStorm } = useStormsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [forecastedAccumulation, setForecastedAccumulation] = useState('');
  const [actualAccumulation, setActualAccumulation] = useState('');

  useEffect(() => {
    fetchStorms();
  }, []);

  const openAddModal = () => {
    setName('');
    setStartTime('');
    setEndTime('');
    setForecastedAccumulation('');
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStorm({
        name,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        forecasted_accumulation: forecastedAccumulation ? parseFloat(forecastedAccumulation) : null,
        status: 'planned',
      });
      setModalOpen(false);
    } catch {
      // Error handled
    }
  };

  const handleActivate = async (s: StormEvent) => {
    try {
      await updateStorm(s.storm_id, {
        status: 'active',
        start_time: new Date().toISOString(), // auto start on activation
      });
    } catch {
      // Error handled
    }
  };

  const openCompleteModal = (s: StormEvent) => {
    setCompleteModalId(s.storm_id);
    setActualAccumulation(s.forecasted_accumulation ? String(s.forecasted_accumulation) : '');
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalId) return;
    try {
      await updateStorm(completeModalId, {
        status: 'completed',
        end_time: new Date().toISOString(),
        actual_accumulation: actualAccumulation ? parseFloat(actualAccumulation) : null,
      });
      setCompleteModalId(null);
    } catch {
      // Error handled
    }
  };

  const handleCancel = async (s: StormEvent) => {
    if (!confirm('Are you sure you want to cancel this storm event?')) return;
    try {
      await updateStorm(s.storm_id, { status: 'cancelled' });
    } catch {
      // Error
    }
  };

  const handleDelete = async (s: StormEvent) => {
    if (!confirm('Are you sure you want to delete this storm from database?')) return;
    try {
      await deleteStorm(s.storm_id);
    } catch {
      // Error
    }
  };

  const getStatusBadge = (status: StormEvent['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black rounded-full shadow-lg shadow-red-500/5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> ACTIVE STORM
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-black rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> PLANNED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ARCHIVED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-500 text-xs font-black rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> CANCELLED
          </span>
        );
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Storm Operations Control</h2>
          <p className="text-sm text-slate-400">Register storm accumulation forecasts, trigger active dispatching, and record actual event totals</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Plan Storm Event
        </button>
      </div>

      {/* Roster & Stats */}
      {isLoading && storms.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-semibold animate-pulse">
          Synchronizing storm telemetry...
        </div>
      ) : storms.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
          No storm events listed. Click "Plan Storm Event" to initialize.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Storm Highlight */}
          {storms.filter((s) => s.status === 'active').map((activeStorm) => (
            <div key={activeStorm.storm_id} className="p-6 bg-gradient-to-r from-red-950/20 to-slate-900 border border-red-900/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 animate-pulse">
                  <CloudSnow className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-extrabold text-white leading-tight">{activeStorm.name}</h3>
                    {getStatusBadge(activeStorm.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Activated: <span className="font-bold text-slate-200">{formatDate(activeStorm.start_time)}</span>
                  </p>
                </div>
              </div>

              {/* Accumulation & Actions */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center bg-slate-950/40 border border-slate-850 px-5 py-2.5 rounded-xl font-mono">
                  <div className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Forecast</div>
                  <div className="text-lg font-black text-slate-200">{activeStorm.forecasted_accumulation || '—'} in</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openCompleteModal(activeStorm)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    Complete Storm
                  </button>
                  <button
                    onClick={() => handleCancel(activeStorm)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Planned & Historical Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between">
              <span className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-400" /> Planned & Archived Events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-900/50">
                    <th className="px-6 py-4">Event details</th>
                    <th className="px-6 py-4">Expected time frame</th>
                    <th className="px-6 py-4">Forecast</th>
                    <th className="px-6 py-4">Actual accumulation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {storms.filter((s) => s.status !== 'active').map((s) => (
                    <tr key={s.storm_id} className="hover:bg-slate-850/30 transition-colors">
                      <td className="px-6 py-4.5 font-bold text-slate-100">
                        {s.name}
                      </td>
                      <td className="px-6 py-4.5 text-slate-350 font-semibold space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-550" />
                          <span>Start: {formatDate(s.start_time)}</span>
                        </div>
                        <div className="text-xs text-slate-500 pl-5">
                          End: {formatDate(s.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-slate-200 font-bold">
                        {s.forecasted_accumulation ? `${s.forecasted_accumulation} in` : '—'}
                      </td>
                      <td className="px-6 py-4.5 font-mono text-slate-200 font-bold">
                        {s.actual_accumulation ? `${s.actual_accumulation} in` : s.status === 'completed' ? '0 in' : '—'}
                      </td>
                      <td className="px-6 py-4.5">
                        {getStatusBadge(s.status)}
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === 'planned' && (
                            <>
                              <button
                                onClick={() => handleActivate(s)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-brand-650 hover:bg-brand-550 border border-brand-700/30 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                                title="Activate Storm Dispatching"
                              >
                                <Play className="w-3.5 h-3.5" /> Activate
                              </button>
                              <button
                                onClick={() => handleCancel(s)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-transparent transition-all cursor-pointer"
                                title="Cancel Event"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 hover:bg-red-950/20 text-slate-500 hover:text-red-450 rounded-lg transition-colors cursor-pointer"
                            title="Delete Storm Log"
                          >
                            <XCircle className="w-4 h-4 text-red-500/40 hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plan Storm Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 animate-slide-in space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CloudSnow className="w-6 h-6 text-brand-400" /> Plan Storm Event
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Storm Name / Code
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter Storm Shirley 2026"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Expected Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Expected End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Forecasted Accumulation (inches)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={forecastedAccumulation}
                    onChange={(e) => setForecastedAccumulation(e.target.value)}
                    placeholder="e.g. 8.5"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    inches
                  </div>
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
                  {isLoading ? 'Saving...' : 'Plan Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Storm Modal */}
      {completeModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setCompleteModalId(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 animate-scale-up">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-emerald-400 animate-spin-slow" /> Archive Storm Event
            </h3>

            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Actual Recorded Accumulation
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={actualAccumulation}
                    onChange={(e) => setActualAccumulation(e.target.value)}
                    placeholder="e.g. 9.2"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    inches
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 font-sans">
                <button
                  type="button"
                  onClick={() => setCompleteModalId(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Record & Close Storm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
