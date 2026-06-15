import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  CloudSnow,
  Activity,
  Users,
  BarChart3,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Navigation,
  Smartphone,
  Shield,
  HelpCircle,
  FileText,
  Mail,
  Snowflake,
  ExternalLink,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

// Floating snowflake particle component
function SnowParticle({ delay, size, x }: { delay: number; size: number; x: number }) {
  return (
    <div
      className="absolute pointer-events-none select-none text-white/[0.04] animate-float"
      style={{
        left: `${x}%`,
        top: `${-10 + delay * 3}%`,
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${8 + delay * 0.8}s`,
      }}
    >
      <Snowflake className="w-full h-full" />
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-slate-200 hover:text-white transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-400' : ''}`} />
      </button>
      <div
        className={`px-6 overflow-hidden transition-all duration-300 text-slate-400 text-sm leading-relaxed ${
          isOpen ? 'pb-5 max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {answer}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const snowflakes = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      delay: Math.random() * 5,
      size: 10 + Math.random() * 24,
      x: Math.random() * 100,
      key: i,
    }))
  ).current;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 font-sans relative overflow-x-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"></div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-500/[0.03] blur-[150px] pointer-events-none select-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.03] blur-[150px] pointer-events-none select-none"></div>
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none select-none"></div>

      {/* Floating snowflakes */}
      {snowflakes.map((s) => (
        <SnowParticle key={s.key} delay={s.delay} size={s.size} x={s.x} />
      ))}

      {/* Header / Navbar */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/25 ring-1 ring-white/10">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gradient">PlowPath</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Smart Dispatch Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/15 transition-all btn-press ring-1 ring-white/10 flex items-center gap-1.5"
          >
            Access Console
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-full text-xs font-semibold text-brand-400 mb-8 animate-fade-in shadow-sm">
          <CloudSnow className="w-4 h-4 text-brand-400 animate-pulse" />
          <span>Next-Generation Snow Operations for Winter 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-4xl leading-[1.15] mb-6">
          Commercial Snow Plow <br />
          <span className="text-gradient">Dispatch & Live Tracking</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
          Optimize route dispatches, track plow fleets in real time with high-precision telemetry, and provide homeowners with instant SMS updates and photo proof of service.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            to="/login"
            className="px-8 py-4 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-bold text-sm rounded-xl shadow-xl shadow-brand-500/20 transition-all btn-press ring-1 ring-white/10 flex items-center justify-center gap-2"
          >
            Access Dispatch Console
          </Link>
          <a
            href="#driver-app"
            className="px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-750 text-slate-200 hover:text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Get Driver App
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="w-full max-w-5xl glass-card rounded-3xl p-2.5 gradient-border shadow-2xl relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-35 transition duration-1000"></div>
          <div className="relative bg-[#0d1321]/90 rounded-[22px] overflow-hidden border border-slate-800">
            {/* Window bar */}
            <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/40"></span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 select-none uppercase">PlowPath Operations Control</span>
              <div className="w-12"></div>
            </div>
            
            {/* Visual content representation */}
            <div className="p-8 sm:p-12 grid md:grid-cols-3 gap-8 text-left bg-gradient-to-b from-transparent to-brand-950/[0.03]">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">Live Ops Geolocation Map</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interactive real-time map plotting active plow trucks, path trails, status markers, and current weather layers across service zones.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">Smart Route Optimization</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatically sequence and group client properties into logical dispatch routes. Minimize deadhead transit time during blizzards.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">Proof of Service Photos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verify clearance quality with high-res before/after pictures taken directly by drivers, automatically archived under customer history logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 z-10 border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Full Suite of Winter Management Tools</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Everything your operations team needs to run heavy-duty dispatching, monitor driver telemetry, and keep clients satisfied.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400">
              <CloudSnow className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Storm Management</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define active snowstorms, spin up dispatch cycles, and track the progress percentage of clearing properties throughout the event.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Driver & Customer Portals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unified database managing driver credentials, payroll metrics, client subscription profiles, and specific driveway clear instructions.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Analytics & Business Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review driver speeds, time spent per clear site, weather duration logs, and customer billing statements under a single window.
            </p>
          </div>

          {/* Feature Card 4 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Homeowner Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send secure tracking links to homeowners showing their assigned plow's ETA, live progress map, and clearance completion report.
            </p>
          </div>

          {/* Feature Card 5 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Background Geolocation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Driver telemetry uploads in the background via robust native service modules. No lost location data when driver screens are locked.
            </p>
          </div>

          {/* Feature Card 6 */}
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-brand-500/30 transition-colors duration-300">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center text-pink-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Enterprise Grade Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Secure database logs, dispatch roles, encrypted password hashing, and tokenized session APIs keep corporate telemetry secure.
            </p>
          </div>
        </div>
      </section>

      {/* Driver App Download Section */}
      <section id="driver-app" className="relative max-w-7xl mx-auto px-6 py-20 z-10 border-t border-slate-900 bg-gradient-to-b from-transparent to-[#0e1626]/40">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-semibold">
              <span>Driver Companion Mobile App</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Built for Heavy-Duty Drivers</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Snow plowing requires focus and speed. The PlowPath Driver mobile app provides a high-contrast, simple interface optimized for cold steering wheels.
            </p>
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sequenced route list with integrated tap-to-navigate.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fast before/after photo uploads to provide verification.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stops telemetry collection automatically when off duty.</span>
              </li>
            </ul>

            <div className="pt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Available Platforms</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-left">
                  <div className="text-slate-400"><Smartphone className="w-6 h-6" /></div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Download For</div>
                    <div className="text-xs font-extrabold text-slate-200">Android (Google Play)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-left">
                  <div className="text-slate-400"><Smartphone className="w-6 h-6" /></div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Download For</div>
                    <div className="text-xs font-extrabold text-slate-200">iOS (App Store)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right illustration / App Preview */}
          <div className="flex justify-center relative">
            <div className="w-64 h-[480px] bg-slate-900/90 border border-slate-800 rounded-[36px] shadow-2xl p-3 relative flex flex-col z-10 overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-950 rounded-full z-20"></div>
              <div className="flex-1 bg-[#090d16] rounded-[28px] p-5 flex flex-col justify-between border border-slate-850 relative">
                
                {/* Driver App Screen Mockup */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-400" />
                    <span className="text-[10px] font-bold text-slate-200 uppercase">Route Active</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">Duty On</span>
                </div>

                <div className="my-auto space-y-4 py-4">
                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl space-y-2">
                    <div className="text-[9px] font-bold text-brand-400 uppercase">Next Stop</div>
                    <h4 className="text-xs font-extrabold text-slate-200">142 Oakridge Crescent</h4>
                    <p className="text-[10px] text-slate-400">Instructions: Clean driveway fully. Pile snow on left lawn side.</p>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-bold block">Status</span>
                      <span className="text-[10px] text-slate-300 font-semibold">Ready to begin</span>
                    </div>
                    <button className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-[10px] text-white font-bold rounded-lg transition-colors shadow-sm">
                      Start Clear
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/40 pt-3 flex justify-between items-center text-slate-500 text-[9px] font-semibold uppercase">
                  <span>PlowPath Driver</span>
                  <span>v2.4</span>
                </div>
              </div>
            </div>
            {/* Ambient circle glow behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-500/10 blur-[80px] pointer-events-none select-none"></div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative max-w-4xl mx-auto px-6 py-20 z-10 border-t border-slate-900">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center justify-center p-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Quick answers to standard operational questions.</p>
        </div>

        <div className="space-y-4">
          <FAQItem
            question="How does PlowPath track snowplow trucks?"
            answer="PlowPath uses a native background telemetry module on the driver's phone. This tracking records GPS location update points and velocity details even when the application is minimized or screens are locked. This data compiles straight into the dispatcher's Live Ops Dashboard."
          />
          <FAQItem
            question="Can homeowners track progress without an account?"
            answer="Yes. When a route begins, dispatchers can set PlowPath to dispatch secure, encrypted tracking portal links via SMS. Homeowners click these links to view active plow locations, ETA predictions, and proof of clearance photos."
          />
          <FAQItem
            question="Is location telemetry tracked outside of active shifts?"
            answer="Absolutely not. Telemetry logs only upload when a driver explicitly taps 'Go On Duty' and ends immediately when they log out or switch off-duty. We maintain strict compliance with mobile application store privacy guidelines."
          />
          <FAQItem
            question="How is my profile data stored and can I request deletion?"
            answer="All driver profiles and associated GPS telemetry coordinates are stored on secure cloud databases. You can submit a deletion request at any time using our data deletion request form to permanently purge all data associated with your driver account."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-950/80 border-t border-slate-900 z-10 py-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-white font-extrabold">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-200">PlowPath</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enterprise dispatch and telemetry platforms for commercial winter operations.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Operations Console</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors">Dispatcher Login</Link>
              </li>
              <li>
                <a href="#driver-app" className="text-slate-500 hover:text-slate-300 transition-colors">Driver Downloads</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Support & Privacy</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy-policy" className="text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/delete-data" className="text-slate-500 hover:text-slate-350 transition-colors flex items-center gap-1 text-red-500/80 hover:text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Request Data Deletion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Contact</h4>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              support@plowpath.ca
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-slate-900 text-center text-[10px] text-slate-600 font-semibold uppercase tracking-[0.1em]">
          © {new Date().getFullYear()} PlowPath Operations Inc. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
