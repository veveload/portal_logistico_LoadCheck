import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Truck, Package, Upload, ClipboardList, LayoutDashboard, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cores dos Gráficos
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444'];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState({ 
    trp: '', 
    placaVeiculo: '', 
    pedido: '', 
    tipoNotificacao: 'FALTA TOTAL' 
  });

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

  // --- 2. DADOS PARA GRÁFICOS ---
  const getChartData = () => {
    const trpCount = {};
    records.forEach(r => {
      const trp = r.trp || 'Outros';
      trpCount[trp] = (trpCount[trp] || 0) + 1;
    });
    return Object.keys(trpCount).map(key => ({ name: key, value: trpCount[key] })).slice(0, 5);
  };

  const getStatusData = () => {
    const solved = records.filter(r => r.retornoOcorrencia).length;
    const pending = records.length - solved;
    return [
      { name: 'Resolvidos', value: solved },
      { name: 'Pendentes', value: pending }
    ];
  };

  // --- 3. AÇÕES (SALVAR E UPLOAD) ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.trp || !formData.pedido) return alert("Preencha TRP e Pedido");
    const { error } = await supabase.from('logistics_records').insert([formData]);
    if (!error) {
      alert('Salvo com sucesso!');
      setFormData({ trp: '', placaVeiculo: '', pedido: '', tipoNotificacao: 'FALTA TOTAL' });
      fetchRecords(); 
      setActiveTab('dashboard');
    } else {
      alert('Erro: ' + error.message);
    }
  };

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
        trp: row['TRP'] || row['trp'] || 'Importado',
        pedido: String(row['PEDIDO'] || row['pedido'] || Math.random().toString().slice(2,8)),
        placaVeiculo: row['PLACA'] || row['placaVeiculo'] || '',
        tipoNotificacao: 'CARGA EM LOTE'
      }));
      if(formatted.length > 0) {
        const { error } = await supabase.from('logistics_records').insert(formatted);
        if (!error) { alert(`${formatted.length} registros importados!`); fetchRecords(); setActiveTab('dashboard'); }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg text-white"><Truck size={24} /></div>
          <h1 className="text-xl font-black uppercase text-slate-900">LoadCheck <span className="text-orange-500">2.0</span></h1>
        </div>
        <nav className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <LayoutDashboard size={18} /> Dash
          </button>
          <button onClick={() => setActiveTab('register')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'register' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ClipboardList size={18} /> Novo
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards (Agora 2 colunas pois tiramos a IA) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Package size={24}/></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Total de Ocorrências</p><p className="text-3xl font-black">{records.length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckCircle size={24}/></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Ocorrências Tratadas</p><p className="text-3xl font-black">{records.filter(r => r.retornoOcorrencia).length}</p></div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18}/> Top 5 Transportadoras</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle size={18}/> Status de Resolução</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getStatusData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {getStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-400 flex justify-between items-center">
                <span>Registros Recentes</span>
                <button onClick={fetchRecords} className="text-orange-500 hover:text-orange-600">Atualizar</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                       <th className="px-6 py-3">Data</th>
                       <th className="px-6 py-3">TRP</th>
                       <th className="px-6 py-3">Pedido</th>
                       <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(0, 10).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{r.trp}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{r.pedido}</td>
                        <td className="px-6 py-4">
                           {r.retornoOcorrencia ? 
                             <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> OK</span> : 
                             <span className="text-yellow-600 font-bold text-xs flex items-center gap-1"><AlertCircle size={12}/> Pendente</span>
                           }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
              <h2 className="text-xl font-black uppercase text-slate-800 mb-6">Novo Registro</h2>
              <form onSubmit={handleSave} className="grid gap-4">
                <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={formData.trp} onChange={e => setFormData({...formData, trp: e.target.value})} placeholder="Transportadora (Ex: PATRUS)" />
                <div className="grid grid-cols-2 gap-4">
                   <input className="p-3 bg-slate-50 border rounded-xl font-mono uppercase" value={formData.placaVeiculo} onChange={e => setFormData({...formData, placaVeiculo: e.target.value})} placeholder="PLACA" />
                   <input className="p-3 bg-slate-50 border rounded-xl font-bold" value={formData.pedido} onChange={e => setFormData({...formData, pedido: e.target.value})} placeholder="PEDIDO" />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform">Salvar</button>
              </form>
            </div>
            
            <div className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white text-center">
               <Upload size={32} className="mx-auto mb-4"/>
               <h3 className="font-bold text-lg mb-2">Importar Excel</h3>
               <label className="cursor-pointer bg-white text-blue-600 font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-50">
                  Escolher Arquivo <input type="file" className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
