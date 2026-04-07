import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  User, 
  Mail, 
  Settings, 
  Moon, 
  Sun, 
  Timer, 
  Coffee, 
  Shield, 
  CheckCircle2,
  Camera,
  Loader2,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Profile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [focusDur, setFocusDur] = useState(profile?.settings?.focusDuration || 25);
  const [breakDur, setBreakDur] = useState(profile?.settings?.breakDuration || 5);
  const [darkMode, setDarkMode] = useState(profile?.settings?.darkMode ?? false);
  const [autoStart, setAutoStart] = useState(profile?.settings?.autoStart ?? false);
  const [muteSound, setMuteSound] = useState(profile?.settings?.muteSound ?? false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setFocusDur(profile.settings?.focusDuration || 25);
      setBreakDur(profile.settings?.breakDuration || 5);
      setDarkMode(profile.settings?.darkMode ?? false);
      setAutoStart(profile.settings?.autoStart ?? false);
      setMuteSound(profile.settings?.muteSound ?? false);
    }
  }, [profile]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (focusDur < 1 || breakDur < 1) {
      setError('Durations must be at least 1 minute');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: name,
        'settings.darkMode': darkMode,
        'settings.focusDuration': focusDur,
        'settings.breakDuration': breakDur,
        'settings.autoStart': autoStart,
        'settings.muteSound': muteSound
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-indigo-50 dark:border-indigo-900"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full border-4 border-white dark:border-gray-900 hover:bg-indigo-700 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile?.displayName}</h2>
            <p className="text-sm text-gray-500 mb-6">{profile?.email}</p>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full uppercase tracking-widest">
              <Shield className="w-3 h-3" />
              Verified Account
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Account Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Member since</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="text-sm font-semibold text-indigo-600">Premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
            {/* Personal Info */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <User className="w-5 h-5" />
                <h3 className="font-bold">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    value={profile?.email || ''}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            {/* App Preferences */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Settings className="w-5 h-5" />
                <h3 className="font-bold">App Preferences</h3>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Dark Mode</p>
                    <p className="text-xs text-gray-500">Adjust the appearance of the app</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    const newMode = !darkMode;
                    setDarkMode(newMode);
                    if (profile) {
                      try {
                        await updateDoc(doc(db, 'users', profile.uid), {
                          'settings.darkMode': newMode
                        });
                        await refreshProfile();
                      } catch (err) {
                        console.error("Error saving theme:", err);
                      }
                    }
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    darkMode ? "bg-indigo-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    darkMode ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </section>

            {/* Focus Timer Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Timer className="w-5 h-5" />
                <h3 className="font-bold">Focus Timer Settings</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <Timer className="w-4 h-4" /> Focus Duration (min)
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="120"
                    value={focusDur}
                    onChange={(e) => {
                      setFocusDur(parseInt(e.target.value) || 1);
                      if (error) setError(null);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Break Duration (min)
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="60"
                    value={breakDur}
                    onChange={(e) => {
                      setBreakDur(parseInt(e.target.value) || 1);
                      if (error) setError(null);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>
              {error && (
                <p className="text-red-500 text-xs font-medium mt-2">{error}</p>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Zap className={cn("w-5 h-5", autoStart ? "text-amber-500" : "text-gray-400")} />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Auto-Start Next Session</p>
                    <p className="text-xs text-gray-500">Automatically switch between focus and break</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setAutoStart(!autoStart)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    autoStart ? "bg-indigo-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    autoStart ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </section>
            
            {/* Sound & Notification Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Volume2 className="w-5 h-5" />
                <h3 className="font-bold">Sound & Notifications</h3>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {muteSound ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-indigo-400" />}
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Mute Notification Sound</p>
                    <p className="text-xs text-gray-500">Mute the sound when the timer completes</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setMuteSound(!muteSound)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    muteSound ? "bg-indigo-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    muteSound ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </section>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Profile updated successfully!
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                type="submit"
                disabled={loading}
                className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
