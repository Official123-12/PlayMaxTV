import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllUsers, fetchProofs, updateProofStatus } from '@/lib/db';
import { Users, CreditCard, BarChart3, Crown, Check, X, Eye, ArrowLeft, Shield, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';

type AdminTab = 'analytics' | 'users' | 'payments';

interface DbProof {
  id: string;
  user_id: string;
  plan: string;
  amount: string;
  proof_url: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
  user_profiles?: { display_name: string; email: string };
}

export default function AdminPage() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [previewProof, setPreviewProof] = useState<DbProof | null>(null);
  const [proofs, setProofs] = useState<DbProof[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchAllUsers(), fetchProofs()])
      .then(([u, p]) => { setUsers(u); setProofs(p as DbProof[]); })
      .finally(() => setDataLoading(false));
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#141414] border border-gray-800 flex items-center justify-center mb-5">
            <Shield size={36} className="text-gray-700" />
          </div>
          <h1 className="text-white text-2xl font-black mb-2">Admin Access Required</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Sign in with an admin email address to access this panel.<br />
            <span className="text-gray-700 text-xs">admin@playmax.com.ng · damini@playmax.com.ng · nicky@playmax.com.ng</span>
          </p>
          <Link to="/login" className="bg-[#e50914] text-white px-6 py-3 rounded-2xl font-black hover:bg-red-700 transition-colors text-sm shadow-lg shadow-red-900/30">
            Admin Sign In
          </Link>
        </div>
      </div>
    );
  }

  const pendingProofs = proofs.filter(p => p.status === 'pending');
  const approvedProofs = proofs.filter(p => p.status === 'approved');
  const premiumUsers = users.filter(u => u.is_premium);

  const totalRevenue = approvedProofs.reduce((acc, p) => {
    const num = parseFloat((p.amount || '0').replace(/[^0-9.]/g, ''));
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const handleApprove = async (proof: DbProof) => {
    await updateProofStatus(proof.id, 'approved');
    setProofs(ps => ps.map(p => p.id === proof.id ? { ...p, status: 'approved', reviewed_at: new Date().toISOString() } : p));
    toast.success(`Approved — ${proof.user_profiles?.display_name || 'user'}'s ${proof.plan} plan activated`);
    setPreviewProof(null);
  };

  const handleReject = async (proof: DbProof) => {
    await updateProofStatus(proof.id, 'rejected');
    setProofs(ps => ps.map(p => p.id === proof.id ? { ...p, status: 'rejected', reviewed_at: new Date().toISOString() } : p));
    toast.error(`Rejected submission from ${proof.user_profiles?.display_name || 'user'}`);
    setPreviewProof(null);
  };

  const stats = [
    { label: 'Total Users', value: dataLoading ? '—' : users.length, icon: Users, color: 'from-blue-500 to-blue-700', bg: 'bg-blue-500/10' },
    { label: 'Premium Members', value: dataLoading ? '—' : premiumUsers.length, icon: Crown, color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-500/10' },
    { label: 'Pending Reviews', value: dataLoading ? '—' : pendingProofs.length, icon: Clock, color: 'from-orange-500 to-orange-700', bg: 'bg-orange-500/10' },
    { label: 'Total Revenue', value: dataLoading ? '—' : `₦${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'from-green-500 to-green-700', bg: 'bg-green-500/10' },
  ];

  const TABS: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: `Users (${users.length})`, icon: Users },
    { id: 'payments', label: `Payments${pendingProofs.length > 0 ? ` · ${pendingProofs.length} pending` : ''}`, icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-4 py-8 border-b border-gray-800/60 mb-6">
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-900">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center shadow-lg shadow-red-900/30">
                <Shield size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-white text-2xl font-black">Admin Panel</h1>
                <p className="text-gray-600 text-sm">PlayMax TV · Damini × Nicky Tech</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-green-950/40 border border-green-800/30 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs font-black">LIVE</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-gray-800/40`}>
                <div className={`w-11 h-11 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                  <s.icon size={20} className="text-white" />
                </div>
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-gray-600 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 border-b border-gray-800/60 mb-8 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-[#e50914] text-white' : 'border-transparent text-gray-600 hover:text-gray-300'}`}
              >
                <t.icon size={14} /> {t.label}
                {t.id === 'payments' && pendingProofs.length > 0 && (
                  <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#e50914] text-white text-[10px] font-black flex items-center justify-center">{pendingProofs.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Analytics Tab */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              {/* Plan breakdown */}
              <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                <h3 className="text-white font-black mb-5 flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#e50914]" /> Subscription Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {['weekly', 'monthly', 'yearly'].map(plan => {
                    const count = approvedProofs.filter(p => p.plan === plan).length;
                    const prices: Record<string, number> = { weekly: 2000, monthly: 4000, yearly: 8000 };
                    const rev = count * (prices[plan] || 0);
                    return (
                      <div key={plan} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/30">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 capitalize">{plan}</p>
                        <p className="text-white text-2xl font-black">{count}</p>
                        <p className="text-green-400 text-xs font-semibold mt-1">₦{rev.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent approvals */}
              <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                <h3 className="text-white font-black mb-4 flex items-center gap-2">
                  <Check size={16} className="text-green-400" /> Recent Approved Payments
                </h3>
                {approvedProofs.length === 0 ? (
                  <p className="text-gray-700 text-sm italic">No approved payments yet</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {approvedProofs.map(proof => (
                      <div key={proof.id} className="flex items-center justify-between py-2.5 border-b border-gray-800/50 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-black text-xs">
                            {(proof.user_profiles?.display_name || proof.user_profiles?.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">{proof.user_profiles?.display_name || 'Unknown'}</p>
                            <p className="text-gray-600 text-xs capitalize">{proof.plan} plan</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-black text-sm">{proof.amount}</p>
                          <p className="text-gray-700 text-xs">{new Date(proof.submitted_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div>
              {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20">
                  <Users size={52} className="text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-600">No registered users yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-800/40">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-800/60 bg-[#141414]">
                        {['User', 'Email', 'Plan', 'Status', 'Joined'].map(h => (
                          <th key={h} className="py-3 px-4 text-gray-600 text-xs font-black uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id as string} className="border-b border-gray-800/30 hover:bg-gray-900/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow ${u.is_premium ? 'bg-gradient-to-br from-[#f5c518] to-yellow-600' : 'bg-gradient-to-br from-[#e50914] to-red-800'}`}>
                                {u.is_premium ? <Crown size={14} className="text-black" /> : ((u.display_name as string) || (u.email as string) || 'U')[0].toUpperCase()}
                              </div>
                              <span className="text-white text-sm font-semibold">{(u.display_name as string) || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 text-sm">{u.email as string}</td>
                          <td className="py-3.5 px-4">
                            {u.premium_plan ? (
                              <span className="text-[#f5c518] text-xs font-black capitalize">{u.premium_plan as string}</span>
                            ) : (
                              <span className="text-gray-700 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.is_premium ? (
                              <span className="flex items-center gap-1 w-fit text-[#f5c518] text-xs font-black bg-yellow-950/40 border border-yellow-800/30 px-2 py-0.5 rounded-full">
                                <Crown size={9} /> Premium
                              </span>
                            ) : (
                              <span className="text-gray-700 text-xs font-medium">Free</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 text-xs">
                            {u.created_at ? new Date(u.created_at as string).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {tab === 'payments' && (
            <div>
              {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : proofs.length === 0 ? (
                <div className="text-center py-20">
                  <CreditCard size={52} className="text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-600">No payment proofs submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proofs.map(proof => (
                    <div key={proof.id} className={`bg-[#141414] rounded-2xl p-4 border transition-all ${proof.status === 'pending' ? 'border-orange-800/40 bg-orange-950/5' : proof.status === 'approved' ? 'border-green-800/30' : 'border-gray-800/40'}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center text-white font-black shadow">
                            {(proof.user_profiles?.display_name || proof.user_profiles?.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{proof.user_profiles?.display_name || 'Unknown User'}</p>
                            <p className="text-gray-600 text-xs">{proof.user_profiles?.email || '—'}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                              <span className="capitalize text-gray-400">{proof.plan}</span>
                              <span>·</span>
                              <span className="text-[#e50914] font-bold">{proof.amount}</span>
                              <span>·</span>
                              <span>{new Date(proof.submitted_at).toLocaleDateString()}</span>
                              {proof.proof_url?.startsWith('paystack:') && (
                                <><span>·</span><span className="text-[#00c3f7] font-bold">Paystack</span></>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${proof.status === 'pending' ? 'bg-orange-950/60 text-orange-400' : proof.status === 'approved' ? 'bg-green-950/60 text-green-400' : 'bg-red-950/60 text-red-400'}`}>
                            {proof.status}
                          </span>
                          {proof.proof_url && !proof.proof_url.startsWith('paystack:') && (
                            <button onClick={() => setPreviewProof(proof)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/60 px-3 py-2 rounded-xl transition-colors">
                              <Eye size={12} /> View Proof
                            </button>
                          )}
                          {proof.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(proof)} className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/40 hover:bg-green-950/70 px-3 py-2 rounded-xl transition-colors font-semibold">
                                <Check size={12} /> Approve
                              </button>
                              <button onClick={() => handleReject(proof)} className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 hover:bg-red-950/70 px-3 py-2 rounded-xl transition-colors font-semibold">
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Proof Image Modal */}
      {previewProof && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setPreviewProof(null)}>
          <div className="bg-[#141414] rounded-3xl p-6 max-w-lg w-full border border-gray-800/60 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black text-lg">Payment Proof</h3>
              <button onClick={() => setPreviewProof(null)} className="text-gray-600 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            {previewProof.proof_url && (
              <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 border border-gray-800">
                <img src={previewProof.proof_url} alt="Payment proof" className="w-full max-h-80 object-contain" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ['User', previewProof.user_profiles?.display_name || '—'],
                ['Email', previewProof.user_profiles?.email || '—'],
                ['Plan', previewProof.plan],
                ['Amount', previewProof.amount],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-900/50 rounded-xl p-3">
                  <p className="text-gray-600 text-xs mb-1 uppercase tracking-wider font-semibold">{k}</p>
                  <p className="text-white font-semibold capitalize text-sm truncate">{v}</p>
                </div>
              ))}
            </div>
            {previewProof.status === 'pending' && (
              <div className="flex gap-3">
                <button onClick={() => handleApprove(previewProof)} className="flex-1 flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-2xl font-black hover:bg-green-600 transition-colors">
                  <Check size={16} /> Approve
                </button>
                <button onClick={() => handleReject(previewProof)} className="flex-1 flex items-center justify-center gap-2 bg-red-900 text-white py-3 rounded-2xl font-black hover:bg-red-800 transition-colors">
                  <X size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
