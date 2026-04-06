import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import StatsBar from '../components/StatsBar';
import WeightBadge from '../components/WeightBadge';
import ViewerStatusBadge from '../components/ViewerStatusBadge';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [viewers, setViewers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [parked, setParked] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbPeriod, setLbPeriod] = useState('today');
  const [routingLeadId, setRoutingLeadId] = useState(null);
  const [routingNotes, setRoutingNotes] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ first_name: '', last_name: '', phone: '', email: '', pool: 'old_lead', state: '', timezone: '', last_message: '', booked_time: '' });

  const refresh = useCallback(async () => {
    try {
      const [s, u, q, p, lb] = await Promise.all([
        api.getToday(),
        api.getUsers(),
        api.getLeads({ status: 'queued' }),
        api.getLeads({ status: 'parked' }),
        api.getLeaderboard(lbPeriod),
      ]);
      setStats(s);
      setViewers(u.users.filter(u => u.role === 'viewer' && u.is_active));
      setQueue(q.leads);
      setParked(p.leads);
      setLeaderboard(lb.leaderboard);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }, [lbPeriod]);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 5000); return () => clearInterval(iv); }, [refresh]);

  const handleRoute = async (leadId, viewerId) => {
    try {
      await api.routeLead(leadId, viewerId, routingNotes);
      setRoutingLeadId(null);
      setRoutingNotes('');
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      await api.addLead(newLead);
      setShowAddLead(false);
      setNewLead({ first_name: '', last_name: '', phone: '', email: '', pool: 'old_lead', state: '', timezone: '', last_message: '' });
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnpark = async (id) => {
    await api.unparkLead(id);
    refresh();
  };

  const available = viewers.filter(v => v.status === 'available');
  const onCall = viewers.filter(v => v.status === 'on_call');
  const onBreak = viewers.filter(v => v.status === 'break');
  const offline = viewers.filter(v => v.status === 'offline');

  // Overflow alerts
  const now = Date.now();
  const overflowLeads = queue.filter(l => {
    if (!l.last_message_at) return false;
    const wait = (now - new Date(l.last_message_at + 'Z').getTime()) / 1000;
    return wait > 90;
  });

  const isWestCoast = (tz) => ['PST', 'PDT', 'America/Los_Angeles'].includes(tz);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-txtb">⚡ ICONIC War Room</h1>
            <p className="text-xs text-txtd">{user.name} · Manager · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <button onClick={() => setShowAddLead(true)} className="bg-pur hover:bg-pur/90 text-white text-xs font-semibold px-4 py-2 rounded transition-colors">
            + Add Lead
          </button>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Viewer Status Grid */}
        <div className="bg-bg2 border border-bdr rounded-lg p-3">
          <div className="text-[10px] font-bold text-txtd uppercase tracking-wider mb-2">Viewer Status Grid</div>
          <div className="flex gap-2 flex-wrap">
            {viewers.map(v => (
              <div key={v.id} className="bg-bg3 border border-bdr rounded px-3 py-1.5 text-xs flex items-center gap-2">
                <ViewerStatusBadge status={v.status} />
                <strong className="text-txtb">{v.name}</strong>
                <span className="text-txtd">
                  {v.status === 'available' ? `${leaderboard.find(l => l.id === v.id)?.closes || 0} closes` :
                   v.status === 'on_call' ? 'on call' :
                   v.status === 'break' ? 'break' : 'offline'}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-txtd mt-2">
            Available: {available.length} · On Call: {onCall.length} · Break: {onBreak.length} · Offline: {offline.length}
          </div>
        </div>

        {/* Overflow Alert */}
        {overflowLeads.length > 0 && (
          <div className="bg-red/10 border border-red/30 rounded-lg px-3 py-2 text-xs text-red font-semibold">
            ⚠️ {overflowLeads.length} lead{overflowLeads.length > 1 ? 's' : ''} waiting 90s+ — assign immediately
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lead Queue */}
          <div className="lg:col-span-2 space-y-2">
            <div className="text-[10px] font-bold text-txtd uppercase tracking-wider">Lead Queue — sorted by weight then wait time ({queue.length} leads)</div>
            {queue.length === 0 && <div className="bg-bg2 border border-bdr rounded-lg p-6 text-center text-sm text-txtd">Queue empty — all caught up</div>}
            {queue.map(lead => {
              const waitSec = lead.last_message_at ? Math.round((now - new Date(lead.last_message_at + 'Z').getTime()) / 1000) : 0;
              const waitStr = waitSec > 60 ? `${Math.floor(waitSec / 60)}m ${waitSec % 60}s` : `${waitSec}s`;
              return (
                <div key={lead.id} className={`bg-bg2 border rounded-lg p-3 ${waitSec > 180 ? 'border-red/50' : waitSec > 90 ? 'border-org/50' : 'border-bdr'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <WeightBadge weight={lead.weight} />
                        {lead.booked_time && <span className="text-[10px] font-mono font-bold text-pur bg-pur/10 px-2 py-0.5 rounded">🕐 {lead.booked_time}</span>}
                      </div>
                      <div className="text-sm font-bold text-txtb mt-1">{lead.first_name} {lead.last_name}</div>
                      <div className="text-xs text-txtd mt-0.5">
                        Replied <span className={waitSec < 120 ? 'text-grn font-semibold' : waitSec < 300 ? 'text-org font-semibold' : 'text-red font-semibold'}>{waitStr} ago</span>
                        {lead.last_message && <> · "{lead.last_message}"</>}
                      </div>
                      <div className="text-xs text-txtd mt-0.5">
                        {lead.state} · {lead.timezone}
                        {isWestCoast(lead.timezone) && <span className="text-red font-semibold ml-1">🌊 WEST COAST</span>}
                      </div>
                    </div>
                    <div>
                      {routingLeadId === lead.id ? (
                        <div className="space-y-1">
                          <select
                            onChange={e => e.target.value && handleRoute(lead.id, parseInt(e.target.value))}
                            className="bg-bg3 border border-bdr rounded px-2 py-1 text-xs text-txtb"
                          >
                            <option value="">Select viewer...</option>
                            {available.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Notes for viewer..."
                            value={routingNotes}
                            onChange={e => setRoutingNotes(e.target.value)}
                            className="bg-bg3 border border-bdr rounded px-2 py-1 text-xs text-txtb w-full"
                          />
                          <button onClick={() => setRoutingLeadId(null)} className="text-[10px] text-gry hover:text-txtd">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRoutingLeadId(lead.id)}
                          className="bg-pur text-white text-[10px] font-semibold px-3 py-1.5 rounded hover:bg-pur/90 transition-colors"
                        >
                          Route →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Parked Leads */}
            {parked.length > 0 && (
              <div className="bg-bg3 border border-bdr rounded-lg p-3 mt-3">
                <div className="text-[10px] font-bold text-yel uppercase tracking-wider mb-2">⏸ Parked / Callbacks</div>
                <div className="flex flex-wrap gap-2">
                  {parked.map(l => (
                    <div key={l.id} className="flex items-center gap-2 border border-bdrl rounded px-2 py-1 text-[10px] text-txtd">
                      <span>{l.first_name} {l.last_name?.[0]}.</span>
                      {l.parked_note && <span>— {l.parked_note}</span>}
                      <button onClick={() => handleUnpark(l.id)} className="text-pur hover:text-pur/80">Unpark</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-txtd uppercase tracking-wider">Leaderboard</div>
              <div className="flex gap-1">
                {['today', 'week', 'month'].map(p => (
                  <button
                    key={p}
                    onClick={() => setLbPeriod(p)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${lbPeriod === p ? 'bg-pur/15 text-pur' : 'text-txtd hover:text-txtb'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {leaderboard.map((v, i) => (
                <div key={v.id} className="bg-bg2 border border-bdr rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-bold ${i === 0 ? 'text-yel' : i === 1 ? 'text-gryl' : i === 2 ? 'text-org' : 'text-gry'}`}>#{i + 1}</span>
                    <div>
                      <div className="text-xs font-semibold text-txtb">{v.name}</div>
                      <div className="text-[10px] text-txtd">{v.calls} calls · {v.deal_rate}% rate</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-grn font-mono">${((v.revenue_cents || 0) / 100).toLocaleString()}</div>
                    <div className="text-[10px] text-txtd">{v.closes} closes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Lead Modal */}
        {showAddLead && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddLead(false)}>
            <form onClick={e => e.stopPropagation()} onSubmit={handleAddLead} className="bg-bg2 border border-bdr rounded-lg p-6 w-full max-w-md space-y-3">
              <h2 className="text-lg font-bold text-txtb">Add Lead</h2>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First name *" required value={newLead.first_name} onChange={e => setNewLead({...newLead, first_name: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
                <input placeholder="Last name" value={newLead.last_name} onChange={e => setNewLead({...newLead, last_name: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
                <input placeholder="Phone" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
                <input placeholder="Email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
                <select value={newLead.pool} onChange={e => setNewLead({...newLead, pool: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb">
                  <option value="no_show">No-Show (W5)</option>
                  <option value="booker_transfer">Booker Transfer (W3)</option>
                  <option value="missed_pitch">Missed Pitch (W2)</option>
                  <option value="old_lead">Old Lead (W1)</option>
                </select>
                <input placeholder="State (e.g. TX)" value={newLead.state} onChange={e => setNewLead({...newLead, state: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
                <input type="time" value={newLead.booked_time} onChange={e => setNewLead({...newLead, booked_time: e.target.value})} className="bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" title="Booked time" />
              </div>
              <input placeholder="Last message..." value={newLead.last_message} onChange={e => setNewLead({...newLead, last_message: e.target.value})} className="w-full bg-bg3 border border-bdr rounded px-3 py-2 text-sm text-txtb" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddLead(false)} className="text-sm text-txtd hover:text-txtb px-4 py-2">Cancel</button>
                <button type="submit" className="bg-pur text-white text-sm font-semibold px-4 py-2 rounded">Add to Queue</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
