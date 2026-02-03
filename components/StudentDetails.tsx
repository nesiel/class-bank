
import React, { useState, useMemo } from 'react';
import { Student, AppConfig, Challenge } from '../types';
import { X, Trash2, Calendar, MessageCircle, Phone, Heart, Users, GraduationCap, PlusCircle, Check, Mail, Smartphone, Home, Trophy, Filter, RotateCcw, Target, Activity, FileSpreadsheet, PieChart, List, Percent, Hash, ChevronDown, ChevronUp, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ActionStats {
  count: number;
  score: number;
}

interface SubjectStats {
  totalCount: number;
  totalScore: number;
  positiveCount: number;
  negativeCount: number;
  actions: Record<string, ActionStats>;
}

interface StudentDetailsProps {
  student: Student | null;
  config: AppConfig;
  onClose: () => void;
  onDeleteLog: (studentName: string, index: number) => void;
  onAddLog: (studentName: string, log: any) => void;
  onMarkNachat: (studentName: string) => void;
  onUpdateStudent: (student: Student) => void;
  isAuthenticated: boolean;
  filterKeyword?: string;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({ student, config, onClose, onDeleteLog, onAddLog, onMarkNachat, onUpdateStudent, isAuthenticated, filterKeyword }) => {
  const [activeTab, setActiveTab] = useState<'behavior' | 'grades'>('behavior');
  // Default to 'grouped' to show the subject breakdown first as requested
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped'); 
  const [showPercentage, setShowPercentage] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const [showAddAction, setShowAddAction] = useState(false);
  const [showChallengeSelect, setShowChallengeSelect] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  
  // State for adding action
  const [selectedAction, setSelectedAction] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customScore, setCustomScore] = useState<string>("0");

  // State for goal
  const [goalInput, setGoalInput] = useState(student?.academicGoal || "");

  if (!student) return null;

  const isSemesterMode = filterKeyword === 'SEMESTER_MODE';

  // SAFETY CHECK: Ensure logs exists
  const safeLogs = student.logs || [];

  // Filter logs if keyword is provided, but if in Semester Mode show everything (it's a historical snapshot)
  const logsWithIndex = safeLogs.map((log, index) => ({ ...log, originalIndex: index }));
  
  const displayedLogs = filterKeyword && !isSemesterMode
    ? logsWithIndex.filter(l => l.sub && l.sub.includes(filterKeyword))
    : logsWithIndex;

  const displayTotal = filterKeyword && !isSemesterMode
    ? displayedLogs.reduce((acc, l) => acc + l.s, 0)
    : student.total;

  // --- Aggregation Logic (Per Subject) ---
  const aggregatedData = useMemo<Record<string, SubjectStats>>(() => {
      const data: Record<string, SubjectStats> = {};
      
      displayedLogs.forEach(log => {
          const sub = log.sub || "כללי"; // Default subject if missing
          if (!data[sub]) {
              data[sub] = { 
                  totalCount: 0, 
                  totalScore: 0, 
                  positiveCount: 0,
                  negativeCount: 0,
                  actions: {} 
              };
          }
          
          data[sub].totalCount += log.c;
          data[sub].totalScore += log.s;
          
          if (log.s > 0) data[sub].positiveCount += log.c;
          else if (log.s < 0) data[sub].negativeCount += log.c;

          if (!data[sub].actions[log.k]) {
              data[sub].actions[log.k] = { count: 0, score: 0 };
          }
          data[sub].actions[log.k].count += log.c;
          data[sub].actions[log.k].score += log.s;
      });

      return data;
  }, [displayedLogs]);

  const toggleSubject = (subject: string) => {
      setExpandedSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  const handleWhatsApp = (phone: string, parentName: string) => {
    if (!phone) return;
    const cleanPhone = phone.startsWith('05') ? '972' + phone.substring(1) : phone;
    const message = `שלום ${parentName || 'הורה'} יקר/ה, רציתי לשתף בנחת מהכיתה! ${student.name} מתקדם/ת יפה מאוד וצובר/ת נקודות זכות על התנהגות והשקעה. כל הכבוד! 🌟`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    onMarkNachat(student.name);
  };

  const handleResetPassword = () => {
      if (window.confirm("האם לאפס את סיסמת התלמיד חזרה ל-1234?")) {
          onUpdateStudent({ ...student, password: undefined });
          alert("הסיסמה אופסה ל-1234 בהצלחה!");
      }
  };

  const handleSaveGoal = () => {
      onUpdateStudent({ ...student, academicGoal: goalInput });
      alert("היעד נשמר בהצלחה!");
  };

  const handleAwardChallenge = (challenge: Challenge) => {
      if(window.confirm(`האם לאשר ש${student.name} עמד באתגר "${challenge.title}"?`)) {
          onAddLog(student.name, {
              sub: "אתגר כיתתי",
              teach: "מחנך/ת",
              k: `עמד באתגר: ${challenge.title}`,
              c: 1,
              s: challenge.reward,
              d: new Date().toLocaleDateString('he-IL')
          });
          setShowChallengeSelect(false);
      }
  };

  const handleSubmitAction = () => {
    let reason = "";
    let score = 0;

    if (isManualInput) {
      if (!customReason) return alert("יש להזין סיבה");
      reason = customReason;
      score = parseInt(customScore) || 0;
    } else {
      if (!selectedAction) return alert("יש לבחור פעולה");
      reason = selectedAction;
      score = config.actionScores[selectedAction] || 0;
    }

    onAddLog(student.name, {
      sub: "ידני",
      teach: "מחנך/ת",
      k: reason,
      c: 1,
      s: score,
      d: new Date().toLocaleDateString('he-IL')
    });

    // Reset form
    setShowAddAction(false);
    setIsManualInput(false);
    setSelectedAction("");
    setCustomReason("");
    setCustomScore("0");
  };

  // Grade Calculations
  const safeGrades = student.grades || [];
  const average = safeGrades.length > 0 
    ? Math.round(safeGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / safeGrades.length) 
    : 0;

  const getScoreColor = (score: number) => {
      if (score >= 90) return 'bg-green-500';
      if (score >= 75) return 'bg-yellow-500';
      if (score >= 55) return 'bg-orange-500';
      return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
      if (score >= 90) return 'text-green-500';
      if (score >= 75) return 'text-yellow-500';
      if (score >= 55) return 'text-orange-500';
      return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg max-h-[90vh] rounded-[2.5rem] border-2 border-accent/40 shadow-2xl flex flex-col overflow-hidden relative">
        
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-accent">{student.name}</h2>
            <div className="flex flex-col gap-1 mt-1">
                <p className="text-accent/50 text-xs italic flex items-center gap-1">
                   {isSemesterMode ? (
                       <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                           <Trophy size={10} /> נתוני מצטייני מחצית (ארכיון)
                       </span>
                   ) : filterKeyword ? (
                       <span className="bg-accent/20 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                           <Filter size={10} /> נתוני תפילה בלבד
                       </span>
                   ) : (
                       isAuthenticated ? "מאזן אישי בבנק הכיתתי" : "אזור אישי: ציונים ונקודות"
                   )}
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-accent">
            <X size={24} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!filterKeyword && (
            <div className="flex px-6 gap-2 mb-2">
                <button 
                    onClick={() => setActiveTab('behavior')} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'behavior' ? 'bg-accent text-accent-fg' : 'bg-white/5 text-gray-400'}`}
                >
                    <Heart size={14} className="inline mr-1"/> התנהגות
                </button>
                <button 
                    onClick={() => setActiveTab('grades')} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'grades' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}
                >
                    <FileSpreadsheet size={14} className="inline mr-1"/> ציונים ויעדים
                </button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Admin Tools */}
          {isAuthenticated && activeTab === 'behavior' && !filterKeyword && !isSemesterMode && (
              <div className="flex gap-2">
                  {student.isHiddenFromPodium ? (
                    <button 
                        onClick={() => {
                            onUpdateStudent({...student, isHiddenFromPodium: false});
                            onClose();
                        }}
                        className="flex-1 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition text-xs"
                    >
                        <Trophy size={16} /> החזר לפודיום
                    </button>
                  ) : null}
                  
                  <button 
                    onClick={handleResetPassword}
                    className="flex-1 py-3 bg-red-600/10 text-red-400 border border-red-500/20 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition text-xs hover:bg-red-600/20"
                  >
                      <RotateCcw size={16} /> אפס סיסמה (1234)
                  </button>
              </div>
          )}

          {/* Quick Actions */}
          {isAuthenticated && activeTab === 'behavior' && !filterKeyword && !isSemesterMode && (
            <div className="bg-accent/5 p-4 rounded-3xl border border-accent/20">
               {!showAddAction && !showChallengeSelect ? (
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setShowAddAction(true)}
                        className="flex-[2] py-3 bg-accent text-accent-fg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-95"
                     >
                        <PlusCircle size={18} /> הוסף פעולה ידנית
                     </button>
                     <button 
                        onClick={() => setShowChallengeSelect(true)}
                        className="flex-1 py-3 bg-orange-500/20 text-orange-500 border border-orange-500/30 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-orange-500/30 transition active:scale-95 text-xs"
                     >
                        <Target size={18} /> אתגר
                     </button>
                 </div>
               ) : showChallengeSelect ? (
                   <div className="space-y-3 animate-in slide-in-from-top-2">
                       <h4 className="text-sm font-bold text-orange-500 mb-2">בחר אתגר שהושלם:</h4>
                       <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                           {(config.challenges || []).length === 0 && <p className="text-gray-500 text-xs">אין אתגרים פעילים</p>}
                           {(config.challenges || []).map(c => (
                               <button 
                                key={c.id} 
                                onClick={() => handleAwardChallenge(c)}
                                className="text-right p-3 bg-black/20 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 rounded-xl flex justify-between items-center group transition"
                               >
                                   <span className="text-xs font-bold text-white group-hover:text-orange-400">{c.title}</span>
                                   <span className="text-xs font-black text-orange-500">+{c.reward}</span>
                               </button>
                           ))}
                       </div>
                       <button onClick={() => setShowChallengeSelect(false)} className="w-full py-2 bg-white/5 text-gray-400 rounded-xl text-xs font-bold mt-2">ביטול</button>
                   </div>
               ) : (
                 <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                       <button 
                          onClick={() => setIsManualInput(false)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${!isManualInput ? 'bg-accent text-accent-fg border-accent' : 'bg-transparent text-gray-400 border-white/10'}`}
                       >
                          רשימה קיימת
                       </button>
                       <button 
                          onClick={() => setIsManualInput(true)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${isManualInput ? 'bg-accent text-accent-fg border-accent' : 'bg-transparent text-gray-400 border-white/10'}`}
                       >
                          הקלדה חופשית
                       </button>
                    </div>

                    {!isManualInput ? (
                        <select 
                          className="w-full bg-black/10 border border-accent/30 text-txt p-3 rounded-xl outline-none text-sm"
                          value={selectedAction}
                          onChange={(e) => setSelectedAction(e.target.value)}
                        >
                          <option value="">בחר התנהגות...</option>
                          {Object.entries(config.actionScores).map(([action, score]) => (
                             <option key={action} value={action}>{action} ({(score as number) > 0 ? '+' : ''}{score})</option>
                          ))}
                        </select>
                    ) : (
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              placeholder="תיאור הפעולה..." 
                              className="flex-[2] bg-black/10 border border-accent/30 text-txt p-3 rounded-xl outline-none text-sm"
                              value={customReason}
                              onChange={(e) => setCustomReason(e.target.value)}
                           />
                           <input 
                              type="number" 
                              placeholder="ניקוד" 
                              className="flex-1 bg-black/10 border border-accent/30 text-txt p-3 rounded-xl outline-none text-sm text-center"
                              value={customScore}
                              onChange={(e) => setCustomScore(e.target.value)}
                           />
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                       <button onClick={() => setShowAddAction(false)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-xl text-xs font-bold">ביטול</button>
                       <button onClick={handleSubmitAction} className="flex-[2] py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2">
                          <Check size={14}/> אשר הוספה
                       </button>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* Grades View */}
          {activeTab === 'grades' && (
              <div className="space-y-4 animate-in fade-in">
                  <div className="bg-black/20 p-4 rounded-3xl border border-blue-500/20">
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                              <Activity className="text-blue-400" size={20} />
                              <h3 className="font-bold text-white">{isAuthenticated ? "הישגים לימודיים" : "הציונים שלי"}</h3>
                          </div>
                          <div className="text-center">
                              <span className="text-[10px] text-gray-400 block">ממוצע כולל</span>
                              <span className={`text-2xl font-black ${getScoreTextColor(average)}`}>{average}</span>
                          </div>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {(!safeGrades || safeGrades.length === 0) && <p className="text-gray-500 text-xs text-center">לא הוזנו ציונים</p>}
                          {safeGrades.map((g, i) => (
                              <div key={i} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold">
                                      <span className="text-gray-300">{g.subject}</span>
                                      <span className={getScoreTextColor(Number(g.score))}>{g.score}</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${getScoreColor(Number(g.score))}`} 
                                        style={{ width: `${Math.min(100, Math.max(0, Number(g.score)))}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Goal Setting */}
                  <div className="bg-orange-500/10 p-4 rounded-3xl border border-orange-500/20">
                      <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
                          <Target size={16}/> {isAuthenticated ? "יעד לימודי אישי" : "היעד הבא שלי"}
                      </h4>
                      {isAuthenticated ? (
                          <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                placeholder="לדוגמה: שיפור ציון בחשבון ל-85..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                              />
                              <button onClick={handleSaveGoal} className="bg-orange-500 text-white font-bold px-4 rounded-xl text-xs shadow-lg active:scale-95">שמור</button>
                          </div>
                      ) : (
                          <div className="flex flex-col gap-2">
                              <p className="text-sm text-gray-300 italic bg-black/20 p-3 rounded-xl border border-white/5">
                                  "{student.academicGoal || "טרם נקבע יעד. פנה למורה לקביעת יעד אישי!"}"
                              </p>
                              {student.academicGoal && (
                                  <div className="flex items-center gap-2 text-[10px] text-orange-400/70">
                                      <Check size={12}/> בהצלחה! אני מאמין בך!
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Behavior Content */}
          {activeTab === 'behavior' && (
            <>
                {/* Parents Section - ONLY FOR TEACHER */}
                {isAuthenticated && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mr-1">
                        <Users size={12}/> אנשי קשר ודיווחי נחת
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {student.phoneMother && (
                                <button onClick={() => handleWhatsApp(student.phoneMother!, student.nameMother || 'אמא')} className="bg-pink-500/10 border border-pink-500/30 p-2 rounded-xl flex items-center justify-center gap-2 text-pink-400 hover:bg-pink-500/20">
                                    <MessageCircle size={14}/> אמא
                                </button>
                            )}
                            {student.phoneFather && (
                                <button onClick={() => handleWhatsApp(student.phoneFather!, student.nameFather || 'אבא')} className="bg-blue-500/10 border border-blue-500/30 p-2 rounded-xl flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-500/20">
                                    <MessageCircle size={14}/> אבא
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Activity Logs */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mr-1">
                        <Calendar size={12}/> {viewMode === 'grouped' ? 'סיכום לפי מקצועות' : 'רשימת פעולות'}
                        </h3>
                        
                        {/* View Toggle */}
                        <div className="flex bg-white/5 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-accent text-accent-fg' : 'text-gray-400'}`}
                                title="רשימה מלאה"
                            >
                                <List size={14} />
                            </button>
                            <button 
                                onClick={() => setViewMode('grouped')}
                                className={`p-1.5 rounded-md transition ${viewMode === 'grouped' ? 'bg-accent text-accent-fg' : 'text-gray-400'}`}
                                title="סיכום לפי מקצוע"
                            >
                                <PieChart size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                    {displayedLogs.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xs">
                            {filterKeyword && !isSemesterMode ? "לא נמצאו נתונים תואמים לסינון" : "טרם נרשמו פעולות"}
                        </div>
                    ) : viewMode === 'grouped' ? (
                        // --- GROUPED VIEW (IMPROVED) ---
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <button 
                                    onClick={() => setShowPercentage(!showPercentage)}
                                    className="text-[10px] flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-gray-400 hover:text-white transition"
                                >
                                    {showPercentage ? <Hash size={10}/> : <Percent size={10}/>}
                                    {showPercentage ? "הצג מספרים" : "הצג אחוזים"}
                                </button>
                            </div>

                            {(Object.entries(aggregatedData) as [string, SubjectStats][]).sort((a,b) => b[1].totalScore - a[1].totalScore).map(([subject, data]) => {
                                // Determine Subject Status Color
                                let statusColor = 'border-gray-500 bg-gray-500/5';
                                let textColor = 'text-gray-400';
                                if (data.totalScore > 0) {
                                    statusColor = 'border-green-500 bg-green-500/10';
                                    textColor = 'text-green-500';
                                } else if (data.totalScore < 0) {
                                    statusColor = 'border-red-500 bg-red-500/10';
                                    textColor = 'text-red-500';
                                }

                                // Calculate Health Bar Width
                                const totalEvents = data.positiveCount + data.negativeCount;
                                const posWidth = totalEvents > 0 ? (data.positiveCount / totalEvents) * 100 : 0;

                                return (
                                    <div key={subject} className={`rounded-xl border-r-4 ${statusColor} overflow-hidden bg-black/20`}>
                                        <button 
                                            onClick={() => toggleSubject(subject)}
                                            className="w-full p-4 flex flex-col gap-2 hover:bg-white/5 transition"
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap size={18} className={textColor}/>
                                                    <span className="font-bold text-base text-white">{subject}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-lg font-black ${textColor} bg-black/20 px-2 py-0.5 rounded-lg`}>
                                                        {data.totalScore > 0 ? '+' : ''}{data.totalScore}
                                                    </span>
                                                    {expandedSubjects[subject] ? <ChevronUp size={16} className="text-gray-500"/> : <ChevronDown size={16} className="text-gray-500"/>}
                                                </div>
                                            </div>
                                            
                                            {/* Health Bar */}
                                            <div className="w-full h-1.5 bg-red-500/30 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-green-500" style={{width: `${posWidth}%`}}></div>
                                            </div>
                                            <div className="flex justify-between text-[9px] text-gray-500 px-1">
                                                <span className="flex items-center gap-1 text-green-400"><ThumbsUp size={8}/> {data.positiveCount}</span>
                                                <span className="flex items-center gap-1 text-red-400"><ThumbsDown size={8}/> {data.negativeCount}</span>
                                            </div>
                                        </button>
                                        
                                        {expandedSubjects[subject] && (
                                            <div className="p-3 border-t border-white/5 bg-black/10 space-y-2 animate-in slide-in-from-top-1">
                                                {(Object.entries(data.actions) as [string, ActionStats][]).sort((a,b) => b[1].count - a[1].count).map(([action, stats]) => {
                                                    const percentage = Math.round((stats.count / data.totalCount) * 100);
                                                    return (
                                                        <div key={action} className="flex justify-between items-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs">
                                                            <span className="text-gray-300 font-medium">{action}</span>
                                                            <div className="flex items-center gap-3">
                                                                {showPercentage ? (
                                                                    <span className="text-[10px] font-mono text-gray-500">{percentage}%</span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">
                                                                        x{stats.count}
                                                                    </span>
                                                                )}
                                                                <span className={`w-8 text-right font-bold ${stats.score >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {stats.score > 0 ? '+' : ''}{stats.score}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // --- LIST VIEW ---
                        displayedLogs.slice().reverse().map((logItem, idx) => (
                        <div key={idx} className="bg-black/10 p-4 rounded-2xl border border-border flex justify-between items-start">
                            <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${logItem.s >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {logItem.c} פעמים
                                </span>
                                <p className={`font-bold text-sm ${logItem.s >= 0 ? 'text-green-500' : 'text-red-500'}`}>{logItem.k}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mt-2">
                                <span className="bg-white/5 px-2 py-0.5 rounded flex items-center gap-1"><GraduationCap size={10}/> {logItem.sub}</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded flex items-center gap-1"><Users size={10}/> {logItem.teach}</span>
                                <span className="text-gray-600">{logItem.d}</span>
                            </div>
                            </div>
                            <div className="text-left">
                            <p className={`font-black text-lg ${logItem.s >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {logItem.s > 0 ? '+' : ''}{logItem.s}₪
                            </p>
                            {isAuthenticated && !isSemesterMode && (
                                <button onClick={() => onDeleteLog(student.name, logItem.originalIndex)} className="text-red-500/30 hover:text-red-500 transition-colors mt-2">
                                <Trash2 size={12}/>
                                </button>
                            )}
                            </div>
                        </div>
                        ))
                    )}
                    </div>
                </div>
            </>
          )}
        </div>

        <div className="p-6 bg-primary border-t border-accent/20 flex justify-between items-center">
          <div className="flex items-center gap-2 text-accent/60">
            <Heart size={16} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">{isSemesterMode ? "ציון מחצית כולל" : filterKeyword ? "מאזן תפילה" : isAuthenticated ? "סך הכל עושר כיתתי" : "המאזן שלי"}</span>
          </div>
          <span className="text-3xl font-black text-accent">{displayTotal}₪</span>
        </div>
      </div>
    </div>
  );
};
