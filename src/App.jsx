import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Truck, Package, Upload, ClipboardList, LayoutDashboard, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO DO SUPABASE (DIRETO NO CÓDIGO) ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- O APP COMEÇA AQUI ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado do formulário manual
  const [formData, setFormData] = useState({ 
    trp: '', 
    placaVeiculo: '', 
    pedido: '', 
    tipoNotificacao: 'FALTA TOTAL' 
  });

  // 1. BUSCAR DADOS DO BANCO
  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logistics_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Erro ao buscar:', error);
    else setRecords(data || []);
    setLoading(false);
  };

  // Carrega os dados ao abrir o site
  useEffect(() => {
    fetchRecords();
  }, []);

  // 2. SALVAR NOVO REGISTRO (MANUAL)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.trp || !formData.pedido) return alert("Preencha TRP e Pedido");

    const { error } = await supabase.from('logistics_records').insert([formData]);
    
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      alert('Registro salvo com sucesso!');
      setFormData({ trp: '', placaVeiculo: '', pedido: '', tipoNotificacao: 'FALTA TOTAL' });
      fetchRecords(); 
      setActiveTab('dashboard');
    }
  };

  // 3. UPLOAD EXCEL (AUTOMÁTICO)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Prepara os dados do Excel para o Supabase
      const formattedData = data.map(row => ({
        trp: row['TRP'] || row['trp'] || 'Importado',
        pedido: String(row['PEDIDO'] || row['pedido'] || Math.random().toString().slice(2,8)),
        placaVeiculo: row['PLACA'] || row['placaVeiculo'] || '',
        tipoNotificacao: 'CARGA EM LOTE'
      }));

      if(formattedData.length > 0) {
        const { error } = await supabase.from('logistics_records').insert(formattedData);
        if (!error) {
          alert(`${formattedData.length} registros importados!`);
          fetchRecords();
          setActiveTab('dashboard');
        } else {
          alert("Erro na importação: " + error.message);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* --- CABEÇALHO --- */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Truck size={24} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">LoadCheck <span className="text-orange-500">.Log</span></h1>
        </div>
        
        <nav className="flex gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('register')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'register' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <ClipboardList size={18} /> Novo Registro
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        
        {/* --- TELA: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Card de Estatística */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Package size={24}/></div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase">Total Registros</p>
                   <p className="text-3xl font-black text-slate-900">{records.length}</p>
                </div>
              </div>
            </div>

            {/* Tabela de Dados */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Histórico de Apontamentos</h3>
                <button onClick={fetchRecords} className="text-sm font-bold text-orange-500 hover:underline">Atualizar Lista</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">TRP</th>
                      <th className="px-6 py-4">Pedido / NF</th>
                      <th className="px-6 py-4">Placa</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{r.trp}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{r.pedido}</td>
                        <td className="px-6 py-4 uppercase font-bold text-slate-800">{r.placaVeiculo || '-'}</td>
                        <td className="px-6 py-4">
                           {r.retornoOcorrencia ? (
                             <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 font-bold text-xs">
                               <CheckCircle size={12}/> Resolvido
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 font-bold text-xs border border-yellow-100">
                               Pendente
                             </span>
                           )}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                          {loading ? 'Carregando...' : 'Nenhum registro encontrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TELA: REGISTRO E UPLOAD --- */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Formulário Manual */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-slate-900 text-white p-2 rounded-lg"><ClipboardList size={20}/></div>
                 <h2 className="text-xl font-black uppercase text-slate-800">Apontamento Manual</h2>
              </div>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Transportadora (TRP)</label>
                  <input 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                    value={formData.trp}
                    onChange={e => setFormData({...formData, trp: e.target.value})}
                    placeholder="Ex: PATRUS"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Placa Veículo</label>
                      <input 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none uppercase font-mono"
                        value={formData.placaVeiculo}
                        onChange={e => setFormData({...formData, placaVeiculo: e.target.value})}
                        placeholder="ABC-1234"
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nº Pedido</label>
                      <input 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        value={formData.pedido}
                        onChange={e => setFormData({...formData, pedido: e.target.value})}
                        placeholder="123456"
                      />
                   </div>
                </div>

                <button type="submit" className="mt-4 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-transform active:scale-95 shadow-lg">
                  Salvar Registro
                </button>
              </form>
            </div>

            {/* Upload de Excel */}
            <div className="bg-blue-600 p-8 rounded-3xl shadow-xl text-white text-center relative overflow-hidden">
               <div className="relative z-10">
                 <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <Upload size={32} />
                 </div>
                 <h3 className="text-xl font-black uppercase mb-2">Carga em Lote (Excel)</h3>
                 <p className="text-blue-100 text-sm mb-6 max-w-xs mx-auto">Importe planilhas .xlsx contendo as colunas: TRP, PEDIDO, PLACA.</p>
                 
                 <label className="cursor-pointer bg-white text-blue-600 font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-blue-50 transition-colors inline-block">
                    Selecionar Arquivo
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                 </label>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
