import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Package, Upload, LayoutDashboard, 
  CheckCircle, AlertTriangle, Clock, Warehouse, Eye, X, FileText, Search, UserCircle, Edit, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DEFINIÇÃO DAS COLUNAS (SEU MAPEAMENTO) ---
const FIELDS_TRP = [
  'TRANSPORTADORA', 'FILIAL ORIGEM', 'PLACA VEÍCULO', 'SHIPMENT', 
  'TIPO DE NOTIFICAÇÂO', 'Nº CX - FALTA/SOBRA', 'DTS', 'REMESSA', 
  'NF', 'PEDIDO', 'FILIAL DESTINO', 'DATA DESCARGA', 'ENVIADO PARA ANÁLISE', 
  'HORA', 'TP CONSULTORA', 'JUST. ACEITA - TRP?', 'OBSERVAÇÃO TRP'
];

const FIELDS_CD = [
  'CÓD T', 'CENTRO (PA LIGHT)', 'ORDEM DE VENDA (PA LIGHT)', 'RETORNO DA OCORRÊNCIA',
  'HORARIO DO RETORNO', 'PROBLEMA', 'SITUAÇÃO', 'RESOLUÇÃO', 
  'OFENSOR MACRO', 'OFENSOR MICRO', 'CAUSA', 'Analise Retroativa', 
  'TEMPO', 'JUST. ACEITA - CD?', 'RESPONSÁVEL', 'ANALISADO POR:', 
  'ID FATURISTA', 'JUST. ACEITA - NATURA?', 'OCORRÊNCIA', 'VALIDADO POR:', 
  'CD', 'AGUARDANDO RETORNO'
];

const FIELDS_ANALISE = [
  'BIP EMBARQUE', 'RAMPA ATRELADA', 'OBS', 'TP. PEDIDO', 
  'EXPEDIÇÃO', 'DOCA', 'INÍCIO DO CARREGAMENTO', 'FINAL DO CARREGAMENTO'
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('TRP'); // TRP | CD | ANALISE
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [viewRecord, setViewRecord] = useState(null); // Apenas ver
  const [editRecord, setEditRecord] = useState(null); // Editar/Responder

  // Form State (Dinâmico)
  const [formValues, setFormValues] = useState({});

  // --- 1. BUSCAR DADOS ---
  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logistics_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Erro:', error);
    else setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  // --- 2. LÓGICA DE SLA ---
  const getSLA = (dateString) => {
    const diff = new Date() - new Date(dateString);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours;
  };

  const isExpired = (hours) => hours > 48;

  // Filtro de Busca Global
  const filteredRecords = records.filter(r => 
    JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 3. AÇÕES (SALVAR / ATUALIZAR) ---
  
  // A: TRP cria novo (INSERT)
  const handleCreate = async () => {
    // Validação básica
    if (!formValues['TRANSPORTADORA'] || !formValues['SHIPMENT']) 
      return alert("Preencha pelo menos Transportadora e Shipment.");

    // Mapeia para as colunas vitais da tabela + details completo
    const vitalData = {
      trp: formValues['TRANSPORTADORA'],
      pedido: formValues['SHIPMENT'] || formValues['PEDIDO'],
      placaVeiculo: formValues['PLACA VEÍCULO'],
      tipoNotificacao: formValues['TIPO DE NOTIFICAÇÂO'],
      retornoOcorrencia: null, // Começa vazio
      details: { ...formValues, created_by: 'TRP' }
    };

    const { error } = await supabase.from('logistics_records').insert([vitalData]);

    if (!error) {
      alert('Apontamento Criado!');
      setFormValues({});
      fetchRecords();
      setActiveTab('dashboard');
    } else {
      alert('Erro: ' + error.message);
    }
  };

  // B: CD ou Analista atualiza (UPDATE)
  const handleUpdate = async () => {
    if (!editRecord) return;

    // Mescla os dados existentes com os novos
    const currentDetails = editRecord.details || {};
    const newDetails = { ...currentDetails, ...formValues };

    // Se for CD e preencheu 'RETORNO DA OCORRÊNCIA', atualiza o status vital
    const updateData = {
      details: newDetails
    };
    
    if (formValues['RETORNO DA OCORRÊNCIA']) {
      updateData.retornoOcorrencia = formValues['RETORNO DA OCORRÊNCIA'];
    }

    const { error } = await supabase
      .from('logistics_records')
      .update(updateData)
      .eq('id', editRecord.id);

    if (!error) {
      alert('Registro Atualizado com Sucesso!');
      setEditRecord(null);
      setFormValues({});
      fetchRecords();
    } else {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  // --- 4. UPLOAD EXCEL (APENAS TRP) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
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
        details: row // Salva TUDO no JSON
      }));
      
      if(formatted.length > 0) {
        const { error } = await supabase.from('logistics_records').insert(formatted);
        if (!error) { alert(`${formatted.length} registros importados!`); fetchRecords(); setActiveTab('dashboard'); }
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- COMPONENTE DE FORMULÁRIO ---
  const renderFormFields = (fields) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map(field => (
        <div key={field}>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{field}</label>
          <input 
            className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            value={formValues[field] || ''}
            onChange={e => setFormValues({...formValues, [field]: e.target.value})}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* --- MODAL EDITAR / RESPONDER (CD/ANALISE) --- */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><Edit /> Responder Apontamento (ID: {editRecord.id})</h3>
              <button onClick={() => {setEditRecord(null); setFormValues({});}}><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              {/* Dados Originais (Leitura) */}
              <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 opacity-70 pointer-events-none">
                <h4 className="text-xs font-black text-slate-400 uppercase mb-2">Dados da Transportadora (Original)</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <p><strong>TRP:</strong> {editRecord.trp}</p>
                  <p><strong>Shipment:</strong> {editRecord.pedido}</p>
                  <p><strong>Notificação:</strong> {editRecord.tipoNotificacao}</p>
                </div>
              </div>

              {/* Formulário de Resposta */}
              <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm">
                <h4 className="text-sm font-bold text-orange-600 uppercase mb-4">
                  {userRole === 'CD' ? 'Preencher Dados do CD' : 'Preencher Análise Técnica'}
                </h4>
                {userRole === 'CD' && renderFormFields(FIELDS_CD)}
                {userRole === 'ANALISE' && renderFormFields(FIELDS_ANALISE)}
              </div>
            </div>
            
            <div className="p-4 border-t bg-white flex justify-end gap-2">
              <button onClick={() => setEditRecord(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleUpdate} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2">
                <Save size={18}/> Salvar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL VER DETALHES UNIFICADOS --- */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2"><FileText /> Ficha Unificada do Apontamento</h3>
              <button onClick={() => setViewRecord(null)}><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-slate-50 space-y-6">
              {/* Seção 1: TRP */}
              <div className="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm">
                <h4 className="font-black text-blue-500 uppercase mb-4 flex items-center gap-2"><Truck size={18}/> Dados da Transportadora</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {viewRecord.details && Object.entries(viewRecord.details).map(([key, val]) => (
                    (FIELDS_TRP.includes(key) || key === 'trp' || key === 'pedido') && (
                      <div key={key}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{key}</p>
                        <p className="text-sm font-semibold text-slate-800">{val}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Seção 2: CD */}
              <div className="bg-white p-6 rounded-xl border-l-4 border-orange-500 shadow-sm">
                <h4 className="font-black text-orange-500 uppercase mb-4 flex items-center gap-2"><Warehouse size={18}/> Dados do CD / Regional</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {viewRecord.details && Object.entries(viewRecord.details).map(([key, val]) => (
                    FIELDS_CD.includes(key) && (
                      <div key={key}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{key}</p>
                        <p className="text-sm font-semibold text-slate-800">{val}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Seção 3: Análise */}
              <div className="bg-white p-6 rounded-xl border-l-4 border-purple-500 shadow-sm">
                <h4 className="font-black text-purple-500 uppercase mb-4 flex items-center gap-2"><Search size={18}/> Dados Técnicos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {viewRecord.details && Object.entries(viewRecord.details).map(([key, val]) => (
                    FIELDS_ANALISE.includes(key) && (
                      <div key={key}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{key}</p>
                        <p className="text-sm font-semibold text-slate-800">{val}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER E SELETOR DE PERFIL */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={24} /></div>
            <div>
               <h1 className="text-xl font-black uppercase text-slate-900 leading-none">LoadCheck <span className="text-orange-500">Flow</span></h1>
               <p className="text-xs text-slate-400 font-bold mt-1">SLA Time: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* SELETOR DE PERFIL (QUEM SOU EU?) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
             {['TRP', 'CD', 'ANALISE'].map(role => (
               <button 
                 key={role}
                 onClick={() => {setUserRole(role); setActiveTab('dashboard');}}
                 className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${userRole === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <UserCircle size={14}/> {role === 'TRP' ? 'Transportadora' : role === 'CD' ? 'CD / Regional' : 'Analista'}
               </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-4">
        
        {/* VIEW: DASHBOARD (COMUM A TODOS, MAS COM BOTÕES DIFERENTES) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Cards de Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Apontamentos</p>
                  <p className="text-2xl font-black text-slate-900">{records.length}</p>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Aguardando CD</p>
                  <p className="text-2xl font-black text-orange-500">{records.filter(r => !r.retornoOcorrencia).length}</p>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">SLA Estourado (+48h)</p>
                  <p className="text-2xl font-black text-red-500">{records.filter(r => isExpired(getSLA(r.created_at)) && !r.retornoOcorrencia).length}</p>
               </div>
               
               {/* Botão de Ação Principal (Muda conforme o Perfil) */}
               {userRole === 'TRP' && (
                 <button onClick={() => setActiveTab('create')} className="bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors flex flex-col items-center justify-center">
                    <Upload size={24} className="mb-1"/> Novo Apontamento
                 </button>
               )}
            </div>

            {/* Tabela de Gestão */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutDashboard size={18}/> Visão Geral</h3>
                 <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                      type="text" 
                      placeholder="Buscar Shipment, Placa, ID..." 
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>
              
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10">
                    <tr>
                       <th className="px-6 py-3">Ação</th>
                       <th className="px-6 py-3">ID</th>
                       <th className="px-6 py-3">SLA (Horas)</th>
                       <th className="px-6 py-3">Status CD</th>
                       <th className="px-6 py-3">TRP</th>
                       <th className="px-6 py-3">Shipment / Pedido</th>
                       <th className="px-6 py-3">Notificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => {
                      const slaHours = getSLA(r.created_at);
                      const expired = isExpired(slaHours);

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${expired && !r.retornoOcorrencia ? 'bg-red-50/40' : ''}`}>
                          <td className="px-6 py-4 flex gap-2">
                            {/* Botão Ver (Para todos) */}
                            <button onClick={() => setViewRecord(r)} className="p-2 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300" title="Ver Detalhes">
                              <Eye size={16}/>
                            </button>
                            
                            {/* Botão Responder (Só CD e Analista) */}
                            {userRole !== 'TRP' && !r.retornoOcorrencia && (
                              <button onClick={() => {setEditRecord(r); setFormValues({});}} className="px-3 py-1 bg-orange-500 text-white rounded-md text-xs font-bold hover:bg-orange-600 flex items-center gap-1">
                                <Edit size={14}/> RESPONDER
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">#{r.id}</td>
                          <td className="px-6 py-4">
                             <span className={`font-bold ${expired ? 'text-red-500' : 'text-slate-600'}`}>
                                {slaHours}h
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             {r.retornoOcorrencia ? (
                               <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 font-bold text-xs">
                                 <CheckCircle size={12}/> {r.retornoOcorrencia}
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 font-bold text-xs border border-yellow-100">
                                 <Clock size={12}/> Pendente
                               </span>
                             )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{r.trp}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-700">{r.pedido}</td>
                          <td className="px-6 py-4 text-xs uppercase">{r.tipoNotificacao}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CRIAÇÃO (SÓ TRP VÊ ISSO) */}
        {activeTab === 'create' && userRole === 'TRP' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setActiveTab('dashboard')} className="text-slate-500 hover:text-slate-800 text-sm font-bold mb-4 flex items-center gap-1">← Voltar</button>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
              <h2 className="text-xl font-black uppercase text-blue-600 mb-6 flex items-center gap-2"><Truck/> Novo Apontamento (Transportadora)</h2>
              
              {/* Opção 1: Upload Excel */}
              <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center">
                 <p className="font-bold text-blue-800 mb-2">Opção A: Upload de Planilha</p>
                 <label className="cursor-pointer bg-blue-600 text-white font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-700 transition-colors">
                    Selecionar Arquivo Excel
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                 </label>
              </div>

              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Ou preencha manualmente</span>
                  <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Opção 2: Manual */}
              <div className="mt-6">
                {renderFormFields(FIELDS_TRP)}
                <button onClick={handleCreate} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-lg">
                  CRIAR APONTAMENTO
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
