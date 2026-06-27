import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Play, Pause, RotateCcw, Maximize, Minimize, Volume2, VolumeX, Search } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import TeddyCompanion from '../components/teddy/TeddyCompanion.jsx';
import usePomodoroStore from '../store/pomodoroStore.js';
import useAuthStore from '../store/authStore.js';
import useTeddy from '../hooks/useTeddy.js';
import ambientSoundEngine from '../utils/ambientSoundEngine.js';
import recommendationService from '../services/recommendationService.js';
import subjectService from '../services/subjectService.js';

const defaultCategories = [
  'General', 'DSA', 'Web Dev', 'OS', 'DBMS', 'ML', 'Reading', 'Coding',
  'Interview Prep', 'Placements', 'Freelancing', 'Gym Focus', 'Side Project'
];

const ambientSounds = ['Rain', 'Forest', 'Lo-Fi'];

export default function Focus() {
  const {
    timeLeft,
    duration,
    breakDuration,
    longBreakDuration,
    isRunning,
    isBreak,
    category,
    sessionId,
    phaseCount,
    sessions,
    todayStats,
    setCategory,
    setDuration,
    setBreakDuration,
    setLongBreakDuration,
    tick,
    startSession,
    pauseTimer,
    startTimer,
    resetTimer,
    abandonSession,
    fetchSessions,
    fetchTodayStats,
  } = usePomodoroStore();

  const { state: teddyState, message: teddyMessage } = useTeddy('focus');

  const { user } = useAuthStore();
  const categories = useMemo(() => {
    const subjects = (user?.subjects || []).filter(Boolean);
    if (subjects.length === 0) return defaultCategories;
    return ['General', ...subjects];
  }, [user?.subjects]);

  const [searchParams] = useSearchParams();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState(ambientSounds[0]);
  const [FocusGuard, setFocusGuard] = useState(null);
  const [subjectRecs, setSubjectRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchTodayStats();
    subjectService
      .getAllSubjects()
      .then(({ data }) => setAllSubjects(data.subjects || []))
      .catch(() => setAllSubjects([]));
  }, [fetchSessions, fetchTodayStats]);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && categories.includes(cat)) setCategory(cat);
  }, [searchParams, setCategory, categories]);

  useEffect(() => {
    if (category === 'General') {
      setSubjectRecs([]);
      return;
    }
    let cancelled = false;
    setRecsLoading(true);
    recommendationService
      .getRecommendations(category)
      .then(({ data }) => {
        if (!cancelled) setSubjectRecs(data.recommendations || []);
      })
      .catch(() => {
        if (!cancelled) setSubjectRecs([]);
      })
      .finally(() => {
        if (!cancelled) setRecsLoading(false);
      });
    return () => { cancelled = true; };
  }, [category]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, tick]);

  useEffect(() => {
    if (soundEnabled) {
      ambientSoundEngine.play(selectedSound);
    } else {
      ambientSoundEngine.stop();
    }
    return () => {
      ambientSoundEngine.stop();
    };
  }, [soundEnabled, selectedSound]);

  const toggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startSession();
      startTimer();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = isBreak
    ? ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100
    : ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const focusContent = (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800">
          {isBreak ? 'Take a cozy break' : 'Time to focus'}
        </h1>
        <p className="text-stone-500 mt-2">
          {isBreak ? 'Recharge before the next session.' : 'One focused session at a time.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <Card className="md:col-span-2 flex flex-col items-center justify-start self-start !p-5">
          <div className="relative mb-4">
            <svg width="240" height="240" className="transform -rotate-90">
              <circle cx="120" cy="120" r="100" stroke="#e7e5e4" strokeWidth="12" fill="none" />
              <motion.circle
                cx="120"
                cy="120"
                r="100"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-display font-bold text-stone-800 tabular-nums">
                {formatTime(timeLeft)}
              </span>
              <span className="text-stone-500 mt-2 font-medium">
                {isBreak ? (phaseCount > 0 && phaseCount % 4 === 0 ? 'Long Break' : 'Break') : category}
              </span>
              {!isBreak && (
                <span className="text-xs text-violet-500 font-medium mt-1">
                  Pomodoro {(phaseCount % 4) + 1} of 4
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" onClick={resetTimer}>
              <RotateCcw className="w-5 h-5" />
            </Button>
            {sessionId && !isBreak && (
              <Button variant="secondary" size="icon" onClick={abandonSession} title="Abandon session">
                <span className="text-xs font-bold">✕</span>
              </Button>
            )}
            <Button variant="cozy" size="lg" className="w-32" onClick={toggleTimer}>
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-display font-bold text-stone-800 mb-4">Category</h3>
            <div className="flex flex-wrap gap-2 pr-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === c
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'bg-white/60 text-stone-600 hover:bg-violet-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-bold text-stone-800 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" /> Find a subject
            </h3>
            <div className="relative">
              <input
                type="text"
                value={subjectQuery}
                onChange={(e) => {
                  setSubjectQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const match = allSubjects.find((s) => s.toLowerCase() === subjectQuery.toLowerCase());
                    if (match) {
                      setCategory(match);
                      setSubjectQuery('');
                      setShowSuggestions(false);
                    }
                  }
                }}
                placeholder="Type a NIT KKR subject..."
                className="w-full px-3 py-2 rounded-xl bg-white/60 border border-stone-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {showSuggestions && subjectQuery.trim() && (
                <div className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white rounded-xl shadow-lg border border-stone-100">
                  {allSubjects
                    .filter((s) => s.toLowerCase().includes(subjectQuery.toLowerCase()))
                    .slice(0, 6)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCategory(s);
                          setSubjectQuery('');
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-violet-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {s}
                      </button>
                    ))}
                  {allSubjects.filter((s) => s.toLowerCase().includes(subjectQuery.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-xs text-stone-400">No NIT KKR subject found.</div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">Only subjects from the NIT KKR curriculum.</p>
          </Card>

          <Card>
            <h3 className="font-display font-bold text-stone-800 mb-4">Timer Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-stone-500">Focus duration</label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <p className="text-right text-sm text-stone-600 font-medium">{duration} min</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Break duration</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <p className="text-right text-sm text-stone-600 font-medium">{breakDuration} min</p>
              </div>
              <div>
                <label className="text-sm text-stone-500">Long break duration</label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="5"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <p className="text-right text-sm text-stone-600 font-medium">{longBreakDuration} min</p>
              </div>
            </div>
          </Card>

          {!FocusGuard && (
            <Card className="p-4">
              <button
                onClick={async () => {
                  const mod = await import('../components/focus/FocusGuard.jsx');
                  setFocusGuard(() => mod.default);
                }}
                className="w-full text-left text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Enable Focus Guard (camera drowsiness detection) →
              </button>
            </Card>
          )}
          {FocusGuard && (
            <Card>
              <FocusGuard isRunning={isRunning} />
            </Card>
          )}

          <Card>
            <h3 className="font-display font-bold text-stone-800 mb-4 flex items-center gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              Ambient Sound
            </h3>
            <div className="space-y-2">
              {ambientSounds.map((sound) => (
                <button
                  key={sound}
                  onClick={() => { setSelectedSound(sound); setSoundEnabled(true); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedSound === sound ? 'bg-violet-100 text-violet-700' : 'bg-white/60 text-stone-600 hover:bg-violet-50'
                  }`}
                >
                  {sound}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {category !== 'General' && (
        <Card className="mt-4">
          <h3 className="font-display font-bold text-stone-800 mb-4">Recommended for {category}</h3>
          {recsLoading ? (
            <p className="text-stone-500 text-sm">Loading study resources...</p>
          ) : subjectRecs.length === 0 ? (
            <p className="text-stone-500 text-sm">No resources found for {category} yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {subjectRecs.slice(0, 6).map((rec) => (
                <a
                  key={rec.url}
                  href={rec.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 rounded-2xl bg-white/60 hover:bg-white transition-colors"
                >
                  <p className="font-medium text-stone-800 truncate">{rec.title}</p>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">
                      {rec.type}
                    </span>
                    {rec.relevanceScore && (
                      <span className="text-xs text-stone-400">{rec.relevanceScore}% match</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <h3 className="font-display font-bold text-stone-800 mb-4">Today&apos;s Sessions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-violet-50 text-center">
            <p className="text-2xl font-bold text-violet-700">{todayStats.totalMinutes}</p>
            <p className="text-xs text-violet-600">Minutes</p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 text-center">
            <p className="text-2xl font-bold text-rose-700">{todayStats.sessionsCompleted}</p>
            <p className="text-xs text-rose-600">Sessions</p>
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="text-center text-stone-400 py-4">No sessions yet today. Start your first focus!</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.slice(0, 10).map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-2xl bg-white/60">
                <div>
                  <p className="font-medium text-stone-800">{s.category}</p>
                  <p className="text-xs text-stone-500">{new Date(s.startedAt).toLocaleTimeString()}</p>
                </div>
                <span className="text-sm font-medium text-stone-600">{s.duration} min</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-violet-950 via-stone-900 to-rose-950 text-white p-8 overflow-auto"
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Minimize className="w-6 h-6" />
            </button>
            <div className="h-full flex flex-col items-center justify-center">
              <TeddyCompanion state={teddyState} message={teddyMessage} compact className="mb-8" />
              <div className="relative mb-8">
                <svg width="360" height="360" className="transform -rotate-90">
                  <circle cx="180" cy="180" r="160" stroke="rgba(255,255,255,0.1)" strokeWidth="16" fill="none" />
                  <circle
                    cx="180"
                    cy="180"
                    r="160"
                    stroke="url(#fsGradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 160}
                    strokeDashoffset={2 * Math.PI * 160 - (progress / 100) * 2 * Math.PI * 160}
                  />
                  <defs>
                    <linearGradient id="fsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c4b5fd" />
                      <stop offset="100%" stopColor="#fda4af" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-8xl font-display font-bold tabular-nums">{formatTime(timeLeft)}</span>
                  <span className="text-white/70 mt-2 text-xl">
                    {isBreak ? (phaseCount > 0 && phaseCount % 4 === 0 ? 'Long Break' : 'Break') : category}
                  </span>
                  {!isBreak && (
                    <span className="text-white/50 text-sm mt-1">
                      Pomodoro {(phaseCount % 4) + 1} of 4
                    </span>
                  )}
                </div>
              </div>
              <Button variant="cozy" size="lg" className="w-40" onClick={toggleTimer}>
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Pause' : 'Start'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {focusContent}
    </>
  );
}
