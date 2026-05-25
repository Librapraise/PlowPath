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
  const [passesCount, setPassesCount] = useState('1');

  useEffect(() => {
    fetchStorms();
  }, []);

  const openAddModal = () => {
    setName('');
    setStartTime('');
    setEndTime('');
    setForecastedAccumulation('');
    setPassesCount('1');
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
        passes_count: passesCount ? parseInt(passesCount) : 1,
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black rounded-full shadow-glow-red animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> ACTIVE STORM
          </span>
        );
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-black rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> PLANNED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ARCHIVED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/60 border border-slate-700/50 text-slate-500 text-[11px] font-black rounded-full">
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Storm Operations Control</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Register storm accumulation forecasts, trigger active dispatching, and record actual event totals</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
        >
          <Plus className="w-5 h-5" />
          Plan Storm Event
        </button>
      </div>

      {/* Roster & Stats */}
      {isLoading && storms.length === 0 ? (
        <div className="space-y-4">
          <div className="h-32 rounded-2xl glass-card shimmer-bg"></div>
          <div className="h-64 rounded-2xl glass-card shimmer-bg"></div>
        </div>
      ) : storms.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl text-slate-500 font-medium">
          No storm events listed. Click "Plan Storm Event" to initialize.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Storm Highlight */}
          {storms.filter((s) => s.status === 'active').map((activeStorm) => (
            <div
              key={activeStorm.storm_id}
              className="p-6 frost-glow-card rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-slide-up"
            >
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.03] via-transparent to-red-500/[0.02] pointer-events-none"></div>

              <div className="relative flex items-center gap-4">
                <div className="w-13 h-13 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 animate-pulse ring-4 ring-red-500/5">
                  <CloudSnow className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-extrabold text-white leading-tight">{activeStorm.name}</h3>
                    {getStatusBadge(activeStorm.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Activated: <span className="font-bold text-slate-200">{formatDate(activeStorm.start_time)}</span>
                  </p>
                </div>
              </div>

              {/* Accumulation & Actions */}
              <div className="relative flex flex-wrap items-center gap-4">
                <div className="text-center stat-glass px-5 py-2.5 rounded-xl font-mono">
                  <div className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Forecast</div>
                  <div className="text-lg font-black text-slate-200">{activeStorm.forecasted_accumulation || '—'} in</div>
                </div>

                <div className="text-center stat-glass px-5 py-2.5 rounded-xl font-mono">
                  <div className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Passes</div>
                  <div className="text-lg font-black text-slate-200">{activeStorm.passes_count || 1}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openCompleteModal(activeStorm)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/15 cursor-pointer transition-all btn-press ring-1 ring-white/10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Storm
                  </button>
                  <button
                    onClick={() => handleCancel(activeStorm)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl border border-slate-700/40 cursor-pointer transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Planned & Historical Table */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-xl animate-slide-up animate-plow-sweep" style={{ animationDelay: '100ms' }}>
            <div className="p-5 border-b border-slate-800/40 flex items-center justify-between">
              <span className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-400" /> Planned & Archived Events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">

                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-450 text-[11px] font-bold uppercase tracking-wider bg-slate-900/20">
                    <th className="px-6 py-4">Event details</th>
                    <th className="px-6 py-4">Expected time frame</th>
                    <th className="px-6 py-4">Forecast</th>
                    <th className="px-6 py-4">Plow Passes</th>
                    <th className="px-6 py-4">Actual accumulation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-sm">
                  {storms.filter((s) => s.status !== 'active').map((s) => (
                    <tr key={s.storm_id} className="table-row-hover">
                      <td className="px-6 py-4 font-bold text-slate-100">
                        {s.name}
                      </td>
                      <td className="px-6 py-4 text-slate-350 font-semibold space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-550" />
                          <span>Start: {formatDate(s.start_time)}</span>
                        </div>
                        <div className="text-xs text-slate-500 pl-5">
                          End: {formatDate(s.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-200 font-bold">
                        {s.forecasted_accumulation ? `${s.forecasted_accumulation} in` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-200 font-bold">
                        {s.passes_count ?? 1}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-200 font-bold">
                        {s.actual_accumulation ? `${s.actual_accumulation} in` : s.status === 'completed' ? '0 in' : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(s.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === 'planned' && (
                            <>
                              <button
                                onClick={() => handleActivate(s)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-all btn-press ring-1 ring-white/10"
                                title="Activate Storm Dispatching"
                              >
                                <Play className="w-3.5 h-3.5" /> Activate
                              </button>
                              <button
                                onClick={() => handleCancel(s)}
                                className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-red-400 rounded-lg border border-transparent transition-all cursor-pointer"
                                title="Cancel Event"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Storm Log"
                          >
                            <XCircle className="w-4 h-4" />
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative glass-card rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 animate-scale-up space-y-6 gradient-border">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CloudSnow className="w-6 h-6 text-brand-400" /> Plan Storm Event
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Storm Name / Code
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter Storm Shirley 2026"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Expected Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Expected End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-350 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Forecast (inches)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={forecastedAccumulation}
                      onChange={(e) => setForecastedAccumulation(e.target.value)}
                      placeholder="e.g. 8.5"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-550">
                      in
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Storm Passes
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={passesCount}
                    onChange={(e) => setPassesCount(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer border border-slate-700/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCompleteModalId(null)}></div>
          <div className="relative glass-card rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 animate-scale-up gradient-border">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-emerald-400 animate-spin-slow" /> Archive Storm Event
            </h3>

            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
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
                  className="px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-350 font-semibold text-xs rounded-xl cursor-pointer border border-slate-700/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/15 cursor-pointer transition-all btn-press ring-1 ring-white/10"
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
