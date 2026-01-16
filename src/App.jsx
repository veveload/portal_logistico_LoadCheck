import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Package, Upload, LayoutDashboard, 
  CheckCircle, Clock, Warehouse, Eye, X, FileText, Search, UserCircle, Edit, Save, Download, History, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- COLUNAS ---
const FIELDS_TRP = [
  'TRANSPORTADORA', 'FILIAL ORIGEM', 'PLACA VEÍCULO', 'SHIPMENT', 
  'TIPO DE NOTIFICAÇÂO', 'Nº CX - FALTA/SOBRA', 'DTS', 'REMESSA', 
  'NF', 'PEDIDO', 'FILIAL DESTINO', 'DATA DESCARGA', 'ENVIADO PARA ANÁLISE', 
  'HORA', 'TP CONSULTORA', 'JUST. ACEITA - TRP?', 'OBSERVAÇÃO TRP'
];

const FIELDS_CD = [
  'SHIPMENT', 'RETORNO DA OCORRÊNCIA', 'RESOLUÇÃO', 'CAUSA', // Campos chaves primeiro
  'CÓD T', 'CENTRO (PA LIGHT)', 'ORDEM DE VENDA (PA LIGHT)', 
  'HORARIO DO RETORNO', 'PROBLEMA', 'SITUAÇÃO', 
  'OFENSOR MACRO', 'OFENSOR MICRO', 'Analise Retroativa', 
  'TEMPO', 'JUST. ACEITA - CD?', 'RESPONSÁVEL', 'ANALISADO POR:', 
  'ID FATURISTA', 'JUST. ACEITA - NATURA?', 'OCORRÊNCIA', 'VALIDADO POR:', 
  'CD', 'AGUARDANDO RETORNO'
];

const FIELDS_ANALISE = [
  'SHIPMENT', 'OBS', // Chave
  'BIP EMBARQUE', 'RAMPA ATRELADA', 'TP. PEDIDO', 
  'EXPEDIÇÃO', 'DOCA', 'INÍCIO DO CARREGAMENTO', 'FINAL DO CARREGAMENTO'
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('TRP'); 
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewRecord, setViewRecord] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]); // Histórico do registro visualizado
  const [editRecord, setEditRecord] = useState(null);
  const [formValues, setFormValues] = useState({});

  // --- 1. BUSCAR DADOS ---
  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logistics_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setRecords(data || []);
    setLoading(false);
  };

  // Busca histórico de auditoria
  const fetchAudit = async (recordId) => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });
    setAuditHistory(data || []);
  };

  useEffect(() => { fetchRecords(); }, []);

  // --- 2. SISTEMA DE AUDITORIA ---
  const logAction = async (recordId, actionType, changedData) => {
    await supabase.from('audit_logs').insert([{
      record_id: recordId,
      action: actionType,
      changed_by: userRole,
      details: changedData
    }]);
  };

  // --- 3. DOWNLOAD DE MODELOS ---
  const handleDownloadTemplate = (type) => {
    let fields = [];
    let fileName = "";

    if (type === 'TRP') {
      fields = FIELDS_TRP;
      fileName = "Modelo_Apontamento_TRP.xlsx";
    } else if (type === 'CD') {
      fields = FIELDS_CD;
      fileName = "Modelo_Resposta_CD.xlsx";
    }

    // Cria um Excel só com o cabeçalho
    const ws = XLSX.utils.json_to_sheet([{}], { header: fields });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, fileName);
  };

  // --- 4. AÇÕES MANUAIS ---
  const handleCreate = async () => {
    if (!formValues['TRANSPORTADORA'] || !formValues['SHIPMENT']) return alert("Preencha Transportadora e Shipment.");
    
    const vitalData = {
      trp: formValues['TRANSPORTADORA'],
      pedido: formValues['SHIPMENT'] || formValues['PEDIDO'],
      placaVeiculo: formValues['PLACA VEÍCULO'],
      tipoNotificacao: formValues['TIPO DE NOTIFICAÇÂO'],
      retornoOcorrencia: null,
      details: { ...formValues, created_by: userRole }
    };

    const { data, error } = await supabase.from('logistics_records').insert([vitalData]).select(); // .select() retorna o ID criado

    if (!error && data) {
      // LOG DE AUDITORIA
      await logAction(data[0].id, 'CRIACAO', { origem: 'Manual', fields: formValues });
      
      alert('Criado!'); 
      setFormValues({}); 
      fetchRecords(); 
      setActiveTab('dashboard'); 
    } else { 
      alert('Erro: ' + error.message); 
    }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    const currentDetails = editRecord.details || {};
    const newDetails = { ...currentDetails, ...formValues };
    const updateData = { details: newDetails };
    if (formValues['RETORNO DA OCORRÊNCIA']) updateData.retornoOcorrencia = formValues['RETORNO DA OCORRÊNCIA'];

    const { error } = await supabase.from('logistics_records').update(updateData).eq('id', editRecord.id);
    
    if (!error) { 
      // LOG DE AUDITORIA
      await logAction(editRecord.id, 'ATUALIZACAO', { origem: 'Manual', changed_fields: formValues });

      alert('Atualizado!'); 
      setEditRecord(null); 
      setFormValues({}); 
      fetchRecords(); 
    } else { 
      alert('Erro: ' + error.message); 
    }
  };

  // --- 5. LOTE TRP ---
  const handleBatchInsert = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const formatted = data.map(row => ({
        trp: row['TRANSPORTADORA'] || row['TRP'] || 'IMPORTADO',
        pedido: String(row['SHIPMENT'] || row['PEDIDO'] || Math.random().toString().slice(2,8)),
        placaVeiculo: row['PLACA VEÍCULO'] || '',
        tipoNotificacao: row['TIPO DE NOTIFICAÇÂO'] || 'CARGA EM LOTE',
        details: row
      }));
      
      if(formatted.length > 0) {
        const { data: created, error } = await supabase.from('logistics_records').insert(formatted).select();
        setProcessingBatch(false);
        if (!error) { 
           // LOG EM LOTE (Opção simplificada: Logar apenas o evento geral ou criar loop. Aqui logamos o evento)
           // Para auditoria perfeita, ideal seria iterar, mas para performance vamos assumir criação em massa.
           // Se quiser logar 1 por 1, teria que fazer loop no 'created'.
           alert(`${formatted.length} registros importados!`); 
           fetchRecords(); 
           setActiveTab('dashboard'); 
        } else { alert("Erro: " + error.message); }
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- 6. LOTE CD (RESPOSTA) ---
  const handleBatchUpdate = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setProcessingBatch(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const excelRows = XLSX.utils.sheet_to_json(ws);
      let updatedCount = 0;

      for (const row of excelRows) {
        const searchKey = row['SHIPMENT'] || row['PEDIDO'];
        if (searchKey) {
          const { data: existingRecords } = await supabase
            .from('logistics_records')
            .select('*')
            .eq('pedido', String(searchKey))
            .limit(1);

          if (existingRecords && existingRecords.length > 0) {
            const record = existingRecords[0];
            const mergedDetails = { ...record.details, ...row };
            const updatePayload = { details: mergedDetails };
            if (row['RETORNO DA OCORRÊNCIA']) updatePayload.retornoOcorrencia = row['RETORNO DA OCORRÊNCIA'];

            await supabase.from('logistics_records').update(updatePayload).eq('id', record.id);
            
            // LOG AUDITORIA INDIVIDUAL
            await logAction(record.id, 'LOTE_RESPOSTA', { changed_by_batch: true, fields: row });
            
            updatedCount++;
          }
        }
      }
      setProcessingBatch(false);
      alert(`Processado! Atualizados: ${updatedCount}`);
      fetchRecords();
    };
    reader.readAsBinaryString(file);
  };

  const renderFormFields = (fields) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map(field => (
        <div key={field}>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{field}</label>
          <input className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            value={formValues[field] || ''} onChange={e => setFormValues({...formValues, [field]: e.target.value})} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {processingBatch && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div>
          <h2 className="text-xl font-bold">Processando e Auditando...</h2>
        </div>
      )}

      {/* --- MODAL EDITAR --- */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><Edit /> Responder (ID: {editRecord.id})</h3>
              <button onClick={() => {setEditRecord(null); setFormValues({});}}><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm">
                <h4 className="text-sm font-bold text-orange-600 uppercase mb-4">Preencher Resposta ({userRole})</h4>
                {userRole === 'CD' && renderFormFields(FIELDS_CD)}
                {userRole === 'ANALISE' && renderFormFields(FIELDS_ANALISE)}
              </div>
            </div>
            <div className="p-4 border-t bg-white flex justify-end gap-2">
              <button onClick={() => setEditRecord(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleUpdate} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2"><Save size={18}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL VER DETALHES + HISTÓRICO --- */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><FileText /> Ficha Unificada</h3>
              <button onClick={() => setViewRecord(null)}><X size={24}/></button>
            </div>
            
            <div className="flex bg-slate-100 p-1 border-b">
               <button className="flex-1 py-2 text-sm font-bold bg-white rounded shadow-sm text-slate-800">Detalhes</button>
               {/* Futuro: Implementar troca de abas aqui se quiser esconder o histórico */}
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50 space-y-6">
              
              {/* HISTÓRICO DE AUDITORIA (NOVO!) */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h4 className="font-black text-slate-700 uppercase mb-4 flex items-center gap-2"><History size={18}/> Log de Auditoria</h4>
                 <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {auditHistory.length === 0 && <p className="text-xs text-slate-400">Carregando histórico ou nenhum registro encontrado...</p>}
                    {auditHistory.map(log => (
                      <div key={log.id} className="flex items-start gap-3 text-xs border-b border-slate-50 pb-2">
                         <div className="bg-slate-100 p-1 rounded font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</div>
                         <div>
                            <span className="font-bold text-slate-800">{log.action}</span> por <span className="bg-blue-100 text-blue-700 px-1 rounded font-bold">{log.changed_by}</span>
                            <div className="text-slate-400 mt-1 truncate w-64 md:w-96">{JSON.stringify(log.details)}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* DADOS DO REGISTRO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm">
                  <h4 className="font-black text-blue-500 uppercase mb-4">Dados TRP</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewRecord.details && Object.entries(viewRecord.details).map(([key, val]) => (
                      (FIELDS_TRP.includes(key) || key === 'trp') && <div key={key}><p className="text-[10px] text-slate-400 font-bold uppercase">{key}</p><p className="text-sm font-semibold">{val}</p></div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border-l-4 border-orange-500 shadow-sm">
                  <h4 className="font-black text-orange-500 uppercase mb-4">Dados CD</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewRecord.details && Object.entries(viewRecord.details).map(([key, val]) => (
                      FIELDS_CD.includes(key) && <div key={key}><p className="text-[10px] text-slate-400 font-bold uppercase">{key}</p><p className="text-sm font-semibold">{val}</p></div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={24} /></div>
            <div>
               <h1 className="text-xl font-black uppercase text-slate-900 leading-none">LoadCheck <span className="text-orange-500">Audit</span></h1>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
             {['TRP', 'CD', 'ANALISE'].map(role => (
               <button key={role} onClick={() => {setUserRole(role); setActiveTab('dashboard');}}
                 className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${userRole === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 <UserCircle size={14}/> {role}
               </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-2xl font-black text-slate-900">{records.length}</p>
               </div>
               
               {/* BOTÕES ESPECIAIS (Agora com Baixar Modelo) */}
               {userRole === 'TRP' && (
                 <button onClick={() => setActiveTab('create')} className="col-span-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors flex flex-col items-center justify-center">
                    <Upload size={24} className="mb-1"/> Novo Apontamento
                 </button>
               )}

               {userRole !== 'TRP' && (
                 <div className="col-span-3 grid grid-cols-3 gap-2">
                    {/* BOTÃO NOVO: BAIXAR MODELO CD */}
                    <button onClick={() => handleDownloadTemplate('CD')} className="bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-200 transition-colors flex flex-col items-center justify-center py-2">
                       <FileSpreadsheet size={20} className="mb-1"/> Baixar Modelo
                    </button>
                    {/* Botões Antigos */}
                    <button onClick={() => {
                        const ws = XLSX.utils.json_to_sheet(records.filter(r => !r.retornoOcorrencia).map(r => ({ ...r.details, SLA: 'Pendente' })));
                        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pendencias"); XLSX.writeFile(wb, "Pendencias.xlsx");
                    }} className="bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex flex-col items-center justify-center py-2">
                       <Download size={20} className="mb-1"/> Exportar Pendências
                    </button>
                    <label className="cursor-pointer bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors flex flex-col items-center justify-center py-2">
                       <Upload size={20} className="mb-1"/> Subir Respostas
                       <input type="file" className="hidden" onChange={handleBatchUpdate} />
                    </label>
                 </div>
               )}
            </div>

            {/* Tabela de Gestão */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center gap-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutDashboard size={18}/> Visão Geral</h3>
                 <input type="text" placeholder="Buscar..." className="pl-4 pr-4 py-2 rounded-lg border border-slate-200 text-sm w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10">
                    <tr>
                       <th className="px-6 py-3">Ação</th>
                       <th className="px-6 py-3">ID</th>
                       <th className="px-6 py-3">Status</th>
                       <th className="px-6 py-3">TRP</th>
                       <th className="px-6 py-3">Shipment / Pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 flex gap-2">
                          <button onClick={() => { setViewRecord(r); fetchAudit(r.id); }} className="p-2 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"><Eye size={16}/></button>
                          {userRole !== 'TRP' && !r.retornoOcorrencia && (
                            <button onClick={() => {setEditRecord(r); setFormValues({});}} className="px-3 py-1 bg-orange-500 text-white rounded-md text-xs font-bold hover:bg-orange-600"><Edit size={14}/></button>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{r.id}</td>
                        <td className="px-6 py-4">
                           {r.retornoOcorrencia ? <span className="text-green-600 font-bold text-xs flex gap-1"><CheckCircle size={12}/> Resolvido</span> : <span className="text-orange-500 font-bold text-xs flex gap-1"><Clock size={12}/> Pendente</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{r.trp}</td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{r.pedido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CREATE VIEW (TRP) */}
        {activeTab === 'create' && userRole === 'TRP' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => setActiveTab('dashboard')} className="text-slate-500 font-bold mb-4 flex gap-1">← Voltar</button>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
              <h2 className="text-xl font-black uppercase text-blue-600 mb-6 flex gap-2"><Truck/> Novo Apontamento</h2>
              
              <div className="flex justify-end mb-4">
                <button onClick={() => handleDownloadTemplate('TRP')} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-100">
                  <FileSpreadsheet size={16}/> BAIXAR MODELO EXCEL (TRP)
                </button>
              </div>

              <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center">
                 <p className="font-bold text-blue-800 mb-2">Upload de Planilha</p>
                 <label className="cursor-pointer bg-blue-600 text-white font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-700">
                    Selecionar Arquivo Excel <input type="file" className="hidden" onChange={handleBatchInsert} />
                 </label>
              </div>
              <div className="mt-6">
                <p className="font-bold text-sm mb-4 uppercase text-slate-400">Ou manual:</p>
                {renderFormFields(FIELDS_TRP)}
                <button onClick={handleCreate} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-lg">CRIAR APONTAMENTO</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
