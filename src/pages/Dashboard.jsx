import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const MAINTENANCE_CHECKLIST = [
  "1. Cleaning Check", "2. फावड़ी Check", "3. आर्म Check", "4. कैम-डोली Check",
  "5. नोजल Check", "6. पंप Check", "7. Oil Check", "8. ग्रीसिंग Check",
  "9. M.Ree Check", "10. फ़िल्टर Check", "11. Catch-chord Shaft & Bearing Check",
  "12. Belt Check", "13. Cutter Shaft & Bearing Check", "14. R.P.M. Check"
];

const ROLE_LABELS = {
  owner: '👑 Owner (पूरा कंट्रोल)',
  main_master: '🧭 Main Master (मुख्य मास्टर)',
  supervisor: '👷 Supervisor (फ्लोर कंट्रोल)',
  running_master: '⚙️ Running Master (रनिंग मास्टर)',
  fitter: '🔧 Fitter (मेंटेनेंस व छोटे काम)',
  beam_getter: '🧵 Beam Getter (बीम व बॉर्डर)',
  karigar: '🧑‍🏭 Karigar (मशीन डिटेल व फॉल्ट)'
};

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('karigar');
  const [companyName, setCompanyName] = useState('सूरत टेक्सटाइल मिल');
  const [accountLabel, setAccountLabel] = useState('Mill Account');
  const [dutyNote, setDutyNote] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [machines, setMachines] = useState([]);
  const [pipeStock, setPipeStock] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Pipe Stock & Program पैनल (Owner & Supervisor)
  const [showPipePanel, setShowPipePanel] = useState(false);
  const [pipeNumInput, setPipeNumInput] = useState('');
  const [pipeSizeInput, setPipeSizeInput] = useState('');
  const [isSmallPipeInput, setIsSmallPipeInput] = useState(false);
  const [pipeProgramInput, setPipeProgramInput] = useState('');

  // Owner ड्यूटी व कंपनी सेटिंग पैनल
  const [showRoleDutyPanel, setShowRoleDutyPanel] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('सूरत टेक्सटाइल मिल');
  const [editAccountLabel, setEditAccountLabel] = useState('');
  const [editDutyNote, setEditDutyNote] = useState('');

  // पॉप-अप्स
  const [viewDetailsMachine, setViewDetailsMachine] = useState(null);
  const [maintenanceModalMachine, setMaintenanceModalMachine] = useState(null);
  const [issueModalMachine, setIssueModalMachine] = useState(null);
  const [resolveModalMachine, setResolveModalMachine] = useState(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showMasterQRModal, setShowMasterQRModal] = useState(false);

  // फॉर्म इनपुट्स
  const [checkedItems, setCheckedItems] = useState({});
  const [techName, setTechName] = useState('');
  const [beamBinderName, setBeamBinderName] = useState('');
  const [masterWorkedName, setMasterWorkedName] = useState('');
  const [meterFedValue, setMeterFedValue] = useState('');

  const [newBeamDetails, setNewBeamDetails] = useState({
    pick: '', panna: '', pattern: '', fawdi: '', weftBhava: '', nozzle: '2x2', rpm: '', quality: '', pipeNo: '', meterBeam: '', operator: ''
  });
  const [issueText, setIssueText] = useState('');
  const [newMachineNum, setNewMachineNum] = useState('');
  const [sparePartName, setSparePartName] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [resolvedByMaster, setResolvedByMaster] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, company_name, account_label, duty_note')
      .eq('id', userId)
      .single();

    if (data) {
      const role = data.role || 'karigar';
      const comp = data.company_name || 'सूरत टेक्सटाइल मिल';
      const acc = data.account_label || 'Staff Account';
      const note = data.duty_note || '';

      setUserRole(role);
      setCompanyName(comp);
      setAccountLabel(acc);
      setDutyNote(note);

      setEditCompanyName(comp);
      setEditAccountLabel(acc);
      setEditDutyNote(note);

      if (role === 'owner') {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, email, role, company_name, account_label, duty_note');
        if (allProfiles) setStaffProfiles(allProfiles);
      }
    }
    fetchMachines();
    fetchPipeStock();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('❌ गलत ई-मेल या पासवर्ड!');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchMachines = async () => {
    setLoading(true);
    const { data } = await supabase.from('machines').select('*').order('id', { ascending: true });
    if (data) {
      const formatted = data.map(item => ({
        id: item.id,
        number: item.number,
        status: item.status,
        operator: item.operator || '-',
        issue: item.issue || '',
        techDetails: item.tech_details || {
          pick: '-', panna: '-', pattern: '-', fawdi: '-', weftBhava: '-',
          nozzle: '-', rpm: '-', quality: 'खाली (No Beam)', pipeNo: '-', meterBeam: '-'
        },
        maintenanceRecord: item.maintenance_record || {
          monthlyTotalCost: 0,
          historyIssues: [],
          isRepeatFault: false,
          lastMasterName: '',
          lastMeterFed: '',
          suspectMasterName: ''
        },
        isRepeatFault: item.maintenance_record?.isRepeatFault || false,
        historyIssues: item.maintenance_record?.historyIssues || []
      }));
      setMachines(formatted);
    }
    setLoading(false);
  };

  const fetchPipeStock = async () => {
    const { data } = await supabase.from('pipe_stock').select('*').order('id', { ascending: false });
    if (data) setPipeStock(data);
  };

  // खाली Pipe और उसमें दिए गए प्रोग्राम की एंट्री सेव करना
  const handleSavePipeEntry = async (e) => {
    e.preventDefault();
    if (!pipeNumInput.trim() || !pipeSizeInput.trim()) return;

    const assignedProgram = pipeProgramInput.trim() || 'खाली (Empty Pipe)';
    const pipeStatus = pipeProgramInput.trim() ? 'ASSIGNED' : 'EMPTY_PIPE';

    const { error } = await supabase
      .from('pipe_stock')
      .upsert([{
        pipe_number: pipeNumInput.trim(),
        pipe_size: pipeSizeInput.trim(),
        is_small_pipe: isSmallPipeInput,
        program_assigned: assignedProgram,
        status: pipeStatus,
        updated_by: `${accountLabel} (${userRole})`,
        updated_at: new Date().toISOString()
      }], { onConflict: 'pipe_number' });

    if (!error) {
      setPipeNumInput('');
      setPipeSizeInput('');
      setIsSmallPipeInput(false);
      setPipeProgramInput('');
      fetchPipeStock();
      alert('✅ Pipe डिटेल और प्रोग्राम अपडेट हो गया!');
    } else {
      alert('Pipe सेव करने में त्रुटि: ' + error.message);
    }
  };

  const handleSaveMyProfileAndCompany = async (e) => {
    e.preventDefault();
    if (!session || userRole !== 'owner') return;

    const { error: myErr } = await supabase
      .from('profiles')
      .update({
        company_name: editCompanyName,
        account_label: editAccountLabel,
        duty_note: editDutyNote
      })
      .eq('id', session.user.id);

    await supabase.from('profiles').update({ company_name: editCompanyName });

    if (!myErr) {
      setCompanyName(editCompanyName);
      setAccountLabel(editAccountLabel);
      setDutyNote(editDutyNote);
      fetchUserProfile(session.user.id);
      alert('✅ कंपनी का नाम और ड्यूटी विवरण सेव हो गया!');
    }
  };

  const handleUpdateStaffRole = async (profileId, newRole, newDuty) => {
    if (userRole !== 'owner') return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, duty_note: newDuty })
      .eq('id', profileId);

    if (!error) {
      fetchUserProfile(session.user.id);
      alert('✅ स्टाफ का रोल और ड्यूटी अपडेट हो गई!');
    }
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
        <form onSubmit={handleLogin} style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a', textAlign: 'center' }}>🏭 मिल ERP लॉगिन</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '22px' }}>Owner, Master, Supervisor, Fitter या Karigar लॉगिन</p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '5px' }}>ई-मेल (Email)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@mill.com" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '5px' }}>पासवर्ड (Password)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={authLoading} style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            {authLoading ? 'लॉगिन हो रहा है...' : 'लॉगिन करें ➔'}
          </button>
        </form>
      </div>
    );
  }

  const canSeeCost = userRole === 'owner';
  const canSeePipeAndMasterAudit = ['owner', 'supervisor', 'main_master', 'running_master'].includes(userRole);
  const canAddCost = ['owner', 'supervisor', 'main_master', 'running_master'].includes(userRole);
  const canDoMaintenance = ['owner', 'main_master', 'supervisor', 'running_master', 'fitter', 'beam_getter'].includes(userRole);
  const canChangeStatus = ['owner', 'main_master', 'supervisor', 'running_master', 'fitter', 'beam_getter'].includes(userRole);
  const canAddMachine = ['owner', 'main_master', 'supervisor'].includes(userRole);

  const totalMillMonthlyCost = machines.reduce((acc, m) => acc + (m.maintenanceRecord?.monthlyTotalCost || 0), 0);
  const countAll = machines.length;
  const countRun = machines.filter(m => m.status === 'चालू (Running)').length;
  const countBand = machines.filter(m => m.status.includes('खाली') || m.status.includes('Band')).length;
  const countProblem = machines.filter(m => m.status.includes('खराब') || m.status.includes('Problem')).length;
  const problemMachines = machines.filter(m => m.status.includes('खराब') || m.status.includes('Problem'));

  // जब दोबारा फॉल्ट आए, तो पिछला काम करने वाला मास्टर Owner को दिखे
  const repeatFaultMachines = machines.filter(
    m => (m.isRepeatFault || (m.historyIssues && m.historyIssues.length > 1)) && m.maintenanceRecord?.lastMasterName
  );

  // 1. फॉल्ट / प्रॉब्लम दर्ज करना
  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueModalMachine || !issueText.trim()) return;

    const oldHistory = issueModalMachine.historyIssues || [];
    const hadPreviousIssue = oldHistory.length > 0;
    const isRepeat = hadPreviousIssue || oldHistory.some(old => old.toLowerCase().includes(issueText.toLowerCase()));
    const updatedHistory = [...oldHistory, issueText];
    const prevMaster = issueModalMachine.maintenanceRecord?.lastMasterName || '';

    const updatedRecord = {
      ...issueModalMachine.maintenanceRecord,
      historyIssues: updatedHistory,
      isRepeatFault: isRepeat,
      suspectMasterName: isRepeat ? prevMaster : (issueModalMachine.maintenanceRecord?.suspectMasterName || '')
    };

    const { error } = await supabase
      .from('machines')
      .update({
        status: 'खराब (Problem)',
        issue: issueText,
        maintenance_record: updatedRecord
      })
      .eq('id', issueModalMachine.id);

    if (!error) {
      fetchMachines();
      setIssueModalMachine(null);
      setIssueText('');
      alert(`📢 फॉल्ट मैसेज दर्ज हो गया! ${issueModalMachine.number} की समस्या सभी को दिख रही है।`);
    }
  };

  // 2. मशीन खाली (Band) मार्क करना (मशीन खाली होने का रिकॉर्ड)
  const handleMarkEmpty = async (id) => {
    if (!canChangeStatus) return;
    const target = machines.find(m => m.id === id);
    const updatedRecord = {
      ...target.maintenanceRecord,
      isRepeatFault: false,
      lastEmptyDate: new Date().toLocaleDateString('en-GB')
    };
    const { error } = await supabase
      .from('machines')
      .update({
        status: 'खाली (Band / Idle)',
        issue: '',
        maintenance_record: updatedRecord
      })
      .eq('id', id);

    if (!error) fetchMachines();
  };

  // 3. 14-पॉइंट मेंटेनेंस + मास्टर नाम + मीटर फीड सेव करके चालू करना
  const handleSaveMaintenanceAndStart = async (e) => {
    e.preventDefault();
    if (!canDoMaintenance) return;
    if (Object.values(checkedItems).filter(Boolean).length < 14) {
      alert("⚠️ कृपया सभी 14 मेंटेनेंस पॉइंट्स चेक करें!");
      return;
    }

    const updatedRecord = {
      ...maintenanceModalMachine.maintenanceRecord,
      techName,
      beamBinderName,
      lastMasterName: masterWorkedName || techName || accountLabel,
      lastMeterFed: meterFedValue || newBeamDetails.meterBeam || '-',
      lastServiceDate: new Date().toLocaleDateString('en-GB'),
      isRepeatFault: false
    };

    const updatedTechDetails = {
      ...newBeamDetails,
      meterBeam: meterFedValue || newBeamDetails.meterBeam
    };

    const { error } = await supabase
      .from('machines')
      .update({
        status: 'चालू (Running)',
        operator: newBeamDetails.operator || 'रमेश भाई',
        tech_details: updatedTechDetails,
        maintenance_record: updatedRecord
      })
      .eq('id', maintenanceModalMachine.id);

    if (!error) {
      fetchMachines();
      setMaintenanceModalMachine(null);
      setCheckedItems({});
      setMasterWorkedName('');
      setMeterFedValue('');
    }
  };

  // 4. प्रॉब्लम सॉल्व / रिपेयर कॉस्ट व मास्टर का नाम सेव करना
  const handleCompleteRepair = async (e) => {
    e.preventDefault();
    if (!resolveModalMachine || !canAddCost) return;
    const addedCost = Number(repairCost) || 0;
    const prevMonthly = resolveModalMachine.maintenanceRecord?.monthlyTotalCost || 0;
    const masterNameUsed = resolvedByMaster.trim() || resolveModalMachine.maintenanceRecord?.lastMasterName || accountLabel;

    const updatedRecord = {
      ...resolveModalMachine.maintenanceRecord,
      sparePart: sparePartName || 'पार्ट नहीं',
      repairCost: addedCost,
      monthlyTotalCost: prevMonthly + addedCost,
      lastMasterName: masterNameUsed,
      lastMeterFed: meterFedValue || resolveModalMachine.maintenanceRecord?.lastMeterFed || '-',
      isRepeatFault: false
    };

    const { error } = await supabase
      .from('machines')
      .update({
        status: 'चालू (Running)',
        issue: '',
        maintenance_record: updatedRecord
      })
      .eq('id', resolveModalMachine.id);

    if (!error) {
      fetchMachines();
      setResolveModalMachine(null);
      setSparePartName('');
      setRepairCost('');
      setResolvedByMaster('');
      setMeterFedValue('');
      alert('✅ प्रॉब्लम सॉल्व व मास्टर रिकॉर्ड सेव हो गया! अब मशीन चालू है।');
    }
  };

  // कारीगर या स्टाफ द्वारा सीधे प्रॉब्लम सॉल्व करके मशीन चालू करना (जब मास्टर काम कर चुका हो)
  const handleKarigarStartAfterSolve = async (machine) => {
    const updatedRecord = {
      ...machine.maintenanceRecord,
      isRepeatFault: false,
      lastStartedBy: `${accountLabel} (${userRole})`
    };

    const { error } = await supabase
      .from('machines')
      .update({
        status: 'चालू (Running)',
        issue: '',
        maintenance_record: updatedRecord
      })
      .eq('id', machine.id);

    if (!error) {
      fetchMachines();
      alert(`✅ ${machine.number} की प्रॉब्लम सॉल्व होने पर मशीन चालू कर दी गई!`);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!canAddMachine || !newMachineNum.trim()) return;
    const { error } = await supabase.from('machines').insert([{
      number: newMachineNum,
      status: 'खाली (Band / Idle)',
      operator: '-',
      issue: '',
      tech_details: { pick: '-', panna: '-', pattern: '-', fawdi: '-', weftBhava: '-', nozzle: '-', rpm: '-', quality: 'खाली (No Beam)', pipeNo: '-', meterBeam: '-' },
      maintenance_record: { monthlyTotalCost: 0, historyIssues: [], isRepeatFault: false, lastMasterName: '', lastMeterFed: '' }
    }]);
    if (!error) { fetchMachines(); setNewMachineNum(''); setShowAddMachine(false); }
  };

  const sendWhatsAppReport = () => {
    let msg = `🏭 *${companyName} लाइव रिपोर्ट*\nकुल मशीनें: ${countAll} | चालू: ${countRun} | खाली: ${countBand} | खराब: ${countProblem}`;
    if (canSeeCost) msg += `\n💰 कुल मासिक रिपेयर खर्चा: ₹${totalMillMonthlyCost}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredMachines = machines.filter(m => {
    if (activeFilter === 'RUN') return m.status === 'चालू (Running)';
    if (activeFilter === 'BAND') return m.status.includes('खाली') || m.status.includes('Band');
    if (activeFilter === 'PROBLEM') return m.status.includes('खराब') || m.status.includes('Problem');
    return true;
  });

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    if (a.isRepeatFault && !b.isRepeatFault) return -1;
    if (!a.isRepeatFault && b.isRepeatFault) return 1;
    if (a.status.includes('Problem') && !b.status.includes('Problem')) return -1;
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', Roboto, sans-serif", paddingBottom: '60px' }}>

      {/* हेडर */}
      <div style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '18px 26px', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>
              🏭 {companyName}
              <span style={{ marginLeft: '10px', fontSize: '12px', background: userRole === 'owner' ? '#10b981' : '#3b82f6', padding: '3px 8px', borderRadius: '6px' }}>
                {ROLE_LABELS[userRole] || userRole}
              </span>
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              खाता: <strong style={{ color: '#e2e8f0' }}>{accountLabel}</strong>
              {dutyNote ? ` • ड्यूटी: ${dutyNote}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {canAddMachine && (
              <button onClick={() => setShowAddMachine(!showAddMachine)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                + मशीन जोड़ें
              </button>
            )}

            {canSeePipeAndMasterAudit && (
              <button onClick={() => setShowPipePanel(!showPipePanel)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                🧵 Pipe व प्रोग्राम
              </button>
            )}

            <button onClick={() => setShowMasterQRModal(true)} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              📷 मास्टर QR
            </button>

            {userRole === 'owner' && (
              <button onClick={() => setShowRoleDutyPanel(!showRoleDutyPanel)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                ⚙️ ड्यूटी व कंपनी सेटिंग
              </button>
            )}

            {canSeeCost && (
              <>
                <button onClick={sendWhatsAppReport} style={{ background: '#25D366', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  📲 WhatsApp
                </button>
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '7px 12px', borderRadius: '8px', fontSize: '13px' }}>
                  मिल का कुल खर्चा: <strong style={{ color: '#38bdf8' }}>₹{totalMillMonthlyCost}</strong>
                </div>
              </>
            )}

            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              लॉगआउट
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '24px auto 0', padding: '0 20px' }}>

        {/* Owner को दिखने वाला मास्टर रिपीट-फॉल्ट / धोखा अलर्ट */}
        {canSeeCost && repeatFaultMachines.length > 0 && (
          <div style={{ background: '#fff1f2', border: '2px solid #e11d48', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', color: '#881337', fontSize: '13px' }}>
            <strong>🚨 Owner मास्टर अलर्ट (दोबारा प्रॉब्लम आई):</strong>{' '}
            {repeatFaultMachines.map(rm =>
              `${rm.number} में पहले काम करने वाले मास्टर: "${rm.maintenanceRecord.lastMasterName}"`
            ).join(' | ')}
          </div>
        )}

        {/* लाइव फॉल्ट मैसेज बैनर */}
        {problemMachines.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', color: '#991b1b', fontSize: '13px' }}>
            <strong>📢 लाइव फॉल्ट मैसेज अलर्ट:</strong>{' '}
            {problemMachines.map(pm => `${pm.number} (${pm.issue})`).join(' | ')}
          </div>
        )}

        {/* Pipe Size व खाली Pipe प्रोग्राम पैनल (Owner और Supervisor को दिखेगा) */}
        {canSeePipeAndMasterAudit && showPipePanel && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', marginBottom: '20px', border: '2px solid #0ea5e9' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>🧵 खाली Pipe, Pipe Size व प्रोग्राम एंट्री</h3>
            <form onSubmit={handleSavePipeEntry} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <input type="text" value={pipeNumInput} onChange={e => setPipeNumInput(e.target.value)} placeholder="Pipe Number (जैसे: P-12)" required style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" value={pipeSizeInput} onChange={e => setPipeSizeInput(e.target.value)} placeholder="Pipe Size (जैसे: 48 inch)" required style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" value={pipeProgramInput} onChange={e => setPipeProgramInput(e.target.value)} placeholder="कौन-सा प्रोग्राम दिया (जैसे: 2x2 Twill)" style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px' }}>
                <input type="checkbox" checked={isSmallPipeInput} onChange={e => setIsSmallPipeInput(e.target.checked)} />
                छोटा Pipe है
              </label>
              <button type="submit" style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                ✓ Pipe अपडेट करें
              </button>
            </form>

            {pipeStock.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Pipe No.</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Pipe Size</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>छोटा Pipe</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>दिया गया प्रोग्राम</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeStock.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: '700' }}>{p.pipe_number}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{p.pipe_size}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{p.is_small_pipe ? 'हाँ (छोटा Pipe)' : 'नहीं'}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', color: '#0369a1', fontWeight: '600' }}>{p.program_assigned}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Owner ड्यूटी व कंपनी सेटिंग पैनल */}
        {userRole === 'owner' && showRoleDutyPanel && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', marginBottom: '20px', border: '2px solid #f59e0b' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>👑 Owner कंट्रोल: कंपनी नाम व स्टाफ ड्यूटी</h3>
            <form onSubmit={handleSaveMyProfileAndCompany} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '18px' }}>
              <input type="text" value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} placeholder="कंपनी का नाम" required style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" value={editAccountLabel} onChange={e => setEditAccountLabel(e.target.value)} placeholder="आपके खाते का नाम" style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" value={editDutyNote} onChange={e => setEditDutyNote(e.target.value)} placeholder="ड्यूटी नोट" style={{ padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>✓ सेव करें</button>
            </form>

            {staffProfiles.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>ई-मेल / खाता</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>रोल (Duty Role)</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>काम / ड्यूटी विवरण</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>अपडेट</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffProfiles.map((sp) => (
                      <StaffDutyRow key={sp.id} profile={sp} onSave={handleUpdateStaffRole} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showAddMachine && canAddMachine && (
          <form onSubmit={handleAddMachine} style={{ background: '#fff', padding: '18px', borderRadius: '12px', marginBottom: '20px', border: '2px solid #3b82f6', maxWidth: '400px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>➕ नई मशीन नंबर जोड़ें</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" value={newMachineNum} onChange={e => setNewMachineNum(e.target.value)} placeholder="जैसे: Loom-101" required style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>सेव करें</button>
            </div>
          </form>
        )}

        {/* फिल्टर बार */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '22px' }}>
          <button onClick={() => setActiveFilter('ALL')} style={{ background: activeFilter === 'ALL' ? '#0f172a' : '#fff', color: activeFilter === 'ALL' ? '#fff' : '#0f172a', padding: '14px', borderRadius: '12px', border: '2px solid #0f172a', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.8 }}>All Mc</div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{countAll}</div>
          </button>
          <button onClick={() => setActiveFilter('RUN')} style={{ background: activeFilter === 'RUN' ? '#10b981' : '#fff', color: activeFilter === 'RUN' ? '#fff' : '#10b981', padding: '14px', borderRadius: '12px', border: '2px solid #10b981', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.8 }}>Run Mc (चालू)</div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{countRun}</div>
          </button>
          <button onClick={() => setActiveFilter('BAND')} style={{ background: activeFilter === 'BAND' ? '#d97706' : '#fff', color: activeFilter === 'BAND' ? '#fff' : '#d97706', padding: '14px', borderRadius: '12px', border: '2px solid #d97706', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.8 }}>Band Mc (खाली)</div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{countBand}</div>
          </button>
          <button onClick={() => setActiveFilter('PROBLEM')} style={{ background: activeFilter === 'PROBLEM' ? '#e11d48' : '#fff', color: activeFilter === 'PROBLEM' ? '#fff' : '#e11d48', padding: '14px', borderRadius: '12px', border: '2px solid #e11d48', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.8 }}>Problem Mc (खराब)</div>
            <div style={{ fontSize: '22px', fontWeight: '800' }}>{countProblem}</div>
          </button>
        </div>

        {/* मशीन कार्ड ग्रिड */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>⏳ लोड हो रहा है...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
            {sortedMachines.map((machine) => {
              const isProblem = machine.status.includes('Problem');
              const isBand = machine.status.includes('Band') || machine.status.includes('खाली');
              const machineMonthlyCost = machine.maintenanceRecord?.monthlyTotalCost || 0;
              const lastMaster = machine.maintenanceRecord?.lastMasterName || '';

              return (
                <div key={machine.id} style={{
                  background: '#fff', borderRadius: '16px', padding: '20px',
                  border: machine.isRepeatFault ? '2.5px solid #dc2626' : isProblem ? '2.5px solid #fecdd3' : isBand ? '2px solid #fde68a' : '1.5px solid #bbf7d0',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div>
                    {machine.isRepeatFault && (
                      <div style={{ background: '#dc2626', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', marginBottom: '10px', textAlign: 'center' }}>
                        🚨 REPEAT WORK ALERT {canSeeCost && lastMaster ? `• Master: ${lastMaster}` : ''}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <button onClick={() => setViewDetailsMachine(machine)} style={{ background: 'none', border: 'none', padding: 0, fontSize: '20px', fontWeight: '800', color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline' }}>
                        {machine.number} ℹ️ (पूरी डिटेल)
                      </button>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: isProblem ? '#ffe4e6' : isBand ? '#fef3c7' : '#dcfce7', color: isProblem ? '#be123c' : isBand ? '#b45309' : '#15803d' }}>
                        {machine.status}
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '13px', color: '#334155', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>🧵 Quality: <strong>{machine.techDetails.quality}</strong></span>
                        <span>Pick: <strong>{machine.techDetails.pick}</strong></span>
                      </div>

                      {canSeePipeAndMasterAudit && lastMaster && (
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                          🛠️ Master: <strong>{lastMaster}</strong>
                        </div>
                      )}

                      {canSeeCost && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '6px' }}>
                          <span style={{ color: '#0369a1', fontWeight: '700' }}>📊 इस महीने का खर्चा:</span>
                          <strong style={{ color: '#0284c7', fontSize: '14px' }}>₹{machineMonthlyCost}</strong>
                        </div>
                      )}
                    </div>

                    {isProblem && (
                      <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#9f1239', marginBottom: '12px' }}>
                        <strong>⚠️ Problem:</strong> {machine.issue}
                      </div>
                    )}
                  </div>

                  {/* एक्शन बटन्स */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isProblem ? (
                      canAddCost ? (
                        <button onClick={() => setResolveModalMachine(machine)} style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                          ✓ प्रॉब्लम सॉल्व / रिपेयर (Master व खर्च दर्ज करें)
                        </button>
                      ) : (
                        <button onClick={() => handleKarigarStartAfterSolve(machine)} style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                          ▶ प्रॉब्लम सॉल्व हुई — मशीन चालू करें
                        </button>
                      )
                    ) : isBand ? (
                      canDoMaintenance ? (
                        <button onClick={() => setMaintenanceModalMachine(machine)} style={{ width: '100%', padding: '10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                          🛠️ 14-पॉइंट मेंटेनेंस, मास्टर व बीम सेटअप
                        </button>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          मशीन खाली है • नॉर्मल डिटेल देखें
                        </div>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setIssueModalMachine(machine)} style={{ flex: 1, padding: '9px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          ⚠️ Fault / Problem बताएं
                        </button>
                        {canChangeStatus && (
                          <button onClick={() => handleMarkEmpty(machine.id)} style={{ padding: '9px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            मशीन खाली (Band)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* पॉप-अप: 10-पॉइंट कुंडली */}
        {viewDetailsMachine && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '19px', color: '#0f172a' }}>📋 {viewDetailsMachine.number} - 10-पॉइंट टेक्निकल कुंडली</h3>
                <button onClick={() => setViewDetailsMachine(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>1. Pick</span><strong>{viewDetailsMachine.techDetails.pick}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>2. पन्ना</span><strong>{viewDetailsMachine.techDetails.panna}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>3. पैटर्न</span><strong>{viewDetailsMachine.techDetails.pattern}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>4. फावड़ी</span><strong>{viewDetailsMachine.techDetails.fawdi}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>5. Weft भाव</span><strong>{viewDetailsMachine.techDetails.weftBhava}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>6. नोजल (1x1/2x2)</span><strong>{viewDetailsMachine.techDetails.nozzle}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>7. RPM</span><strong>{viewDetailsMachine.techDetails.rpm}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>8. क्वालिटी</span><strong>{viewDetailsMachine.techDetails.quality}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>9. Pipe Number</span><strong>{viewDetailsMachine.techDetails.pipeNo}</strong></div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>10. मीटर / Beam</span><strong>{viewDetailsMachine.techDetails.meterBeam}</strong></div>
              </div>

              {canSeePipeAndMasterAudit && (
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#166534', marginBottom: '12px' }}>
                  <div>🛠️ <strong>आखरी काम करने वाला Master:</strong> {viewDetailsMachine.maintenanceRecord?.lastMasterName || '-'}</div>
                  <div>📏 <strong>फीड किया गया मीटर:</strong> {viewDetailsMachine.maintenanceRecord?.lastMeterFed || '-'}</div>
                </div>
              )}

              {canSeeCost && (
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', fontSize: '13px', color: '#1e3a8a', marginBottom: '16px' }}>
                  <div>💰 <strong>इस महीने का कुल रिपेयरिंग खर्चा: ₹{viewDetailsMachine.maintenanceRecord?.monthlyTotalCost || 0}</strong></div>
                  <div>⚙️ आखरी बदला गया पार्ट: {viewDetailsMachine.maintenanceRecord?.sparePart || 'कोई नहीं'}</div>
                </div>
              )}

              <button onClick={() => setViewDetailsMachine(null)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>बंद करें</button>
            </div>
          </div>
        )}

        {/* पॉप-अप: 14-पॉइंट मेंटेनेंस, मास्टर नाम व मीटर फीड */}
        {maintenanceModalMachine && canDoMaintenance && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <form onSubmit={handleSaveMaintenanceAndStart} style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>🛠️ {maintenanceModalMachine.number} - 14-पॉइंट मेंटेनेंस व बीम सेटअप</h3>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>✅ मेंटेनेंस चेकलिस्ट (सभी 14 अनिवार्य):</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {MAINTENANCE_CHECKLIST.map((item) => (
                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!checkedItems[item]} onChange={(e) => setCheckedItems({ ...checkedItems, [item]: e.target.checked })} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <input type="text" placeholder="Master का नाम (Running/Main)*" value={masterWorkedName} onChange={e => setMasterWorkedName(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="मीटर फीड (जैसे: 120 मीटर)" value={meterFedValue} onChange={e => setMeterFedValue(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="मिस्त्री / फिटर का नाम*" value={techName} onChange={e => setTechName(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input type="text" placeholder="बीम गेटर / बांधने वाले का नाम*" value={beamBinderName} onChange={e => setBeamBinderName(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <input type="text" placeholder="1. Pick*" value={newBeamDetails.pick} onChange={e => setNewBeamDetails({...newBeamDetails, pick: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="2. पन्ना*" value={newBeamDetails.panna} onChange={e => setNewBeamDetails({...newBeamDetails, panna: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="3. पैटर्न*" value={newBeamDetails.pattern} onChange={e => setNewBeamDetails({...newBeamDetails, pattern: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="4. फावड़ी*" value={newBeamDetails.fawdi} onChange={e => setNewBeamDetails({...newBeamDetails, fawdi: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="5. Weft भाव*" value={newBeamDetails.weftBhava} onChange={e => setNewBeamDetails({...newBeamDetails, weftBhava: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="6. नोजल (1x1/2x2)*" value={newBeamDetails.nozzle} onChange={e => setNewBeamDetails({...newBeamDetails, nozzle: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="7. RPM*" value={newBeamDetails.rpm} onChange={e => setNewBeamDetails({...newBeamDetails, rpm: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="8. क्वालिटी*" value={newBeamDetails.quality} onChange={e => setNewBeamDetails({...newBeamDetails, quality: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="9. Pipe No.*" value={newBeamDetails.pipeNo} onChange={e => setNewBeamDetails({...newBeamDetails, pipeNo: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="10. मीटर / Beam*" value={newBeamDetails.meterBeam} onChange={e => setNewBeamDetails({...newBeamDetails, meterBeam: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                <input type="text" placeholder="कारीगर का नाम*" value={newBeamDetails.operator} onChange={e => setNewBeamDetails({...newBeamDetails, operator: e.target.value})} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>✓ सेव करें व मशीन चालू करें</button>
                <button type="button" onClick={() => setMaintenanceModalMachine(null)} style={{ background: '#e2e8f0', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>रद्द करें</button>
              </div>
            </form>
          </div>
        )}

        {/* पॉप-अप: प्रॉब्लम सॉल्व / रिपेयर व मास्टर एंट्री */}
        {resolveModalMachine && canAddCost && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <form onSubmit={handleCompleteRepair} style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '420px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>💰 {resolveModalMachine.number} - प्रॉब्लम सॉल्व व रिकॉर्ड</h3>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>किस Master ने काम किया? (Running / Main Master)</label>
                <input type="text" value={resolvedByMaster} onChange={e => setResolvedByMaster(e.target.value)} placeholder="Master का नाम लिखें" required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>मीटर फीड (यदि कोई मीटर फीड किया हो)</label>
                <input type="text" value={meterFedValue} onChange={e => setMeterFedValue(e.target.value)} placeholder="जैसे: 1 मीटर / 50 मीटर" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>स्पेयर पार्ट का नाम</label>
                <input type="text" value={sparePartName} onChange={e => setSparePartName(e.target.value)} placeholder="जैसे: V-Belt" required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>इस बार का खर्चा (₹)</label>
                <input type="number" value={repairCost} onChange={e => setRepairCost(e.target.value)} placeholder="जैसे: 450" required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>सेव व चालू करें</button>
                <button type="button" onClick={() => setResolveModalMachine(null)} style={{ background: '#e2e8f0', padding: '10px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>रद्द करें</button>
              </div>
            </form>
          </div>
        )}

        {/* पॉप-अप: कारीगर / स्टाफ फॉल्ट रिपोर्ट */}
        {issueModalMachine && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <form onSubmit={handleReportIssue} style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '420px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>⚠️ {issueModalMachine.number} - Fault / Problem बताएं</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {['नोजल प्रेशर कम है', 'धागा बार-बार टूट रहा है', 'वी-बेल्ट टूट गई है', 'ऑयल लीकेज हो रहा है'].map(chip => (
                  <button key={chip} type="button" onClick={() => setIssueText(chip)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '14px', fontSize: '12px', cursor: 'pointer' }}>{chip}</button>
                ))}
              </div>
              <textarea value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="मशीन में क्या फॉल्ट आया है यहाँ लिखें..." required rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '14px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#e11d48', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>फॉल्ट मैसेज भेजें</button>
                <button type="button" onClick={() => setIssueModalMachine(null)} style={{ background: '#e2e8f0', padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>रद्द करें</button>
              </div>
            </form>
          </div>
        )}

        {/* मास्टर QR कोड पॉप-अप */}
        {showMasterQRModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: '#fff', padding: '26px', borderRadius: '16px', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>📷 {companyName} मास्टर QR कोड</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>इस QR कोड को स्कैन करके अपने खाते वाले फोन से ऐप खोलें।</p>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'inline-block', marginBottom: '16px' }}>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://surat-mill-erp.vercel.app" alt="Master QR" style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }} />
              </div>
              <button onClick={() => setShowMasterQRModal(false)} style={{ width: '100%', padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>बंद करें</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StaffDutyRow({ profile, onSave }) {
  const [role, setRole] = useState(profile.role || 'karigar');
  const [duty, setDuty] = useState(profile.duty_note || '');

  return (
    <tr>
      <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{profile.email || profile.account_label || profile.id}</td>
      <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="owner">Owner</option>
          <option value="main_master">Main Master</option>
          <option value="supervisor">Supervisor</option>
          <option value="running_master">Running Master</option>
          <option value="fitter">Fitter</option>
          <option value="beam_getter">Beam Getter</option>
          <option value="karigar">Karigar</option>
        </select>
      </td>
      <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
        <input type="text" value={duty} onChange={e => setDuty(e.target.value)} placeholder="ड्यूटी लिखें..." style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
      </td>
      <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
        <button type="button" onClick={() => onSave(profile.id, role, duty)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
          सेव
        </button>
      </td>
    </tr>
  );
}