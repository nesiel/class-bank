import React from 'react';
import { Student } from '../types';
import { Trophy, MessageCircle } from 'lucide-react';

interface PodiumProps {
  students: Student[];
  onRemoveStudent: (name: string) => void;
}

export const Podium: React.FC<PodiumProps> = ({ students, onRemoveStudent }) => {
  const first = students[0];
  const second = students[1];
  const third = students[2];

  const handleWhatsApp = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    const phone = student.phoneMother || student.phoneFather;
    if (!phone) {
      alert("לא נמצא מס' טלפון להורים");
      return;
    }
    const cleanPhone = phone.startsWith('05') ? '972' + phone.substring(1) : phone;
    const message = `שמח להודיע כי בנכם ${student.name} מצטיין שבועי! יישר כוח על התמדתו והתנהגותו השבוע. עלה והצלח! 🏆`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!first) return null;

  return (
    <div className="flex justify-center items-end h-64 gap-3 mb-4 px-4 pt-12">
      {/* 2nd Place */}
      <div className="flex flex-col items-center w-1/3 z-10">
        {second && (
          <>
            <div className="mb-2 text-center relative w-full flex justify-center z-50">
               <div 
                  className="relative bg-card/80 p-1.5 rounded-xl border border-border flex flex-col items-center min-w-[80px] cursor-pointer active:scale-95 active:bg-red-500/10 active:border-red-500/30 transition-all group shadow-lg"
                  onClick={() => onRemoveStudent(second.name)}
               >
                  <span className="text-xs font-bold block text-txt/70 truncate w-20 text-center group-hover:text-red-400 transition-colors">{second.name}</span>
                  <span className="text-sm font-bold text-accent group-hover:text-red-300 transition-colors">{second.total}₪</span>

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
                className="relative bg-card/80 p-2 rounded-xl border border-border flex flex-col items-center min-w-[90px] cursor-pointer active:scale-95 active:bg-red-500/10 active:border-red-500/30 transition-all group shadow-xl"
                onClick={() => onRemoveStudent(first.name)}
            >
                <Trophy className="w-8 h-8 text-yellow-500 mb-1 drop-shadow-md group-hover:text-red-400 transition-colors" />
                <span className="text-sm font-bold block text-txt truncate w-24 text-center group-hover:text-red-400 transition-colors">{first.name}</span>
                <span className="text-lg font-bold text-accent drop-shadow-sm group-hover:text-red-300 transition-colors">{first.total}₪</span>

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
                    className="relative bg-card/80 p-1.5 rounded-xl border border-border flex flex-col items-center min-w-[80px] cursor-pointer active:scale-95 active:bg-red-500/10 active:border-red-500/30 transition-all group shadow-lg"
                    onClick={() => onRemoveStudent(third.name)}
                >
                    <span className="text-xs font-bold block text-txt/70 truncate w-20 text-center group-hover:text-red-400 transition-colors">{third.name}</span>
                    <span className="text-sm font-bold text-accent group-hover:text-red-300 transition-colors">{third.total}₪</span>

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
  );
};