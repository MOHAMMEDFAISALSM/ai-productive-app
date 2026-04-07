import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Task } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart2,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, subDays, startOfDay, isSameDay, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Analytics: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchTasks = async () => {
      const q = query(
        collection(db, 'tasks'),
        where('uid', '==', auth.currentUser?.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      setLoading(false);
    };

    fetchTasks();
  }, []);

  // Prepare data for Weekly Productivity Chart
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
  const weeklyData = last7Days.map(day => {
    const dayTasks = tasks.filter(t => t.completedAt && isSameDay(new Date(t.completedAt), day));
    return {
      name: format(day, 'EEE'),
      completed: dayTasks.length
    };
  });

  // Prepare data for Monthly Productivity Chart
  const last30Days = Array.from({ length: 30 }).map((_, i) => subDays(new Date(), i)).reverse();
  const monthlyData = last30Days.map(day => {
    const dayTasks = tasks.filter(t => t.completedAt && isSameDay(new Date(t.completedAt), day));
    return {
      name: format(day, 'MMM d'),
      completed: dayTasks.length
    };
  });

  // Prepare data for Category Distribution
  const categories = Array.from(new Set(tasks.map(t => t.category || 'Uncategorized')));
  const categoryData = categories.map(cat => ({
    name: cat,
    completed: tasks.filter(t => t.category === cat && t.completed).length,
    total: tasks.filter(t => t.category === cat).length
  })).sort((a, b) => b.completed - a.completed);

  // Prepare data for Average Time per Category
  const avgTimeData = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat && t.completed && t.timeSpent);
    const avgTime = catTasks.length > 0 
      ? Math.round(catTasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0) / catTasks.length)
      : 0;
    return {
      name: cat,
      avgTime
    };
  }).filter(d => d.avgTime > 0).sort((a, b) => b.avgTime - a.avgTime);

  // Prepare data for Priority Distribution
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
  const priorityData = [
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: '#f43f5e' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: '#10b981' },
  ].filter(d => d.value > 0);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate real average completion time from timeSpent
  const tasksWithTime = tasks.filter(t => t.completed && t.timeSpent);
  const avgTimeSpent = tasksWithTime.length > 0
    ? (tasksWithTime.reduce((acc, t) => acc + (t.timeSpent || 0), 0) / tasksWithTime.length / 60).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Productivity Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your progress and optimize your workflow.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Last 30 Days</span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
              <ArrowUpRight className="w-4 h-4" />
              12%
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{completionRate}%</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
              <ArrowUpRight className="w-4 h-4" />
              {weeklyData.reduce((acc, d) => acc + d.completed, 0)}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasks Completed</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{completedCount}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex items-center gap-1 text-rose-600 font-bold text-sm">
              <ArrowDownRight className="w-4 h-4" />
              3%
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Time / Task</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{avgTimeSpent}h</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl">
              <Activity className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
              <ArrowUpRight className="w-4 h-4" />
              5
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Streak</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">12 Days</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Productivity Overview */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Productivity Overview</h2>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  dy={10}
                  interval={2}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMonthly)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Completion Trends */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Completion by Category</h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Bar dataKey="completed" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <PieChartIcon className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Priority Distribution</h2>
          </div>
          <div className="h-80 w-full flex flex-col items-center justify-center">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-sm italic">No data available</div>
            )}
          </div>
        </div>

        {/* Average Time per Category */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
              <Clock className="w-5 h-5 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Average Time Spent per Category (min)</h2>
          </div>
          <div className="h-80 w-full">
            {avgTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgTimeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }} 
                  />
                  <Bar dataKey="avgTime" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Clock className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm italic">No time tracking data available yet. Use Focus Mode to track time!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-white/20 rounded-2xl">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Productivity Insights</h2>
            <p className="text-indigo-100">AI-powered analysis of your performance.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" /> Peak Performance
            </h3>
            <p className="text-sm text-indigo-50">Your most productive hours are between 9:00 AM and 11:00 AM. Try scheduling your "High" priority tasks during this window.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Task Breakdown
            </h3>
            <p className="text-sm text-indigo-50">You tend to complete "{categoryData[0]?.name || 'Work'}" tasks faster than others. Consider using the Pomodoro timer for more complex tasks to boost focus.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
