
import React, { useState } from 'react';
import { AppConfig, LearningResource } from '../types';
import { ChevronRight, Folder, FileText, Link as LinkIcon, Download, Video, Search, HardDrive, FileQuestion, ExternalLink } from 'lucide-react';

interface LearningCenterProps {
    config: AppConfig;
    onClose: () => void;
}

export const LearningCenter: React.FC<LearningCenterProps> = ({ config, onClose }) => {
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const subjects = config.learningSubjects || [];
    const resources = config.learningResources || [];

    const filteredResources = resources.filter(r => {
        const matchesSubject = selectedSubject ? r.subject === selectedSubject : true;
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSubject && matchesSearch;
    });

    const getIconForResource = (res: LearningResource) => {
        // Auto-detect Google Services based on URL
        if (res.url.includes('drive.google.com')) {
            return <HardDrive size={24} className="text-blue-500" />;
        }
        if (res.url.includes('docs.google.com/forms')) {
            return <FileQuestion size={24} className="text-purple-500" />;
        }
        if (res.url.includes('youtube.com') || res.url.includes('youtu.be')) {
            return <Video size={24} className="text-red-500" />;
        }

        // Fallback to type
        switch (res.type) {
            case 'link': return <LinkIcon size={24} className="text-blue-400" />;
            case 'file': return <Download size={24} className="text-green-400" />;
            case 'video': return <Video size={24} className="text-red-400" />;
            case 'form': return <FileText size={24} className="text-purple-400" />;
            default: return <FileText size={24} className="text-gray-400" />;
        }
    };

    const getResourceLabel = (res: LearningResource) => {
        if (res.url.includes('drive.google.com')) return "תיקיית דרייב";
        if (res.url.includes('docs.google.com/forms')) return "מבחן/טופס";
        return res.type === 'video' ? "סרטון" : res.type === 'file' ? "קובץ" : "קישור";
    };

    const handleResourceClick = (res: LearningResource) => {
        if (res.type === 'file' && res.url.startsWith('data:')) {
            // It's a base64 file, download it
            const link = document.createElement('a');
            link.href = res.url;
            link.download = res.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // It's a URL
            window.open(res.url, '_blank');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 p-4 shadow-lg border-b border-slate-700 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition">
                        <ChevronRight size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white">מרכז למידה</h1>
                        <p className="text-xs text-slate-400">חומרי עזר, מבחנים ודפי עבודה</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
                
                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="חפש דף עבודה או מבחן..." 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {!selectedSubject && !searchTerm ? (
                    // Folder View
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {subjects.map(subject => {
                            const count = resources.filter(r => r.subject === subject).length;
                            return (
                                <button 
                                    key={subject}
                                    onClick={() => setSelectedSubject(subject)}
                                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors z-10">
                                        <Folder size={40} fill="currentColor" className="opacity-80"/>
                                    </div>
                                    <div className="text-center z-10">
                                        <h3 className="font-bold text-lg text-white">{subject}</h3>
                                        <p className="text-xs text-slate-500">{count} קבצים</p>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // File List View
                    <div className="space-y-4">
                        {selectedSubject && (
                            <div className="flex items-center gap-2 mb-4">
                                <button onClick={() => setSelectedSubject(null)} className="text-sm text-blue-400 font-bold hover:underline">תיקיות</button>
                                <span className="text-slate-600">/</span>
                                <span className="text-sm text-slate-300 font-bold">{selectedSubject}</span>
                            </div>
                        )}

                        {filteredResources.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <Folder size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>לא נמצאו קבצים בתיקייה זו</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredResources.map(res => (
                                    <button 
                                        key={res.id}
                                        onClick={() => handleResourceClick(res)}
                                        className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 rounded-xl flex items-center gap-4 text-right transition active:scale-[0.98] group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-slate-500 transition-colors">
                                            {getIconForResource(res)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors text-sm">{res.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{res.subject}</span>
                                                <span className="text-[10px] text-slate-500 bg-black/20 px-2 py-0.5 rounded-full">{getResourceLabel(res)}</span>
                                            </div>
                                        </div>
                                        <div className="p-2 bg-slate-700/50 rounded-full text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                            <ExternalLink size={16}/>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
