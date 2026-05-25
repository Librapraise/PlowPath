import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Activity, Users, Truck, CloudSnow, Navigation, LogOut, Menu, X, Zap, Coins } from 'lucide-react';
import ToastContainer from './ToastContainer';
import { io } from 'socket.io-client';

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Monitor Socket.io connection state
  useEffect(() => {
    if (!token) return;
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
    const socket = io(wsUrl, { auth: { token } });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Live Ops Map', icon: Activity, roles: ['owner', 'manager', 'driver'] },
    { to: '/customers', label: 'Customers', icon: Users, roles: ['owner', 'manager'] },
    { to: '/drivers', label: 'Drivers', icon: Truck, roles: ['owner', 'manager'] },
    { to: '/storms', label: 'Storms', icon: CloudSnow, roles: ['owner', 'manager'] },
    { to: '/routes', label: 'Routes', icon: Navigation, roles: ['owner', 'manager'] },
    { to: '/finance', label: 'Finance & Signs', icon: Coins, roles: ['owner', 'manager'] },
  ];

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-[#0a0f1a] text-slate-100 overflow-hidden font-sans">
      {/* Subtle noise grain overlay */}
      <div className="noise-overlay"></div>

      {/* Toast Overlay */}
      <ToastContainer />

      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel relative z-20 border-r-0">
        {/* Subtle gradient sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.03] to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-brand-500/20 via-slate-700/30 to-transparent"></div>

        {/* Brand */}
        <div className="relative flex items-center gap-3 px-6 py-5 border-b border-slate-800/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/10">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-gradient">
              PlowPath
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Operations Console</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/[0.08] to-indigo-500/[0.04] text-brand-400 shadow-sm shadow-brand-500/5 nav-active-bar'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Panel */}
        <div className="relative p-4 border-t border-slate-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/20 to-indigo-500/20 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-xs shadow-inner ring-1 ring-white/5">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left max-w-[110px]">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[9px] font-bold text-brand-400/80 uppercase tracking-widest truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-500 transition-all active:scale-95 cursor-pointer border border-transparent hover:border-red-500/15"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (backdrop + sliding side panel) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[10000] lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-64 max-w-[280px] h-full glass-panel shadow-2xl animate-slide-in">
            {/* Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-gradient">PlowPath</h1>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Operations Console</p>
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-500/[0.08] to-indigo-500/[0.04] text-brand-400 shadow-sm nav-active-bar'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`
                    }
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/20 to-indigo-500/20 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-xs shadow-inner">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
                    <p className="text-[9px] font-bold text-brand-400/80 uppercase tracking-widest">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-500 transition-all cursor-pointer border border-transparent hover:border-red-500/15"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 py-3 glass-panel border-t-0 border-l-0 border-r-0 shadow-lg z-10 relative">
          {/* Subtle bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent"></div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 text-slate-400 rounded-lg border border-slate-800/50 cursor-pointer transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    socketConnected
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] telemetry-ping'
                      : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-bounce'
                  }`}
                ></div>
              </div>
              <p className="text-xs font-medium text-slate-400 hidden sm:block">
                {socketConnected ? (
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Live Telemetry Active
                  </span>
                ) : (
                  'Connecting Stream...'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1.5 bg-gradient-to-r from-brand-500/[0.08] to-indigo-500/[0.06] border border-brand-500/15 rounded-full text-[11px] font-semibold text-brand-400 tracking-wide">
              PlowPath v3.0
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-auto bg-[#0a0f1a] relative">
          {/* Subtle top radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-radial-glow pointer-events-none"></div>
          <div className="relative animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
