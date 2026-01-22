
import React, { useState } from 'react';
import { AppConfig, Challenge, Student, ChallengeRequest, UserRole } from '../types';
import { Target, Check, X, Plus, Trophy, MessageCircle, Clock, Award, Trash2 } from 'lucide-react';

interface ChallengesViewProps {
    config: AppConfig;
    students: Student[];
    userRole: UserRole;
    loggedInStudentName: string | null;
    onUpdateConfig: (newConfig: AppConfig) => void;
    onUpdateStudent: (student: Student) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({ 
    config, students, userRole, loggedInStudentName, onUpdateConfig, onUpdateStudent 
}) => {
    const [activeTab, setActiveTab] = useState<'list' | 'approvals' | 'suggestions'>('list');
    const [newChallengeTitle, setNewChallengeTitle] = useState("");
    const [newChallengeReward, setNewChallengeReward] = useState("50");

    // --- Student Logic ---
    const handleStudentRequest = (challenge: Challenge) => {
        const student = students.find(s => s.name === loggedInStudentName);
        if (!student) return;

        // Check if already requested (pending)
        const existing = student.challengeRequests?.find(r => r.challengeId === challenge.id && r.status === 'pending');
        if (existing) {
            alert("כבר הגשת בקשה לאתגר זה, המתן לאישור המורה.");
            return;
        }

        const newRequest: ChallengeRequest = {
            id: Date.now().toString(),
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            reward: challenge.reward,
            date: new Date().toLocaleDateString('he-IL'),
            timestamp: Date.now(),
            status: 'pending'
        };

        onUpdateStudent({
            ...student,
            challengeRequests: [...(student.challengeRequests || []), newRequest]
        });

        // WhatsApp Logic
        const cleanPhone = config.teacherCell.replace(/[^0-9]/g, '').replace(/^0/, '972');
        const message = `שלום המורה, השלמתי את האתגר "${challenge.title}"! הנה ההוכחה (מצורפת תמונה):`;
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        
        if (window.confirm("הבקשה נרשמה! האם לפתוח וואטסאפ לשליחת הוכחה למורה?")) {
            window.open(waLink, '_blank');
        }
    };

    const handleSuggestChallenge = () => {
        if (!newChallengeTitle.trim()) return;
        
        const newChallenge: Challenge = {
            id: Date.now().toString(),
            title: newChallengeTitle,
            reward: parseInt(newChallengeReward) || 50,
            approved: userRole === 'teacher', // Auto approve if teacher adds it
            suggestedBy: userRole === 'student' ? loggedInStudentName || 'תלמיד' : undefined
        };

        onUpdateConfig({
            ...config,
            challenges: [...(config.challenges || []), newChallenge]
        });

        setNewChallengeTitle("");
        if (userRole === 'student') {
            alert("ההצעה נשלחה למורה לאישור!");
        } else {
            alert("האתגר נוסף בהצלחה!");
        }
    };

    // --- Teacher Logic ---
    const pendingCompletions = students.flatMap(s => 
        (s.challengeRequests || [])
            .filter(r => r.status === 'pending')
            .map(r => ({ student: s, req: r }))
    ).sort((a, b) => b.req.timestamp - a.req.timestamp);

    const pendingSuggestions = (config.challenges || []).filter(c => !c.approved);
    const activeChallenges = (config.challenges || []).filter(c => c.approved);

    const handleApproveCompletion = (student: Student, req: ChallengeRequest) => {
        const updatedRequests = student.challengeRequests?.map(r => 
            r.id === req.id ? { ...r, status: 'approved' as const } : r
        ) || [];

        const logEntry = {
            sub: "אתגרים",
            teach: "מערכת",
            k: `השלמת אתגר: ${req.challengeTitle}`,
            c: 1,
            s: req.reward,
            d: new Date().toLocaleDateString('he-IL')
        };

        onUpdateStudent({
            ...student,
            total: student.total + req.reward,
            logs: [...student.logs, logEntry],
            challengeRequests: updatedRequests
        });
    };

    const handleRejectCompletion = (student: Student, req: ChallengeRequest) => {
        const updatedRequests = student.challengeRequests?.map(r => 
            r.id === req.id ? { ...r, status: 'rejected' as const } : r
        ) || [];
        onUpdateStudent({ ...student, challengeRequests: updatedRequests });
    };

    const handleApproveSuggestion = (challengeId: string) => {
        const updated = config.challenges.map(c => c.id === challengeId ? { ...c, approved: true } : c);
        onUpdateConfig({ ...config, challenges: updated });
    };

    const handleDeleteChallenge = (challengeId: string) => {
        if (!window.confirm("למחוק אתגר זה?")) return;
        const updated = config.challenges.filter(c => c.id !== challengeId);
        onUpdateConfig({ ...config, challenges: updated });
    };

    return (
        <div className="h-full flex flex-col bg-primary text-txt">
            {/* Header */}
            <div className="p-4 bg-card border-b border-accent/20 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-2">
                    <Target className="text-orange-500" size={24} />
                    <h2 className="text-xl font-black">לוח אתגרים</h2>
                </div>
                
                {userRole === 'teacher' && (
                    <div className="flex bg-black/20 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>רשימה</button>
                        <button onClick={() => setActiveTab('approvals')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'approvals' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>אישורים ({pendingCompletions.length})</button>
                        <button onClick={() => setActiveTab('suggestions')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'suggestions' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>הצעות ({pendingSuggestions.length})</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                
                {/* LIST TAB (View for everyone) */}
                {(activeTab === 'list' || userRole === 'student') && (
                    <div className="space-y-4">
                        {/* Suggestion Box */}
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
                            <h3 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
                                <Plus size={16}/> {userRole === 'teacher' ? 'הוסף אתגר חדש' : 'הצע רעיון לאתגר'}
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newChallengeTitle}
                                    onChange={(e) => setNewChallengeTitle(e.target.value)}
                                    placeholder="תיאור האתגר..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                />
                                <input 
                                    type="number" 
                                    value={newChallengeReward}
                                    onChange={(e) => setNewChallengeReward(e.target.value)}
                                    placeholder="נקודות"
                                    className="w-16 bg-black/20 border border-white/10 rounded-xl px-2 py-2 text-sm text-center text-white outline-none focus:border-orange-500"
                                />
                                <button 
                                    onClick={handleSuggestChallenge}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 rounded-xl text-xs shadow-lg active:scale-95"
                                >
                                    {userRole === 'teacher' ? 'הוסף' : 'שלח'}
                                </button>
                            </div>
                        </div>

                        {/* Challenges List */}
                        <div className="grid grid-cols-1 gap-3">
                            {activeChallenges.length === 0 && <p className="text-center text-gray-500 py-4">אין אתגרים פעילים כרגע.</p>}
                            {activeChallenges.map(challenge => (
                                <div key={challenge.id} className="bg-card border border-white/10 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white">{challenge.title}</h3>
                                        <p className="text-xs text-orange-400 font-bold flex items-center gap-1 mt-1">
                                            <Trophy size={12}/> תגמול: {challenge.reward} נקודות
                                        </p>
                                    </div>
                                    
                                    {userRole === 'student' ? (
                                        <button 
                                            onClick={() => handleStudentRequest(challenge)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition"
                                        >
                                            <Check size={14}/> ביצעתי!
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleDeleteChallenge(challenge.id)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* APPROVALS TAB (Teacher Only) */}
                {userRole === 'teacher' && activeTab === 'approvals' && (
                    <div className="space-y-3">
                        {pendingCompletions.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <Award size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>אין דיווחים ממתינים לאישור.</p>
                            </div>
                        )}
                        {pendingCompletions.map(({ student, req }) => (
                            <div key={req.id} className="bg-card border border-orange-500/20 p-4 rounded-2xl flex justify-between items-center animate-in slide-in-from-right-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{student.name}</span>
                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400">{req.date}</span>
                                    </div>
                                    <p className="text-sm text-gray-300">דיווח על: <span className="text-orange-400 font-bold">{req.challengeTitle}</span></p>
                                    <p className="text-xs text-gray-500">דורש בדיקה בוואטסאפ</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRejectCompletion(student, req)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"><X size={18}/></button>
                                    <button onClick={() => handleApproveCompletion(student, req)} className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition shadow-lg"><Check size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* SUGGESTIONS TAB (Teacher Only) */}
                {userRole === 'teacher' && activeTab === 'suggestions' && (
                    <div className="space-y-3">
                        {pendingSuggestions.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <MessageCircle size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>אין הצעות חדשות מתלמידים.</p>
                            </div>
                        )}
                        {pendingSuggestions.map(challenge => (
                            <div key={challenge.id} className="bg-card border border-blue-500/20 p-4 rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-white">{challenge.title}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs text-blue-400">הוצע ע"י: {challenge.suggestedBy}</span>
                                        <span className="text-xs text-orange-400">פרס: {challenge.reward}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDeleteChallenge(challenge.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                                    <button onClick={() => handleApproveSuggestion(challenge.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500">אשר והוסף</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
