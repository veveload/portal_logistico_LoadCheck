import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Truck, Package, Upload, LayoutDashboard, CheckCircle, Clock, Warehouse, 
  Eye, X, FileText, Search, UserCircle, Edit, Save, Download, History, 
  FileSpreadsheet, LogOut, Shield, Users, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- COMPONENTE DE LOGIN ---
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
      else alert("Usuário criado! Peça ao Admin para liberar seu acesso.");
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
           <p className="text-slate-400 text-sm font-bold">Acesso Restrito</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
            <input type="email" required className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-700" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
            <input type="password" required className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-700" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-lg">
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-xs font-bold text-slate-400 hover:text-slate-600">
          {isSignUp ? 'Já tem conta? Fazer Login' : 'Não tem conta? Cadastrar'}
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE ADMIN (GERENCIAR ACESSOS) ---
const AdminPanel = ({ session }) => {
  const [users, setUsers] = useState([]);
  
  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const updateUser = async (id, role, entity) => {
    await supabase.from('profiles').update({ role, assigned_entity: entity }).eq('id', id);
    alert("Perfil atualizado!");
    fetchUsers();
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><Shield size={24}/> Gestão de Acessos</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Email</th>
              <th className="p-4">Função</th>
              <th className="p-4">Entidade Vinculada (Ex: PATRUS)</th>
              <th className="p-4">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-4 font-bold text-slate-700">{u.email}</td>
                <td className="p-4">
                  <select className="p-2 border rounded font-bold text-slate-600" defaultValue={u.role} id={`role-${u.id}`}>
                    <option value="TRP">Transportadora</option>
                    <option value="CD">CD / Regional</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </td>
                <td className="p-4">
                  <input type="text" className="p-2 border rounded w-full font-mono text-xs" defaultValue={u.assigned_entity} placeholder="Nome EXATO da TRP ou CD" id={`entity-${u.id}`}/>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => updateUser(u.id, document.getElementById(`role-${u.id}`).value, document.getElementById(`entity-${u.id}`).value)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-700"
                  >
                    Salvar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
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
  const [viewRecord, setViewRecord] = useState(null);

  // Verifica sessão ao abrir
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const fetchRecords = async () => {
    // O RLS FAZ A MÁGICA AQUI: O select não tem 'where', mas o banco filtra sozinho!
    const { data, error } = await supabase
      .from('logistics_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
  };

  useEffect(() => { if(session) fetchRecords(); }, [session]);

  if (!session) return <Login />;
  if (!profile) return <div className="flex h-screen items-center justify-center font-bold text-slate-500">Carregando Perfil...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={24} /></div>
          <div>
             <h1 className="text-xl font-black uppercase text-slate-900 leading-none">LoadCheck <span className="text-orange-500">Secure</span></h1>
             <p className="text-xs font-bold text-slate-400 mt-1">
               Logado como: {profile.email} 
               <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{profile.role} - {profile.assigned_entity || 'GLOBAL'}</span>
             </p>
          </div>
        </div>
        <div className="flex gap-2">
          {profile.role === 'ADMIN' && (
            <button onClick={() => setActiveTab('admin')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200">
              <Users size={16}/> Usuários
            </button>
          )}
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200">
            <LayoutDashboard size={16}/> Dash
          </button>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100">
            <LogOut size={16}/> Sair
          </button>
        </div>
      </header>

      {activeTab === 'admin' && profile.role === 'ADMIN' ? (
        <AdminPanel />
      ) : (
        <main className="max-w-7xl mx-auto p-6 mt-4">
           {/* CONTEÚDO DO DASHBOARD (MANTENDO O MESMO LAYOUT QUE JÁ TÍNHAMOS) */}
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase text-slate-700">Seus Registros</h2>
                 <p className="text-sm text-slate-500">O sistema exibe automaticamente apenas os dados vinculados a <strong>{profile.assigned_entity}</strong>.</p>
              </div>

              {/* Tabela Simplificada para Teste */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                       <th className="px-6 py-3">ID</th>
                       <th className="px-6 py-3">TRP</th>
                       <th className="px-6 py-3">Pedido</th>
                       <th className="px-6 py-3">Centro</th>
                       <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-xs">#{r.id}</td>
                        <td className="px-6 py-4 font-bold">{r.trp}</td>
                        <td className="px-6 py-4 font-mono">{r.pedido}</td>
                        {/* Pega o CD de dentro do JSON details */}
                        <td className="px-6 py-4 text-xs">{r.details?.['CENTRO (PA LIGHT)'] || '-'}</td>
                        <td className="px-6 py-4">
                           {r.retornoOcorrencia ? <span className="text-green-600 font-bold text-xs">Resolvido</span> : <span className="text-orange-500 font-bold text-xs">Pendente</span>}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-400">Nenhum registro encontrado para sua visão.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </main>
      )}
    </div>
  );
}

export default App;
