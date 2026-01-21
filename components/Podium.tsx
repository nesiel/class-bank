
import React from 'react';
import { Student } from '../types';
import { Trophy, MessageCircle, User, X } from 'lucide-react';

interface PodiumProps {
  students: Student[];
  onRemoveStudent: (name: string) => void;
  onStudentClick: (student: Student) => void;
}

export const Podium: React.FC<PodiumProps> = ({ students, onRemoveStudent, onStudentClick }) => {
  const first = students[0];
  const second = students[1];
  const third = students[2];
  const rest = students.slice(3);

  const handleWhatsApp = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    const phone = student.phoneMother || student.phoneFather;
    if (!phone) {
      alert("לא נמצא מס' טלפון להורים");
      return;
    }
    const cleanPhone = phone.startsWith('05') ? '972' + phone.substring(1) : phone;
    const message = `שמח להודיע כי בנכם ${student.name} מצטיין! יישר כוח על התמדתו והתנהגותו. עלה והצלח! 🏆`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!first) return null;

  return (
    <div className="flex flex-col w-full">
        {/* Top 3 Podium */}
        <div className="flex justify-center items-end h-64 gap-3 mb-6 px-4 pt-12">
        {/* 2nd Place */}
        <div className="flex flex-col items-center w-1/3 z-10">
            {second && (
            <>
                <div className="mb-2 text-center relative w-full flex justify-center z-50">
                <div 
                    className="relative bg-card/80 p-1.5 rounded-xl border border-border flex flex-col items-center min-w-[80px] cursor-pointer active:scale-95 active:bg-white/10 transition-all group shadow-lg"
                    onClick={() => onStudentClick(second)}
                >
                    {/* Remove Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveStudent(second.name); }}
                        className="absolute -left-2 -top-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-30 opacity-0 group-hover:opacity-100"
                        title="הסר מהפודיום"
                    >
                        <X size={10} />
                    </button>

                    <span className="text-xs font-bold block text-txt/70 truncate w-20 text-center group-hover:text-accent transition-colors">{second.name}</span>
                    <span className="text-sm font-bold text-accent">{second.total}₪</span>

                    {/* WhatsApp */}
                    <button 
                        onClick={(e) => handleWhatsApp(e, second)}
                        className="absolute -right-3 -top-3 bg-green-500/20 text-green-500 p-1.5 rounded-full hover:bg-green-500 hover:text-white transition-colors border border-green-500/30 shadow-lg z-20"
                        title="שלח הודעת הצטיינות"
                    >
                    <MessageCircle size={14} />
                    </button>
                </div>
                </div>
                <div className="w-full bg-gray-400 h-24 rounded-t-lg shadow-lg flex items-center justify-center border-t-2 border-gray-300">
                <span className="text-2xl font-bold text-gray-800">2</span>
                </div>
            </>
            )}
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center w-1/3 z-20 -mx-2">
            <div className="mb-2 text-center flex flex-col items-center animate-bounce relative w-full z-50">
                <div 
                    className="relative bg-card/80 p-2 rounded-xl border border-border flex flex-col items-center min-w-[90px] cursor-pointer active:scale-95 active:bg-white/10 transition-all group shadow-xl"
                    onClick={() => onStudentClick(first)}
                >
                    {/* Remove Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveStudent(first.name); }}
                        className="absolute -left-2 -top-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-30 opacity-0 group-hover:opacity-100"
                        title="הסר מהפודיום"
                    >
                        <X size={12} />
                    </button>

                    <Trophy className="w-8 h-8 text-yellow-500 mb-1 drop-shadow-md group-hover:text-accent transition-colors" />
                    <span className="text-sm font-bold block text-txt truncate w-24 text-center group-hover:text-accent transition-colors">{first.name}</span>
                    <span className="text-lg font-bold text-accent drop-shadow-sm">{first.total}₪</span>

                    {/* WhatsApp */}
                    <button 
                        onClick={(e) => handleWhatsApp(e, first)}
                        className="absolute -right-3 -top-3 bg-green-500/20 text-green-500 p-1.5 rounded-full hover:bg-green-500 hover:text-white transition-colors border border-green-500/30 shadow-lg z-20"
                        title="שלח הודעת הצטיינות"
                    >
                        <MessageCircle size={16} />
                    </button>
                </div>
            </div>
            <div className="w-full bg-yellow-500 h-36 rounded-t-lg shadow-lg flex items-center justify-center border-t-4 border-yellow-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                <span className="text-5xl font-bold text-yellow-900 relative z-10">1</span>
            </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center w-1/3 z-10">
            {third && (
            <>
                <div className="mb-2 text-center relative w-full flex justify-center z-50">
                    <div 
                        className="relative bg-card/80 p-1.5 rounded-xl border border-border flex flex-col items-center min-w-[80px] cursor-pointer active:scale-95 active:bg-white/10 transition-all group shadow-lg"
                        onClick={() => onStudentClick(third)}
                    >
                        {/* Remove Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveStudent(third.name); }}
                            className="absolute -left-2 -top-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-30 opacity-0 group-hover:opacity-100"
                            title="הסר מהפודיום"
                        >
                            <X size={10} />
                        </button>

                        <span className="text-xs font-bold block text-txt/70 truncate w-20 text-center group-hover:text-accent transition-colors">{third.name}</span>
                        <span className="text-sm font-bold text-accent">{third.total}₪</span>

                        {/* WhatsApp */}
                        <button 
                        onClick={(e) => handleWhatsApp(e, third)}
                        className="absolute -right-3 -top-3 bg-green-500/20 text-green-500 p-1.5 rounded-full hover:bg-green-500 hover:text-white transition-colors border border-green-500/30 shadow-lg z-20"
                        title="שלח הודעת הצטיינות"
                    >
                        <MessageCircle size={14} />
                    </button>
                    </div>
                </div>
                <div className="w-full bg-orange-700 h-16 rounded-t-lg shadow-lg flex items-center justify-center border-t-2 border-orange-600">
                    <span className="text-2xl font-bold text-orange-200">3</span>
                </div>
            </>
            )}
        </div>
        </div>

        {/* Rest of the list (4th place onwards) */}
        {rest.length > 0 && (
            <div className="bg-black/20 rounded-2xl p-2 border border-white/5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar mb-4">
                {rest.map((student, index) => (
                    <div 
                        key={student.name} 
                        onClick={() => onStudentClick(student)}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-bold text-gray-500">
                                {index + 4}
                            </span>
                            <span className="text-xs font-bold text-white">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-accent/70">{student.total}₪</span>
                            <button 
                                onClick={(e) => handleWhatsApp(e, student)}
                                className="p-1.5 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                            >
                                <MessageCircle size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
