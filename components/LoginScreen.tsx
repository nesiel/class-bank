
import React, { useState, useEffect } from 'react';
import { Database, Student, UserRole } from '../types';
import { GraduationCap, Lock, ArrowRight, User, KeyRound, Coins, CheckSquare, Square, ChevronRight, BookOpen } from 'lucide-react';

interface LoginScreenProps {
  students: Student[];
  teacherPin: string;
  onLogin: (role: UserRole, studentName?: string, remember?: boolean) => void;
  onEnterLearning: () => void;
  logo?: string;
  isSystemLocked?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ students, teacherPin, onLogin, onEnterLearning, logo, isSystemLocked }) => {
  const [view, setView] = useState<'main' | 'teacher' | 'student' | 'student-pin'>('main');
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedStudentForLogin, setSelectedStudentForLogin] = useState<Student | null>(null);

  const handleTeacherLogin = () => {
    if (pinInput === teacherPin) {
      onLogin('teacher', undefined, rememberMe);
    } else {
      setError("סיסמה שגויה");
      setPinInput("");
    }
  };

  const handleStudentSelect = (student: Student) => {
      setSelectedStudentForLogin(student);
      setPinInput("");
      setError("");
      setView('student-pin');
  };

  const verifyStudentPin = () => {
      if (!selectedStudentForLogin) return;

      // Check if student has a custom password, otherwise use default '1234'
      const correctPassword = selectedStudentForLogin.password || '1234';

      if (pinInput === correctPassword) {
          onLogin('student', selectedStudentForLogin.name);
      } else {
          setError("סיסמה שגויה");
          setPinInput("");
      }
  };

  // Enable physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'teacher' && view !== 'student-pin') return;

      // Numbers
      if (/^\d$/.test(e.key)) {
        if (pinInput.length < 4) {
          setPinInput(prev => prev + e.key);
          setError("");
        }
      }
      
      // Backspace
      if (e.key === 'Backspace') {
        setPinInput(prev => prev.slice(0, -1));
        setError("");
      }

      // Enter
      if (e.key === 'Enter') {
        if (view === 'teacher') {
            if (pinInput === teacherPin) {
                onLogin('teacher', undefined, rememberMe);
            } else {
                setError("סיסמה שגויה");
                setPinInput("");
            }
        }
        if (view === 'student-pin' && selectedStudentForLogin) {
            const correctPassword = selectedStudentForLogin.password || '1234';
            if (pinInput === correctPassword) {
                onLogin('student', selectedStudentForLogin.name);
            } else {
                setError("סיסמה שגויה");
                setPinInput("");
            }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, pinInput, teacherPin, selectedStudentForLogin, onLogin, rememberMe]);

  const filteredStudents = students
    .filter(s => s.name.includes(searchStudent))
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderKeypad = (onSubmit: () => void) => (
    <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
                key={num} 
                onClick={() => {
                    if (pinInput.length < 4) {
                        setPinInput(prev => prev + num);
                        setError("");
                    }
                }}
                className="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl active:scale-90 transition-transform"
            >
                {num}
            </button>
        ))}
        <button onClick={() => {
            setPinInput("");
            setView(view === 'teacher' ? 'main' : 'student');
        }} className="text-xs font-bold text-gray-500 hover:text-white">חזור</button>
        <button 
            onClick={() => {
                if (pinInput.length < 4) {
                    setPinInput(prev => prev + '0');
                    setError("");
                }
            }}
            className="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl active:scale-90 transition-transform"
        >
            0
        </button>
        <button onClick={() => { setPinInput(""); setError(""); }} className="text-xs font-bold text-red-400 hover:text-red-300">נקה</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a0f0d] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#d4af37] rounded-full blur-[100px]"></div>
         <div className="absolute top-1/2 right-0 w-48 h-48 bg-blue-500 rounded-full blur-[80px]"></div>
         <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Area */}
        {view === 'main' && (
            <div className="mb-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-[#d4af37] bg-black/40 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)] mb-4">
                    {logo ? (
                        <img src={logo} className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <Coins size={48} className="text-[#d4af37]" />
                    )}
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">הבנק הכיתתי</h1>
                <p className="text-[#d4af37] font-medium mt-2">מערכת חינוך חכמה</p>
            </div>
        )}

        {view === 'main' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <button 
                    onClick={() => setView('teacher')}
                    className="w-full bg-[#2d1b15] border border-[#d4af37]/30 p-5 rounded-2xl flex items-center justify-between group hover:border-[#d4af37] transition-all active:scale-95 shadow-lg"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-[#d4af37]/10 p-3 rounded-full text--[#d4af37]">
                            <Lock size={24} />
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-white group-hover:text-[#d4af37] transition-colors">כניסת מורה</span>
                            <span className="text-xs text-gray-400">ניהול ניקוד, חנות והגדרות</span>
                        </div>
                    </div>
                    <ArrowRight className="text-gray-500 group-hover:text-[#d4af37] transition-colors" />
                </button>

                <button 
                    onClick={() => !isSystemLocked && setView('student')}
                    disabled={isSystemLocked}
                    className={`w-full p-5 rounded-2xl flex items-center justify-between group transition-all active:scale-95 shadow-lg ${isSystemLocked ? 'bg-red-900/20 border border-red-500/30 opacity-70 cursor-not-allowed' : 'bg-[#1e293b] border border-blue-500/30 hover:border-blue-400'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isSystemLocked ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
                            {isSystemLocked ? <Lock size={24}/> : <GraduationCap size={24} />}
                        </div>
                        <div className="text-right">
                            <span className={`block text-lg font-bold transition-colors ${isSystemLocked ? 'text-red-400' : 'text-white group-hover:text-blue-400'}`}>
                                {isSystemLocked ? 'האתר נעול כעת' : 'כניסת תלמיד/ה'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {isSystemLocked ? 'המורה נעל את האתר זמנית' : 'צפייה במאזן, רכישות והיסטוריה'}
                            </span>
                        </div>
                    </div>
                    {!isSystemLocked && <ArrowRight className="text-gray-500 group-hover:text-blue-400 transition-colors" />}
                </button>

                <button 
                    onClick={onEnterLearning}
                    className="w-full bg-[#14532d] border border-green-500/30 p-5 rounded-2xl flex items-center justify-between group hover:border-green-400 transition-all active:scale-95 shadow-lg"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-green-500/10 p-3 rounded-full text-green-400">
                            <BookOpen size={24} />
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-white group-hover:text-green-400 transition-colors">מרכז למידה</span>
                            <span className="text-xs text-gray-400">חזרה למבחנים, דפי עבודה וטפסים</span>
                        </div>
                    </div>
                    <ArrowRight className="text-gray-500 group-hover:text-green-400 transition-colors" />
                </button>
            </div>
        )}

        {view === 'teacher' && (
            <div className="bg-[#2d1b15] border border-[#d4af37]/30 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-center mb-6 text-[#d4af37]">
                    <KeyRound size={40} />
                </div>
                <h3 className="text-xl font-bold text-white mb-6">הזן קוד מורה</h3>
                
                {/* Masked Display */}
                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border ${pinInput.length > i ? 'bg-[#d4af37] border-[#d4af37]' : 'border-gray-600'}`}></div>
                    ))}
                </div>

                {renderKeypad(handleTeacherLogin)}

                {error && <p className="text-red-500 text-sm font-bold mb-4 animate-bounce">{error}</p>}

                <div 
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center justify-center gap-2 mb-4 cursor-pointer text-[#d4af37] text-sm font-bold opacity-90 hover:opacity-100"
                >
                    {rememberMe ? <CheckSquare size={18} /> : <Square size={18} />}
                    <span>זכור אותי במכשיר זה</span>
                </div>

                <button 
                    onClick={handleTeacherLogin}
                    className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                    כניסה
                </button>
            </div>
        )}

        {view === 'student' && !isSystemLocked && (
            <div className="bg-[#1e293b] border border-blue-500/30 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[70vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={20} className="text-blue-400"/> בחר את שמך
                    </h3>
                    <button onClick={() => setView('main')} className="text-sm text-gray-400 hover:text-white">ביטול</button>
                </div>
                
                <input 
                    type="text" 
                    placeholder="חפש תלמיד..." 
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:border-blue-400 transition"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    autoFocus
                />

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredStudents.length === 0 && <p className="text-gray-500 text-sm py-4">לא נמצאו תלמידים</p>}
                    {filteredStudents.map(s => (
                        <button 
                            key={s.name}
                            onClick={() => handleStudentSelect(s)}
                            className="w-full text-right p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/50 transition-all active:scale-95 flex items-center justify-between group"
                        >
                            <span className="font-bold text-gray-200 group-hover:text-blue-200">{s.name}</span>
                            <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
                                <ChevronRight size={14} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {view === 'student-pin' && selectedStudentForLogin && (
             <div className="bg-[#1e293b] border border-blue-500/30 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white">שלום {selectedStudentForLogin.name.split(' ')[0]}!</h3>
                    <p className="text-blue-300 text-sm mt-1">
                        {selectedStudentForLogin.password ? "הזן/י את הסיסמה האישית שלך" : "הזן/י סיסמה (ברירת מחדל 1234)"}
                    </p>
                </div>
                
                {/* Masked Display */}
                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border ${pinInput.length > i ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}></div>
                    ))}
                </div>

                {renderKeypad(verifyStudentPin)}

                {error && <p className="text-red-500 text-sm font-bold mb-4 animate-bounce">{error}</p>}

                <button 
                    onClick={verifyStudentPin}
                    className="w-full bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                    כניסה
                </button>
            </div>
        )}

      </div>
      
      <p className="fixed bottom-4 text-xs text-gray-600 font-mono">v1.3 - Secured</p>
    </div>
  );
};
