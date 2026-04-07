import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart2, 
  Timer, 
  User, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  Search,
  Bell,
  Shield
} from 'lucide-react';
import { logout, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { name: 'AI Planner', icon: Calendar, path: '/planner' },
  { name: 'Analytics', icon: BarChart2, path: '/analytics' },
  { name: 'Focus Mode', icon: Timer, path: '/focus' },
  { name: 'Profile', icon: User, path: '/profile' },
];

import { AIChatBot } from './AIChatBot';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(profile?.settings?.darkMode ?? false);

  useEffect(() => {
    if (profile?.settings?.darkMode !== undefined) {
      setDarkMode(profile.settings.darkMode);
    }
  }, [profile?.settings?.darkMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300", darkMode && "dark")}>
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30 hidden md:block",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CheckSquare className="text-white w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-xl text-gray-900 dark:text-white truncate">AI Planner</span>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                aria-current={location.pathname === item.path ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
                  location.pathname === item.path 
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-indigo-600 dark:text-indigo-400" : "group-hover:text-gray-700 dark:group-hover:text-gray-300")} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
                !isSidebarOpen && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "md:ml-64" : "md:ml-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              aria-expanded={isSidebarOpen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hidden md:block transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Mobile Menu"
              aria-expanded={isMobileMenuOpen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg md:hidden transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <form onSubmit={handleSearch} className="relative hidden sm:block group" role="search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                aria-label="Search tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white w-64 transition-all"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </form>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const newMode = !darkMode;
                setDarkMode(newMode);
                // Save to Firestore if user is logged in
                if (profile) {
                  updateDoc(doc(db, 'users', profile.uid), {
                    'settings.darkMode': newMode
                  }).catch(err => console.error("Error saving theme:", err));
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-pressed={darkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                aria-expanded={showNotifications}
                aria-haspopup="true"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full relative transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border-2 border-white dark:border-gray-900" aria-hidden="true"></span>
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase">2 New</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <NotificationItem 
                          title="Welcome to AI Planner!" 
                          desc="Start by adding your first task to get AI suggestions." 
                          time="Just now"
                          icon={CheckSquare}
                          color="indigo"
                        />
                        <NotificationItem 
                          title="Premium Plan Active" 
                          desc="You have access to all AI productivity features." 
                          time="2h ago"
                          icon={Shield}
                          color="emerald"
                        />
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:border-gray-800 mx-1"></div>
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.displayName || user?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Premium Plan</p>
              </div>
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                alt="Profile" 
                className="w-9 h-9 rounded-full border-2 border-indigo-100 dark:border-indigo-900"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <AIChatBot />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-gray-900 z-50 md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <CheckSquare className="text-white w-5 h-5" />
                  </div>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">AI Planner</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <nav className="flex-1 px-4 space-y-1 mt-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                      location.pathname === item.path 
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{ title: string, desc: string, time: string, icon: any, color: string }> = ({ title, desc, time, icon: Icon, color }) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex gap-3">
        <div className={cn("p-2 rounded-lg h-fit", colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{desc}</p>
          <p className="text-[10px] text-gray-400 mt-1.5">{time}</p>
        </div>
      </div>
    </div>
  );
};
