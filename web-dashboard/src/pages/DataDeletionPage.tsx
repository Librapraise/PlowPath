import { ShieldAlert, ArrowLeft, Trash2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 p-6 font-sans relative overflow-hidden flex flex-col items-center">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-red-500/[0.04] blur-[140px] pointer-events-none select-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[140px] pointer-events-none select-none"></div>

      <div className="w-full max-w-3xl z-10 my-12">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-red-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-red-500/25 ring-1 ring-white/10">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-gradient">
              PlowPath
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em] mt-1">
              Data Deletion Request
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 space-y-6 gradient-border shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Delete Your Account & Data</h2>
              <p className="text-xs text-slate-500 font-medium">Manage your personal information</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2.5">
              <p>
                Under modern data privacy standards, you have the right to request the permanent deletion of your account and any associated personal data collected by PlowPath.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">What data will be removed?</h3>
              <p>When you delete your account, the following data is permanently purged from our active systems:</p>
              <ul className="list-disc list-inside pl-2 space-y-1.5 text-slate-400">
                <li><strong className="text-slate-350">Account Profile:</strong> Your name, username, email address, phone number, and password hash.</li>
                <li><strong className="text-slate-350">Service Telemetry:</strong> All historical GPS location coordinate updates and tracking logs.</li>
                <li><strong className="text-slate-350">Operational Records:</strong> Completed service photographs and dispatcher logs mapped to your driver profile.</li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                * Note: Transactional billing history and invoices may be retained for accounting and compliance purposes as required by local regulations.
              </p>
            </section>

            <section className="space-y-4 p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                How to Submit a Deletion Request
              </h3>
              <p className="text-slate-300 leading-relaxed">
                To initiate a deletion request, please click the button below to generate an email template. Make sure to send the request from the email address registered to your PlowPath account.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:support@plowpath.ca?subject=PlowPath%20Data%20Deletion%20Request&body=Please%20delete%20my%20PlowPath%20account%20and%20all%20associated%20data.%0A%0ARegistered%20Email%3A%20%0AFull%20Name%3A%20%0APhone%20Number%3A%20"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-650 hover:bg-red-700 bg-red-600 rounded-xl transition-all shadow-lg hover:shadow-red-500/10 border border-red-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Email Deletion Request
                </a>
                <div className="flex items-center text-xs text-slate-500">
                  Or email support@plowpath.ca directly.
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">Process and Timeline</h3>
              <p>
                Once we receive your deletion request, our support team will verify your identity. After verification, your account and all telemetry records will be permanently deleted from our active database within <strong>30 days</strong>.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-250 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              View Privacy Policy
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
