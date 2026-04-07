import React from 'react';
import { Task, Priority } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  Trash2, 
  Edit2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  Tag,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskIndex: number, completed: boolean) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const priorityColors = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};

const priorityLabels = {
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggleComplete, 
  onDelete, 
  onEdit,
  onToggleSubtask,
  isSelected,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);

  const handleToggle = () => {
    const newCompleted = !task.completed;
    onToggleComplete(task.id, newCompleted);
    if (newCompleted) {
      setShowToast(true);
    }
  };

  React.useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const progress = task.subtasks.length > 0 
    ? Math.round((completedSubtasks / task.subtasks.length) * 100) 
    : (task.completed ? 100 : 0);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all group relative overflow-hidden",
        task.completed && "opacity-75"
      )}
    >
      {/* Priority Indicator Line */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", priorityColors[task.priority])} />

      {/* Selection Checkbox (Top Left) */}
      {onSelect && (
        <div className="absolute top-4 left-4 z-20">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={(e) => onSelect(task.id, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      )}

      <div className={cn("flex items-start gap-4 relative", onSelect && "pl-6")}>
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute -top-12 left-0 right-0 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Task completed!</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowToast(false);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={handleToggle}
          aria-label={task.completed ? "Mark task as incomplete" : "Mark task as complete"}
          aria-pressed={task.completed}
          className="mt-1 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full transition-shadow"
        >
          <motion.div
            key={task.completed ? 'checked' : 'unchecked'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {task.completed ? (
              <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors" />
            )}
          </motion.div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={cn(
              "font-semibold text-gray-900 dark:text-white truncate",
              task.completed && "line-through text-gray-500"
            )}>
              {task.title}
            </h3>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Task options"
                aria-expanded={showMenu}
                aria-haspopup="true"
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 py-1"
                    >
                      <button 
                        onClick={() => { onEdit(task); setShowMenu(false); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => { onDelete(task.id); setShowMenu(false); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
            <span className={cn("px-2 py-0.5 rounded-lg", priorityLabels[task.priority])}>
              {task.priority}
            </span>
            {task.deadline && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg",
                isPast(new Date(task.deadline)) && !task.completed ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : "bg-gray-50 dark:bg-gray-800"
              )}>
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
              </div>
            )}
            {task.category && (
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                <Tag className="w-3 h-3" />
                {task.category}
              </div>
            )}
          </div>

          {task.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mt-5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Task progress">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"
              />
            </div>
          </div>

          {/* Subtasks Toggle */}
          {task.subtasks.length > 0 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Hide subtasks" : "Show subtasks"}
              aria-expanded={isExpanded}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isExpanded ? 'Hide' : 'Show'} {task.subtasks.length} subtasks
            </button>
          )}

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-800">
                  {task.subtasks.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 group/sub">
                      <button 
                        onClick={() => onToggleSubtask(task.id, idx, !sub.completed)}
                        aria-label={sub.completed ? `Mark "${sub.title}" as incomplete` : `Mark "${sub.title}" as complete`}
                        aria-pressed={sub.completed}
                        className="flex-shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full"
                      >
                        <motion.div
                          key={sub.completed ? 'checked' : 'unchecked'}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          {sub.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          )}
                        </motion.div>
                      </button>
                      <span className={cn(
                        "text-sm text-gray-600 dark:text-gray-400",
                        sub.completed && "line-through opacity-50"
                      )}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
