import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Brain, 
  Settings,
  Volume2,
  VolumeX,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { Task } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Focus: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(profile?.settings?.muteSound ?? false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const focusTime = (profile?.settings?.focusDuration || 25) * 60;
  const breakTime = (profile?.settings?.breakDuration || 5) * 60;
  const autoStart = profile?.settings?.autoStart ?? false;

  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, 'tasks'),
        where('uid', '==', auth.currentUser.uid),
        where('completed', '==', false)
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    if (profile?.settings?.muteSound !== undefined) {
      setIsMuted(profile.settings.muteSound);
    }
  }, [profile?.settings?.muteSound]);

  // Reset timer when mode changes or durations are updated (only if not active)
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(mode === 'focus' ? focusTime : breakTime);
    }
  }, [mode, focusTime, breakTime]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    
    if (!isMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    }

    if (Notification.permission === 'granted') {
      new Notification(mode === 'focus' ? 'Focus Session Complete!' : 'Break Over!', {
        body: mode === 'focus' ? 'Time for a short break.' : 'Ready to focus again?',
        icon: '/favicon.ico'
      });
    }

    if (mode === 'focus') {
      setSessionsCompleted(prev => prev + 1);
      
      // Update task time spent if a task is selected
      if (selectedTaskId) {
        try {
          const durationMinutes = Math.round(focusTime / 60);
          await updateDoc(doc(db, 'tasks', selectedTaskId), {
            timeSpent: increment(durationMinutes)
          });
        } catch (error) {
          console.error("Error updating task time spent:", error);
        }
      }
      
      setMode('break');
    } else {
      setMode('focus');
    }

    if (autoStart) {
      setTimeout(() => setIsActive(true), 1000);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (profile) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          'settings.muteSound': newMuted
        });
        await refreshProfile();
      } catch (error) {
        console.error("Error updating mute setting:", error);
      }
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? focusTime : breakTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (mode === 'focus' ? focusTime : breakTime));

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Focus Mode</h1>
        <p className="text-gray-500 dark:text-gray-400">Stay concentrated using the Pomodoro technique.</p>
      </div>

      <div className="flex flex-col items-center">
        {/* Task Selector */}
        {mode === 'focus' && !isActive && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 w-full max-w-md"
          >
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
              <ListTodo className="w-4 h-4" />
              Focusing on
            </div>
            <select 
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="">General Focus (No specific task)</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title} ({task.category})
                </option>
              ))}
            </select>
          </motion.div>
        )}

        {/* Timer Circle */}
        <div 
          className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${mode === 'focus' ? 'Focus' : 'Break'} timer progress`}
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
            <circle 
              cx="50%" 
              cy="50%" 
              r="48%" 
              className="fill-none stroke-gray-100 dark:stroke-gray-800" 
              strokeWidth="8"
            />
            <motion.circle 
              cx="50%" 
              cy="50%" 
              r="48%" 
              className={cn(
                "fill-none transition-colors duration-500",
                mode === 'focus' ? "stroke-indigo-600" : "stroke-emerald-500"
              )}
              strokeWidth="8"
              strokeDasharray="100 100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 100 - (progress * 100) }}
              strokeLinecap="round"
            />
          </svg>

          <div className="text-center z-10">
            <motion.div 
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-sm font-bold uppercase tracking-widest mb-2",
                mode === 'focus' ? "text-indigo-600" : "text-emerald-500"
              )}
            >
              {mode === 'focus' ? 'Focus Session' : 'Short Break'}
            </motion.div>
            <div 
              className="text-7xl md:text-8xl font-black text-gray-900 dark:text-white tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatTime(timeLeft)}
            </div>
            {selectedTaskId && mode === 'focus' && (
              <div className="mt-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                {tasks.find(t => t.id === selectedTaskId)?.title}
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">{sessionsCompleted} sessions today</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-12 flex items-center gap-6">
          <button 
            onClick={resetTimer}
            aria-label="Reset timer"
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button 
            onClick={toggleTimer}
            aria-label={isActive ? "Pause timer" : "Start timer"}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-gray-950",
              isActive 
                ? "bg-gray-900 dark:bg-white dark:text-gray-900" 
                : (mode === 'focus' ? "bg-indigo-600" : "bg-emerald-500")
            )}
          >
            {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>

          <button 
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute notification sound" : "Mute notification sound"}
            aria-pressed={isMuted}
            className={cn(
              "p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500",
              isMuted ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            )}
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mt-12 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex gap-2 shadow-sm" role="tablist">
          <button 
            onClick={() => { setMode('focus'); setIsActive(false); }}
            role="tab"
            aria-selected={mode === 'focus'}
            aria-label="Focus mode"
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500",
              mode === 'focus' 
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <Brain className="w-4 h-4" />
            Focus
          </button>
          <button 
            onClick={() => { setMode('break'); setIsActive(false); }}
            role="tab"
            aria-selected={mode === 'break'}
            aria-label="Break mode"
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500",
              mode === 'break' 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <Coffee className="w-4 h-4" />
            Break
          </button>
        </div>
      </div>

      {/* Settings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
            <Timer className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Focus Duration</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{profile?.settings?.focusDuration || 25} min</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
            <Coffee className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Break Duration</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{profile?.settings?.breakDuration || 5} min</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auto Start</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{autoStart ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Timer: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default Focus;
