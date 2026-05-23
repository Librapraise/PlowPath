import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Activity, Users, Truck, CloudSnow, Navigation, LogOut, Menu, X } from 'lucide-react';
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
  ];

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Overlay */}
      <ToastContainer />

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shadow-xl z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
              PlowPath
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Operations</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/10 to-indigo-600/5 border-brand-500/20 text-brand-400 shadow-sm shadow-brand-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Panel */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs shadow-inner">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left max-w-[110px]">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-950/30 hover:text-red-400 rounded-lg text-slate-400 transition-all active:scale-95 cursor-pointer border border-transparent hover:border-red-900/30"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (backdrop + sliding side panel) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <aside className="relative flex flex-col w-64 max-w-[280px] h-full bg-slate-900 border-r border-slate-800 shadow-2xl animate-slide-in">
            {/* Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white tracking-tight">PlowPath</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Operations</p>
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600/10 to-indigo-600/5 border-brand-500/20 text-brand-400 shadow-sm'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs shadow-inner">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
                    <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-950/30 hover:text-red-400 rounded-lg text-slate-400 transition-all cursor-pointer border border-transparent hover:border-red-900/30"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-900 shadow-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className={`w-3.5 h-3.5 rounded-full transition-all duration-500 shadow-lg ${
                  socketConnected
                    ? 'bg-emerald-500 shadow-emerald-500/40 animate-pulse'
                    : 'bg-amber-500 shadow-amber-500/40 animate-bounce'
                }`}
                title={socketConnected ? 'Live Sockets Telemetry Connected' : 'Sockets Disconnected — Retrying...'}
              ></div>
              <p className="text-xs font-semibold text-slate-400 hidden sm:block">
                {socketConnected ? 'Live Telemetry Active' : 'Connecting Stream...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-850 border border-slate-800 rounded-full text-xs font-semibold text-brand-400 shadow-inner">
              PlowPath v3.0
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-auto bg-slate-950 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
