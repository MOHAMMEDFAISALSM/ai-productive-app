import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Task, Plan, ScheduleItem } from '../types';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  History,
  Download,
  Printer,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { generateDayPlan } from '../lib/ai';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Planner: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<Plan[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch active tasks
    const fetchTasks = async () => {
      const q = query(
        collection(db, 'tasks'),
        where('uid', '==', auth.currentUser?.uid),
        where('completed', '==', false)
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    };

    // Fetch today's plan
    const today = format(new Date(), 'yyyy-MM-dd');
    const qPlan = query(
      collection(db, 'plans'),
      where('uid', '==', auth.currentUser.uid),
      where('date', '==', today),
      limit(1)
    );

    const unsubscribePlan = onSnapshot(qPlan, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentPlan({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Plan);
      }
      setLoading(false);
    });

    // Fetch history
    const qHistory = query(
      collection(db, 'plans'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('date', 'desc'),
      limit(5)
    );
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    });

    fetchTasks();
    return () => {
      unsubscribePlan();
      unsubscribeHistory();
    };
  }, []);

  const handleGeneratePlan = async () => {
    if (!auth.currentUser || tasks.length === 0) return;

    setIsGenerating(true);
    try {
      const schedule = await generateDayPlan(tasks, "The user wants a balanced day with focus on high priority tasks.");
      
      const newPlan = {
        uid: auth.currentUser.uid,
        date: format(new Date(), 'yyyy-MM-dd'),
        schedule,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'plans'), newPlan);
    } catch (error) {
      console.error("Error generating plan:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            AI Smart Planner
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Let AI organize your day for maximum productivity.
          </p>
        </div>
        {!currentPlan && (
          <button 
            onClick={handleGeneratePlan}
            disabled={isGenerating || tasks.length === 0}
            aria-label="Generate My Day Plan"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Sparkles className="w-5 h-5" aria-hidden="true" />}
            Generate My Day Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 border border-gray-100 dark:border-gray-800 animate-pulse">
              <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>)}
              </div>
            </div>
          ) : currentPlan ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today's Schedule</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrint}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                    title="Print schedule"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    Optimized by AI
                  </div>
                </div>
              </div>

              <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800" role="list" aria-label="Daily Schedule">
                {currentPlan.schedule.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    role="listitem"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative pl-12"
                  >
                    <div className="absolute left-0 top-1 w-9 h-9 bg-white dark:bg-gray-900 border-2 border-indigo-600 rounded-full flex items-center justify-center z-10">
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{item.time}</span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-500">{item.duration}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.taskTitle}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button 
                aria-label="Export schedule to calendar"
                className="w-full mt-8 py-3 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                Export to Calendar
              </button>
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-800">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No plan for today yet</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                {tasks.length > 0 
                  ? "You have pending tasks! Click the button to generate an AI-optimized schedule for your day."
                  : "You don't have any active tasks. Add some tasks first to generate a plan."}
              </p>
              {tasks.length > 0 && (
                <button 
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Plan Now
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Tasks Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Recent Plans
            </h2>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((plan, i) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{format(new Date(plan.date), 'MMM do, yyyy')}</p>
                        <p className="text-xs text-gray-500">{plan.schedule.length} tasks scheduled</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No history yet.</p>
              )}
            </div>
          </div>

          {/* Productivity Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/30">
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Pro Tip
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              The AI Planner works best when you set clear priorities for your tasks. High priority tasks are scheduled during your peak focus hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planner;
