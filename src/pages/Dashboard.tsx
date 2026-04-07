import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Task, Priority } from '../types';
import { TaskCard } from '../components/TaskCard';
import { AddTaskModal } from '../components/AddTaskModal';
import { 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Brain, 
  ArrowRight,
  Plus,
  Zap,
  Calendar,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfDay } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { getProductivityTip } from '../lib/ai';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tasks'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      setLoading(false);
      
      // Generate mock chart data based on tasks
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayTasks = taskList.filter(t => t.createdAt && startOfDay(new Date(t.createdAt)).getTime() === startOfDay(date).getTime());
        const completed = dayTasks.filter(t => t.completed).length;
        return {
          name: format(date, 'EEE'),
          completed: completed
        };
      });
      setChartData(last7Days);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, []);

  const fetchSuggestion = async () => {
    setIsGeneratingSuggestion(true);
    try {
      const suggestion = await getProductivityTip(tasks);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error("Error fetching suggestion:", error);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && !aiSuggestion && !isGeneratingSuggestion) {
      fetchSuggestion();
    }
  }, [tasks]);

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { completed });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const toggleSubtask = async (taskId: string, subtaskIndex: number, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtasks = [...task.subtasks];
    newSubtasks[subtaskIndex].completed = completed;

    try {
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: newSubtasks });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const productivityScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hello, {auth.currentUser?.displayName?.split(' ')[0] || 'Productive User'}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{format(new Date(), 'EEEE, MMM do')}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Statistics Overview">
        <StatCard 
          title="Productivity Score" 
          value={`${productivityScore}%`} 
          icon={TrendingUp} 
          color="indigo" 
          trend="+5% from yesterday"
        />
        <StatCard 
          title="Tasks Completed" 
          value={completedCount.toString()} 
          icon={CheckCircle} 
          color="emerald" 
          trend="Keep it up!"
        />
        <StatCard 
          title="Pending Tasks" 
          value={(tasks.length - completedCount).toString()} 
          icon={Clock} 
          color="amber" 
          trend="Focus on these"
        />
        <StatCard 
          title="Focus Time" 
          value="2.5h" 
          icon={Zap} 
          color="rose" 
          trend="Great concentration"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks & Chart */}
        <div className="lg:col-span-2 space-y-8">
          {/* Productivity Chart */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Productivity Trend</h2>
                <p className="text-xs text-gray-500">Tasks completed over the last 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                Live Data
              </div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#4f46e5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Tasks</h2>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div>
              ))
            ) : tasks.length > 0 ? (
              tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggleComplete={toggleTask}
                  onDelete={deleteTask}
                  onEdit={() => {}}
                  onToggleSubtask={toggleSubtask}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400">No tasks yet. Start by adding one!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
        <div className="space-y-6">
          <div className="relative overflow-hidden bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none group">
            {/* Decorative background elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl group-hover:bg-indigo-400/40 transition-all duration-700"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">AI Insight</h2>
                    <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold">Personalized for you</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                  onClick={() => fetchSuggestion()}
                  disabled={isGeneratingSuggestion}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-colors disabled:opacity-50"
                  title="Refresh suggestion"
                >
                  <RefreshCw className={cn("w-4 h-4", isGeneratingSuggestion && "animate-spin")} />
                </motion.button>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 min-h-[120px] flex items-center justify-center border border-white/10" aria-live="polite">
                {isGeneratingSuggestion ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1.5">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div 
                          key={i}
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                          className="w-2 h-2 bg-white rounded-full"
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Analyzing your flow...</p>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed italic w-full text-center">
                    <Sparkles className="w-4 h-4 text-indigo-200 mb-2 mx-auto opacity-50" />
                    <ReactMarkdown>
                      {aiSuggestion ? `"${aiSuggestion}"` : '"Add some tasks to get personalized suggestions!"'}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                <span>Gemini 3.0 Flash</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-indigo-200 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-indigo-200 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-indigo-200 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3" role="group" aria-label="Quick Actions">
              <ActionButton 
                icon={Plus} 
                label="Add New Task" 
                color="indigo" 
                onClick={() => setIsAddTaskModalOpen(true)}
              />
              <ActionButton 
                icon={Calendar} 
                label="Generate Day Plan" 
                color="emerald" 
                onClick={() => navigate('/planner')}
              />
              <ActionButton 
                icon={Zap} 
                label="Start Focus Session" 
                color="rose" 
                onClick={() => navigate('/focus')}
              />
            </div>
          </div>
        </div>
      </div>

      <AddTaskModal 
        isOpen={isAddTaskModalOpen} 
        onClose={() => setIsAddTaskModalOpen(false)} 
      />
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: any, color: string, trend: string }> = ({ title, value, icon: Icon, color, trend }) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };

  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-lg", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{trend}</p>
    </motion.div>
  );
};

const ActionButton: React.FC<{ icon: any, label: string, color: string, onClick?: () => void }> = ({ icon: Icon, label, color, onClick }) => {
  const colors: any = {
    indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40',
    emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40',
    rose: 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40',
  };

  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  return (
    <button 
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all focus-visible:ring-2 focus-visible:ring-indigo-500", colors[color])} 
      aria-label={label}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </button>
  );
};

export default Dashboard;
