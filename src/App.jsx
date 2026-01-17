import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Upload, LayoutDashboard, CheckCircle, Clock, 
  Eye, X, FileText, Search, Edit, Save, Download, History, 
  FileSpreadsheet, LogOut, Shield, Users, Lock, ChevronLeft, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- COLUNAS (ORDEM OPERACIONAL) ---
const ALL_COLUMNS_ORDERED = [
  'TRANSPORTADORA', 'FILIAL ORIGEM', 'PLACA VEÍCULO', 'SHIPMENT', 
  'TIPO DE NOTIFICAÇÂO', 'Nº CX - FALTA/SOBRA', 'DTS', 'REMESSA', 
  'NF', 'PEDIDO', 'FILIAL DESTINO', 'DATA DESCARGA', 'ENVIADO PARA ANÁLISE', 
  'HORA', 'TP CONSULTORA', 'JUST. ACEITA - TRP?', 'OBSERVAÇÃO TRP',
  'CÓD T', 'CENTRO (PA LIGHT)', 'ORDEM DE VENDA (PA LIGHT)', 'RETORNO DA OCORRÊNCIA',
  'HORARIO DO RETORNO', 'PROBLEMA', 'SITUAÇÃO', 'RESOLUÇÃO', 
  'OFENSOR MACRO', 'OFENSOR MICRO', 'CAUSA', 'Analise Retroativa', 
  'TEMPO', 'JUST. ACEITA - CD?', 'RESPONSÁVEL', 'ANALISADO POR:', 
  'ID FATURISTA', 'JUST. ACEITA - NATURA?', 'OCORRÊNCIA', 'VALIDADO POR:', 
  'CD', 'AGUARDANDO RETORNO',
  'BIP EMBARQUE', 'RAMPA ATRELADA', 'OBS', 'TP. PEDIDO', 
  'EXPEDIÇÃO', 'DOCA', 'INÍCIO DO CARREGAMENTO', 'FINAL DO CARREGAMENTO'
];

const FIELDS_TRP = ALL_COLUMNS_ORDERED.slice(0, 17);
const FIELDS_CD = ALL_COLUMNS_ORDERED.slice(17, 39);
const REQUIRED_FIELDS_RESPONSE = ['SHIPMENT', 'RETORNO DA OCORRÊNCIA', 'RESOLUÇÃO'];

// --- COMPONENTE LOGIN ---
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let result;
    if (isSignUp) {
      result = await supabase.auth.signUp({ email, password });
      if (result.error) alert(result.error.message);
      else alert("Conta criada! Aguarde liberação.");
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) alert(result.error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
           <div className="bg-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
             <Lock className="text-white" size={32}/>
           </div>
           <h1 className="text-2xl font-black uppercase text-slate-900">Portal Logístico</h1>
           <p className="text-slate-400 text-sm font-bold">Acesso Operacional</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required className="w-full p-3 border border-slate-200 rounded-lg font-bold" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label><input type="password" required className="w-full p-3 border border-slate-200 rounded-lg font-bold" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-lg">{loading ? '...' : isSignUp ? 'Criar Conta' : 'Acessar'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-xs font-bold text-slate-400">{isSignUp ? 'Voltar para Login' : 'Criar nova conta'}</button>
      </div>
    </div>
  );
};

// --- COMPONENTE ADMIN ---
const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const fetchUsers = async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); setUsers(data || []); };
  const updateUser = async (id, role, entity) => { await supabase.from('profiles').update({ role, assigned_entity: entity }).eq('id', id); alert("Salvo!"); fetchUsers(); };
  useEffect(() => { fetchUsers(); }, []);
  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in">
      <h2 className="text-2xl font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><Shield size={24}/> Gestão de Acessos</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Email</th><th className="p-4">Função</th><th className="p-4">Entidade</th><th className="p-4">Ação</th></tr></thead>
          <tbody>{users.map(u => (<tr key={u.id} className="border-t border-slate-100"><td className="p-4 font-bold">{u.email}</td><td className="p-4"><select className="p-2 border rounded font-bold text-slate-600" defaultValue={u.role} id={`role-${u.id}`}><option value="TRP">Transportadora</option><option value="CD">CD / Regional</option><option value="ADMIN">Admin</option></select></td><td className="p-4"><input type="text" className="p-2 border rounded w-full font-mono text-xs" defaultValue={u.assigned_entity} id={`entity-${u.id}`}/></td><td className="p-4"><button onClick={() => updateUser(u.id, document.getElementById(`role-${u.id}`).value, document.getElementById(`entity-${u.id}`).value)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs">Salvar</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  
  // PAGINAÇÃO E FILTROS
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100); // Padrão 100 itens
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewRecord, setViewRecord] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]); 
  const [editRecord, setEditRecord] = useState(null);
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchProfile(session.user.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchProfile(session.user.id); });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  // --- NOVA LÓGICA DE FETCH COM PAGINAÇÃO ---
  const fetchRecords = async (resetPage = false) => {
    setLoading(true);
    
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    // Calcula o Range (ex: Página 1 = 0 a 99)
    const from = (currentPage - 1) * rowsPerPage;
    const to = from + rowsPerPage - 1;

    let query = supabase
      .from('logistics_records')
      .select('*', { count: 'exact' }); // Pede a contagem total

    // Aplica ordenação
    query = query.order('created_at', { ascending: false });

    // Aplica Paginação
    query = query.range(from, to);

    const { data, count, error } = await query;
    
    if (!error) {
      setRecords(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  // Recarrega quando muda página ou linhas por página
  useEffect(() => { if (profile) fetchRecords(); }, [profile, page, rowsPerPage]);

  const fetchAudit = async (recordId) => {
    const { data } = await supabase.from('audit_logs').select('*').eq('record_id', recordId).order('created_at', { ascending: false });
    setAuditHistory(data || []);
  };

  const logAction = async (recordId, actionType, changedData) => {
    await supabase.from('audit_logs').insert([{ record_id: recordId, action: actionType, changed_by: profile.email, details: changedData }]);
  };

  const handleDownloadTemplate = (type) => {
    let fields = type === 'TRP' ? FIELDS_TRP : FIELDS_CD;
    let fileName = type === 'TRP' ? "Modelo_Apontamento.xlsx" : "Modelo_Resposta.xlsx";
    const ws = XLSX.utils.json_to_sheet([{}], { header: fields });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Modelo"); XLSX.writeFile(wb, fileName);
  };

  const handleCreate = async () => {
    if (!formValues['TRANSPORTADORA'] || !formValues['SHIPMENT']) return alert("Preencha Transportadora e Shipment.");
    const trpName = profile.assigned_entity && profile.assigned_entity !== 'GLOBAL' ? profile.assigned_entity : formValues['TRANSPORTADORA'];
    const vitalData = {
      trp: trpName, pedido: formValues['SHIPMENT'] || formValues['PEDIDO'], placaVeiculo: formValues['PLACA VEÍCULO'], 
      tipoNotificacao: formValues['TIPO DE NOTIFICAÇÂO'], retornoOcorrencia: null,
      details: { ...formValues, created_by: profile.email, TRANSPORTADORA: trpName }
    };
    const { data, error } = await supabase.from('logistics_records').insert([vitalData]).select();
    if (!error && data) { await logAction(data[0].id, 'CRIACAO', { origem: 'Manual', fields: formValues }); alert('Criado!'); setFormValues({}); fetchRecords(true); setActiveTab('dashboard'); } 
    else { alert('Erro: ' + error.message); }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    const currentDetails = editRecord.details || {}; const newDetails = { ...currentDetails, ...formValues };
    const updateData = { details: newDetails }; if (formValues['RETORNO DA OCORRÊNCIA']) updateData.retornoOcorrencia = formValues['RETORNO DA OCORRÊNCIA'];
    const { error } = await supabase.from('logistics_records').update(updateData).eq('id', editRecord.id);
    if (!error) { await logAction(editRecord.id, 'ATUALIZACAO', { origem: 'Manual', changed_fields: formValues }); alert('Atualizado!'); setEditRecord(null); setFormValues({}); fetchRecords(); } 
    else { alert('Erro: ' + error.message); }
  };

  const handleBatchInsert = (e) => {
    const file = e.target.files[0]; if(!file) return;
    setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result; const wb = XLSX.read(bstr, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; const data = XLSX.utils.sheet_to_json(ws);
      const formatted = data.map(row => ({
        trp: profile.assigned_entity && profile.assigned_entity !== 'GLOBAL' ? profile.assigned_entity : (row['TRANSPORTADORA'] || 'IMPORTADO'),
        pedido: String(row['SHIPMENT'] || row['PEDIDO'] || Math.random().toString().slice(2,8)),
        placaVeiculo: row['PLACA VEÍCULO'] || '', tipoNotificacao: row['TIPO DE NOTIFICAÇÂO'] || 'CARGA EM LOTE', details: row
      }));
      if(formatted.length > 0) { 
        const { error } = await supabase.from('logistics_records').insert(formatted); 
        setProcessingBatch(false); 
        if (!error) { alert(`${formatted.length} importados!`); fetchRecords(true); setActiveTab('dashboard'); } // Reset page
        else { alert("Erro: " + error.message); } 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBatchUpdate = (e) => {
    const file = e.target.files[0]; if(!file) return;
    setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result; const wb = XLSX.read(bstr, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; const excelRows = XLSX.utils.sheet_to_json(ws);
      let validationError = null;
      for (let i = 0; i < excelRows.length; i++) {
        const row = excelRows[i]; if (!row['SHIPMENT'] && !row['PEDIDO']) { validationError = `Linha ${i+2}: Falta SHIPMENT/PEDIDO`; break; }
        if (profile.role !== 'TRP') { for (const field of REQUIRED_FIELDS_RESPONSE) { if (!row[field]) { validationError = `Linha ${i+2}: Campo ${field} vazio.`; break; } } }
        if (validationError) break;
      }
      if (validationError) { setProcessingBatch(false); alert("⛔ BLOQUEADO: " + validationError); return; }
      let updatedCount = 0;
      for (const row of excelRows) {
        const searchKey = row['SHIPMENT'] || row['PEDIDO'];
        if (searchKey) {
          const { data: existingRecords } = await supabase.from('logistics_records').select('*').eq('pedido', String(searchKey)).limit(1);
          if (existingRecords && existingRecords.length > 0) {
            const record = existingRecords[0]; const mergedDetails = { ...record.details, ...row };
            const updatePayload = { details: mergedDetails }; if (row['RETORNO DA OCORRÊNCIA']) updatePayload.retornoOcorrencia = row['RETORNO DA OCORRÊNCIA'];
            await supabase.from('logistics_records').update(updatePayload).eq('id', record.id);
            await logAction(record.id, 'LOTE_RESPOSTA', { changed_by_batch: true, fields: row }); updatedCount++;
          }
        }
      }
      setProcessingBatch(false); alert(`Sucesso! ${updatedCount} atualizados.`); fetchRecords();
    };
    reader.readAsBinaryString(file);
  };

  const renderFormFields = (fields) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(field => (
      <div key={field}><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{field}</label>
      <input className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={formValues[field] || ''} onChange={e => setFormValues({...formValues, [field]: e.target.value})} /></div>))}
    </div>
  );

  // Filtro no Cliente (apenas para a página atual)
  // *Nota: Para filtrar em TODO o banco com paginação, a busca teria que ser no Supabase, mas para manter simples faremos na página atual
  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    const details = r.details || {};
    return (
      (details['PEDIDO'] || '').toString().toLowerCase().includes(term) ||
      (details['SHIPMENT'] || '').toString().toLowerCase().includes(term) ||
      (details['FILIAL ORIGEM'] || '').toString().toLowerCase().includes(term) ||
      (r.trp || '').toLowerCase().includes(term)
    );
  });

  if (!session) return <Login />;
  if (!profile) return <div className="flex h-screen items-center justify-center font-bold text-slate-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {processingBatch && <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center text-white"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div><h2 className="text-xl font-bold">Processando...</h2></div>}
      
      {/* MODAIS (EDIT / VIEW) */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-orange-500 p-6 flex justify-between items-center text-white"><h3 className="font-bold text-xl flex items-center gap-2"><Edit /> Responder</h3><button onClick={() => {setEditRecord(null); setFormValues({});}}><X size={24}/></button></div>
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm"><h4 className="text-sm font-bold text-orange-600 uppercase mb-4">Preencher Campos</h4>{renderFormFields(FIELDS_CD)}</div>
            </div>
            <div className="p-4 border-t bg-white flex justify-end gap-2"><button onClick={() => setEditRecord(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button><button onClick={handleUpdate} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2"><Save size={18}/> Salvar</button></div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={24} /></div>
          <div><h1 className="text-xl font-black uppercase text-slate-900 leading-none">LoadCheck <span className="text-orange-500">Ops</span></h1>
             <p className="text-xs font-bold text-slate-400 mt-1">{profile.email} <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{profile.role} - {profile.assigned_entity || 'GLOBAL'}</span></p></div>
        </div>
        <div className="flex gap-2">
          {profile.role === 'ADMIN' && <button onClick={() => setActiveTab('admin')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200"><Users size={16}/> Admin</button>}
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200"><LayoutDashboard size={16}/> Dash</button>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100"><LogOut size={16}/> Sair</button>
        </div>
      </header>

      {/* MAIN */}
      {activeTab === 'admin' && profile.role === 'ADMIN' ? <AdminPanel /> : (
        <main className="max-w-[98%] mx-auto p-4 mt-2">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in">
              {/* CONTROLES E TOTALIZADORES */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex gap-4 items-center">
                    <div className="bg-blue-50 p-3 rounded-lg"><Truck size={20} className="text-blue-600"/></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Total Registros</p><p className="text-xl font-black text-slate-900">{totalCount}</p></div>
                 </div>

                 <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" placeholder="Filtrar nesta página..." 
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>

                 <div className="flex gap-2">
                   {profile.role === 'TRP' && <button onClick={() => setActiveTab('create')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2"><Upload size={16}/> Novo</button>}
                   {(profile.role === 'CD' || profile.role === 'ADMIN') && (
                     <>
                       <button onClick={() => handleDownloadTemplate('CD')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 border">Modelo</button>
                       <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-orange-600 shadow-lg flex items-center gap-2"><Upload size={16}/> Subir <input type="file" className="hidden" onChange={handleBatchUpdate} /></label>
                     </>
                   )}
                 </div>
              </div>

              {/* GRID OPERACIONAL */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[65vh]">
                <div className="overflow-auto flex-1 relative">
                  {loading && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center font-bold text-slate-500">Carregando dados...</div>}
                  <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase sticky top-0 z-20 shadow-sm">
                      <tr>
                         <th className="px-4 py-3 sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Ações</th>
                         <th className="px-4 py-3 sticky left-[80px] bg-slate-100 z-30 border-r border-slate-200">Status</th>
                         <th className="px-4 py-3 sticky left-[180px] bg-slate-100 z-30 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">ID / Data</th>
                         {ALL_COLUMNS_ORDERED.map(col => (<th key={col} className="px-4 py-3 border-r border-slate-200 min-w-[150px]">{col}</th>))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r, idx) => (
                        <tr key={r.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex gap-1">
                              <button onClick={() => { setViewRecord(r); fetchAudit(r.id); }} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><Eye size={14}/></button>
                              {(profile.role !== 'TRP' && !r.retornoOcorrencia) && (
                                <button onClick={() => {setEditRecord(r); setFormValues({});}} className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600"><Edit size={14}/></button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 sticky left-[80px] bg-white z-10 border-r border-slate-200">
                             {r.retornoOcorrencia ? <span className="text-green-600 font-bold flex gap-1 items-center"><CheckCircle size={12}/> OK</span> : <span className="text-orange-500 font-bold flex gap-1 items-center"><Clock size={12}/> Pend</span>}
                          </td>
                          <td className="px-4 py-2 sticky left-[180px] bg-white z-10 border-r border-slate-200 font-mono text-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                             #{r.id} <br/> {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          {ALL_COLUMNS_ORDERED.map(col => (<td key={col} className="px-4 py-2 border-r border-slate-100 text-slate-700 font-medium truncate max-w-[300px]" title={r.details?.[col]}>{r.details?.[col] || '-'}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* --- BARRA DE PAGINAÇÃO (RODAPÉ) --- */}
                <div className="bg-white border-t border-slate-200 p-2 flex items-center justify-between text-xs font-bold text-slate-500">
                   <div className="flex items-center gap-2">
                      <span>Itens por página:</span>
                      <select 
                        value={rowsPerPage} 
                        onChange={(e) => setRowsPerPage(Number(e.target.value))} 
                        className="bg-slate-100 border border-slate-300 rounded p-1"
                      >
                         <option value={50}>50</option>
                         <option value={100}>100</option>
                         <option value={500}>500</option>
                         <option value={1000}>1000</option>
                      </select>
                   </div>

                   <div className="flex items-center gap-4">
                      <span>
                        {((page - 1) * rowsPerPage) + 1} - {Math.min(page * rowsPerPage, totalCount)} de {totalCount}
                      </span>
                      <div className="flex gap-1">
                         <button 
                           onClick={() => setPage(p => Math.max(1, p - 1))} 
                           disabled={page === 1}
                           className="p-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
                         >
                            <ChevronLeft size={16}/>
                         </button>
                         <button 
                           onClick={() => setPage(p => (p * rowsPerPage < totalCount ? p + 1 : p))} 
                           disabled={page * rowsPerPage >= totalCount}
                           className="p-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
                         >
                            <ChevronRight size={16}/>
                         </button>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: CREATE */}
          {activeTab === 'create' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <button onClick={() => setActiveTab('dashboard')} className="font-bold text-slate-500 mb-4">← Voltar</button>
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <h2 className="text-xl font-black uppercase text-blue-600 mb-6">Novo Apontamento</h2>
                <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center">
                   <p className="font-bold text-blue-800 mb-2">Upload Rápido</p>
                   <label className="cursor-pointer bg-blue-600 text-white font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-700">Selecionar Excel <input type="file" className="hidden" onChange={handleBatchInsert} /></label>
                   <button onClick={() => handleDownloadTemplate('TRP')} className="ml-4 text-xs font-bold text-blue-600 underline">Baixar Modelo</button>
                </div>
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
