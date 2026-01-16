import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Download, Upload, Truck, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ trp: '', placaVeiculo: '', pedido: '', tipoNotificacao: 'FALTA TOTAL' });

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

  // --- 2. SALVAR ---
  const handleSave = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('logistics_records').insert([formData]);
    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      alert('Registro Salvo!');
      setFormData({ trp: '', placaVeiculo: '', pedido: '', tipoNotificacao: 'FALTA TOTAL' });
      fetchRecords();
    }
  };

  // --- 3. UPLOAD EXCEL ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Mapeamento simples
      const formatted = data.map(row => ({
        trp: row['TRP'] || 'Desconhecido',
        pedido: row['PEDIDO'] || '000',
        tipoNotificacao: 'CARGA EM LOTE'
      }));

      const { error } = await supabase.from('logistics_records').insert(formatted);
      if (!error) { alert('Lote importado!'); fetchRecords(); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <header className="mb-8 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tighter flex gap-2 items-center">
          <Truck className="text-orange-500"/> Portal Logístico
        </h1>
        <nav className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('register')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'register' ? 'bg-orange-500 text-white' : 'hover:bg-slate-100'}`}>Novo Registro</button>
        </nav>
      </header>

      {activeTab === 'register' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold mb-6">Novo Apontamento</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <input placeholder="Nome da Transportadora" className="w-full p-3 border rounded-lg" value={formData.trp} onChange={e => setFormData({...formData, trp: e.target.value})} />
            <input placeholder="Placa do Veículo" className="w-full p-3 border rounded-lg" value={formData.placaVeiculo} onChange={e => setFormData({...formData, placaVeiculo: e.target.value})} />
            <input placeholder="Número do Pedido" className="w-full p-3 border rounded-lg" value={formData.pedido} onChange={e => setFormData({...formData, pedido: e.target.value})} />
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">Salvar Registro</button>
            
            <div className="pt-6 border-t mt-6">
               <p className="mb-2 font-bold text-sm">Ou importar Excel:</p>
               <input type="file" onChange={handleFileUpload} />
            </div>
          </form>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Registros</p>
              <p className="text-3xl font-black">{records.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">TRP</th>
                  <th className="p-4">Placa</th>
                  <th className="p-4">Pedido</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold">{r.trp}</td>
                    <td className="p-4">{r.placaVeiculo}</td>
                    <td className="p-4">{r.pedido}</td>
                    <td className="p-4"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">{r.retornoOcorrencia || 'PENDENTE'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && <p className="p-8 text-center text-slate-400">Nenhum registro encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
