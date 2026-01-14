import React, { useState } from 'react';
import { Student } from '../types';
import { User, RefreshCw, XCircle, Users, List, Copy, Loader2, Info, Printer, ArrowRightLeft, Move, X } from 'lucide-react';

interface SeatingChartProps {
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onBatchUpdate: (students: Student[]) => void;
}

export const SeatingChart: React.FC<SeatingChartProps> = ({ students, onUpdateStudent, onBatchUpdate }) => {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  
  // State for Drag & Drop / Swap Logic
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [dragOverSeatId, setDragOverSeatId] = useState<string | null>(null);

  // Define Classroom Structure
  // 4 Columns. All have 4 rows now.
  const columns = [
    { id: 1, rows: 4 },
    { id: 2, rows: 4 },
    { id: 3, rows: 4 },
    { id: 4, rows: 4 }, 
  ];

  const getStudentInSeat = (seatId: string) => students.find(s => s.seatId === seatId);
  const getUnseatedStudents = () => students.filter(s => !s.seatId);

  // Stats
  const totalStudents = students.length;
  const seatedStudents = students.filter(s => s.seatId).length;

  // --- Logic for Swapping/Moving ---
  const performSwap = (sourceSeatId: string, targetSeatId: string) => {
    if (sourceSeatId === targetSeatId) return;

    const sourceStudent = getStudentInSeat(sourceSeatId);
    const targetStudent = getStudentInSeat(targetSeatId);

    if (!sourceStudent) return; // Should not happen based on logic

    const updates: Student[] = [];

    // Move source to target
    updates.push({ ...sourceStudent, seatId: targetSeatId });

    // If target has a student, move them to source (Swap)
    if (targetStudent) {
        updates.push({ ...targetStudent, seatId: sourceSeatId });
    }

    onBatchUpdate(updates);
  };

  // --- Interaction Handlers ---

  const handleSeatClick = (seatId: string) => {
    // Mode 1: Completing a Move/Swap (Source already selected)
    if (swapSourceId) {
        if (swapSourceId === seatId) {
            // Clicked same seat -> Deselect (allow removal logic next click)
            setSwapSourceId(null);
            
            // Optional: If user wants to remove, we can do it here or require a long press / second click
            const occupant = getStudentInSeat(seatId);
            if (occupant && window.confirm(`לבטל את הבחירה ב-${occupant.name}? \n(לחץ אישור כדי להסיר מהכיסא, ביטול כדי פשוט לבטל סימון)`)) {
                 onUpdateStudent({ ...occupant, seatId: undefined });
            }
        } else {
            // Perform Swap
            performSwap(swapSourceId, seatId);
            setSwapSourceId(null);
        }
        return;
    }

    // Mode 2: Selecting a Source or Adding New
    const occupant = getStudentInSeat(seatId);
    if (occupant) {
        // Select for potential move
        setSwapSourceId(seatId);
    } else {
        // Empty seat -> Open modal to add
        setSelectedSeat(seatId);
    }
  };

  // --- HTML5 Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, seatId: string) => {
    const student = getStudentInSeat(seatId);
    if (!student) {
        e.preventDefault();
        return;
    }
    setSwapSourceId(seatId); // Visually select
    e.dataTransfer.setData("text/plain", seatId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, seatId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
    if (dragOverSeatId !== seatId) {
        setDragOverSeatId(seatId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverSeatId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSeatId: string) => {
    e.preventDefault();
    setDragOverSeatId(null);
    setSwapSourceId(null);
    
    const sourceSeatId = e.dataTransfer.getData("text/plain");
    if (sourceSeatId) {
        performSwap(sourceSeatId, targetSeatId);
    }
  };

  const assignStudent = (student: Student) => {
    if (!selectedSeat) return;
    onUpdateStudent({ ...student, seatId: selectedSeat });
    setSelectedSeat(null);
  };

  const randomizeSeating = async () => {
    if (students.length === 0) {
      alert("לא נמצאו תלמידים ברשימה. אנא ודא שטענת את קובץ הכיתה או הוספת תלמידים.");
      return;
    }

    setIsShuffling(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const allSeats: string[] = [];
      columns.forEach(col => {
        for (let r = 0; r < col.rows; r++) {
          allSeats.push(`c${col.id}-r${r}-0`); // ימין
          allSeats.push(`c${col.id}-r${r}-1`); // שמאל
        }
      });

      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

      const updates = shuffledStudents.map((student, index) => {
        const seatId = index < allSeats.length ? allSeats[index] : undefined;
        return { ...student, seatId };
      });

      onBatchUpdate(updates);

    } catch (error) {
      console.error("Error during shuffle:", error);
      alert("אירעה שגיאה במהלך ההגרלה");
    } finally {
      setTimeout(() => setIsShuffling(false), 800);
    }
  };

  const clearAllSeats = () => {
    if (!window.confirm("לנקות את כל הלוח?")) return;
    const cleared = students.map(s => ({ ...s, seatId: undefined }));
    onBatchUpdate(cleared);
  };

  const copyListToClipboard = () => {
    let text = "סידור ישיבה כיתתי:\n\n";
    columns.forEach(col => {
      text += `--- טור ${col.id} ---\n`;
      for (let r = 0; r < col.rows; r++) {
        const sRight = getStudentInSeat(`c${col.id}-r${r}-0`);
        const sLeft = getStudentInSeat(`c${col.id}-r${r}-1`);
        if (sRight || sLeft) {
            text += `שולחן ${r+1}: ${sRight?.name || '(ריק)'} | ${sLeft?.name || '(ריק)'}\n`;
        }
      }
      text += "\n";
    });
    navigator.clipboard.writeText(text);
    alert("הרשימה הועתקה ללוח!");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `
      <html dir="rtl">
      <head>
        <title>סידור כיתה</title>
        <style>
          body { font-family: sans-serif; padding: 20px; direction: rtl; }
          h1 { text-align: center; margin-bottom: 30px; }
          .board { 
            width: 60%; margin: 0 auto 40px auto; 
            border-bottom: 4px solid #333; height: 20px; 
            text-align: center; font-weight: bold;
          }
          .classroom { 
            display: flex; justify-content: center; gap: 40px; 
          }
          .column { 
            display: flex; flex-direction: column; gap: 20px; 
            border: 1px dashed #ccc; padding: 10px; border-radius: 10px;
          }
          .col-title { text-align: center; font-weight: bold; margin-bottom: 10px; }
          .table-pair { 
            display: flex; gap: 10px; justify-content: center;
          }
          .seat { 
            width: 100px; height: 60px; 
            border: 2px solid #000; 
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            text-align: center;
            font-size: 14px; font-weight: bold;
          }
          .empty { border: 2px dashed #999; color: #999; }
          @media print {
            @page { size: landscape; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>סידור ישיבה כיתתי</h1>
        <div class="board">לוח הכיתה</div>
        <div class="classroom">
    `;

    columns.forEach(col => {
      html += `<div class="column"><div class="col-title">טור ${col.id}</div>`;
      for (let r = 0; r < col.rows; r++) {
        const sRight = getStudentInSeat(`c${col.id}-r${r}-0`);
        const sLeft = getStudentInSeat(`c${col.id}-r${r}-1`);
        
        html += `<div class="table-pair">`;
        html += `<div class="seat ${!sRight ? 'empty' : ''}">${sRight?.name || 'פנוי'}</div>`;
        html += `<div class="seat ${!sLeft ? 'empty' : ''}">${sLeft?.name || 'פנוי'}</div>`;
        html += `</div>`;
      }
      html += `</div>`;
    });

    html += `</div></body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  const renderName = (name: string) => {
    const parts = name.trim().split(' ');
    let firstName = name;
    let lastName = '';
    
    if (parts.length > 1) {
        lastName = parts[0];
        firstName = parts.slice(1).join(' ');
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full text-current pointer-events-none">
            <User className="mb-0.5 opacity-80 size-3 sm:size-4" strokeWidth={2.5} />
            {/* First Name (Big) */}
            <span className="text-[8px] sm:text-[11px] font-black leading-none text-center w-full truncate px-0.5">
                {firstName}
            </span>
            {/* Last Name (Small) */}
            <span className="text-[6px] sm:text-[9px] font-bold opacity-75 leading-tight text-center w-full truncate px-0.5">
                {lastName}
            </span>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-primary relative">
      {/* Loading Overlay */}
      {isShuffling && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-200">
          <Loader2 size={80} className="text-accent animate-spin mb-6 drop-shadow-md" />
          <h2 className="text-3xl font-black text-accent tracking-wider animate-pulse">מערבב תלמידים...</h2>
          <p className="text-white/50 mt-2 text-sm">בוחר מקומות אקראיים</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 bg-card border-b border-accent/30 flex flex-col gap-2 shadow-lg z-10 sticky top-0">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-accent flex items-center gap-2">
            <Users size={20} /> מפת כיתה
            </h2>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="p-2 bg-white/10 text-txt rounded-lg text-xs font-bold border border-white/20 flex items-center gap-1 hover:bg-white/20 transition">
                    <Printer size={14} /> <span className="hidden sm:inline">הדפס</span>
                </button>
                <button onClick={() => setShowList(true)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20 flex items-center gap-1 hover:bg-blue-500/20 transition">
                    <List size={14} /> רשימה
                </button>
                <button onClick={clearAllSeats} className="p-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition">
                    נקה
                </button>
                <button 
                  onClick={randomizeSeating} 
                  disabled={isShuffling || students.length === 0} 
                  className="p-2 bg-accent text-accent-fg rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50 hover:opacity-90"
                >
                    <RefreshCw size={14} className={isShuffling ? "animate-spin" : ""} /> הגרלה
                </button>
            </div>
        </div>
        
        {/* Status Bar */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-black/10 p-2 rounded-lg w-fit px-3 border border-border">
                <Info size={12} className="text-accent" />
                <span>רשומים: <span className="text-txt font-bold">{totalStudents}</span></span>
                <span className="text-gray-600">|</span>
                <span>יושבים: <span className="text-accent font-bold">{seatedStudents}</span></span>
            </div>
            {swapSourceId && (
                <div className="text-[10px] bg-accent/20 text-accent px-3 py-1.5 rounded-full font-bold animate-pulse flex items-center gap-1 border border-accent/30">
                    <ArrowRightLeft size={12} /> מצב החלפה פעיל: בחר יעד
                </div>
            )}
        </div>
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-6 relative bg-primary">
        <div className="w-full min-h-full flex flex-col items-center gap-4 pb-20">
          
          {/* Whiteboard visual */}
          <div className="w-4/5 sm:w-2/3 h-6 sm:h-8 bg-gray-700 rounded-b-xl border-x-4 border-b-4 border-gray-600 shadow-xl flex items-center justify-center">
            <span className="text-gray-400 text-[8px] sm:text-[10px] tracking-[0.3em] uppercase">לוח הכיתה</span>
          </div>

          {/* Grid of Columns */}
          <div className="flex gap-1.5 sm:gap-6 justify-center">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col gap-2 sm:gap-3">
                <div className="text-center text-accent/50 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest mb-1">טור {col.id}</div>
                {Array.from({ length: col.rows }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1 relative group">
                    {[1, 0].map((side) => { // 1=Left, 0=Right
                      const seatId = `c${col.id}-r${rowIndex}-${side}`;
                      const student = getStudentInSeat(seatId);
                      const isSelectedSource = swapSourceId === seatId;
                      const isDragOver = dragOverSeatId === seatId;
                      
                      return (
                        <button
                          key={seatId}
                          onClick={() => handleSeatClick(seatId)}
                          // DnD Props
                          draggable={!!student}
                          onDragStart={(e) => handleDragStart(e, seatId)}
                          onDragOver={(e) => handleDragOver(e, seatId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, seatId)}

                          className={`
                            w-11 h-9 sm:w-24 sm:h-16 
                            rounded-md sm:rounded-xl border-2 flex flex-col items-center justify-center p-0.5 sm:p-1 relative transition-all duration-200 overflow-hidden
                            
                            ${student 
                              ? (isSelectedSource 
                                    ? 'bg-accent/80 border-accent text-accent-fg scale-95 shadow-[0_0_15px_rgba(var(--c-accent),0.5)] z-20 ring-2 ring-white' 
                                    : 'bg-accent border-accent text-accent-fg shadow-lg scale-100 z-10')
                              : (isDragOver 
                                    ? 'bg-accent/20 border-accent border-dashed scale-105' 
                                    : 'bg-white/5 border-white/10 hover:border-white/30 text-txt/20')
                            }
                            ${swapSourceId && !student && !isDragOver ? 'animate-pulse border-accent/30' : ''}
                          `}
                          title={student?.name}
                        >
                          {student ? (
                            <>
                                {renderName(student.name)}
                                {isSelectedSource && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><ArrowRightLeft className="text-white drop-shadow-md animate-pulse"/></div>}
                            </>
                          ) : (
                            <User className="size-3.5 sm:size-[18px]" />
                          )}
                          
                          {/* Drag Target Visual */}
                          {isDragOver && !student && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <Move className="text-accent opacity-50" />
                              </div>
                          )}
                        </button>
                      );
                    })}
                    {/* Table visual connector */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-8 sm:w-4 sm:h-12 bg-black/20 -z-10 rounded-full shadow-inner border border-white/5"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Selector Modal (Manual Assign) */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] border border-accent/30 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-primary">
              <h3 className="text-accent font-bold">בחר תלמיד לכיסא</h3>
              <button onClick={() => setSelectedSeat(null)}><XCircle className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2">
              {getUnseatedStudents().length === 0 && (
                <p className="col-span-2 text-center text-gray-500 py-4 text-sm">כל התלמידים יושבים במקומותיהם</p>
              )}
              {getUnseatedStudents().sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                <button
                  key={s.name}
                  onClick={() => assignStudent(s)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-right border border-white/5 transition flex items-center justify-between group"
                >
                  <span className="font-bold text-txt group-hover:text-accent">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List View Modal */}
      {showList && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md h-[80vh] rounded-[2rem] border border-accent/30 shadow-2xl flex flex-col">
                <div className="p-5 border-b border-border flex justify-between items-center bg-primary rounded-t-[2rem]">
                    <h3 className="text-xl font-black text-accent flex items-center gap-2">
                        <List size={20}/> רשימת שיבוץ
                    </h3>
                    <button onClick={() => setShowList(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-txt"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {columns.map(col => (
                        <div key={col.id} className="space-y-2">
                            <h4 className="text-accent font-bold border-b border-border pb-1 mb-2">טור {col.id}</h4>
                            <div className="space-y-2">
                                {Array.from({ length: col.rows }).map((_, r) => {
                                    const sRight = getStudentInSeat(`c${col.id}-r${r}-0`);
                                    const sLeft = getStudentInSeat(`c${col.id}-r${r}-1`);
                                    if (!sRight && !sLeft) return null;
                                    return (
                                        <div key={r} className="bg-white/5 p-3 rounded-xl flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-bold w-6">#{r+1}</span>
                                            <div className="flex-1 flex justify-around">
                                                <span className={sRight ? "text-txt" : "text-gray-500"}>{sRight?.name || "---"}</span>
                                                <span className="text-accent mx-2">|</span>
                                                <span className={sLeft ? "text-txt" : "text-gray-500"}>{sLeft?.name || "---"}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-border bg-primary rounded-b-[2rem]">
                    <button onClick={copyListToClipboard} className="w-full py-3 bg-accent text-accent-fg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition">
                        <Copy size={18} /> העתק רשימה
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};