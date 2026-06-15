import { FileText, ArrowLeft, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsAndConditionsPage() {
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
              Terms &amp; Conditions
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 space-y-6 gradient-border shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
            <FileText className="w-6 h-6 text-brand-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Terms and Conditions</h2>
              <p className="text-xs text-slate-500 font-medium">Effective Date: June 15, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2.5">
              <p>
                Welcome to PlowPath. By accessing or using our website, dashboard, or SMS communications service (collectively, the &quot;Service&quot;), you agree to be bound by these Terms and Conditions (&quot;Terms&quot;). If you do not agree, do not use the Service.
              </p>
            </section>

            <section className="space-y-3 p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <h3 className="text-base font-bold text-brand-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
                SMS Service Program Terms
              </h3>
              <p className="text-slate-200">
                PlowPath operates a snow plowing management platform that sends dispatch status notifications, ETAs, storm alerts, and service completion updates via SMS to homeowners and clients.
              </p>
              <div className="mt-3 space-y-2 text-slate-300 border-t border-slate-800/60 pt-3">
                <p>
                  <strong className="text-slate-200">Message &amp; Data Rates:</strong> Message and data rates may apply for any messages sent to you from us and to us from you.
                </p>
                <p>
                  <strong className="text-slate-200">Message Frequency:</strong> Message frequency varies based on storm activity and active bookings (typically up to 5 messages per storm event).
                </p>
                <p>
                  <strong className="text-slate-200">Opt-Out Instructions:</strong> You can cancel the SMS service at any time by replying <strong className="text-white font-extrabold uppercase">STOP</strong>. After you send the SMS message <strong className="text-white font-extrabold uppercase">STOP</strong> to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us.
                </p>
                <p>
                  <strong className="text-slate-200">Support / Assistance:</strong> For support, email <a href="mailto:support@plowpath.ca" className="text-brand-400 hover:underline">support@plowpath.ca</a> or reply with <strong className="text-white font-extrabold uppercase">HELP</strong>. After you send the SMS message <strong className="text-white font-extrabold uppercase">HELP</strong> to us, we will respond with instructions on how to use our service as well as how to unsubscribe.
                </p>
              </div>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">1. Eligibility and Registration</h3>
              <p>
                To access and use certain features of PlowPath, you may be required to register for an account. You agree to provide accurate, current, and complete information and maintain the security of your credentials. You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">2. Prohibited Activities</h3>
              <p>
                You agree not to use the platform for any unlawful purpose, or to upload or transmit any content that is harmful, abusive, harassing, or violates third-party rights. Unauthorized access or interference with the platform&apos;s servers or networks is strictly prohibited.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">3. Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, PlowPath shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the Service.
              </p>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-base font-bold text-slate-200">4. Changes to Terms</h3>
              <p>
                We reserve the right to modify or replace these Terms at any time. We will notify you of any material changes by posting the new Terms on this page. Your continued use of the platform after changes become effective constitutes acceptance of the new Terms.
              </p>
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
