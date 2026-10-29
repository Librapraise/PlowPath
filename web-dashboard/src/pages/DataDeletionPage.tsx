import { useState } from 'react';
import { ShieldAlert, ArrowLeft, Trash2, Mail, X, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DataDeletionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !confirm) {
      return;
    }

    const subject = encodeURIComponent('PlowPath Data Deletion Request');
    const body = encodeURIComponent(
      `Please delete my PlowPath account and all associated data.\n\n` +
      `Full Name: ${name}\n` +
      `Registered Email: ${email}\n` +
      `Phone Number: ${phone || 'Not provided'}\n` +
      `Reason for deletion: ${reason || 'Not provided'}\n\n` +
      `I understand that this request is permanent and cannot be undone.`
    );

    // Open system mail client with pre-filled details
    window.location.href = `mailto:support@plowpath.ca?subject=${subject}&body=${body}`;
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setReason('');
    setConfirm(false);
    setIsSubmitted(false);
    setIsModalOpen(false);
  };

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
                Click the button below to open the data deletion request form. This will prepare a request template for our support team to process.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg hover:shadow-red-500/10 border border-red-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Request Account Deletion
                </button>
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

      {/* Premium Interactive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0e1626]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-bold text-slate-100">Deletion Request Details</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Please provide the details associated with your PlowPath account so we can locate and remove your information.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Deletion (Optional)</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you requesting data deletion? (e.g. no longer driving)"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500/50 resize-none"
                  />
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    required
                    id="confirm-deletion"
                    checked={confirm}
                    onChange={(e) => setConfirm(e.target.checked)}
                    className="mt-1 accent-red-500 cursor-pointer"
                  />
                  <label htmlFor="confirm-deletion" className="text-xs text-slate-450 text-slate-400 select-none cursor-pointer leading-relaxed">
                    I understand that this will permanently remove my account details, location history, and operational logs from PlowPath. This action is irreversible.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg hover:shadow-red-500/10 border border-red-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Generate Deletion Email
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-100">Request Prepared</h3>
                  <p className="text-xs text-slate-400 px-4 leading-relaxed">
                    Your request details have been composed and loaded into your system's default email client. Please send the pre-filled email to complete the request.
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-200 rounded-xl transition-colors border border-slate-700"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
