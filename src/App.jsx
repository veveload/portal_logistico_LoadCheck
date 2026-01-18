import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Upload, LayoutDashboard, CheckCircle, Clock, 
  Eye, X, Edit, Save, Download, 
  FileSpreadsheet, LogOut, Shield, Users, Lock, ChevronLeft, ChevronRight,
  MapPin, AlertOctagon, FileText, History, AlertTriangle, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- COLUNAS ---
const ALL_COLUMNS_ORDERED = [
  'TRANSPORTADORA', 'FILIAL ORIGEM', 'PLACA VEÍCULO', 'SHIPMENT', 
  'TIPO DE NOTIFICAÇÂO', 'Nº CX - FALTA/SOBRA', 'DTS', 'REMESSA', 
  'NF', 'PEDIDO', 'FILIAL DESTINO', 'DATA DESCARGA', 'ENVIADO PARA ANÁLISE', 
  'HORA', 'TP CONSULTORA', 'JUST. ACEITA - TRP?', 'OBSERVAÇÃO TRP',
  'CÓD T', 'CENTRO (PA LIGHT)', 'ORDEM DE VENDA (PA LIGHT)', 'RETORNO DA OCORRÊNCIA',
  'HORARIO DO RETORNO', 'PROBLEMA', 'SITUAÇÃO', 'RESOLUÇÃO', 
  'OFENSOR MACRO', 'OFENSOR MICRO', 'CAUSA', 'TEMPO', 'RESPONSÁVEL', 'ANALISADO POR:', 
  'ID FATURISTA', 'OCORRÊNCIA', 'CD', 'AGUARDANDO RETORNO',
  'VALIDAÇÃO REGIONAL', 'PARECER REGIONAL', 'OBSERVAÇÃO GERAL', 
  'Analise Retroativa', 'JUST. ACEITA - CD?', 'JUST. ACEITA - NATURA?', 'VALIDADO POR:'
];

const FIELDS_TRP = ALL_COLUMNS_ORDERED.slice(0, 17);
const FIELDS_CD = ALL_COLUMNS_ORDERED.slice(17, 36);
const FIELDS_REGIONAL = ALL_COLUMNS_ORDERED.slice(36);
const REQUIRED_FIELDS_RESPONSE = ['SHIPMENT', 'RETORNO DA OCORRÊNCIA'];
const LOCKED_STATUSES = ['FINALIZADO', 'PROCEDENTE', 'IMPROCEDENTE', 'ACORDADO'];

// --- LOGIN ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message); else alert("Conta criada!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
      }
    } catch (err) { alert(err.message); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <div className="bg-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Lock className="text-white" size={32}/></div>
        <h1 className="text-2xl font-black uppercase text-slate-900 mb-8">Portal Logístico</h1>
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required className="w-full p-3 border border-slate-200 rounded-lg font-bold" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label><input type="password" required className="w-full p-3 border border-slate-200 rounded-lg font-bold" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-lg">{loading ? '...' : isSignUp ? 'Criar Conta' : 'Entrar'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-xs font-bold text-slate-400 hover:text-slate-600">{isSignUp ? 'Voltar para Login' : 'Criar nova conta'}</button>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewRecord, setViewRecord] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [formValues, setFormValues] = useState({});

  // --- SESSÃO E PERFIL (MODO DE EMERGÊNCIA ATIVADO) ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await fetchProfile(session.user);
      else setLoadingProfile(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) await fetchProfile(session.user);
      else { setProfile(null); setLoadingProfile(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (user) => {
    setLoadingProfile(true);
    try {
      console.log("Tentando buscar perfil para:", user.id);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (data) {
        console.log("Perfil encontrado no banco:", data);
        setProfile(data);
      } else {
        console.warn("Perfil não encontrado no banco. Usando Fallback de Emergência.");
        // PERFIL TEMPORÁRIO DE EMERGÊNCIA PARA NÃO TRAVAR O SISTEMA
        setProfile({ 
          id: user.id, 
          email: user.email, 
          role: 'ADMIN', // Assume Admin temporariamente se falhar
          assigned_entity: 'GLOBAL' 
        });
      }
    } catch (e) {
      console.error("Erro crítico ao buscar perfil:", e);
      // PERFIL DE ERRO (Ainda permite entrar)
      setProfile({ email: user.email, role: 'ADMIN', assigned_entity: 'ERRO_DB' });
    } finally {
      setLoadingProfile(false);
    }
  };

  // --- DADOS (TUDO ABERTO) ---
  const fetchRecords = async (resetPage = false) => {
    setLoadingData(true);
    try {
      const currentPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);
      
      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      let query = supabase.from('logistics_records').select('*', { count: 'exact' });
      query = query.order('created_at', { ascending: false }).range(from, to);
      
      const { data, count, error } = await query;
      if (error) throw error;
      
      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Erro ao buscar registros:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { if (!loadingProfile && session) fetchRecords(); }, [loadingProfile, session, page, rowsPerPage]);

  const fetchAudit = async (recordId) => {
    const { data } = await supabase.from('audit_logs').select('*').eq('record_id', recordId).order('created_at', { ascending: false });
    setAuditHistory(data || []);
  };

  const logAction = async (recordId, action, details) => {
    await supabase.from('audit_logs').insert([{ record_id: recordId, action, changed_by: session?.user?.email, details }]);
  };

  // --- HELPERS ---
  const isLocked = (r) => LOCKED_STATUSES.includes((r.retornoOcorrencia || '').toUpperCase());
  
  const getStatusData = () => {
    if (!records) return [];
    const solved = records.filter(r => r.retornoOcorrencia).length;
    const pending = records.length - solved;
    return [{ name: 'Finalizados', value: solved }, { name: 'Pendentes', value: pending }];
  };

  const getChartData = () => {
    if (!records) return [];
    const counts = {};
    records.forEach(r => { const k = r.trp || '?'; counts[k] = (counts[k] || 0) + 1; });
    return Object.keys(counts).slice(0, 5).map(k => ({ name: k, value: counts[k] }));
  };

  const handleDownloadTemplate = (role) => {
    let fields = [];
    let fileName = "";
    if (role === 'TRP') { fields = FIELDS_TRP; fileName = "Modelo_Apontamento.xlsx"; }
    else if (role === 'CD') { fields = FIELDS_CD; fileName = "Modelo_Resposta_CD.xlsx"; }
    else if (role === 'REGIONAL') { fields = FIELDS_REGIONAL; fileName = "Modelo_Regional.xlsx"; }
    const ws = XLSX.utils.json_to_sheet([{}], { header: fields });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Modelo"); XLSX.writeFile(wb, fileName);
  };

  const handleCreate = async () => {
    if (!formValues['TRANSPORTADORA'] || !formValues['SHIPMENT']) return alert("Preencha Transportadora e Shipment.");
    const vitalData = {
      trp: formValues['TRANSPORTADORA'], 
      pedido: formValues['SHIPMENT'] || formValues['PEDIDO'], 
      placaVeiculo: formValues['PLACA VEÍCULO'], 
      tipoNotificacao: formValues['TIPO DE NOTIFICAÇÂO'], 
      retornoOcorrencia: null,
      details: { ...formValues, created_by: session?.user?.email }
    };
    const { data, error } = await supabase.from('logistics_records').insert([vitalData]).select();
    if (!error && data) { await logAction(data[0].id, 'CRIACAO', { origem: 'Manual', fields: formValues }); alert('Criado!'); setFormValues({}); fetchRecords(true); setActiveTab('dashboard'); } 
    else { alert('Erro: ' + error.message); }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    if (isLocked(editRecord) && profile?.role !== 'ADMIN') return alert("ERRO: Registro finalizado."); 
    const currentDetails = editRecord.details || {}; const newDetails = { ...currentDetails, ...formValues };
    const updateData = { details: newDetails }; 
    if (formValues['RETORNO DA OCORRÊNCIA']) updateData.retornoOcorrencia = formValues['RETORNO DA OCORRÊNCIA'];
    const { error } = await supabase.from('logistics_records').update(updateData).eq('id', editRecord.id);
    if (!error) { await logAction(editRecord.id, 'ATUALIZACAO', { role: profile?.role, fields: formValues }); alert('Salvo!'); setEditRecord(null); setFormValues({}); fetchRecords(); } 
    else { alert('Erro: ' + error.message); }
  };

  const handleBatchInsert = (e) => {
    const file = e.target.files[0]; if(!file) return; setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result; const wb = XLSX.read(bstr, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; 
        const data = XLSX.utils.sheet_to_json(ws);
        const formatted = data.map(row => ({
          trp: row['TRANSPORTADORA'] || 'IMPORTADO',
          pedido: String(row['SHIPMENT'] || row['PEDIDO'] || Math.random().toString().slice(2,8)),
          placaVeiculo: row['PLACA VEÍCULO'] || '', tipoNotificacao: row['TIPO DE NOTIFICAÇÂO'] || 'CARGA EM LOTE', details: row
        }));
        if(formatted.length > 0) {
           const { error } = await supabase.from('logistics_records').insert(formatted);
           if (error) throw error;
           alert(`${formatted.length} importados!`); fetchRecords(true); setActiveTab('dashboard');
        }
      } catch (err) { alert("Erro Upload: " + err.message); } 
      finally { setProcessingBatch(false); }
    }; reader.readAsBinaryString(file);
  };

  const handleBatchUpdate = (e) => {
    const file = e.target.files[0]; if(!file) return; setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result; const wb = XLSX.read(bstr, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; 
        const rows = XLSX.utils.sheet_to_json(ws);
        let updated = 0, locked = 0;
        for (const row of rows) {
           const key = row['SHIPMENT'] || row['PEDIDO'];
           if (!key) continue;
           const { data: exists } = await supabase.from('logistics_records').select('*').eq('pedido', String(key)).limit(1);
           if (exists && exists[0]) {
              const rec = exists[0];
              if (isLocked(rec) && profile?.role !== 'ADMIN') { locked++; continue; } 
              const newDetails = { ...rec.details, ...row };
              const updateData = { details: newDetails };
              if (row['RETORNO DA OCORRÊNCIA']) updateData.retornoOcorrencia = row['RETORNO DA OCORRÊNCIA'];
              await supabase.from('logistics_records').update(updateData).eq('id', rec.id);
              await logAction(rec.id, 'LOTE', row);
              updated++;
           }
        }
        alert(`Sucesso: ${updated} atualizados. Bloqueados: ${locked}`); fetchRecords();
      } catch (err) { alert("Erro Lote: " + err.message); }
      finally { setProcessingBatch(false); }
    }; reader.readAsBinaryString(file);
  };

  const renderFormFields = (fields) => (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(f => (<div key={f}><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{f}</label><input className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={formValues[f] || ''} onChange={e => setFormValues({...formValues, [f]: e.target.value})} /></div>))}</div>);

  // --- RENDERIZAÇÃO ---
  if (loadingProfile) return <div className="flex h-screen items-center justify-center font-bold text-slate-500">Carregando Sistema...</div>;
  if (!session) return <Login />;

  const filteredRecords = records.filter(r => {
    const t = searchTerm.toLowerCase();
    const d = r.details || {};
    return (d['SHIPMENT'] || '').toString().toLowerCase().includes(t) || (d['PEDIDO'] || '').toString().toLowerCase().includes(t) || (r.trp || '').toLowerCase().includes(t);
  });

  // LOGICA DE BOTÕES: Quem vê o quê?
  const canCreate = profile?.role === 'TRP' || profile?.role === 'ADMIN';
  const canEdit = profile?.role === 'CD' || profile?.role === 'REGIONAL' || profile?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {processingBatch && <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center text-white"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div><h2 className="text-xl font-bold">Processando...</h2></div>}

      {/* MODAL EDIT */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-orange-500 p-6 flex justify-between items-center text-white"><h3 className="font-bold text-xl flex items-center gap-2"><Edit /> Responder ({profile?.role})</h3><button onClick={() => {setEditRecord(null); setFormValues({});}}><X size={24}/></button></div>
            <div className="p-6 overflow-y-auto bg-slate-50">
               <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm">
                 <h4 className="text-sm font-bold text-orange-600 uppercase mb-4">Dados da Resposta</h4>
                 {(profile?.role === 'CD' || profile?.role === 'ADMIN') && renderFormFields(FIELDS_CD)}
                 {(profile?.role === 'REGIONAL' || profile?.role === 'ADMIN') && renderFormFields(FIELDS_REGIONAL)}
               </div>
            </div>
            <div className="p-4 border-t bg-white flex justify-end gap-2"><button onClick={() => setEditRecord(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button><button onClick={handleUpdate} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2"><Save size={18}/> Salvar</button></div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white"><h3 className="font-bold text-xl flex items-center gap-2"><FileText /> Detalhes {isLocked(viewRecord) && <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded">FINALIZADO</span>}</h3><button onClick={() => setViewRecord(null)}><X size={24}/></button></div>
            <div className="p-8 overflow-y-auto bg-slate-50 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h4 className="font-black text-slate-700 uppercase mb-4 flex items-center gap-2"><History size={18}/> Linha do Tempo</h4><div className="space-y-2 max-h-32 overflow-y-auto">{auditHistory.map(log => (<div key={log.id} className="text-xs border-b pb-1 flex gap-2"><span className="font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</span><span className="font-bold bg-slate-100 px-1 rounded">{log.action}</span><span className="text-blue-600">por {log.changed_by}</span></div>))}</div></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-500 overflow-hidden"><div className="bg-blue-50 p-3 border-b border-blue-100"><h4 className="font-black text-blue-800 uppercase flex items-center gap-2"><Truck size={16}/> TRP</h4></div><div className="p-4 grid grid-cols-1 gap-3">{FIELDS_TRP.map(key => (<div key={key} className="border-b border-slate-50 pb-1"><p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p><p className="text-sm font-semibold text-slate-800 break-words">{viewRecord.details?.[key] || '-'}</p></div>))}</div></div>
                <div className="bg-white rounded-xl shadow-sm border-t-4 border-orange-500 overflow-hidden"><div className="bg-orange-50 p-3 border-b border-orange-100"><h4 className="font-black text-orange-800 uppercase flex items-center gap-2"><AlertOctagon size={16}/> CD</h4></div><div className="p-4 grid grid-cols-1 gap-3">{FIELDS_CD.map(key => (<div key={key} className="border-b border-slate-50 pb-1"><p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p><p className="text-sm font-semibold text-slate-800 break-words">{viewRecord.details?.[key] || '-'}</p></div>))}</div></div>
                <div className="bg-white rounded-xl shadow-sm border-t-4 border-emerald-500 overflow-hidden"><div className="bg-emerald-50 p-3 border-b border-emerald-100"><h4 className="font-black text-emerald-800 uppercase flex items-center gap-2"><MapPin size={16}/> REGIONAL</h4></div><div className="p-4 grid grid-cols-1 gap-3">{FIELDS_REGIONAL.map(key => (<div key={key} className="border-b border-slate-50 pb-1"><p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p><p className="text-sm font-semibold text-slate-800 break-words">{viewRecord.details?.[key] || '-'}</p></div>))}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={24} /></div>
          <div><h1 className="text-xl font-black uppercase text-slate-900 leading-none">LoadCheck <span className="text-orange-500">360º</span></h1>
             <p className="text-xs font-bold text-slate-400 mt-1">{session?.user?.email} • <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{profile?.role || 'Visitante'}</span></p></div>
        </div>
        <div className="flex gap-2">
          {profile?.role === 'ADMIN' && <button onClick={() => setActiveTab('admin')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200"><Users size={16}/> Admin</button>}
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200"><LayoutDashboard size={16}/> Dash</button>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100"><LogOut size={16}/> Sair</button>
        </div>
      </header>

      {/* MAIN */}
      {activeTab === 'admin' && profile?.role === 'ADMIN' ? <AdminPanel /> : (
        <main className="max-w-[98%] mx-auto p-4 mt-2">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between items-center"><div><p className="text-xs font-bold text-slate-400 uppercase">Registros</p><p className="text-2xl font-black text-slate-900">{totalCount}</p></div><div className="bg-blue-50 p-3 rounded-lg"><Truck size={20} className="text-blue-600"/></div></div></div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between items-center"><div><p className="text-xs font-bold text-slate-400 uppercase">Pendentes</p><p className="text-2xl font-black text-orange-500">{getStatusData()[1]?.value || 0}</p></div><div className="bg-orange-50 p-3 rounded-lg"><Clock size={20} className="text-orange-600"/></div></div></div>
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 h-28 flex items-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getStatusData()} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">{getStatusData().map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f97316'} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="text-[10px] font-bold text-slate-400 mr-4">STATUS</div></div>
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 h-28 flex items-center"><ResponsiveContainer width="100%" height="100%"><BarChart data={getChartData()}><XAxis dataKey="name" hide /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 4, 4]} /></BarChart></ResponsiveContainer><div className="text-[10px] font-bold text-slate-400 mr-4">VOLUME</div></div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Filtrar nesta página..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                 
                 <div className="flex gap-2">
                   {canCreate && <button onClick={() => setActiveTab('create')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2"><Upload size={16}/> Novo</button>}
                   
                   {canEdit && (
                     <div className="flex gap-1">
                        <button onClick={() => handleDownloadTemplate(profile?.role || 'CD')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-l-lg font-bold text-xs hover:bg-slate-200 border border-r-0">Modelo</button>
                        <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-r-lg font-bold text-xs hover:bg-orange-600 shadow-lg flex items-center gap-2"><Upload size={16}/> Lote Respostas <input type="file" className="hidden" onChange={handleBatchUpdate} /></label>
                     </div>
                   )}
                 </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[65vh]">
                <div className="overflow-auto flex-1 relative">
                  {loadingData && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center font-bold text-slate-500">Carregando dados...</div>}
                  <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase sticky top-0 z-20 shadow-sm">
                      <tr><th className="px-4 py-3 sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-md">Ações</th><th className="px-4 py-3 sticky left-[80px] bg-slate-100 z-30 border-r border-slate-200">Status</th><th className="px-4 py-3 sticky left-[180px] bg-slate-100 z-30 border-r border-slate-200 shadow-md">ID / Data</th>{ALL_COLUMNS_ORDERED.map(col => (<th key={col} className="px-4 py-3 border-r border-slate-200 min-w-[150px]">{col}</th>))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r, idx) => {
                        const locked = isLocked(r);
                        return (
                        <tr key={r.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${locked ? 'bg-slate-100 opacity-80' : ''}`}>
                          <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-md">
                            <div className="flex gap-1"><button onClick={() => { setViewRecord(r); fetchAudit(r.id); }} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><Eye size={14}/></button>{(canEdit && (!locked || profile?.role === 'ADMIN')) && (<button onClick={() => {setEditRecord(r); setFormValues({});}} className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600"><Edit size={14}/></button>)}{locked && <Lock size={14} className="text-slate-400 m-1"/>}</div>
                          </td>
                          <td className="px-4 py-2 sticky left-[80px] bg-white z-10 border-r border-slate-200">{r.retornoOcorrencia ? <span className="text-green-600 font-bold flex gap-1 items-center"><CheckCircle size={12}/> {r.retornoOcorrencia}</span> : <span className="text-orange-500 font-bold flex gap-1 items-center"><Clock size={12}/> Pend</span>}</td>
                          <td className="px-4 py-2 sticky left-[180px] bg-white z-10 border-r border-slate-200 font-mono text-slate-400 shadow-md">#{r.id} <br/> {new Date(r.created_at).toLocaleDateString()}</td>
                          {ALL_COLUMNS_ORDERED.map(col => (<td key={col} className="px-4 py-2 border-r border-slate-100 text-slate-700 font-medium truncate max-w-[300px]" title={r.details?.[col]}>{r.details?.[col] || '-'}</td>))}
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="bg-white border-t border-slate-200 p-2 flex items-center justify-between text-xs font-bold text-slate-500">
                   <div className="flex items-center gap-2"><span>Itens/pág:</span><select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="bg-slate-100 border border-slate-300 rounded p-1"><option value={50}>50</option><option value={100}>100</option><option value={500}>500</option></select></div>
                   <div className="flex items-center gap-4"><span>{((page - 1) * rowsPerPage) + 1} - {Math.min(page * rowsPerPage, totalCount)} de {totalCount}</span><div className="flex gap-1"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronLeft size={16}/></button><button onClick={() => setPage(p => (p * rowsPerPage < totalCount ? p + 1 : p))} disabled={page * rowsPerPage >= totalCount} className="p-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronRight size={16}/></button></div></div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'create' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <button onClick={() => setActiveTab('dashboard')} className="font-bold text-slate-500 mb-4">← Voltar</button>
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <h2 className="text-xl font-black uppercase text-blue-600 mb-6">Novo Apontamento</h2>
                <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center"><p className="font-bold text-blue-800 mb-2">Upload Rápido</p><label className="cursor-pointer bg-blue-600 text-white font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-700">Selecionar Excel <input type="file" className="hidden" onChange={handleBatchInsert} /></label><button onClick={() => handleDownloadTemplate('TRP')} className="ml-4 text-xs font-bold text-blue-600 underline">Baixar Modelo</button></div>
                <div><p className="font-bold text-sm mb-4 uppercase text-slate-400">Ou Manual:</p>{renderFormFields(FIELDS_TRP)}<button onClick={handleCreate} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg">CRIAR</button></div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
