import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Settings, Shield, Bell, CloudSnow, Globe, User, Lock, Sparkles, Phone, Mail, Coins } from 'lucide-react';

interface OrgSettings {
  settings_id: string;
  company_name: string;
  support_phone: string | null;
  support_email: string | null;
  settings: {
    storm_accumulation_threshold_inches: number;
    message_templates: {
      sms_pre_storm: string;
      sms_en_route: string;
      sms_completed: string;
      email_overdue?: string;
    };
    quiet_hours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    geocoding_bounds?: {
      min_lat: number;
      min_lon: number;
      max_lat: number;
      max_lon: number;
    } | null;
    pricing?: {
      residential_rate: number;
      commercial_rate: number;
      fuel_price_per_gallon: number;
      vehicle_mpg: number;
      overhead_percentage: number;
    } | null;
  };
}

interface UserProfile {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: string;
}

export default function SettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<'org' | 'account' | 'pricing' | 'notifications' | 'geocoding'>('org');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Org Settings State
  const [orgData, setOrgData] = useState<OrgSettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [threshold, setThreshold] = useState('2.0');
  const [preStormTemplate, setPreStormTemplate] = useState('');
  const [enRouteTemplate, setEnRouteTemplate] = useState('');
  const [completedTemplate, setCompletedTemplate] = useState('');
  const [emailOverdueTemplate, setEmailOverdueTemplate] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('06:00');
  const [minLat, setMinLat] = useState('40.0');
  const [minLon, setMinLon] = useState('-80.0');
  const [maxLat, setMaxLat] = useState('45.0');
  const [maxLon, setMaxLon] = useState('-70.0');

  // Pricing State
  const [residentialRate, setResidentialRate] = useState('50.0');
  const [commercialRate, setCommercialRate] = useState('150.0');
  const [fuelPrice, setFuelPrice] = useState('3.75');
  const [vehicleMpg, setVehicleMpg] = useState('10.0');
  const [overheadPercentage, setOverheadPercentage] = useState('15.0');

  // Account State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch Settings & Profile
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [orgRes, userRes] = await Promise.all([
          api.get<OrgSettings>('/settings'),
          api.get<UserProfile>('/users/me'),
        ]);

        const org = orgRes.data;
        setOrgData(org);
        setCompanyName(org.company_name);
        setSupportPhone(org.support_phone || '');
        setSupportEmail(org.support_email || '');
        setThreshold(String(org.settings.storm_accumulation_threshold_inches));
        setPreStormTemplate(org.settings.message_templates.sms_pre_storm);
        setEnRouteTemplate(org.settings.message_templates.sms_en_route);
        setCompletedTemplate(org.settings.message_templates.sms_completed);
        setEmailOverdueTemplate(org.settings.message_templates.email_overdue || '');
        setQuietHoursEnabled(org.settings.quiet_hours.enabled);
        setQuietHoursStart(org.settings.quiet_hours.start);
        setQuietHoursEnd(org.settings.quiet_hours.end);
        
        if (org.settings.geocoding_bounds) {
          setMinLat(String(org.settings.geocoding_bounds.min_lat));
          setMinLon(String(org.settings.geocoding_bounds.min_lon));
          setMaxLat(String(org.settings.geocoding_bounds.max_lat));
          setMaxLon(String(org.settings.geocoding_bounds.max_lon));
        }

        if (org.settings.pricing) {
          setResidentialRate(String(org.settings.pricing.residential_rate));
          setCommercialRate(String(org.settings.pricing.commercial_rate));
          setFuelPrice(String(org.settings.pricing.fuel_price_per_gallon));
          setVehicleMpg(String(org.settings.pricing.vehicle_mpg));
          setOverheadPercentage(String(org.settings.pricing.overhead_percentage));
        }

        const user = userRes.data;
        setProfile(user);
        setProfileName(user.name);
        setProfileEmail(user.email || '');
        setProfilePhone(user.phone || '');
      } catch {
        addToast('Failed to load settings data', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save Org Settings
  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgData) return;
    try {
      setSaving(true);
      const updatedSettings = {
        company_name: companyName,
        support_phone: supportPhone || null,
        support_email: supportEmail || null,
        settings: {
          storm_accumulation_threshold_inches: parseFloat(threshold),
          message_templates: {
            sms_pre_storm: preStormTemplate,
            sms_en_route: enRouteTemplate,
            sms_completed: completedTemplate,
            email_overdue: emailOverdueTemplate,
          },
          quiet_hours: {
            enabled: quietHoursEnabled,
            start: quietHoursStart,
            end: quietHoursEnd,
          },
          geocoding_bounds: {
            min_lat: parseFloat(minLat),
            min_lon: parseFloat(minLon),
            max_lat: parseFloat(maxLat),
            max_lon: parseFloat(maxLon),
          },
          pricing: {
            residential_rate: parseFloat(residentialRate),
            commercial_rate: parseFloat(commercialRate),
            fuel_price_per_gallon: parseFloat(fuelPrice),
            vehicle_mpg: parseFloat(vehicleMpg),
            overhead_percentage: parseFloat(overheadPercentage),
          },
        },
      };

      await api.put('/settings', updatedSettings);
      addToast('Organization settings updated successfully', 'success');
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message ?? 'Failed to save settings';
      addToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Account Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedProfile = {
        name: profileName,
        email: profileEmail || null,
        phone: profilePhone || null,
      };

      const { data } = await api.put<UserProfile>('/users/me', updatedProfile);
      setProfile(data);
      addToast('Account profile updated successfully', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.error?.message ?? 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Confirm password does not match new password', 'error');
      return;
    }
    try {
      setSaving(true);
      await api.put('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password updated successfully', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.error?.message ?? 'Password update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Autocomplete Tag Injection
  const injectTag = (textareaId: 'pre' | 'route' | 'completed', tag: string) => {
    if (textareaId === 'pre') {
      setPreStormTemplate((prev) => prev + ` ${tag}`);
    } else if (textareaId === 'route') {
      setEnRouteTemplate((prev) => prev + ` ${tag}`);
    } else {
      setCompletedTemplate((prev) => prev + ` ${tag}`);
    }
  };

  const injectEmailTag = (tag: string) => {
    setEmailOverdueTemplate((prev) => prev + tag);
  };

  const renderEmailPreviewHTML = () => {
    return emailOverdueTemplate
      .replace(/{{customer_name}}/g, 'John Doe')
      .replace(/{{customer_address}}/g, '123 Blizzard Boulevard, Buffalo, NY 14201')
      .replace(/{{date}}/g, new Date().toLocaleDateString())
      .replace(/{{ref_code}}/g, 'AR-8A2D3C4E')
      .replace(/{{payment_status}}/g, 'overdue')
      .replace(/{{outstanding_balance}}/g, '$185.00');
  };

  const tabs = [
    { id: 'org', label: 'Company Profile', icon: Shield },
    { id: 'account', label: 'My Account', icon: User },
    { id: 'pricing', label: 'Financial Billing Rates', icon: Coins },
    { id: 'notifications', label: 'Alert Layouts & Quiet Hours', icon: Bell },
    { id: 'geocoding', label: 'Geocoding Bounding Boxes', icon: Globe },
  ] as const;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-800/40 rounded-xl shimmer-bg"></div>
        <div className="h-96 rounded-2xl glass-card shimmer-bg"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-slide-up">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">System Configuration Center</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Fine-tune system thresholds, SMS templates, quiet hours, and regional limits</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3 md:pb-0 scrollbar-none border-b md:border-b-0 border-slate-800/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-brand-500/[0.08] to-indigo-500/[0.04] text-brand-400 border border-brand-500/15 shadow-sm shadow-brand-500/5'
                    : 'text-slate-450 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="flex-1 w-full glass-card rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-slide-up border border-slate-850">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/15 to-transparent"></div>

          {/* TAB 1: Company Profile */}
          {activeTab === 'org' && (
            <form onSubmit={handleSaveOrgSettings} className="space-y-6">
              <div className="border-b border-slate-800/40 pb-4">
                <h3 className="text-base font-extrabold text-white">Company Profile Settings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Define system branding and centralized operational limits</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. PlowPath Operations"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Accumulation Dispatch Trigger (Inches)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      placeholder="e.g. 2.0"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-550">in</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Centralized Support Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="e.g. +15551234567"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Centralized Support Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="e.g. support@plowpath.app"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800/40">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
                >
                  {saving ? 'Saving changes...' : 'Save Company Profile'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Financial Billing Rates */}
          {activeTab === 'pricing' && (
            <form onSubmit={handleSaveOrgSettings} className="space-y-6">
              <div className="border-b border-slate-800/40 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-400" /> Financial Billing Rates & Estimates
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize default customer pricing, fuel parameters, and overhead ratios to run automatic storm calculations</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Residential Plow Rate ($ per Stop)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={residentialRate}
                      onChange={(e) => setResidentialRate(e.target.value)}
                      placeholder="50.00"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Commercial Plow Rate ($ per Stop)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={commercialRate}
                      onChange={(e) => setCommercialRate(e.target.value)}
                      placeholder="150.00"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Fuel Cost ($ per Gallon)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={fuelPrice}
                      onChange={(e) => setFuelPrice(e.target.value)}
                      placeholder="3.75"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Truck Fuel Economy (MPG)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={vehicleMpg}
                      onChange={(e) => setVehicleMpg(e.target.value)}
                      placeholder="10.0"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-550 font-sans">mpg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Overhead Allocation (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={overheadPercentage}
                      onChange={(e) => setOverheadPercentage(e.target.value)}
                      placeholder="15.0"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-550 font-sans">%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800/40">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
                >
                  {saving ? 'Saving changes...' : 'Save Billing Rates'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: My Account */}
          {activeTab === 'account' && (
            <div className="space-y-8 divide-y divide-slate-800/40">
              {/* Profile Details */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="pb-4">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-400" /> Personal Account Roster Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Manage your personal credentials, support contact, and access roles</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Operational Access Role
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile?.role.toUpperCase() || 'MANAGER'}
                      className="w-full px-4 py-2.5 bg-slate-950/30 border border-slate-800/40 rounded-xl text-slate-500 text-sm font-black cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="e.g. you@plowpath.com"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +15550000000"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    {saving ? 'Saving...' : 'Update Details'}
                  </button>
                </div>
              </form>

              {/* Password Reset */}
              <form onSubmit={handleSavePassword} className="space-y-4 pt-6">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-400" /> Reset Operational Password
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Securely rotate your access credentials to prevent unauthorized account logins</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-650 hover:from-indigo-400 hover:to-indigo-550 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all btn-press ring-1 ring-white/10"
                  >
                    {saving ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Alert Layouts & Quiet Hours */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveOrgSettings} className="space-y-6">
              <div className="border-b border-slate-800/40 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-400" /> Dispatch SMS Templates & Quiet Hours
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize default text copy sent to customers and configure communication blackout periods</p>
              </div>

              {/* Template Editor Cards */}
              <div className="space-y-5">
                {/* PRE STORM */}
                <div className="glass-card p-4 rounded-xl space-y-3 border border-slate-850">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">1. Pre-Storm Warning Template</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inject Tags:</span>
                      <button type="button" onClick={() => injectTag('pre', '{{customer}}')} className="tag-chip">customer</button>
                      <button type="button" onClick={() => injectTag('pre', '{{address}}')} className="tag-chip">address</button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={preStormTemplate}
                    onChange={(e) => setPreStormTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium leading-relaxed"
                  />
                </div>

                {/* EN ROUTE */}
                <div className="glass-card p-4 rounded-xl space-y-3 border border-slate-850">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">2. Crew En-Route Template</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inject Tags:</span>
                      <button type="button" onClick={() => injectTag('route', '{{customer}}')} className="tag-chip">customer</button>
                      <button type="button" onClick={() => injectTag('route', '{{address}}')} className="tag-chip">address</button>
                      <button type="button" onClick={() => injectTag('route', '{{eta}}')} className="tag-chip">eta</button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={enRouteTemplate}
                    onChange={(e) => setEnRouteTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium leading-relaxed"
                  />
                </div>

                {/* COMPLETED */}
                <div className="glass-card p-4 rounded-xl space-y-3 border border-slate-850">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">3. Completion Proof Template</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inject Tags:</span>
                      <button type="button" onClick={() => injectTag('completed', '{{customer}}')} className="tag-chip">customer</button>
                      <button type="button" onClick={() => injectTag('completed', '{{address}}')} className="tag-chip">address</button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={completedTemplate}
                    onChange={(e) => setCompletedTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium leading-relaxed"
                  />
                </div>

                {/* OVERDUE EMAIL TEMPLATE */}
                <div className="glass-card p-5 rounded-xl space-y-4 border border-slate-850">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-brand-400" />
                      <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">4. Overdue Account Invoice Email Template</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inject Tags:</span>
                      <button type="button" onClick={() => injectEmailTag('{{customer_name}}')} className="tag-chip">customer_name</button>
                      <button type="button" onClick={() => injectEmailTag('{{customer_address}}')} className="tag-chip">customer_address</button>
                      <button type="button" onClick={() => injectEmailTag('{{date}}')} className="tag-chip">date</button>
                      <button type="button" onClick={() => injectEmailTag('{{ref_code}}')} className="tag-chip">ref_code</button>
                      <button type="button" onClick={() => injectEmailTag('{{payment_status}}')} className="tag-chip">payment_status</button>
                      <button type="button" onClick={() => injectEmailTag('{{outstanding_balance}}')} className="tag-chip">outstanding_balance</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-medium">
                    Design a premium, responsive HTML email notice to alert clients with overdue balances. Double-bracket tags will be dynamically replaced when reminding customers.
                  </p>
                  <div className="flex flex-col gap-3">
                    <textarea
                      rows={12}
                      required
                      value={emailOverdueTemplate}
                      onChange={(e) => setEmailOverdueTemplate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-mono leading-relaxed"
                      placeholder="<!-- Enter HTML Email Template -->"
                    />
                    
                    {/* HTML Preview Trigger */}
                    <div className="flex items-center justify-between bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[11px] font-bold text-slate-400">Live Render HTML Sandbox Preview</span>
                      <button
                        type="button"
                        onClick={() => setShowEmailPreview(!showEmailPreview)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                      >
                        {showEmailPreview ? 'Collapse Preview' : 'Expand Live Preview'}
                      </button>
                    </div>
                    
                    {showEmailPreview && (
                      <div className="w-full h-[400px] border border-slate-800 bg-white rounded-xl overflow-hidden shadow-inner">
                        <iframe
                          srcDoc={renderEmailPreviewHTML()}
                          title="Email Overdue Template Preview"
                          className="w-full h-full border-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quiet Hours Panel */}
              <div className="glass-card p-5 rounded-xl border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-400" /> Quiet Hours Message Buffer
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quietHoursEnabled}
                      onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-450 leading-relaxed font-medium">When active, all automated pre-storm and completion SMS notifications generated inside the quiet hour window are held in a postponed Bull queue and dispatched automatically at the end of quiet hours.</p>

                {quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">
                        Quiet Period Begins
                      </label>
                      <input
                        type="time"
                        required
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 transition-all font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">
                        Quiet Period Concludes
                      </label>
                      <input
                        type="time"
                        required
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 transition-all font-bold font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800/40">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
                >
                  {saving ? 'Saving changes...' : 'Save Alerts & Quiet Hours'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Geocoding Bounding Boxes */}
          {activeTab === 'geocoding' && (
            <form onSubmit={handleSaveOrgSettings} className="space-y-6">
              <div className="border-b border-slate-800/40 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-400" /> Geocoding Bounding Limits
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Restrict Nominatim address searches strictly to your local county or state to prevent global coordinate conflicts</p>
              </div>

              <p className="text-xs text-slate-450 leading-relaxed font-medium">Entering geocoding bounds locks Nominatim search queries to the specified lat/lon boundary coordinates. Addresses found outside these bounds will be filtered to avoid accidental lookups in another state.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Minimum Latitude (South Limit)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={minLat}
                    onChange={(e) => setMinLat(e.target.value)}
                    placeholder="e.g. 40.0"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Maximum Latitude (North Limit)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={maxLat}
                    onChange={(e) => setMaxLat(e.target.value)}
                    placeholder="e.g. 45.0"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Minimum Longitude (West Limit)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={minLon}
                    onChange={(e) => setMinLon(e.target.value)}
                    placeholder="e.g. -80.0"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Maximum Longitude (East Limit)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={maxLon}
                    onChange={(e) => setMaxLon(e.target.value)}
                    placeholder="e.g. -70.0"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800/40">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition-all btn-press cursor-pointer ring-1 ring-white/10"
                >
                  {saving ? 'Saving bounds...' : 'Save Geocoding Bounds'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
