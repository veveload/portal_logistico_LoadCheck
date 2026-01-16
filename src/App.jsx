import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Package, Upload, ClipboardList, LayoutDashboard, 
  CheckCircle, AlertTriangle, Clock, Warehouse, User, Flame 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cores dos Gráficos
const COLORS = ['#f97316', '#3b82f6', '#ef4444', '#10b981'];

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

  // --- 2. LÓGICA DE NEGÓCIO (Alertas e Responsabilidade) ---
  
  // Verifica se passou de 48h
  const isExpired = (dateString, status) => {
    if (status) return false; // Se já resolveu, não vence
    const diff = new Date() - new Date(dateString);
    const hours48 = 48 * 60 * 60 * 1000;
    return diff > hours48;
  };

  // Define com quem está a pendência
  const getResponsibility = (record) => {
    if (record.retornoOcorrencia) return { label: 'Resolvido', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    // Lógica futura: Se status for "Aguardando Evidencia", seria TRP. Por padrão, upload novo é CD.
    return { label: 'Pendente CD', color: 'bg-blue-100 text-blue-700', icon: Warehouse };
  };

  // --- 3. DADOS PARA GRÁFICOS ---
  const getChartData = () => {
    const trpCount = {};
    records.forEach(r => {
      const trp = r.trp || 'N/I';
      trpCount[trp] = (trpCount[trp] || 0) + 1;
    });
    return Object.keys(trpCount).map(key => ({ name: key, value: trpCount[key] })).slice(0, 5);
  };

  const getStatusData = () => {
    const expired = records.filter(r => isExpired(r.created_at, r.retornoOcorrencia)).length;
    const pending = records.filter(r => !r.retornoOcorrencia && !isExpired(r.created_at, r.retornoOcorrencia)).length;
    const solved = records.filter(r => r.retornoOcorrencia).length;

    return [
      { name: 'Crítico (>48h)', value: expired },
      { name: 'No Prazo', value: pending },
      { name: 'Resolvido', value: solved }
    ];
  };

  // --- 4. AÇÕES ---
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
        trp: row['TRP'] || row['trp'] || 'IMPORTADO',
        pedido: String(row['PEDIDO'] || row['pedido'] || Math.random().toString().slice(2,8)),
        placaVeiculo: row['PLACA'] || row['placaVeiculo'] || '',
        tipoNotificacao: row['TIPO'] || row['tipo'] || 'CARGA EM LOTE'
      }));
      
      if(formatted.length > 0) {
        const { error } = await supabase.from('logistics_records').insert(formatted);
        if (!error) { alert(`${formatted.length} importados!`); fetchRecords(); setActiveTab('dashboard'); }
      }
    };
    reader.readAsBinaryString(file);
  };

  // Cálculos Rápidos
  const totalCritico = records.filter(r => isExpired(r.created_at, r.retornoOcorrencia)).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg text-white"><Truck size={24} /></div>
          <h1 className="text-xl font-black uppercase text-slate-900">LoadCheck <span className="text-orange-500">Alert</span></h1>
        </div>
        <nav className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <LayoutDashboard size={18} /> Monitor
          </button>
          <button onClick={() => setActiveTab('register')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'register' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ClipboardList size={18} /> Upload
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards (Com Alerta de Vencimento) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Package size={24}/></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Total Geral</p><p className="text-3xl font-black">{records.length}</p></div>
              </div>
              
              <div className={`p-6 rounded-2xl shadow-sm border flex items-center gap-4 ${totalCritico > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                <div className={`${totalCritico > 0 ? 'bg-red-200 text-red-600' : 'bg-slate-100 text-slate-400'} p-3 rounded-full`}>
                   {totalCritico > 0 ? <Flame size={24} className="animate-pulse"/> : <Clock size={24}/>}
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase ${totalCritico > 0 ? 'text-red-500' : 'text-slate-400'}`}>Vencidos (+48h)</p>
                  <p className={`text-3xl font-black ${totalCritico > 0 ? 'text-red-600' : 'text-slate-800'}`}>{totalCritico}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full text-green-600"><Warehouse size={24}/></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Em Análise CD</p><p className="text-3xl font-black">{records.filter(r => !r.retornoOcorrencia).length}</p></div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18}/> Ocorrências por TRP</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock size={18}/> SLA de Atendimento</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getStatusData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {getStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#3b82f6' : '#10b981'} />
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
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <span className="font-bold text-xs uppercase text-slate-500">Monitoramento em Tempo Real</span>
                 <button onClick={fetchRecords} className="text-xs font-bold text-blue-600 hover:underline">Atualizar</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                       <th className="px-6 py-3">Alerta</th>
                       <th className="px-6 py-3">Data</th>
                       <th className="px-6 py-3">TRP</th>
                       <th className="px-6 py-3">Pedido / Tipo</th>
                       <th className="px-6 py-3">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => {
                      const expired = isExpired(r.created_at, r.retornoOcorrencia);
                      const resp = getResponsibility(r);
                      const RespIcon = resp.icon;

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${expired ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            {expired ? (
                              <div className="flex items-center gap-1 text-red-600 font-bold text-xs animate-pulse">
                                <AlertTriangle size={14} /> +48h
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-500 font-bold text-xs">
                                <CheckCircle size={14} /> OK
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {new Date(r.created_at).toLocaleDateString()} <br/>
                            {new Date(r.created_at).toLocaleTimeString().slice(0,5)}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{r.trp}</td>
                          <td className="px-6 py-4">
                             <div className="font-mono font-bold text-slate-700">{r.pedido}</div>
                             <div className="text-xs text-slate-400 uppercase">{r.tipoNotificacao}</div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${resp.color}`}>
                               <RespIcon size={12}/> {resp.label}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
              <h2 className="text-xl font-black uppercase text-slate-800 mb-6">Novo Apontamento (TRP)</h2>
              <form onSubmit={handleSave} className="grid gap-4">
                <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={formData.trp} onChange={e => setFormData({...formData, trp: e.target.value})} placeholder="Transportadora (TRP)" />
                <div className="grid grid-cols-2 gap-4">
                   <input className="p-3 bg-slate-50 border rounded-xl font-mono uppercase" value={formData.placaVeiculo} onChange={e => setFormData({...formData, placaVeiculo: e.target.value})} placeholder="PLACA" />
                   <input className="p-3 bg-slate-50 border rounded-xl font-bold" value={formData.pedido} onChange={e => setFormData({...formData, pedido: e.target.value})} placeholder="PEDIDO / REMESSA" />
                </div>
                <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-slate-600" value={formData.tipoNotificacao} onChange={e => setFormData({...formData, tipoNotificacao: e.target.value})}>
                  <option>FALTA TOTAL</option>
                  <option>FALTA PARCIAL</option>
                  <option>SOBRA</option>
                  <option>AVARIA</option>
                  <option>TROCA</option>
                </select>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform">Salvar Registro</button>
              </form>
            </div>
            
            <div className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white text-center">
               <Upload size={32} className="mx-auto mb-4"/>
               <h3 className="font-bold text-lg mb-2">Upload Excel em Lote</h3>
               <div className="text-blue-100 text-sm mb-6 max-w-xs mx-auto text-left bg-blue-700/30 p-4 rounded-lg">
                  <p className="font-bold mb-1">Colunas Obrigatórias:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>TRP</li>
                    <li>PEDIDO</li>
                    <li>PLACA</li>
                    <li>TIPO (Opcional)</li>
                  </ul>
               </div>
               
               <label className="cursor-pointer bg-white text-blue-600 font-bold py-2 px-6 rounded-lg inline-block hover:bg-blue-50">
                  Selecionar Planilha <input type="file" className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
