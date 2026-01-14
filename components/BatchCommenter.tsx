
import React, { useState, useEffect } from 'react';
import { Student, Database, GradeEntry } from '../types';
import { X, ChevronLeft, ChevronRight, Wand2, Save, FileSpreadsheet, Loader2, Sparkles, GraduationCap, AlertCircle, Plus, Trash2, BookOpen } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { exportCommentsToExcel } from '../utils';

interface BatchCommenterProps {
  db: Database;
  onSave: (updatedDb: Database) => void;
  onClose: () => void;
}

export const BatchCommenter: React.FC<BatchCommenterProps> = ({ db, onSave, onClose }) => {
  const students = (Object.values(db) as Student[]).sort((a, b) => a.name.localeCompare(b.name));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localDb, setLocalDb] = useState<Database>({ ...db });
  const [isGenerating, setIsGenerating] = useState(false);

  const currentStudent = students[currentIndex];
  
  const updateStudentData = (field: keyof Student, value: any) => {
    if (!currentStudent) return;
    const updated = { ...localDb };
    updated[currentStudent.name] = { ...updated[currentStudent.name], [field]: value };
    setLocalDb(updated);
  };

  const addGradeRow = () => {
    const currentGrades = localDb[currentStudent.name]?.grades || [];
    updateStudentData('grades', [...currentGrades, { subject: '', score: '' }]);
  };

  const updateGradeRow = (index: number, field: keyof GradeEntry, value: string) => {
    const currentGrades = [...(localDb[currentStudent.name]?.grades || [])];
    currentGrades[index] = { ...currentGrades[index], [field]: value };
    updateStudentData('grades', currentGrades);
  };

  const removeGradeRow = (index: number) => {
    const currentGrades = [...(localDb[currentStudent.name]?.grades || [])];
    currentGrades.splice(index, 1);
    updateStudentData('grades', currentGrades);
  };

  const generateAIComment = async () => {
    if (!currentStudent) return;
    setIsGenerating(true);
    try {
      // Fix: Strictly follow Gemini API initialization rules
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const positiveBehaviors = currentStudent.logs
        .filter(l => l.s > 0)
        .map(l => l.k)
        .join(", ");

      const gradesList = (localDb[currentStudent.name]?.grades || [])
        .map(g => `${g.subject}: ${g.score}`)
        .join(", ");
      
      const prompt = `אתה עוזר הוראה מקצועי במערכת חינוך. כתוב הערה חמה, אישית וחיובית לתעודה עבור התלמיד/ה ${currentStudent.name}.
      
      נתונים לניתוח:
      - התנהגות חברתית והשקעה (מבנק הנקודות): ${positiveBehaviors || "התנהגות טובה ונעימה"}
      - הישגים לימודיים (ציונים): ${gradesList || "לא הוזנו ציונים ספציפיים"}
      - דגשים נוספים: ${currentStudent.academicReinforcement || "אין"}
      
      הנחיות לכתיבה:
      1. פתח בציון החוזקות האישיות והחברתיות שעלו מהבנק הכיתתי.
      2. שלב את ההישגים הלימודיים בתוך הטקסט (אל תציג כרשימה).
      3. אם יש ציון נמוך או נושא לחיזוק, הצג אותו כיעד לעתיד ("בסמסטר הבא נשאף לחזק את...") ולא ככישלון.
      4. השתמש בנוסח מעצים, חם ומקצועי.
      5. המנע ממילים שליליות. התמקד בצמיחה ומבט קדימה.
      6. אורך: 4-5 משפטים בעברית רהוטה.
      7. פנה לתלמיד בגוף שלישי.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      // Fix: Access response.text directly (it's a getter, not a method)
      const text = response.text || "";
      updateStudentData('certificateComment', text.trim());
    } catch (error) {
      console.error(error);
      alert("שגיאה בייצור ההערה. ודא שהגדרת מפתח API ושאתה מחובר לאינטרנט.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinish = () => {
    onSave(localDb);
    onClose();
  };

  if (!currentStudent) return null;

  const progress = Math.round(((currentIndex + 1) / students.length) * 100);

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a0f0d] flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="bg-[#2d1b15] p-4 border-b border-[#d4af37]/30 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#d4af37]/20 rounded-lg text-[#d4af37]">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="font-bold text-[#d4af37]">כתיבת הערות לתעודה</h2>
            <p className="text-[10px] text-gray-400">תלמיד {currentIndex + 1} מתוך {students.length}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
          <X size={24} />
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-black/50">
        <div 
          className="h-full bg-gradient-to-r from-[#d4af37] to-yellow-500 transition-all duration-500 shadow-[0_0_10px_#d4af37]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-6">
          
          <div className="bg-black/30 border border-[#d4af37]/20 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <h1 className="text-3xl font-bold text-[#d4af37] text-center mb-6">{currentStudent.name}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Behavior Section */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Sparkles size={12} className="text-[#d4af37]"/> חוזקות מהבנק
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentStudent.logs.filter(l => l.s > 0).slice(0, 8).map((l, i) => (
                      <span key={i} className="text-[10px] bg-[#d4af37]/10 text-[#d4af37] px-2 py-1 rounded-full border border-[#d4af37]/20">
                        {l.k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <AlertCircle size={12} className="text-blue-400"/> דגשים נוספים
                  </h4>
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-blue-400 outline-none transition resize-none h-20"
                    placeholder="הערות אישיות למורה..."
                    value={localDb[currentStudent.name]?.academicReinforcement || ""}
                    onChange={(e) => updateStudentData('academicReinforcement', e.target.value)}
                  />
                </div>
              </div>

              {/* Grades Table Section */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <BookOpen size={12} className="text-green-400"/> הישגים לימודיים
                  </h4>
                  <button 
                    onClick={addGradeRow}
                    className="p-1 hover:bg-white/10 text-green-400 rounded-lg transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {(localDb[currentStudent.name]?.grades || []).map((grade, idx) => (
                    <div key={idx} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none focus:border-green-400"
                        placeholder="מקצוע"
                        value={grade.subject}
                        onChange={(e) => updateGradeRow(idx, 'subject', e.target.value)}
                      />
                      <input 
                        className="w-16 bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none focus:border-green-400 text-center"
                        placeholder="ציון"
                        value={grade.score}
                        onChange={(e) => updateGradeRow(idx, 'score', e.target.value)}
                      />
                      <button 
                        onClick={() => removeGradeRow(idx)}
                        className="p-2 text-red-500/50 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(localDb[currentStudent.name]?.grades || []).length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-[10px] text-gray-600 italic">
                      לחץ על הפלוס להוספת ציונים
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comment Editor */}
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <label className="text-sm font-bold text-[#d4af37]">הערה סופית לתעודה:</label>
              <button 
                onClick={generateAIComment}
                disabled={isGenerating}
                className="bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] text-xs px-3 py-1.5 rounded-full border border-[#d4af37]/30 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                <span>ייצר הערה משולבת</span>
              </button>
            </div>
            
            <div className="relative group">
               <textarea 
                className="w-full h-56 bg-black/40 border-2 border-[#d4af37]/30 rounded-2xl p-4 text-white text-lg focus:border-[#d4af37] outline-none transition shadow-inner leading-relaxed"
                placeholder="ההערה תופיע כאן..."
                value={localDb[currentStudent.name]?.certificateComment || ""}
                onChange={(e) => updateStudentData('certificateComment', e.target.value)}
              />
              <div className="absolute top-4 left-4 opacity-10 pointer-events-none group-focus-within:opacity-5 transition">
                <Sparkles size={80} className="text-[#d4af37]" />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-[#2d1b15] p-6 border-t border-[#d4af37]/30 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 md:flex-none p-3 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 transition"
          >
            <ChevronRight size={24} />
          </button>
          
          {currentIndex === students.length - 1 ? (
             <button 
                onClick={handleFinish}
                className="flex-1 md:w-48 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
             >
               <Save size={20} /> שמירה וסיום
             </button>
          ) : (
            <button 
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex-1 md:w-48 bg-[#d4af37] hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              הבא <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <button 
          onClick={() => exportCommentsToExcel(localDb)}
          className="text-xs text-[#d4af37]/70 hover:text-[#d4af37] flex items-center gap-2 p-2"
        >
          <FileSpreadsheet size={16} /> ייצוא מרכז לאקסל
        </button>
      </footer>
    </div>
  );
};
