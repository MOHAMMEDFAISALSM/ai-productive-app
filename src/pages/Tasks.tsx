import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Task, Priority } from '../types';
import { TaskCard } from '../components/TaskCard';
import { AddTaskModal } from '../components/AddTaskModal';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Search, 
  LayoutGrid, 
  List,
  ChevronDown,
  Calendar,
  AlertCircle,
  Trash2,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'deadline'>('newest');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tasks'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, []);

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        completed,
        completedAt: completed ? new Date().toISOString() : null
      });
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !task.completed) || 
                         (filterStatus === 'completed' && task.completed);
    return matchesSearch && matchesPriority && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'priority') {
      const p = { high: 3, medium: 2, low: 1 };
      return p[b.priority] - p[a.priority];
    }
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return 0;
  });

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return;
    try {
      await Promise.all(selectedTasks.map(id => deleteDoc(doc(db, 'tasks', id))));
      setSelectedTasks([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks/bulk');
    }
  };

  const handleBulkComplete = async () => {
    try {
      await Promise.all(selectedTasks.map(id => updateDoc(doc(db, 'tasks', id), { 
        completed: true,
        completedAt: new Date().toISOString()
      })));
      setSelectedTasks([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks/bulk');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and organize your daily activities.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="deadline">Closest Deadline</option>
            </select>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedTasks.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50"
          >
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {selectedTasks.length} tasks selected
            </span>
            <div className="h-6 w-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBulkComplete}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button 
                onClick={() => setSelectedTasks([])}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading your tasks...</p>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        )}>
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onToggleComplete={toggleTask}
                onDelete={deleteTask}
                onEdit={() => {}}
                onToggleSubtask={toggleSubtask}
                isSelected={selectedTasks.includes(task.id)}
                onSelect={(id, selected) => {
                  if (selected) {
                    setSelectedTasks([...selectedTasks, id]);
                  } else {
                    setSelectedTasks(selectedTasks.filter(tid => tid !== id));
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No tasks found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            {searchQuery || filterPriority !== 'all' || filterStatus !== 'all' 
              ? "Try adjusting your filters or search query." 
              : "You haven't added any tasks yet. Click the button above to get started!"}
          </p>
        </div>
      )}

      <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

const Loader2: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default Tasks;
