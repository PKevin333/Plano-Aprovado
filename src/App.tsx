import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Timer, 
  Calendar, 
  RefreshCcw, 
  BarChart3, 
  Target, 
  Settings,
  Plus,
  Play,
  Pause,
  Square,
  X,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Flag,
  Layers,
  User,
  Palette,
  Moon,
  Sun,
  Download,
  Database,
  Contrast,
  Save,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

import { api } from './services/api';
import { Subject, Session, Exercise, Review, Goal, DashboardStats, Objective, Topic } from './types';
import { AutoSaveIndicator, useAutoSave, useDraft } from './components/AutoSave';
import { ColorPicker, SubjectAutocomplete } from './components/SubjectPicker';
import WelcomeScreen from './components/WelcomeScreen';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// --- App Context (tema, cor, nome) ---

type Theme = 'light' | 'dark' | 'bw';

interface AppConfig {
  theme: Theme;
  accentColor: string;
  userName: string;
  dailyGoalHours: number;
}

const defaultConfig: AppConfig = {
  theme: 'light',
  accentColor: '#2563eb',
  userName: '',
  dailyGoalHours: 4,
};

const AppContext = createContext<{
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  refreshBadges: () => void;
  navigateTo: (tab: string) => void;
}>({ config: defaultConfig, setConfig: () => {}, refreshBadges: () => {}, navigateTo: () => {} });

const useAppConfig = () => useContext(AppContext);
const useRefreshBadges = () => useContext(AppContext).refreshBadges;

const useTheme = () => {
  const { config } = useAppConfig();
  const dark = config.theme === 'dark';
  return {
    dark,
    bg: dark ? '#0f172a' : '#f8fafc',
    surface: dark ? '#1e293b' : '#ffffff',
    surface2: dark ? '#0f172a' : '#f8fafc',
    border: dark ? '#334155' : '#e2e8f0',
    border2: dark ? '#1e293b' : '#f1f5f9',
    text: dark ? '#f1f5f9' : '#0f172a',
    textMuted: dark ? '#94a3b8' : '#64748b',
    textFaint: dark ? '#475569' : '#94a3b8',
    inputBg: dark ? '#0f172a' : '#ffffff',
    hoverBg: dark ? '#334155' : '#f1f5f9',
    cardClass: dark ? '' : '',
    card: { background: dark ? '#1e293b' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0', color: dark ? '#f1f5f9' : '#0f172a' },
    cardInner: { background: dark ? '#0f172a' : '#f8fafc' },
    input: { background: dark ? '#0f172a' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0', color: dark ? '#f1f5f9' : '#0f172a' },
  };
};


function applyTheme(config: AppConfig) {
  const root = document.documentElement;
  root.setAttribute('data-theme', config.theme);
  root.style.setProperty('--accent', config.accentColor);

  if (config.theme === 'dark') {
    root.style.setProperty('--surface', '#1e293b');
    root.style.setProperty('--surface2', '#0f172a');
    root.style.setProperty('--border', '#334155');
    root.style.setProperty('--border2', '#1e293b');
    root.style.setProperty('--text', '#f1f5f9');
    root.style.setProperty('--text-muted', '#94a3b8');
  } else {
    root.style.setProperty('--surface', '#ffffff');
    root.style.setProperty('--surface2', '#f8fafc');
    root.style.setProperty('--border', '#e2e8f0');
    root.style.setProperty('--border2', '#f1f5f9');
    root.style.setProperty('--text', '#0f172a');
    root.style.setProperty('--text-muted', '#64748b');
  }

  let style = document.getElementById('theme-style') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-style';
    document.head.appendChild(style);
  }
  if (config.theme === 'bw') {
    style.textContent = 'html { filter: grayscale(1) contrast(1.1); }';
  } else if (config.theme === 'dark') {
    style.textContent = `
      * { scrollbar-color: #334155 #0f172a; }
      input, select, textarea { background: #0f172a !important; color: #f1f5f9 !important; border-color: #334155 !important; }
      .recharts-cartesian-grid line { stroke: #334155 !important; }
      .recharts-text { fill: #94a3b8 !important; }
    `;
  } else {
    style.textContent = '';
  }
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, badgeColor }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: number, badgeColor?: string }) => {
  const { config } = useAppConfig();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active ? "text-white shadow-lg" : "hover:opacity-80"
      )}
      style={active ? { backgroundColor: config.accentColor, boxShadow: `0 4px 14px ${config.accentColor}40` } : { color: config.theme === 'dark' ? '#94a3b8' : '#64748b' }}
    >
      <Icon size={20} className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")} />
      <span className="font-medium flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center text-white"
          style={{ backgroundColor: active ? 'rgba(255,255,255,0.35)' : (badgeColor || '#ef4444') }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  key?: React.Key;
}

const Card = ({ children, className, title, subtitle, action }: CardProps) => {
  const t = useTheme();
  return (
    <div className={cn("rounded-2xl border shadow-sm overflow-hidden", className)} style={t.card}>
      {(title || action) && (
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.border2}` }}>
          <div>
            {title && <h3 className="font-semibold" style={{ color: t.text }}>{title}</h3>}
            {subtitle && <p className="text-sm" style={{ color: t.textMuted }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string, value: string | number, icon: any, color: string, trend?: string }) => {
  const t = useTheme();
  return (
    <div className="p-6 rounded-2xl border shadow-sm flex items-start justify-between" style={t.card}>
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: t.textMuted }}>{label}</p>
        <h3 className="text-2xl font-bold" style={{ color: t.text }}>{value}</h3>
        {trend && (
          <p className="text-xs font-medium text-emerald-500 mt-2 flex items-center gap-1">
            <TrendingUp size={12} />{trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );
};

// --- Pages ---

const Dashboard = () => {
  const { config, navigateTo } = useAppConfig();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats.summary(), api.sessions.list()]).then(([data, sessionList]) => {
      setStats(data);
      setSessions(sessionList);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) return <div className="p-8">Carregando dashboard...</div>;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m}m`;
  };

  const progress = stats.daily_goal > 0 ? (stats.today_duration / (stats.daily_goal * 60)) * 100 : 0;

  // ✅ FIX: Consistência calculada de verdade — % de dias com estudo no mês atual
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysSoFar = now.getDate(); // só conta até hoje, não o mês todo
  const studiedDaysThisMonth = new Set(
    sessions
      .filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .map(s => s.date.substring(0, 10))
  ).size;
  const consistencyPct = daysSoFar > 0 ? Math.round((studiedDaysThisMonth / daysSoFar) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          {/* ✅ FIX: usa config.userName que agora é sincronizado corretamente do WelcomeScreen */}
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Olá, {config.userName || 'Estudante'}! 👋</h1>
          <p style={{color: 'inherit', opacity: 0.6}}>Aqui está o resumo do seu progresso hoje.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Calendar size={18} />
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Horas Hoje" value={formatDuration(stats.today_duration)} icon={Clock} color="bg-emerald-500" trend="+12% que ontem" />
        <StatCard label="Meta Diária" value={`${stats.daily_goal}h`} icon={Target} color="bg-indigo-500" />
        <StatCard label="Revisões Pendentes" value={stats.pending_reviews_count} icon={RefreshCcw} color="bg-orange-500" />
        {/* ✅ FIX: Consistência real, calculada dos dias estudados no mês */}
        <StatCard label="Consistência" value={`${consistencyPct}%`} icon={TrendingUp} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2" title="Progresso da Meta Diária" subtitle="Acompanhamento em tempo real">
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold" style={{color:'inherit'}}>{Math.round(progress)}%</p>
                <p className="text-sm opacity-60">da sua meta de {stats.daily_goal}h</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{color:'inherit'}}>{formatDuration(stats.today_duration)}</p>
                <p className="text-xs opacity-60">estudados</p>
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold",
                    i === 2 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    {i === 2 ? <CheckCircle2 size={16} /> : null}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Estudos Recentes" action={<button onClick={() => navigateTo('history')} className="text-sm font-semibold hover:underline transition-opacity hover:opacity-70" style={{color: config.accentColor}}>Ver tudo →</button>}>
          <div className="space-y-4">
            {stats.recent_sessions.length > 0 ? stats.recent_sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-2 h-10 rounded-full" style={{ backgroundColor: session.subject_color || '#10b981' }} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-inherit truncate" style={{color:'inherit'}}>{session.subject_name}</h4>
                  <p className="text-xs opacity-60">{session.type} • {Math.floor(session.duration / 60)}h {session.duration % 60}m</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            )) : (
              <div className="text-center py-8">
                <BookOpen size={40} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm opacity-60">Nenhum estudo registrado hoje.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Subjects = () => {
  const { config } = useAppConfig();
  const th = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{id: number, name: string} | null>(null);
  
  const [draft, setDraft, clearDraft] = useDraft('new_subject', {
    name: '',
    color: '#10b981',
    priority: 'medium' as Subject['priority'],
    difficulty: 3,
    objective_id: undefined as number | undefined
  });

  useEffect(() => {
    api.subjects.list().then(setSubjects);
    api.objectives.list().then(setObjectives);
  }, []);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft.name.trim()) return;
    await api.subjects.create(draft);
    setIsAdding(false);
    clearDraft();
    api.subjects.list().then(setSubjects);
  };

  const handleUpdate = async (id: number, data: Partial<Subject>) => {
    await api.subjects.update(id, data);
    api.subjects.list().then(setSubjects);
  };

  const handleDelete = (id: number) => {
    const subject = subjects.find(s => s.id === id);
    if (subject) setDeleteModal({ id, name: subject.name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    await api.subjects.delete(deleteModal.id);
    api.subjects.list().then(setSubjects);
    setDeleteModal(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Disciplinas</h1>
          <p className="text-slate-500">Gerencie as matérias do seu plano de estudos.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2" style={{backgroundColor:'var(--accent,#2563eb)'}}>
          <Plus size={20} />
          Nova Disciplina
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Card key={subject.id} className="group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingId(editingId === subject.id ? null : subject.id)} className="text-slate-400 hover:text-indigo-500"><Settings size={18} /></button>
              <button onClick={() => handleDelete(subject.id)} className="text-slate-400 hover:text-rose-500 transition-colors" title="Excluir disciplina"><Trash2 size={18} /></button>
            </div>
            {editingId === subject.id ? (
              <div className="space-y-4">
                <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" value={subject.name} onChange={e => handleUpdate(subject.id, { name: e.target.value })} />
                <ColorPicker value={subject.color} onChange={color => handleUpdate(subject.id, { color })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs" value={subject.priority} onChange={e => handleUpdate(subject.id, { priority: e.target.value as any })}>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs" value={subject.objective_id || ''} onChange={e => handleUpdate(subject.id, { objective_id: e.target.value ? parseInt(e.target.value) : undefined })}>
                    <option value="">Sem Objetivo</option>
                    {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <button onClick={() => setEditingId(null)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Fechar Edição</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ backgroundColor: subject.color }}>
                    {subject.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold" style={{color: 'inherit'}}>{subject.name}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{subject.objective_name || 'Geral'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Prioridade</span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", subject.priority === 'high' ? "bg-rose-100 text-rose-600" : subject.priority === 'medium' ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600")}>
                      {subject.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Dificuldade</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => <div key={star} className={cn("w-2 h-2 rounded-full", star <= subject.difficulty ? "bg-indigo-500" : "bg-slate-200")} />)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Nova Disciplina</h2>
                <form onSubmit={handleAdd} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Nome da Matéria</label>
                    <SubjectAutocomplete value={draft.name} onChange={name => setDraft({...draft, name})} onSelect={s => setDraft({...draft, name: s.name, color: s.color, priority: s.priority, difficulty: s.difficulty, objective_id: s.objective_id})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Escolha uma Cor</label>
                    <ColorPicker value={draft.color} onChange={color => setDraft({...draft, color})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 opacity-80">Prioridade</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={draft.priority} onChange={e => setDraft({...draft, priority: e.target.value as any})}>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 opacity-80">Dificuldade (1-5)</label>
                      <input type="range" min="1" max="5" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-4" value={draft.difficulty} onChange={e => setDraft({...draft, difficulty: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Objetivo</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={draft.objective_id || ''} onChange={e => setDraft({...draft, objective_id: e.target.value ? parseInt(e.target.value) : undefined})}>
                      <option value="">Nenhum</option>
                      {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 rounded-xl font-bold transition-all" style={{color:'var(--text-muted,#64748b)'}}>Cancelar</button>
                    <button type="submit" className="flex-1 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all" style={{backgroundColor:'var(--accent,#2563eb)'}}>Criar</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
              style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black" style={{color:'inherit'}}>Excluir disciplina?</h2>
                  <p className="text-sm" style={{color:'var(--text-muted,#64748b)'}}>
                    "<strong>{deleteModal.name}</strong>" e <strong>todas as sessões, exercícios e revisões</strong> vinculadas serão apagados permanentemente.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDeleteModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold transition-all"
                    style={{background:'var(--border2,#f1f5f9)',color:'var(--text-muted,#64748b)'}}>
                    Cancelar
                  </button>
                  <button onClick={confirmDelete}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all">
                    Excluir tudo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Topics = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [draft, setDraft, clearDraft] = useDraft('new_topic', { subject_id: 0, name: '', description: '' });

  useEffect(() => { api.subjects.list().then(setSubjects); }, []);
  useEffect(() => {
    if (selectedSubjectId) api.topics.list(selectedSubjectId).then(setTopics);
    else api.topics.list().then(setTopics);
  }, [selectedSubjectId]);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft.subject_id || !draft.name.trim()) return;
    await api.topics.create(draft);
    setIsAdding(false);
    clearDraft();
    if (selectedSubjectId === draft.subject_id || selectedSubjectId === null) api.topics.list(selectedSubjectId || undefined).then(setTopics);
    else setSelectedSubjectId(draft.subject_id);
  };

  const handleUpdate = async (id: number, data: Partial<Topic>) => {
    await api.topics.update(id, data);
    api.topics.list(selectedSubjectId || undefined).then(setTopics);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Excluir este assunto?')) {
      await api.topics.delete(id);
      api.topics.list(selectedSubjectId || undefined).then(setTopics);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Assuntos</h1>
          <p className="text-slate-500">Cadastre os tópicos específicos de cada matéria.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2" style={{backgroundColor:'var(--accent,#2563eb)'}}>
          <Plus size={20} />
          Novo Assunto
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setSelectedSubjectId(null)} className={cn("px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap", selectedSubjectId === null ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 hover:bg-slate-50")}>Todos</button>
        {subjects.map(subject => (
          <button key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={cn("px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2", selectedSubjectId === subject.id ? "text-white shadow-lg" : "bg-white text-slate-500 hover:bg-slate-50")} style={selectedSubjectId === subject.id ? { backgroundColor: subject.color } : {}}>
            <div className="w-2 h-2 rounded-full bg-current opacity-40" />
            {subject.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => {
          const subject = subjects.find(s => s.id === topic.subject_id);
          return (
            <Card key={topic.id} className="group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingId(editingId === topic.id ? null : topic.id)} className="text-slate-400 hover:text-indigo-500"><Settings size={18} /></button>
                <button onClick={() => handleDelete(topic.id)} className="text-slate-400 hover:text-rose-500"><AlertCircle size={18} /></button>
              </div>
              {editingId === topic.id ? (
                <div className="space-y-4">
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" value={topic.name} onChange={e => handleUpdate(topic.id, { name: e.target.value })} />
                  <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs h-20 resize-none" value={topic.description} onChange={e => handleUpdate(topic.id, { description: e.target.value })} />
                  <button onClick={() => setEditingId(null)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Fechar Edição</button>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md text-white shadow-sm" style={{ backgroundColor: subject?.color || '#10b981' }}>{topic.subject_name}</span>
                  </div>
                  <h3 className="font-bold text-inherit text-lg" style={{color:'inherit'}}>{topic.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-3">{topic.description || 'Sem descrição'}</p>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Novo Assunto</h2>
                <form onSubmit={handleAdd} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Disciplina</label>
                    <select required className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.subject_id} onChange={e => setDraft({...draft, subject_id: parseInt(e.target.value)})}>
                      <option value="">Selecione...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Nome do Assunto</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} placeholder="Ex: Interpretação de Texto" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Descrição (Opcional)</label>
                    <textarea className="w-full px-4 py-3 rounded-xl border h-24 resize-none" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 rounded-xl font-bold transition-all" style={{color:'var(--text-muted,#64748b)'}}>Cancelar</button>
                    <button type="submit" className="flex-1 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all" style={{backgroundColor:'var(--accent,#2563eb)'}}>Criar</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Objectives = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newObjective, setNewObjective] = useState<Omit<Objective, 'id'>>({ name: '', description: '' });

  useEffect(() => { api.objectives.list().then(setObjectives); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.objectives.create(newObjective);
    setIsAdding(false);
    api.objectives.list().then(setObjectives);
    setNewObjective({ name: '', description: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Objetivos</h1>
          <p className="text-slate-500">Defina seus focos principais (Ex: Concurso X, Vestibular Y).</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2" style={{backgroundColor:'var(--accent,#2563eb)'}}>
          <Plus size={20} />
          Novo Objetivo
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {objectives.map(obj => (
          <Card key={obj.id}>
            <h3 className="font-bold text-inherit text-lg" style={{color:'inherit'}}>{obj.name}</h3>
            <p className="text-sm text-slate-500 mt-2">{obj.description || 'Sem descrição'}</p>
          </Card>
        ))}
      </div>
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Novo Objetivo</h2>
                <form onSubmit={handleAdd} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Nome do Objetivo</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} placeholder="Ex: Concurso Receita Federal" value={newObjective.name} onChange={e => setNewObjective({...newObjective, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 opacity-80">Descrição</label>
                    <textarea className="w-full px-4 py-3 rounded-xl border h-24 resize-none" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={newObjective.description} onChange={e => setNewObjective({...newObjective, description: e.target.value})} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 rounded-xl font-bold transition-all" style={{color:'var(--text-muted,#64748b)'}}>Cancelar</button>
                    <button type="submit" className="flex-1 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all" style={{backgroundColor:'var(--accent,#2563eb)'}}>Criar</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudyTimer = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  
  const [draft, setDraft, clearDraft] = useDraft('study_session', {
    subject_id: 0, topic_id: 0, type: 'theory' as Session['type'], notes: '',
    duration: 0, date: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00', endTime: '09:00',
    manualMode: 'duration' as 'duration' | 'range'
  });

  useEffect(() => {
    const saved = localStorage.getItem('academiaflow_timer');
    if (saved) {
      const { seconds: s, isActive: a, isPaused: p, lastUpdate, draft: savedDraft } = JSON.parse(saved);
      if (a && !p) { const elapsed = Math.floor((Date.now() - lastUpdate) / 1000); setSeconds(s + elapsed); }
      else setSeconds(s);
      setIsActive(a); setIsPaused(p);
      if (savedDraft) setDraft(savedDraft);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('academiaflow_timer', JSON.stringify({ seconds, isActive, isPaused, lastUpdate: Date.now(), draft }));
  }, [seconds, isActive, isPaused, draft]);

  useEffect(() => { api.subjects.list().then(setSubjects); }, []);
  useEffect(() => {
    if (draft.subject_id) api.topics.list(draft.subject_id).then(setTopics);
    else setTopics([]);
  }, [draft.subject_id]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };

  const handleFinishTimer = () => { setIsActive(false); setIsPaused(false); setDraft({ ...draft, duration: Math.ceil(seconds / 60) }); setShowFinishModal(true); };
  const handleCancelTimer = () => {
    if (confirm('Deseja realmente cancelar o cronômetro?')) { setSeconds(0); setIsActive(false); setIsPaused(false); localStorage.removeItem('academiaflow_timer'); }
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!sessionData.subject_id) return alert('Selecione uma disciplina');
    let finalDuration = sessionData.duration;
    if (sessionData.manualMode === 'range') {
      const [startH, startM] = sessionData.startTime.split(':').map(Number);
      const [endH, endM] = sessionData.endTime.split(':').map(Number);
      finalDuration = (endH * 60 + endM) - (startH * 60 + startM);
      if (finalDuration < 0) finalDuration += 24 * 60;
    }
    await api.sessions.create({ subject_id: sessionData.subject_id, topic_id: sessionData.topic_id || undefined, type: sessionData.type, notes: sessionData.notes, duration: finalDuration, date: sessionData.date || new Date().toISOString() });
    const prefs = await api.preferences.get();
    const globalEnabled = prefs.reviews_global_enabled !== false;
    const disabledSubjects: number[] = prefs.reviews_disabled_subjects || [];
    const subjectEnabled = !disabledSubjects.includes(sessionData.subject_id);
    let msg = 'Sessão salva com sucesso!';
    if (globalEnabled && subjectEnabled) {
      const now = new Date();
      for (const r of [{ type: '24h' as Review['type'], days: 1 }, { type: '7d' as Review['type'], days: 7 }, { type: '30d' as Review['type'], days: 30 }]) {
        const scheduledDate = new Date(now); scheduledDate.setDate(now.getDate() + r.days);
        await api.reviews.create({ subject_id: sessionData.subject_id, scheduled_date: scheduledDate.toISOString(), type: r.type });
      }
      msg += ' Revisões agendadas.';
    } else {
      msg += ' Revisões não agendadas (desativadas nas configurações).';
    }
    setSeconds(0); setIsActive(false); setIsPaused(false); setShowFinishModal(false); setShowManualModal(false); clearDraft();
    localStorage.removeItem('academiaflow_timer');
    alert(msg);
  };

  const selectedSubject = subjects.find(s => s.id === draft.subject_id);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Foco Total</h1>
          <p className="text-slate-500">Gerencie seu tempo de estudo com precisão.</p>
        </div>
        <button onClick={() => setShowManualModal(true)} className="bg-white text-inherit border border-slate-200 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2" style={{color:'inherit'}}>
          <Plus size={20} />
          Registrar Manualmente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="flex flex-col items-center justify-center py-16 relative overflow-hidden">
            {selectedSubject && <div className="absolute top-0 left-0 w-full h-2 opacity-20" style={{ backgroundColor: selectedSubject.color }} />}
            <div className="text-7xl font-black font-mono mb-8 tracking-tighter" style={{color:'inherit'}}>{formatTime(seconds)}</div>
            <div className="flex flex-wrap justify-center gap-4">
              {!isActive ? (
                <button onClick={() => { if (!draft.subject_id) return alert('Selecione uma disciplina antes de iniciar.'); setIsActive(true); setIsPaused(false); }} className="px-10 py-4 rounded-2xl font-bold text-lg bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-3">
                  <Play size={24} /> Iniciar
                </button>
              ) : (
                <>
                  <button onClick={() => setIsPaused(!isPaused)} className={cn("px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3", isPaused ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600" : "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600")}>
                    {isPaused ? <Play size={24} /> : <Pause size={24} />}{isPaused ? 'Retomar' : 'Pausar'}
                  </button>
                  <button onClick={handleFinishTimer} className="px-8 py-4 rounded-2xl font-bold text-lg bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-3"><Square size={20} />Finalizar</button>
                  <button onClick={handleCancelTimer} className="px-8 py-4 rounded-2xl font-bold text-lg bg-white text-rose-500 border border-rose-100 shadow-xl shadow-rose-500/5 hover:bg-rose-50 transition-all flex items-center gap-3"><X size={20} />Cancelar</button>
                </>
              )}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Disciplina">
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.subject_id} onChange={e => setDraft({...draft, subject_id: parseInt(e.target.value)})} disabled={isActive}>
                <option value="">Selecione...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Card>
            <Card title="Assunto">
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.topic_id} onChange={e => setDraft({...draft, topic_id: parseInt(e.target.value)})} disabled={!draft.subject_id || isActive}>
                <option value="">Selecione...</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Card>
          </div>
        </div>
        <div className="space-y-6">
          <Card title="Tipo de Estudo">
            <div className="grid grid-cols-1 gap-2">
              {[{ id: 'theory', label: 'Teoria', icon: BookOpen, color: 'indigo' }, { id: 'revision', label: 'Revisão', icon: RefreshCcw, color: 'emerald' }, { id: 'exercises', label: 'Exercícios', icon: Target, color: 'amber' }, { id: 'simulated', label: 'Simulado', icon: BarChart3, color: 'rose' }].map(type => (
                <button key={type.id} disabled={isActive} onClick={() => setDraft({...draft, type: type.id as any})} className={cn("flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold", draft.type === type.id ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700` : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100", isActive && "opacity-50 cursor-not-allowed")}>
                  <type.icon size={20} />{type.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showFinishModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Confirmar Sessão de Estudo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Duração (minutos)</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.duration} onChange={e => setDraft({...draft, duration: parseInt(e.target.value) || 0})} /></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Disciplina</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.subject_id} onChange={e => setDraft({...draft, subject_id: parseInt(e.target.value)})}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Assunto</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.topic_id} onChange={e => setDraft({...draft, topic_id: parseInt(e.target.value)})}><option value="">Nenhum</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Tipo</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.type} onChange={e => setDraft({...draft, type: e.target.value as any})}><option value="theory">Teoria</option><option value="revision">Revisão</option><option value="exercises">Exercícios</option><option value="simulated">Simulado</option></select></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Observações</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 h-32 resize-none" placeholder="O que você aprendeu?" value={draft.notes} onChange={e => setDraft({...draft, notes: e.target.value})} /></div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button onClick={() => setShowFinishModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Voltar</button>
                  <button onClick={() => handleSaveSession(draft)} className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">Salvar Sessão</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Registrar Estudo Manualmente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Data</label><input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.date} onChange={e => setDraft({...draft, date: e.target.value})} /></div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Modo de Registro</label>
                      <div className="flex gap-2">
                        <button onClick={() => setDraft({...draft, manualMode: 'duration'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all", draft.manualMode === 'duration' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400")}>Duração</button>
                        <button onClick={() => setDraft({...draft, manualMode: 'range'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all", draft.manualMode === 'range' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400")}>Horário</button>
                      </div>
                    </div>
                    {draft.manualMode === 'duration' ? (
                      <div><label className="block text-sm font-bold mb-2 opacity-80">Duração (minutos)</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" placeholder="Ex: 60" value={draft.duration} onChange={e => setDraft({...draft, duration: parseInt(e.target.value) || 0})} /></div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Início</label><input type="time" className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" value={draft.startTime} onChange={e => setDraft({...draft, startTime: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Fim</label><input type="time" className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold" value={draft.endTime} onChange={e => setDraft({...draft, endTime: e.target.value})} /></div>
                      </div>
                    )}
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Disciplina</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.subject_id} onChange={e => setDraft({...draft, subject_id: parseInt(e.target.value)})}><option value="">Selecione...</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Assunto</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.topic_id} onChange={e => setDraft({...draft, topic_id: parseInt(e.target.value)})} disabled={!draft.subject_id}><option value="">Nenhum</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Tipo</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={draft.type} onChange={e => setDraft({...draft, type: e.target.value as any})}><option value="theory">Teoria</option><option value="revision">Revisão</option><option value="exercises">Exercícios</option><option value="simulated">Simulado</option></select></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Observações</label><textarea className="w-full px-4 py-3 rounded-xl border h-24 resize-none" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} placeholder="O que você estudou?" value={draft.notes} onChange={e => setDraft({...draft, notes: e.target.value})} /></div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button onClick={() => setShowManualModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                  <button onClick={() => handleSaveSession(draft)} className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">Salvar Registro</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [disabledSubjects, setDisabledSubjects] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.reviews.list().then(setReviews);
    api.subjects.list().then(setSubjects);
    api.preferences.get().then(prefs => {
      if (prefs.reviews_global_enabled !== undefined) setGlobalEnabled(prefs.reviews_global_enabled);
      if (prefs.reviews_disabled_subjects) setDisabledSubjects(prefs.reviews_disabled_subjects);
    });
  }, []);

  const savePrefs = async (global: boolean, disabled: number[]) => {
    await api.preferences.set('reviews_global_enabled', global);
    await api.preferences.set('reviews_disabled_subjects', disabled);
  };

  const handleToggleGlobal = async () => {
    const next = !globalEnabled;
    setGlobalEnabled(next);
    await savePrefs(next, disabledSubjects);
  };

  const handleToggleSubject = async (id: number) => {
    const next = disabledSubjects.includes(id)
      ? disabledSubjects.filter(s => s !== id)
      : [...disabledSubjects, id];
    setDisabledSubjects(next);
    await savePrefs(globalEnabled, next);
  };

  const refreshBadges = useRefreshBadges();

  const handleComplete = async (id: number) => {
    await api.reviews.updateStatus(id, 'completed');
    api.reviews.list().then(setReviews);
    refreshBadges();
  };

  const handleSkip = async (id: number) => {
    await api.reviews.updateStatus(id, 'skipped');
    api.reviews.list().then(setReviews);
    refreshBadges();
  };

  const pendingReviews = reviews.filter(r => r.status === 'pending');
  const completedReviews = reviews.filter(r => r.status === 'completed');
  const skippedReviews = reviews.filter(r => r.status === 'skipped');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Revisões Programadas</h1>
          <p className="text-slate-500">A curva do esquecimento não tem chance contra você.</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all",
            showSettings ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}
        >
          <Settings size={16} />
          Configurações
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border shadow-sm overflow-hidden" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold" style={{color: 'inherit'}}>Configurações de Revisão</h3>
                <p className="text-sm opacity-60">Controle como as revisões automáticas funcionam</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl border" style={{background:'var(--surface2,#f8fafc)',borderColor:'var(--border2,#f1f5f9)'}}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", globalEnabled ? "bg-emerald-100" : "bg-slate-200")}>
                    <RefreshCcw size={20} className={globalEnabled ? "text-emerald-600" : "text-slate-400"} />
                  </div>
                  <div>
                    <p className="font-bold" style={{color: 'inherit'}}>Revisões automáticas</p>
                    <p className="text-sm opacity-60">Ao finalizar uma sessão, agendar revisões em 24h, 7d e 30d</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleGlobal}
                  className={cn("relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0", globalEnabled ? "bg-emerald-500" : "bg-slate-300")}
                >
                  <motion.div
                    animate={{ x: globalEnabled ? 24 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {globalEnabled && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Revisões por Disciplina</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjects.map(subject => {
                      const enabled = !disabledSubjects.includes(subject.id);
                      return (
                        <div key={subject.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: subject.color }} />
                            <span className="font-semibold text-slate-700">{subject.name}</span>
                          </div>
                          <button
                            onClick={() => handleToggleSubject(subject.id)}
                            className={cn("relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0", enabled ? "bg-emerald-500" : "bg-slate-300")}
                          >
                            <motion.div
                              animate={{ x: enabled ? 20 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!globalEnabled && (
                <div className="text-center py-4 text-slate-400 text-sm">
                  Revisões automáticas desativadas. Nenhuma revisão será agendada ao estudar.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Próximas Revisões" subtitle="Fique em dia com seu cronograma">
          <div className="space-y-4">
            {pendingReviews.length > 0 ? pendingReviews.map(review => (
              <div key={review.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: review.subject_color }}>
                  {review.type}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-inherit truncate" style={{color:'inherit'}}>{review.subject_name}</h4>
                  <p className="text-xs opacity-60">Programada para {format(new Date(review.scheduled_date), "dd/MM/yyyy")}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleSkip(review.id)} title="Ignorar" className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all"><X size={18} /></button>
                  <button onClick={() => handleComplete(review.id)} title="Concluída" className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"><CheckCircle2 size={20} /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 size={40} className="mx-auto mb-2 text-slate-200" />
                Tudo limpo por aqui! Nenhuma revisão pendente.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Histórico de Revisões" subtitle="Suas revisões concluídas">
            <div className="space-y-3">
              {completedReviews.slice(0, 5).map(review => (
                <div key={review.id} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: review.subject_color }}>{review.type}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-inherit truncate" style={{color:'inherit'}}>{review.subject_name}</h4>
                    <p className="text-xs opacity-60">Concluída em {format(new Date(review.scheduled_date), "dd/MM/yyyy")}</p>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                </div>
              ))}
              {completedReviews.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhuma revisão concluída ainda.</p>}
            </div>
          </Card>

          {skippedReviews.length > 0 && (
            <Card title="Revisões Ignoradas" subtitle="Marcadas para pular">
              <div className="space-y-3">
                {skippedReviews.slice(0, 3).map(review => (
                  <div key={review.id} className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 opacity-60" style={{ backgroundColor: review.subject_color }}>{review.type}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-500 truncate">{review.subject_name}</h4>
                      <p className="text-xs text-slate-400">{format(new Date(review.scheduled_date), "dd/MM/yyyy")}</p>
                    </div>
                    <X size={16} className="text-amber-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const ExercisesPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft, clearDraft] = useDraft('new_exercise', { subject_id: 0, topic_id: 0, total: 0, correct: 0, notes: '' });

  useEffect(() => { api.subjects.list().then(setSubjects); api.exercises.list().then(setExercises); }, []);
  useEffect(() => { if (draft.subject_id) api.topics.list(draft.subject_id).then(setTopics); else setTopics([]); }, [draft.subject_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.correct > draft.total) return alert('Acertos não podem ser maiores que o total');
    await api.exercises.create({ ...draft, topic_id: draft.topic_id || undefined, incorrect: draft.total - draft.correct, date: new Date().toISOString() });
    setIsAdding(false); clearDraft(); api.exercises.list().then(setExercises);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Exercícios</h1>
          <p className="text-slate-500">Monitore seu desempenho e identifique pontos de melhoria.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center gap-2">
          <Plus size={20} />Registrar Desempenho
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2" title="Histórico de Questões">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-4 px-4">Data</th><th className="pb-4 px-4">Disciplina</th><th className="pb-4 px-4">Assunto</th><th className="pb-4 px-4">Total</th><th className="pb-4 px-4">Acertos</th><th className="pb-4 px-4">Aproveitamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {exercises.map(ex => (
                  <tr key={ex.id} className="text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">{format(new Date(ex.date), "dd/MM/yy")}</td>
                    <td className="py-4 px-4 font-bold">{ex.subject_name}</td>
                    <td className="py-4 px-4">{ex.topic_name || '-'}</td>
                    <td className="py-4 px-4">{ex.total}</td>
                    <td className="py-4 px-4 text-emerald-600 font-bold">{ex.correct}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]"><div className="h-full bg-indigo-500" style={{ width: `${ex.percent_correct}%` }} /></div>
                        <span className="font-bold">{Math.round(ex.percent_correct)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Métricas Gerais">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Total de Questões</p>
                <p className="text-4xl font-bold" style={{color:'inherit'}}>{exercises.reduce((acc, curr) => acc + curr.total, 0)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl text-center"><p className="text-xs text-emerald-600 font-bold uppercase mb-1">Acertos</p><p className="text-2xl font-bold text-emerald-700">{exercises.reduce((acc, curr) => acc + curr.correct, 0)}</p></div>
                <div className="bg-rose-50 p-4 rounded-2xl text-center"><p className="text-xs text-rose-600 font-bold uppercase mb-1">Erros</p><p className="text-2xl font-bold text-rose-700">{exercises.reduce((acc, curr) => acc + curr.incorrect, 0)}</p></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" style={{background:'var(--surface,#fff)',color:'inherit'}}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-inherit mb-6" style={{color:'inherit'}}>Registrar Exercícios</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div><label className="block text-sm font-bold mb-2 opacity-80">Disciplina</label><select required className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.subject_id} onChange={e => setDraft({...draft, subject_id: parseInt(e.target.value)})}><option value="">Selecione...</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  {draft.subject_id > 0 && <div><label className="block text-sm font-bold mb-2 opacity-80">Assunto (Opcional)</label><select className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.topic_id} onChange={e => setDraft({...draft, topic_id: parseInt(e.target.value)})}><option value="">Selecione...</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
                  <div><label className="block text-sm font-bold mb-2 opacity-80">Observações (Opcional)</label><input type="text" className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} placeholder="Ex: Prova da banca X" value={draft.notes} onChange={e => setDraft({...draft, notes: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Total de Questões</label><input required type="number" className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.total} onChange={e => setDraft({...draft, total: parseInt(e.target.value)})} /></div>
                    <div><label className="block text-sm font-bold mb-2 opacity-80">Acertos</label><input required type="number" className="w-full px-4 py-3 rounded-xl border" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={draft.correct} onChange={e => setDraft({...draft, correct: parseInt(e.target.value)})} /></div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 rounded-xl font-bold transition-all" style={{color:'var(--text-muted,#64748b)'}}>Cancelar</button>
                    <button type="submit" className="flex-1 bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600">Salvar</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Planning = () => {
  const { config } = useAppConfig();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft, clearDraft] = useDraft('new_goal', { target_hours: 0, type: 'daily' as Goal['type'] });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    Promise.all([api.goals.list(), api.sessions.list()]).then(([g, s]) => { setGoals(g); setSessions(s); });
  }, []);

  const handleSaveGoal = async () => {
    const period = new Date().toISOString().split('T')[0];
    await api.goals.create({ ...draft, period });
    api.goals.list().then(setGoals);
    clearDraft();
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  const studyByDay = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const d = s.date.split('T')[0];
      const [sy, sm] = d.split('-').map(Number);
      if (sy === year && sm - 1 === month) {
        const day = parseInt(d.split('-')[2]);
        map[day] = (map[day] || 0) + s.duration;
      }
    });
    return map;
  }, [sessions, year, month]);

  const studiedDays = Object.keys(studyByDay).length;
  const totalMinutes = Object.values(studyByDay).reduce((a: number, b: number) => a + b, 0);

  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const found = sessions.some(s => s.date.startsWith(key));
      if (!found) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [sessions]);

  const goalsWithProgress = useMemo(() => goals.map(g => {
    let studied = 0;
    const now = new Date();
    if (g.type === 'daily') {
      const todayStr = format(now, 'yyyy-MM-dd');
      studied = sessions.filter(s => s.date.startsWith(todayStr)).reduce((a, s) => a + s.duration, 0) / 60;
    } else if (g.type === 'weekly') {
      const weekAgo = subDays(now, 7);
      studied = sessions.filter(s => new Date(s.date) >= weekAgo).reduce((a, s) => a + s.duration, 0) / 60;
    } else {
      studied = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((a, s) => a + s.duration, 0) / 60;
    }
    const pct = g.target_hours > 0 ? Math.min(100, (studied / g.target_hours) * 100) : 0;
    return { ...g, studied: Math.round(studied * 10) / 10, pct: Math.round(pct) };
  }), [goals, sessions]);

  const typeLabel: Record<string, string> = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
  const badgeColors: Record<string, string> = {
    daily: 'bg-blue-50 text-blue-700',
    weekly: 'bg-emerald-50 text-emerald-700',
    monthly: 'bg-amber-50 text-amber-700',
  };
  const barColors: Record<string, string> = { daily: config.accentColor, weekly: '#10b981', monthly: '#f59e0b' };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Planejamento</h1>
          <p className="text-slate-500">Defina suas metas e acompanhe sua consistência.</p>
        </div>
        <button onClick={handleSaveGoal} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:opacity-90" style={{ backgroundColor: config.accentColor }}>
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sequência Atual', value: `🔥 ${streak} ${streak === 1 ? 'dia' : 'dias'}`, sub: 'dias consecutivos' },
          { label: 'Dias Estudados', value: `${studiedDays} / ${daysInMonth}`, sub: `${Math.round((studiedDays/daysInMonth)*100)}% de consistência` },
          { label: 'Horas no Mês', value: `${Math.floor((totalMinutes as number)/60)}h ${(totalMinutes as number)%60}m`, sub: `Meta: ${goals.find(g=>g.type==='monthly')?.target_hours || 0}h` },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-black text-inherit" style={{color:'inherit'}}>{s.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: config.accentColor }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-50"><Calendar size={16} className="text-slate-600" /></div>
            <div>
              <p className="font-bold" style={{color: 'inherit'}}>Calendário de Estudos</p>
              <p className="text-xs text-slate-400">Visualize seus dias de estudo</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors text-sm font-bold">‹</button>
              <span className="font-black text-inherit" style={{color:'inherit'}}>{monthNames[month]} {year}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors text-sm font-bold">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const mins = studyByDay[day] || 0;
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const hasHigh = mins >= 180;
                const hasMed = mins > 0 && mins < 180;
                return (
                  <motion.div key={day} whileHover={{ scale: 1.1 }}
                    className={cn("aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold cursor-default relative transition-all",
                      hasHigh ? 'text-white' : hasMed ? 'text-blue-800' : isToday ? '' : 'text-slate-400')}
                    style={{ backgroundColor: hasHigh ? config.accentColor : hasMed ? config.accentColor + '30' : '#f8fafc', boxShadow: isToday ? `0 0 0 2px ${config.accentColor}` : 'none' }}>
                    {day}
                    {mins > 0 && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: hasHigh ? 'white' : config.accentColor }} />}
                  </motion.div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {[
                { bg: '#f1f5f9', border: true, label: 'Sem estudo' },
                { color: config.accentColor + '30', label: '1–3h', textColor: '#1e40af' },
                { color: config.accentColor, label: '3h+', textColor: 'white' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <div className="w-3 h-3 rounded-[4px]" style={{ background: l.color || l.bg, border: l.border ? '1px solid #e2e8f0' : 'none' }} />
                  {l.label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <div className="w-3 h-3 rounded-[4px] bg-white" style={{ boxShadow: `0 0 0 2px ${config.accentColor}` }} />
                Hoje
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border shadow-sm overflow-hidden" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-50"><Target size={16} className="text-slate-600" /></div>
              <div>
                <p className="font-bold" style={{color: 'inherit'}}>Definir Meta</p>
                <p className="text-xs text-slate-400">Crie metas de horas de estudo</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Tipo de Meta</label>
                <select className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors" style={{background: 'inherit', borderColor: 'var(--border, #e2e8f0)', color: 'inherit'}} value={draft.type} onChange={e => setDraft({...draft, type: e.target.value as any})}>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Horas Alvo</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors" style={{background: 'inherit', borderColor: 'var(--border, #e2e8f0)', color: 'inherit'}} value={draft.target_hours} onChange={e => setDraft({...draft, target_hours: parseFloat(e.target.value)})} />
              </div>
              <button onClick={handleSaveGoal} className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90" style={{ backgroundColor: config.accentColor }}>
                Salvar Meta
              </button>
            </div>
          </div>

          <div className="rounded-2xl border shadow-sm overflow-hidden" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-50"><CheckCircle2 size={16} className="text-slate-600" /></div>
              <p className="font-bold" style={{color: 'inherit'}}>Metas Ativas</p>
            </div>
            <div className="p-5 space-y-4">
              {goalsWithProgress.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma meta cadastrada.</p>
              )}
              {goalsWithProgress.map((goal, i) => (
                <motion.div key={goal.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold", badgeColors[goal.type])}>{typeLabel[goal.type]}</span>
                      <span className="text-sm font-bold" style={{color:'inherit'}}>{goal.target_hours}h</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{goal.studied}h / {goal.target_hours}h</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${goal.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full" style={{ backgroundColor: barColors[goal.type] }} />
                  </div>
                  <p className="text-[11px] text-slate-400 text-right">{goal.pct}% concluído</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTabLocal] = useState<'evolution' | 'subjects' | 'distribution'>('evolution');
  const [filters, setFilters] = useState({ subjectId: 'all', period: '7d' });

  useAutoSave(filters, useCallback((data: any) => api.preferences.set('report_filters', data), []), 1000);

  useEffect(() => {
    api.preferences.get().then(prefs => { if (prefs.report_filters) setFilters(prefs.report_filters); });
  }, []);

  useEffect(() => {
    Promise.all([api.sessions.list(), api.exercises.list(), api.subjects.list()])
      .then(([s, e, sub]) => { setSessions(s); setExercises(e); setSubjects(sub); });
  }, []);

  const getPeriodDays = (period: string) => {
    if (period === 'today') return 1;
    if (period === '7d') return 7;
    if (period === '30d') return 30;
    if (period === '90d') return 90;
    if (period === 'month') return new Date().getDate();
    if (period === 'year') return Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
    if (period === 'all') return 3650;
    return 7;
  };

  const inPeriod = useCallback((dateStr: string, period: string) => {
    const dateOnly = dateStr.substring(0, 10);
    const nowStr = format(new Date(), 'yyyy-MM-dd');
    if (period === 'today') return dateOnly === nowStr;
    if (period === 'month') return dateOnly.substring(0, 7) === nowStr.substring(0, 7);
    if (period === 'year') return dateOnly.substring(0, 4) === nowStr.substring(0, 4);
    if (period === 'all') return dateOnly <= nowStr;
    const days = getPeriodDays(period);
    const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd');
    return dateOnly >= cutoff && dateOnly <= nowStr;
  }, []);

  const prevPeriodFilter = useCallback((dateStr: string, period: string) => {
    if (period === 'all' || period === 'year') return false;
    const dateOnly = dateStr.substring(0, 10);
    if (period === 'month') {
      const prevMonth = format(subDays(new Date(), 30), 'yyyy-MM');
      return dateOnly.substring(0, 7) === prevMonth;
    }
    const days = getPeriodDays(period);
    const cutoffStart = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
    const cutoffEnd = format(subDays(new Date(), days), 'yyyy-MM-dd');
    return dateOnly >= cutoffStart && dateOnly < cutoffEnd;
  }, []);

  const filteredSessions = useMemo(() => sessions.filter(s => inPeriod(s.date, filters.period) && (filters.subjectId === 'all' || String(s.subject_id) === String(filters.subjectId))), [sessions, filters, inPeriod]);
  const prevSessions = useMemo(() => sessions.filter(s => prevPeriodFilter(s.date, filters.period) && (filters.subjectId === 'all' || String(s.subject_id) === String(filters.subjectId))), [sessions, filters, prevPeriodFilter]);
  const filteredExercises = useMemo(() => exercises.filter(e => inPeriod(e.date, filters.period) && (filters.subjectId === 'all' || String(e.subject_id) === String(filters.subjectId))), [exercises, filters, inPeriod]);
  const prevExercises = useMemo(() => exercises.filter(e => prevPeriodFilter(e.date, filters.period) && (filters.subjectId === 'all' || String(e.subject_id) === String(filters.subjectId))), [exercises, filters, prevPeriodFilter]);

  const dateRange = useMemo(() => {
    if (filters.period === 'all') {
      if (sessions.length === 0) return [];
      const firstDate = sessions.map(s => s.date.substring(0, 10)).sort()[0];
      const months: string[] = [];
      let cur = new Date(firstDate.substring(0, 7) + '-01');
      const now = new Date();
      while (cur <= now) {
        months.push(format(cur, 'yyyy-MM'));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      return months;
    }
    if (filters.period === 'year') {
      const year = new Date().getFullYear();
      return Array.from({length: new Date().getMonth() + 1}, (_, i) => `${year}-${String(i+1).padStart(2,'0')}`);
    }
    const days = getPeriodDays(filters.period);
    return Array.from({ length: days }, (_, i) => format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd'));
  }, [filters.period, sessions]);

  const evolutionData = useMemo(() => {
    const isMonthGrouped = filters.period === 'all' || filters.period === 'year';
    return dateRange.map(date => {
      const label = isMonthGrouped
        ? format(new Date(date + '-01'), 'MMM/yy', { locale: ptBR })
        : format(new Date(date), filters.period === '7d' ? 'EEE' : 'dd/MM', { locale: ptBR });
      const daySessions = filteredSessions.filter(s => s.date.startsWith(date));
      const entry: any = { date: label };
      if (filters.subjectId === 'all') {
        subjects.forEach(sub => { entry[sub.name] = parseFloat((daySessions.filter(s => s.subject_id === sub.id).reduce((a, s) => a + s.duration, 0) / 60).toFixed(2)); });
      } else {
        entry['horas'] = parseFloat((daySessions.reduce((a, s) => a + s.duration, 0) / 60).toFixed(2));
      }
      return entry;
    });
  }, [dateRange, filteredSessions, subjects, filters]);

  const distributionData = useMemo(() => {
    const dist: Record<string, { value: number; color: string }> = {};
    filteredSessions.forEach(s => {
      const name = s.subject_name || 'Outros';
      if (!dist[name]) dist[name] = { value: 0, color: s.subject_color || '#cbd5e1' };
      dist[name].value += s.duration / 60;
    });
    const total = Object.values(dist).reduce((a, b) => a + b.value, 0);
    return Object.entries(dist).map(([name, d]) => ({ name, value: parseFloat(d.value.toFixed(1)), color: d.color, pct: total > 0 ? Math.round((d.value / total) * 100) : 0 })).sort((a, b) => b.value - a.value);
  }, [filteredSessions]);

  const rankingData = useMemo(() => {
    const curr: Record<number, { name: string; color: string; hours: number }> = {};
    const prev: Record<number, number> = {};
    filteredSessions.forEach(s => {
      if (!curr[s.subject_id]) curr[s.subject_id] = { name: s.subject_name || '', color: s.subject_color || '#cbd5e1', hours: 0 };
      curr[s.subject_id].hours += s.duration / 60;
    });
    prevSessions.forEach(s => { prev[s.subject_id] = (prev[s.subject_id] || 0) + s.duration / 60; });
    return Object.entries(curr).map(([id, d]) => ({ ...d, id: parseInt(id), hours: parseFloat(d.hours.toFixed(1)), diff: parseFloat((d.hours - (prev[parseInt(id)] || 0)).toFixed(1)) })).sort((a, b) => b.hours - a.hours);
  }, [filteredSessions, prevSessions]);

  const totalHours = useMemo(() => filteredSessions.reduce((a, s) => a + s.duration / 60, 0), [filteredSessions]);
  const prevTotalHours = useMemo(() => prevSessions.reduce((a, s) => a + s.duration / 60, 0), [prevSessions]);
  const hoursDiff = parseFloat((totalHours - prevTotalHours).toFixed(1));
  const totalQuestoes = useMemo(() => filteredExercises.reduce((a, e) => a + e.total, 0), [filteredExercises]);
  const prevQuestoes = useMemo(() => prevExercises.reduce((a, e) => a + e.total, 0), [prevExercises]);
  const mediaExercicios = useMemo(() => { const t = filteredExercises.reduce((a, e) => a + e.total, 0); const c = filteredExercises.reduce((a, e) => a + e.correct, 0); return t > 0 ? Math.round((c / t) * 100) : 0; }, [filteredExercises]);
  const prevMedia = useMemo(() => { const t = prevExercises.reduce((a, e) => a + e.total, 0); const c = prevExercises.reduce((a, e) => a + e.correct, 0); return t > 0 ? Math.round((c / t) * 100) : 0; }, [prevExercises]);
  const sessionsCount = filteredSessions.length;
  const prevSessionsCount = prevSessions.length;

  const barKeys = useMemo(() => filters.subjectId === 'all' ? subjects.map(s => s.name) : ['horas'], [subjects, filters.subjectId]);
  const getSubjectColor = (name: string) => subjects.find(s => s.name === name)?.color || '#6366f1';
  const selectedSubjectColor = useMemo(() => filters.subjectId === 'all' ? '#6366f1' : subjects.find(s => s.id === parseInt(filters.subjectId))?.color || '#6366f1', [filters.subjectId, subjects]);
  const totalHoursDonut = distributionData.reduce((a, b) => a + b.value, 0);
  const periodLabel: Record<string, string> = { today: 'Hoje', '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', '90d': 'Últimos 90 dias', month: 'Mês atual', year: 'Este ano', all: 'Todo o histórico' };

  const DeltaBadge = ({ value, unit = 'h' }: { value: number; unit?: string }) => {
    if (value === 0) return <span className="text-xs font-bold text-slate-400">= igual ao período anterior</span>;
    return (
      <span className={cn("text-xs font-bold flex items-center gap-1", value > 0 ? "text-emerald-600" : "text-rose-500")}>
        <TrendingUp size={12} className={value < 0 ? "rotate-180" : ""} />
        {value > 0 ? '+' : ''}{value}{unit} comparado ao período anterior
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Relatórios e Análises</h1>
          <p className="text-slate-500">Visualize sua evolução e tome decisões baseadas em dados.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="px-4 py-2.5 rounded-xl border text-sm font-bold shadow-sm" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={filters.period} onChange={e => setFilters({ ...filters, period: e.target.value })}>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="month">Mês atual</option>
            <option value="year">Este ano</option>
            <option value="all">Todo o histórico</option>
          </select>
          <select className="px-4 py-2.5 rounded-xl border text-sm font-bold shadow-sm" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)',color:'inherit'}} value={filters.subjectId} onChange={e => setFilters({ ...filters, subjectId: e.target.value })}>
            <option value="all">Todas as Disciplinas</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Horas', value: `${totalHours.toFixed(1)}h`, icon: Clock, bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-500', delta: <DeltaBadge value={hoursDiff} /> },
          { label: 'Média de Exercícios', value: `${mediaExercicios}%`, icon: Target, bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-500', delta: <DeltaBadge value={mediaExercicios - prevMedia} unit="%" /> },
          { label: 'Questões Totais', value: totalQuestoes, icon: CheckCircle2, bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', delta: <DeltaBadge value={totalQuestoes - prevQuestoes} unit="" /> },
          { label: 'Sessões', value: sessionsCount, icon: BarChart3, bg: 'bg-rose-50', border: 'border-rose-100', iconBg: 'bg-rose-500', delta: <DeltaBadge value={sessionsCount - prevSessionsCount} unit="" /> }
        ].map((card, i) => (
          <div key={i} className={cn("rounded-2xl border p-5 space-y-3", card.bg, card.border)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
              <div className={cn("p-2 rounded-xl", card.iconBg)}><card.icon size={16} className="text-white" /></div>
            </div>
            <p className="text-3xl font-black text-inherit" style={{color:'inherit'}}>{card.value}</p>
            {card.delta}
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{background:'var(--border2,#f1f5f9)'}}>
        {([{ id: 'evolution', label: 'Evolução' }, { id: 'subjects', label: 'Disciplinas' }, { id: 'distribution', label: 'Distribuição' }] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTabLocal(tab.id)} className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all", activeTab === tab.id ? "shadow-sm" : "opacity-60 hover:opacity-90")}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'evolution' && (
        <div className="rounded-2xl border shadow-sm p-6 space-y-4" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)'}}>
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold" style={{color: 'inherit'}}>Horas de Estudo (Evolução)</h3><p className="text-sm opacity-60">{periodLabel[filters.period] || '7 dias'}</p></div>
            <DeltaBadge value={hoursDiff} />
          </div>
          <div className="h-80">
            {evolutionData.some(d => barKeys.some(k => (d[k] || 0) > 0)) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData} barCategoryGap="35%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border2,#f1f5f9)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="h"
                    domain={[0, (dataMax: number) => { const max = Math.ceil(dataMax * 1.2); return max < 1 ? 1 : max; }]}
                    allowDecimals={false} width={36} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', fontSize: 13, background: 'var(--surface,#fff)', color: 'inherit' }}
                    formatter={(v: number, name: string) => v > 0 ? [`${v.toFixed(1)}h`, name] : null}
                    cursor={{ fill: 'var(--border2,#f1f5f9)' }} />
                  <Legend formatter={(value) => <span style={{fontSize: 12, fontWeight: 600, color: 'var(--text-muted,#64748b)'}}>{value}</span>} />
                  {barKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} stackId="a"
                      fill={filters.subjectId === 'all' ? getSubjectColor(key) : selectedSubjectColor}
                      radius={i === barKeys.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={56} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3" style={{color:'var(--border,#e2e8f0)'}}>
                <BarChart3 size={48} /><p className="text-sm font-medium opacity-60">Nenhuma sessão registrada neste período</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="rounded-2xl border shadow-sm p-6 space-y-4" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)'}}>
          <div><h3 className="font-bold" style={{color: 'inherit'}}>Comparação entre Disciplinas</h3><p className="text-sm opacity-60">Horas estudadas por matéria no período</p></div>
          <div className="h-72">
            {rankingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="h" />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} width={130} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }} formatter={(v: number) => [`${v.toFixed(1)}h`, 'Horas']} />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                    {rankingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                <BookOpen size={48} /><p className="text-sm font-medium">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="rounded-2xl border shadow-sm p-6 space-y-6" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)'}}>
          <div><h3 className="font-bold" style={{color: 'inherit'}}>Distribuição por Disciplina</h3><p className="text-sm opacity-60">Percentual de tempo por matéria</p></div>
          {distributionData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center opacity-30 gap-3">
              <BarChart3 size={48} /><p className="text-sm font-medium">Nenhuma sessão registrada no período.</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="relative flex-shrink-0" style={{width: 320, height: 320}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={85} outerRadius={115} paddingAngle={3} dataKey="value" strokeWidth={0}
                      label={({ cx, cy, midAngle, outerRadius, name, pct }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 38;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const anchor = x > cx ? 'start' : 'end';
                        const shortName = name.length > 14 ? name.substring(0, 13) + '…' : name;
                        return (
                          <g>
                            <text x={x} y={y - 7} textAnchor={anchor} dominantBaseline="middle" style={{fontSize: 12, fontWeight: 700, fill: 'currentColor'}} className="recharts-text">{shortName}</text>
                            <text x={x} y={y + 9} textAnchor={anchor} dominantBaseline="middle" style={{fontSize: 11, fontWeight: 600, opacity: 0.6}} className="recharts-text">{pct}%</text>
                          </g>
                        );
                      }}
                      labelLine={{ stroke: 'var(--border,#e2e8f0)', strokeWidth: 1.5, strokeDasharray: '3 2' }}>
                      {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', background: 'var(--surface,#fff)', color: 'inherit' }}
                      formatter={(v: number, name: string) => [`${v.toFixed(1)}h`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-4xl font-black" style={{color:'inherit'}}>{totalHoursDonut.toFixed(0)}h</p>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-40">total</p>
                </div>
              </div>
              <div className="flex-1 space-y-4 w-full">
                {distributionData.map((item, i) => (
                  <motion.div key={i} initial={{opacity:0, x:16}} animate={{opacity:1, x:0}} transition={{delay: i * 0.07}} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-bold truncate max-w-[180px]" style={{color:'inherit'}}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs opacity-50 font-medium">{item.value}h</span>
                        <span className="font-black w-10 text-right" style={{color: item.color}}>{item.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--border,#e2e8f0)'}}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border shadow-sm p-6 space-y-5" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)'}}>
          <div><h3 className="font-bold" style={{color: 'inherit'}}>Ranking por Disciplina</h3><p className="text-sm opacity-60">Ordenado por horas estudadas</p></div>
          <div className="space-y-3">
            {rankingData.length > 0 ? rankingData.map((item, i) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl transition-colors" onMouseEnter={e=>(e.currentTarget.style.background='var(--surface2,#f8fafc)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400")}>{i + 1}</span>
                <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{color:'inherit'}}>{item.name}</p>
                  <p className="text-xs opacity-60">{item.hours}h estudadas</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0", item.diff > 0 ? "bg-emerald-100 text-emerald-700" : item.diff < 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500")}>
                  {item.diff > 0 ? '+' : ''}{item.diff}h
                </span>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-300"><TrendingUp size={40} className="mx-auto mb-2" /><p className="text-sm">Nenhum dado disponível</p></div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border shadow-sm p-6 space-y-5" style={{background:'var(--surface,#fff)',borderColor:'var(--border,#e2e8f0)'}}>
          <div><h3 className="font-bold" style={{color: 'inherit'}}>Desempenho em Exercícios</h3><p className="text-sm opacity-60">Aproveitamento por disciplina</p></div>
          <div className="space-y-4">
            {(() => {
              const bySubject: Record<string, { name: string; color: string; total: number; correct: number }> = {};
              filteredExercises.forEach(e => {
                const sub = subjects.find(s => s.id === e.subject_id);
                const name = e.subject_name || 'Outros';
                if (!bySubject[name]) bySubject[name] = { name, color: sub?.color || '#cbd5e1', total: 0, correct: 0 };
                bySubject[name].total += e.total; bySubject[name].correct += e.correct;
              });
              const list = Object.values(bySubject).sort((a, b) => (b.correct / b.total) - (a.correct / a.total));
              if (list.length === 0) return (
                <div className="text-center py-10 text-slate-300"><Target size={40} className="mx-auto mb-2" /><p className="text-sm">Nenhum exercício registrado</p></div>
              );
              return list.map((item, i) => {
                const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold truncate max-w-[160px]" style={{color:'inherit'}}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{item.correct}/{item.total}</span>
                        <span className="font-bold text-inherit w-10 text-right" style={{color:'inherit'}}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Settings Page ---

const ACCENT_COLORS = [
  { label: 'Azul', value: '#2563eb' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Roxo', value: '#7c3aed' },
  { label: 'Rosa', value: '#db2777' },
  { label: 'Laranja', value: '#ea580c' },
  { label: 'Ciano', value: '#0891b2' },
  { label: 'Vermelho', value: '#dc2626' },
  { label: 'Âmbar', value: '#d97706' },
];

// ✅ FIX Bug de digitação: input NÃO controlado (uncontrolled)
// Usar value+onChange dentro do AppContext causa re-render a cada tecla → lag
// Com defaultValue + ref, o DOM gerencia o valor nativamente, zero re-render durante digitação
const NameInput = React.memo(({ defaultValue, inputRef, accentColor }: {
  defaultValue: string;
  inputRef: React.RefObject<HTMLInputElement>;
  accentColor: string;
}) => (
  <input
    ref={inputRef}
    type="text"
    autoComplete="off"
    defaultValue={defaultValue}
    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 transition-all"
    style={{ '--tw-ring-color': accentColor } as any}
    placeholder="Ex: João Silva"
  />
));

const SettingsPage = () => {
  const { config, setConfig } = useAppConfig();
  const [local, setLocal] = useState<AppConfig>(config);
  // ✅ Ref em vez de state — lê o valor só na hora de salvar, sem re-render a cada tecla
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    Promise.all([api.sessions.list(), api.exercises.list(), api.goals.list()])
      .then(([s, e, g]) => { setSessions(s); setExercises(e); setGoals(g); });
  }, []);

  const handleSave = async () => {
    // Lê o valor diretamente do DOM — sem state intermediário
    const nameValue = nameInputRef.current?.value.trim() || config.userName;
    const final = { ...local, userName: nameValue };
    setLocal(final);
    setConfig(final);
    applyTheme(final);
    localStorage.setItem('planoaprovado_user_name', nameValue);
    await api.preferences.set('app_config', final);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJSON = () => {
    const data = { sessions, exercises, goals, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planoaprovado_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Data','Disciplina','Duração (min)','Tipo','Notas'];
    const rows = sessions.map(s => [s.date, s.subject_name || '', s.duration, s.type, s.notes || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-50"><Icon size={18} className="text-slate-600" /></div>
        <h3 className="font-bold" style={{color: 'inherit'}}>{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'inherit'}}>Configurações</h1>
          <p className="text-slate-500">Personalize sua experiência no app.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all"
          style={{ backgroundColor: local.accentColor }}
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Section title="Perfil" icon={User}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2 opacity-80">Seu nome</label>
              {/* ✅ FIX: input não controlado com ref — zero re-render durante digitação */}
              <NameInput defaultValue={config.userName} inputRef={nameInputRef} accentColor={local.accentColor} />
              <p className="text-xs text-slate-400 mt-1">Clique em "Salvar alterações" para confirmar o nome.</p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 opacity-80">Meta diária de horas</label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="1" max="12" step="0.5"
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: local.accentColor }}
                  value={local.dailyGoalHours}
                  onChange={e => setLocal({ ...local, dailyGoalHours: parseFloat(e.target.value) })}
                />
                <span className="text-2xl font-black text-inherit w-16 text-center" style={{color:'inherit'}}>{local.dailyGoalHours}h</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Tema" icon={Palette}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Aparência</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'light', label: 'Claro', icon: Sun, bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-900' },
                  { id: 'dark', label: 'Escuro', icon: Moon, bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-white' },
                  { id: 'bw', label: 'P&B', icon: Contrast, bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { const next = { ...local, theme: t.id }; setLocal(next); setConfig(next); applyTheme(next); }}
                    className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all", t.bg, t.border, local.theme === t.id ? "ring-2 ring-offset-2" : "opacity-70 hover:opacity-100")}
                    style={local.theme === t.id ? { '--tw-ring-color': local.accentColor } as any : {}}
                  >
                    <div className={cn("p-2 rounded-lg", local.theme === t.id ? "bg-white/20" : "bg-black/5")}>
                      <t.icon size={20} className={t.text} />
                    </div>
                    <span className={cn("text-xs font-bold", t.text)}>{t.label}</span>
                    {local.theme === t.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: local.accentColor }} />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Cor de destaque</label>
              <div className="grid grid-cols-4 gap-2">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { const next = { ...local, accentColor: c.value }; setLocal(next); setConfig(next); applyTheme(next); }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:scale-105"
                    style={{ borderColor: local.accentColor === c.value ? c.value : 'transparent', backgroundColor: local.accentColor === c.value ? c.value + '15' : '#f8fafc' }}
                  >
                    <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: c.value }} />
                    <span className="text-[10px] font-bold text-slate-500">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Exportar Dados" icon={Download}>
          <div className="space-y-4">
            <p className="text-sm opacity-60">Faça backup dos seus dados de estudo.</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={handleExportJSON} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group">
                <div className="p-3 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors"><Database size={20} className="text-indigo-600" /></div>
                <div className="text-left flex-1">
                  <p className="font-bold" style={{color: 'inherit'}}>Backup completo (JSON)</p>
                  <p className="text-xs opacity-60">Sessões, exercícios e metas</p>
                </div>
                <Download size={16} className="text-slate-400 group-hover:text-slate-600" />
              </button>

              <button onClick={handleExportCSV} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group">
                <div className="p-3 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors"><Download size={20} className="text-emerald-600" /></div>
                <div className="text-left flex-1">
                  <p className="font-bold" style={{color: 'inherit'}}>Sessões de estudo (CSV)</p>
                  <p className="text-xs opacity-60">{sessions.length} sessões registradas</p>
                </div>
                <Download size={16} className="text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>
          </div>
        </Section>

        <Section title="Seus Dados" icon={Database}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Sessões', value: sessions.length, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Exercícios', value: exercises.length, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Total de horas', value: `${(sessions.reduce((a, s) => a + s.duration, 0) / 60).toFixed(0)}h`, color: 'bg-amber-50 text-amber-700' },
              { label: 'Questões', value: exercises.reduce((a, e) => a + e.total, 0), color: 'bg-rose-50 text-rose-700' },
            ].map((item, i) => (
              <div key={i} className={cn("p-4 rounded-2xl text-center", item.color.split(' ')[0])}>
                <p className="text-2xl font-black">{item.value}</p>
                <p className={cn("text-xs font-bold mt-1", item.color.split(' ')[1])}>{item.label}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>

      <div className="rounded-2xl border shadow-sm p-6" style={{background: 'var(--surface, #fff)', borderColor: 'var(--border, #e2e8f0)'}}>
        <h3 className="font-bold text-inherit mb-4" style={{color:'inherit'}}>Preview das alterações</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: local.accentColor }}>
              {(nameInputRef.current?.value || config.userName).charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="font-bold" style={{color: 'inherit'}}>Olá, {nameInputRef.current?.value || config.userName || 'você'}! 👋</span>
          </div>
          <button className="px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow" style={{ backgroundColor: local.accentColor }}>
            Botão de ação
          </button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: local.accentColor }} />
            <span className="text-sm font-semibold" style={{ color: local.accentColor }}>Texto de destaque</span>
          </div>
          <div className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", local.theme === 'dark' ? 'bg-slate-800 text-white' : local.theme === 'bw' ? 'bg-gray-200 text-gray-900' : 'bg-slate-100 text-slate-700')}>
            Tema: {local.theme === 'light' ? 'Claro' : local.theme === 'dark' ? 'Escuro' : 'Preto & Branco'}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Histórico de Sessões ---
const SessionHistory = () => {
  const { config } = useAppConfig();
  const th = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filters, setFilters] = useState({ subjectId: 'all', period: '30d', type: 'all' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.sessions.list(), api.subjects.list()]).then(([s, sub]) => {
      setSessions(s); setSubjects(sub); setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = filters.period === '7d' ? subDays(now, 7)
      : filters.period === '30d' ? subDays(now, 30)
      : filters.period === '90d' ? subDays(now, 90)
      : new Date('2000-01-01');

    return sessions.filter(s => {
      const date = new Date(s.date);
      if (date < cutoff) return false;
      if (filters.subjectId !== 'all' && s.subject_id !== parseInt(filters.subjectId)) return false;
      if (filters.type !== 'all' && s.type !== filters.type) return false;
      if (search && !s.subject_name?.toLowerCase().includes(search.toLowerCase()) && !(s.notes || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, filters, search]);

  const totalHours = filtered.reduce((a, s) => a + s.duration / 60, 0);
  const selectStyle = { background: th.surface, borderColor: th.border, color: th.text };

  if (loading) return <div className="p-8 text-center opacity-60">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color:'inherit'}}>Histórico de Sessões</h1>
          <p style={{color: th.textMuted}}>{filtered.length} sessão(ões) • {totalHours.toFixed(1)}h no período</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 p-5 rounded-2xl border" style={{background: th.surface, borderColor: th.border}}>
        <input type="text" placeholder="🔍 Buscar por disciplina ou notas..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border text-sm" style={selectStyle} />
        <select className="px-4 py-2.5 rounded-xl border text-sm font-bold" style={selectStyle} value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})}>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="all">Todo o histórico</option>
        </select>
        <select className="px-4 py-2.5 rounded-xl border text-sm font-bold" style={selectStyle} value={filters.subjectId} onChange={e => setFilters({...filters, subjectId: e.target.value})}>
          <option value="all">Todas as disciplinas</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="px-4 py-2.5 rounded-xl border text-sm font-bold" style={selectStyle} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
          <option value="all">Todos os tipos</option>
          <option value="teoria">Teoria</option>
          <option value="exercicios">Exercícios</option>
          <option value="revisao">Revisão</option>
          <option value="simulado">Simulado</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{background: th.surface, borderColor: th.border}}>
            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold opacity-40">Nenhuma sessão encontrada</p>
          </div>
        ) : filtered.map((session, i) => (
          <motion.div key={session.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay: Math.min(i * 0.02, 0.3)}}
            className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
            style={{background: th.surface, borderColor: th.border}}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{backgroundColor: session.subject_color || config.accentColor}}>
              {(session.subject_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold" style={{color:'inherit'}}>{session.subject_name || 'Disciplina'}</h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase" style={{backgroundColor: config.accentColor + '20', color: config.accentColor}}>{session.type}</span>
              </div>
              {session.notes && <p className="text-xs mt-0.5 truncate" style={{color: th.textMuted}}>{session.notes}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black" style={{color: config.accentColor}}>{Math.floor(session.duration/60)}h {session.duration%60}m</p>
              <p className="text-xs" style={{color: th.textMuted}}>{format(new Date(session.date), "dd/MM/yyyy", {locale: ptBR})}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfigState] = useState<AppConfig>(defaultConfig);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [dailyGoalMet, setDailyGoalMet] = useState(false);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('planoaprovado_user_id'));

  const refreshBadges = useCallback(async () => {
    const [reviews, stats] = await Promise.all([
      api.reviews.list(),
      api.stats.summary()
    ]);
    setPendingReviewsCount(reviews.filter((r: Review) => r.status === 'pending').length);
    setTodayMinutes(stats.today_duration || 0);
    setDailyGoalMet((stats.today_duration || 0) >= (stats.daily_goal || 4) * 60);
  }, []);

  useEffect(() => {
    api.preferences.get().then(prefs => {
      if (prefs.app_config) {
        const saved = prefs.app_config as AppConfig;
        // ✅ FIX: Se config salva tem nome padrão vazio/Estudante, tenta recuperar do localStorage
        const storedName = localStorage.getItem('planoaprovado_user_name');
        if (storedName && (!saved.userName || saved.userName === 'Estudante')) {
          saved.userName = storedName;
        }
        setConfigState(saved);
        applyTheme(saved);
      } else {
        // ✅ FIX: Primeiro acesso — carrega nome do localStorage (definido pelo WelcomeScreen)
        const storedName = localStorage.getItem('planoaprovado_user_name');
        if (storedName) {
          const initial = { ...defaultConfig, userName: storedName };
          setConfigState(initial);
          applyTheme(initial);
        }
      }
    });
    refreshBadges();
    const interval = setInterval(refreshBadges, 60000);
    return () => clearInterval(interval);
  }, [refreshBadges]);

  const setConfig = (c: AppConfig) => {
    setConfigState(c);
    applyTheme(c);
  };

  if (!userId) {
    return (
      <WelcomeScreen
        onConfirm={(name, id) => {
          // ✅ FIX: Salva nome no localStorage E sincroniza imediatamente com o AppConfig
          localStorage.setItem('planoaprovado_user_name', name);
          localStorage.setItem('planoaprovado_user_id', id);
          const updated = { ...defaultConfig, userName: name };
          setConfigState(updated);
          applyTheme(updated);
          api.preferences.set('app_config', updated);
          setUserId(id);
        }}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'objectives': return <Objectives />;
      case 'subjects': return <Subjects />;
      case 'topics': return <Topics />;
      case 'timer': return <StudyTimer />;
      case 'reviews': return <Reviews />;
      case 'exercises': return <ExercisesPage />;
      case 'planning': return <Planning />;
      case 'reports': return <Reports />;
      case 'settings': return <SettingsPage />;
      case 'history': return <SessionHistory />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ config, setConfig, refreshBadges, navigateTo: setActiveTab }}>
      <div className="min-h-screen flex font-sans" style={{ background: config.theme === 'dark' ? '#0f172a' : config.theme === 'bw' ? '#f5f5f5' : '#f8fafc', color: config.theme === 'dark' ? '#f1f5f9' : '#0f172a' }}>
        <aside className="w-72 border-r p-6 flex flex-col gap-8 sticky top-0 h-screen" style={{ background: config.theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: config.theme === 'dark' ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${config.accentColor}cc, ${config.accentColor})` }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L2 8l10 5 10-5-10-5z" fill="white" fillOpacity="0.95"/>
                <path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="2" y1="8" x2="2" y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="2" cy="14" r="1" fill="white" fillOpacity="0.8"/>
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'inherit' }}>
              Plano<span style={{ color: config.accentColor }}>Aprovado</span>
            </h1>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={Flag} label="Objetivos" active={activeTab === 'objectives'} onClick={() => setActiveTab('objectives')} />
            <SidebarItem icon={BookOpen} label="Disciplinas" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
            <SidebarItem icon={Layers} label="Assuntos" active={activeTab === 'topics'} onClick={() => setActiveTab('topics')} />
            <SidebarItem icon={Timer} label="Cronômetro" active={activeTab === 'timer'} onClick={() => setActiveTab('timer')} />
            <SidebarItem icon={RefreshCcw} label="Revisões" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} badge={pendingReviewsCount} badgeColor="#ef4444" />
            <SidebarItem icon={Target} label="Exercícios" active={activeTab === 'exercises'} onClick={() => setActiveTab('exercises')} />
            <SidebarItem icon={Calendar} label="Planejamento" active={activeTab === 'planning'} onClick={() => setActiveTab('planning')} />
            <SidebarItem icon={History} label="Histórico" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <SidebarItem icon={BarChart3} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          </nav>
          <div className="pt-6 space-y-2" style={{ borderTop: `1px solid ${config.theme === 'dark' ? '#334155' : '#f1f5f9'}`, paddingTop: '24px' }}>
            <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <div className="p-4 rounded-2xl" style={{ background: config.theme === 'dark' ? '#0f172a' : '#f8fafc' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: config.theme === 'dark' ? '#475569' : '#94a3b8' }}>Meta do Dia</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: config.theme === 'dark' ? '#94a3b8' : '#475569' }}>
                  {Math.floor(todayMinutes/60)}h {todayMinutes%60}m / {config.dailyGoalHours}h
                </span>
                {dailyGoalMet && <span className="text-xs font-black text-emerald-500">✓ Meta!</span>}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: config.theme === 'dark' ? '#334155' : '#e2e8f0' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, config.dailyGoalHours > 0 ? (todayMinutes / (config.dailyGoalHours * 60)) * 100 : 0)}%`, backgroundColor: dailyGoalMet ? '#10b981' : config.accentColor }} />
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1 p-10 overflow-y-auto relative">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
          <AutoSaveIndicator />
        </div>
      </div>
    </AppContext.Provider>
  );
}
