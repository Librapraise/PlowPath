import { Shield, ArrowLeft, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 p-6 font-sans relative overflow-hidden flex flex-col items-center">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-500/[0.06] blur-[140px] pointer-events-none select-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.06] blur-[140px] pointer-events-none select-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-radial-glow pointer-events-none"></div>

      <div className="w-full max-w-3xl z-10 my-12">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-brand-500/25 ring-1 ring-white/10">
            <Truck className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-gradient">
              PlowPath
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em] mt-1">
              Privacy Policy
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 space-y-6 gradient-border shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
            <Shield className="w-6 h-6 text-brand-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Privacy Policy</h2>
              <p className="text-xs text-slate-500 font-medium">Effective Date: June 15, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2.5">
              <p>
                PlowPath (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the PlowPath snow plowing management platform, consisting of our web application, mobile applications, and SMS messaging services. We are dedicated to protecting the privacy of our dispatchers, drivers, and customers.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you interact with our platform. Please read this policy carefully.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">1. Information We Collect</h3>
              <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5 text-slate-400">
                <li><strong className="text-slate-350">Personal Data:</strong> Name, billing address, service address, email address, and phone number when you register for services.</li>
                <li><strong className="text-slate-350">Service &amp; Operations Data:</strong> Property size, plowing priority, dispatch logs, driver locations, photos of completed services, and status updates.</li>
                <li><strong className="text-slate-350">Device &amp; Telemetry Data:</strong> IP address, browser type, operating system, and access times logged automatically when accessing our web dashboard.</li>
              </ul>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">2. How We Use Your Information</h3>
              <p>We use the information we collect to provide and optimize the PlowPath operations service. Specifically, this includes:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5 text-slate-400">
                <li>Configuring routes, dispatching snow plows, and verifying service completions.</li>
                <li>Sending transactional updates, service alerts, and estimated arrival times (ETAs).</li>
                <li>Processing payments and tracking financial transactions.</li>
                <li>Sending automated SMS notifications to notify you when a plow is dispatched or service is complete.</li>
              </ul>
            </section>

            <section className="space-y-3 p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <h3 className="text-base font-bold text-brand-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
                3. SMS Privacy &amp; Sharing Restrictions
              </h3>
              <p className="text-slate-200 font-medium leading-relaxed">
                We value your privacy and trust. PlowPath does not share, sell, rent, or lease mobile information or SMS consent with third parties, affiliates, or partners for marketing or promotional purposes.
              </p>
              <p className="text-slate-400 text-xs">
                All of the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties under any circumstances.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">4. Data Security &amp; Retention</h3>
              <p>
                We use administrative, technical, and physical security measures to protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable. We retain personal data only as long as necessary to fulfill service operations and comply with legal requirements.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">5. Contact Us</h3>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <div className="bg-slate-900/60 p-4 border border-slate-800/50 rounded-xl space-y-1">
                <p className="font-semibold text-slate-200">PlowPath Support</p>
                <p className="text-xs text-slate-400">Email: <a href="mailto:support@plowpath.ca" className="text-brand-400 hover:underline">support@plowpath.ca</a></p>
              </div>
            </section>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-250 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
            <p className="text-[10px] text-slate-650 font-semibold uppercase tracking-[0.15em] select-none">
              PlowPath Operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
