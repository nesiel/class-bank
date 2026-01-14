import React, { useState, useEffect, useRef } from 'react';
import { Database, Student, AppConfig, DEFAULT_CONFIG, ThemeType, StoreItem, Purchase } from './types';
import { parseExcel, fileToBase64 } from './utils';
import { Podium } from './components/Podium';
import { StudentDetails } from './components/StudentDetails';
import { SeatingChart } from './components/SeatingChart';
import { StoreView } from './components/StoreView';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, ShieldCheck, ChevronUp, ChevronDown, Settings, Trash2, Trophy, FileSpreadsheet, Coins, Users, Phone, Download, UserPlus, LayoutGrid, Book, X, PlusCircle, ArrowUp, ArrowDown, GripVertical, MessageCircle, Undo, Scroll, Star, AlertCircle, Palette, Store, Image as ImageIcon, ShoppingBag, Plus, Package, Wand2, Loader2, Save
} from 'lucide-react';

// Define the available admin sections
const ADMIN_SECTIONS = [
  { id: 'import_files', label: 'ייבוא נתונים (אקסל)', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'store_manage', label: 'ניהול חנות ומלאי', icon: Store, color: 'text-accent', bg: 'bg-accent/10' },
  { id: 'score_settings', label: 'הגדרות ניקוד', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'rules_manage', label: 'עריכת תקנון', icon: Book, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'general_settings', label: 'הגדרות כלליות', icon: Phone, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { id: 'backup_reset', label: 'גיבוי ואיפוס', icon: Download, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'theme_settings', label: 'עיצוב', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

function App() {
  const [db, setDb] = useState<Database>({});
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'contacts' | 'seating' | 'store'>('home');
  const [showAll, setShowAll] = useState(false);
  const [showAllTefillah, setShowAllTefillah] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsFilter, setDetailsFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Admin Collapsibles State
  const [adminCollapsed, setAdminCollapsed] = useState<Record<string, boolean>>({
    store_manage: true,
    score_settings: true,
    rules_manage: true,
  });
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);

  // Store Persistent State
  const [storeSelectedStudentId, setStoreSelectedStudentId] = useState<string | null>(null);
  const [cart, setCart] = useState<StoreItem[]>([]);
  
  // Undo State
  const [undoState, setUndoState] = useState<{name: string, timestamp: number} | null>(null);

  // Admin View State - Order
  const [adminOrder, setAdminOrder] = useState<string[]>([
    'import_files', 
    'store_manage', 
    'score_settings', 
    'rules_manage',
    'general_settings',
    'backup_reset', 
    'theme_settings'
  ]);
  const [isReordering, setIsReordering] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sDb = localStorage.getItem('bank_db');
    const sCfg = localStorage.getItem('bank_cfg');
    if (sDb) setDb(JSON.parse(sDb));
    if (sCfg) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(sCfg) });
    
    // Load admin order
    const sOrder = localStorage.getItem('admin_order_v2');
    if (sOrder) setAdminOrder(JSON.parse(sOrder));
  }, []);

  const saveDb = (newDb: Database) => {
    setDb(newDb);
    localStorage.setItem('bank_db', JSON.stringify(newDb));
  };

  const saveConfig = (newCfg: AppConfig) => {
    setConfig(newCfg);
    localStorage.setItem('bank_cfg', JSON.stringify(newCfg));
  };

  const saveAdminOrder = (newOrder: string[]) => {
    setAdminOrder(newOrder);
    localStorage.setItem('admin_order_v2', JSON.stringify(newOrder));
  };

  const toggleAdminSection = (id: string) => {
    setAdminCollapsed(prev => ({...prev, [id]: !prev[id]}));
  };

  // Theme Logic
  const getThemeVariables = (theme: ThemeType) => {
    switch (theme) {
      case 'modern':
        return {
          '--c-bg': '#0f172a',
          '--c-card': '#1e293b',
          '--c-text': '#f1f5f9',
          '--c-accent': '#38bdf8',
          '--c-accent-fg': '#000000',
          '--c-border': 'rgba(56, 189, 248, 0.3)',
        };
      case 'simple':
        return {
          '--c-bg': '#f3f4f6',
          '--c-card': '#ffffff',
          '--c-text': '#111827',
          '--c-accent': '#2563eb', // Blue
          '--c-accent-fg': '#ffffff',
          '--c-border': 'rgba(37, 99, 235, 0.2)',
        };
      case 'current':
      default:
        return {
          '--c-bg': '#1a0f0d',
          '--c-card': '#2d1b15',
          '--c-text': '#fff8e1',
          '--c-accent': '#d4af37',
          '--c-accent-fg': '#000000',
          '--c-border': 'rgba(212, 175, 55, 0.3)',
        };
    }
  };

  const themeVars = getThemeVariables(config.theme || 'current');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'behavior' | 'alfon') => {
    if (e.target.files?.[0]) {
      try {
        const newDb = await parseExcel(e.target.files[0], config);
        const final = { ...db };
        Object.entries(newDb).forEach(([name, data]) => {
          const studentData = data as Student;
          if (final[name]) {
            if (type === 'behavior') {
              final[name] = { 
                ...final[name], 
                total: final[name].total + studentData.total, 
                logs: [...final[name].logs, ...studentData.logs] 
              };
            } else {
              final[name] = { 
                ...final[name],
                nameMother: studentData.nameMother || final[name].nameMother,
                phoneMother: studentData.phoneMother || final[name].phoneMother,
                nameFather: studentData.nameFather || final[name].nameFather,
                phoneFather: studentData.phoneFather || final[name].phoneFather,
                studentCell: studentData.studentCell || final[name].studentCell,
                studentEmail: studentData.studentEmail || final[name].studentEmail,
                homePhone: studentData.homePhone || final[name].homePhone
              };
            }
          } else {
            final[name] = studentData;
          }
        });
        saveDb(final);
        alert(type === 'behavior' ? "הנקודות עודכנו!" : "האלפון עודכן בהצלחה!");
      } catch (err) { alert("שגיאה בקובץ"); }
      e.target.value = '';
    }
  };

  const updateScore = (action: string, value: number) => {
    const newScores = { ...config.actionScores, [action]: value };
    saveConfig({ ...config, actionScores: newScores });
  };
  
  // --- Store Management Functions ---
  const handleAddStoreItem = () => {
    const newItem: StoreItem = {
      id: Date.now().toString(),
      name: "", // Start empty to trigger auto-suggest
      emoji: "🎁",
      price: 50,
      stock: 10
    };
    saveConfig({ ...config, storeItems: [...config.storeItems, newItem] });
  };

  const handleUpdateStoreItem = (id: string, field: keyof StoreItem, value: any) => {
    const updatedItems = config.storeItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    saveConfig({ ...config, storeItems: updatedItems });
  };

  const handleDeleteStoreItem = (id: string) => {
    if (window.confirm("למחוק פריט זה?")) {
        saveConfig({ ...config, storeItems: config.storeItems.filter(i => i.id !== id) });
    }
  };

  const handleStoreItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    if (e.target.files?.[0]) {
      try {
        // fileToBase64 now automatically compresses images
        const base64 = await fileToBase64(e.target.files[0]);
        handleUpdateStoreItem(itemId, 'image', base64);
      } catch (err) {
        alert("שגיאה בהעלאת התמונה");
      }
    }
  };
  
  const handleGenerateProductAsset = async (item: StoreItem) => {
    setGeneratingItemId(item.id);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // If name is empty, suggest a name first
        if (!item.name.trim()) {
            const nameResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: "Suggest ONE popular, small, physical prize for a 5th grade classroom store (in Hebrew). Just the name.",
            });
            const suggestedName = nameResponse.text?.trim() || "הפתעה";
            handleUpdateStoreItem(item.id, 'name', suggestedName);
            item.name = suggestedName; // Update local var for next step
        }

        // Generate Image
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `Generate a cute, high-quality, 3D icon of ${item.name} (product) on a plain white background. It should look like a game asset.`,
        });

        // Find image part
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
             for (const part of parts) {
                if (part.inlineData) {
                    const base64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    // We can accept the AI image as is, or compress it if we want to be safe, 
                    // but usually AI icons are manageable. Manual upload is the big risk.
                    handleUpdateStoreItem(item.id, 'image', base64);
                    break;
                }
             }
        }
    } catch (e) {
        console.error(e);
        alert("שגיאה בייצור אוטומטי. ודא חיבור לרשת.");
    } finally {
        setGeneratingItemId(null);
    }
  };

  const handleCheckout = () => {
    if (!storeSelectedStudentId || cart.length === 0) return;
    
    const student = db[storeSelectedStudentId];
    if (!student) return;

    let totalCost = 0;
    cart.forEach(item => totalCost += item.price);

    if (student.total < totalCost) {
        alert("שגיאה: אין מספיק נקודות לביצוע העסקה.");
        return;
    }

    // 1. Update Student (Deduct points, add Purchase logs)
    const newPurchases: Purchase[] = cart.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        itemId: item.id,
        itemName: item.name,
        cost: item.price,
        date: new Date().toLocaleDateString('he-IL'),
        timestamp: Date.now()
    }));

    const updatedStudent: Student = {
        ...student,
        total: student.total - totalCost,
        purchases: [...(student.purchases || []), ...newPurchases]
    };

    saveDb({ ...db, [student.name]: updatedStudent });

    // 2. Update Inventory (Deduct stock)
    const updatedStoreItems = config.storeItems.map(storeItem => {
        // Count how many of this item are in the cart
        const countInCart = cart.filter(c => c.id === storeItem.id).length;
        if (countInCart > 0) {
            return { ...storeItem, stock: Math.max(0, storeItem.stock - countInCart) };
        }
        return storeItem;
    });

    saveConfig({ ...config, storeItems: updatedStoreItems });

    // 3. Clear Cart (but keep student selected for UI feedback)
    setCart([]);
    
    return true; // Signal success
  };

  const handleBackup = () => {
    try {
      const data = JSON.stringify({ db, config });
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("שגיאה ביצירת הגיבוי");
    }
  };

  const handleRemoveFromPodium = (studentName: string) => {
    const newDb = { ...db };
    if (newDb[studentName]) {
      newDb[studentName] = { ...newDb[studentName], isHiddenFromPodium: true };
      saveDb(newDb);
      
      const timestamp = Date.now();
      setUndoState({ name: studentName, timestamp });
      
      setTimeout(() => {
        setUndoState(current => (current && current.timestamp === timestamp) ? null : current);
      }, 4000);
    }
  };

  const handleUndoRemove = () => {
    if (undoState) {
      const newDb = { ...db };
      if (newDb[undoState.name]) {
        newDb[undoState.name] = { ...newDb[undoState.name], isHiddenFromPodium: false };
        saveDb(newDb);
        setUndoState(null);
      }
    }
  };

  const handleSendNachat = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    const phone = student.phoneMother || student.phoneFather;
    if (!phone) {
      alert("לא נמצא מס' טלפון להורים");
      return;
    }
    const cleanPhone = phone.startsWith('05') ? '972' + phone.substring(1) : phone;
    const message = `שמח להודיע כי בנכם ${student.name} תפקד מצוין השבוע! ללא עבירות משמעת ועם צבירת התנהגויות טובות. נחת אמיתית! 🌟`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isEligibleForNachat = (student: Student) => {
    const hasNegatives = student.logs.some(l => l.s < 0);
    const positiveCount = student.logs.filter(l => l.s > 0).length;
    return !hasNegatives && positiveCount >= 2;
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...adminOrder];
    if (direction === 'up') {
        if (index === 0) return;
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else {
        if (index === newOrder.length - 1) return;
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    saveAdminOrder(newOrder);
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
        setIsReordering(true);
        if (navigator.vibrate) navigator.vibrate(50);
    }, 800);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
    }
  };

  // --- Admin Section Renders ---

  const renderAdminSectionContent = (id: string) => {
    switch(id) {
        case 'import_files':
            return (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl cursor-pointer active:scale-95 transition">
                        <FileSpreadsheet className="text-green-500 mb-2" size={24} />
                        <span className="text-xs font-bold text-green-500">דיווחי התנהגות</span>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'behavior')} />
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer active:scale-95 transition">
                        <UserPlus className="text-blue-500 mb-2" size={24} />
                        <span className="text-xs font-bold text-blue-500">אלפון כיתתי</span>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'alfon')} />
                    </label>
                </div>
            );
        case 'store_manage':
            return (
                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-xs text-gray-400">מוצרים: {config.storeItems.length}</span>
                        <button onClick={handleAddStoreItem} className="text-xs bg-accent text-accent-fg px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:brightness-110">
                            <Plus size={14}/> הוסף מוצר
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                        {config.storeItems.map((item) => (
                            <div key={item.id} className="bg-black/20 p-3 rounded-xl border border-border flex items-center gap-3">
                                <div className="relative group shrink-0">
                                    <label className="w-14 h-14 bg-black/40 rounded-lg flex items-center justify-center cursor-pointer border border-white/10 hover:border-accent transition overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">{item.emoji}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ImageIcon size={16} className="text-white"/>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleStoreItemImageUpload(e, item.id)} />
                                    </label>
                                </div>
                                
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="flex gap-2">
                                        <input 
                                        value={item.name} 
                                        onChange={(e) => handleUpdateStoreItem(item.id, 'name', e.target.value)}
                                        className="w-full bg-transparent border-b border-white/10 text-sm font-bold text-txt outline-none focus:border-accent"
                                        placeholder="שם הפריט"
                                        />
                                        <button 
                                        onClick={() => handleGenerateProductAsset(item)}
                                        disabled={generatingItemId === item.id}
                                        className="text-accent hover:text-white transition-colors bg-accent/10 hover:bg-accent/20 p-1.5 rounded-lg"
                                        title="מחולל קסם: השלם שם או צור תמונה"
                                        >
                                            {generatingItemId === item.id ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                                            <span className="text-[10px] text-gray-500">מחיר:</span>
                                            <input 
                                            type="number" 
                                            value={item.price} 
                                            onChange={(e) => handleUpdateStoreItem(item.id, 'price', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-transparent text-xs text-accent font-bold outline-none focus:border-accent text-center"
                                            placeholder="0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                                            <span className="text-[10px] text-gray-500">מלאי:</span>
                                            <input 
                                            type="number" 
                                            value={item.stock} 
                                            onChange={(e) => handleUpdateStoreItem(item.id, 'stock', parseInt(e.target.value) || 0)}
                                            className="w-10 bg-transparent text-xs text-white font-bold outline-none focus:border-accent text-center"
                                            placeholder="∞"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => handleDeleteStoreItem(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h4 className="text-xs font-bold text-gray-400 mb-2">היסטוריית רכישות חודשית</h4>
                        <div className="bg-black/20 rounded-xl p-2 max-h-40 overflow-y-auto text-xs">
                            {allPurchases.length === 0 && <p className="text-center text-gray-500 py-2">אין רכישות עדיין</p>}
                            {allPurchases.map((p, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                                    <span>{p.studentName} רכש/ה <b>{p.itemName}</b></span>
                                    <span className="text-gray-500 text-[10px]">{p.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'score_settings':
            return (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    {Object.entries(config.actionScores).map(([action, score]) => (
                    <div key={action} className="bg-black/20 p-3 rounded-xl border border-border">
                        <label className="text-[10px] text-gray-400 block mb-1">{action}</label>
                        <input 
                        type="number" 
                        className="bg-transparent border-b border-accent/30 w-full text-sm font-bold text-accent outline-none text-center"
                        value={score}
                        onChange={(e) => updateScore(action, parseInt(e.target.value) || 0)}
                        />
                    </div>
                    ))}
                </div>
            );
        case 'rules_manage':
            return (
                <div className="pt-2">
                    <textarea 
                        className="w-full h-32 bg-black/20 rounded-xl border border-white/10 p-4 text-sm text-txt/80 focus:border-accent outline-none resize-none"
                        value={config.rules}
                        onChange={(e) => saveConfig({...config, rules: e.target.value})}
                        placeholder="הדבק כאן את התקנון הכיתתי..."
                    />
                </div>
            );
        case 'general_settings':
            return (
                <div className="pt-2 space-y-3">
                    <div className="bg-black/20 p-3 rounded-xl border border-border">
                         <label className="text-xs font-bold text-gray-400 block mb-1 flex items-center gap-2">
                             <Phone size={12}/> טלפון המורה (לקבלת עדכוני רכישה)
                         </label>
                         <input 
                            type="tel"
                            placeholder="לדוגמה: 0501234567"
                            className="w-full bg-transparent border-b border-white/10 p-1 text-sm text-white outline-none focus:border-accent"
                            value={config.teacherCell}
                            onChange={(e) => saveConfig({...config, teacherCell: e.target.value})}
                         />
                         <p className="text-[10px] text-gray-500 mt-1">מספר זה ישמש לשליחת וואטסאפ אוטומטי של רכישות</p>
                    </div>
                </div>
            );
        case 'backup_reset':
            return (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={handleBackup} className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/5 active:bg-white/10 transition-colors text-txt">
                        <Download size={16}/> גיבוי
                    </button>
                    <button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 p-4 bg-red-500/10 rounded-2xl text-xs font-bold text-red-500 border border-red-500/10 active:bg-red-500/20 transition-colors">
                        <Trash2 size={16}/> איפוס מלא
                    </button>
                </div>
            );
        case 'theme_settings':
            return (
                <div className="flex gap-2 pt-2">
                    {['current', 'modern', 'simple'].map((t) => (
                        <button 
                            key={t}
                            onClick={() => saveConfig({ ...config, theme: t as ThemeType })}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                                config.theme === t 
                                ? 'bg-accent text-accent-fg border-accent shadow-lg scale-105' 
                                : 'bg-black/20 text-gray-400 border-transparent hover:bg-black/30'
                            }`}
                        >
                            {t === 'current' ? 'נוכחי' : t === 'modern' ? 'מודרני' : 'פשוט'}
                        </button>
                    ))}
                </div>
            );
        default: return null;
    }
  };

  const sorted = (Object.values(db) as Student[]).sort((a, b) => b.total - a.total);
  const filtered = sorted.filter(s => s.name.includes(searchQuery));
  const classTotal = (Object.values(db) as Student[]).reduce((sum, s) => sum + s.total, 0);

  // Logic for Tefillah Stats (Sorted by Absence Priority, then Score)
  const tefillahStats = (Object.values(db) as Student[])
    .map(s => {
        const prayerLogs = s.logs.filter(l => l.sub && l.sub.includes('תפיל'));
        const rawScore = prayerLogs.reduce((sum, l) => sum + l.s, 0);
        const absences = prayerLogs.filter(l => l.k.includes('חיסור')).reduce((sum, l) => sum + l.c, 0);
        const goodWords = prayerLogs.filter(l => l.k.includes('מילה טובה')).reduce((sum, l) => sum + l.c, 0);
        const calculatedScore = rawScore + (goodWords * 10) - (absences * 20);

        return { 
            ...s, 
            tefillahScore: calculatedScore, 
            tefillahAbsences: absences,
            goodWordsTefillah: goodWords, 
            hasPrayerLogs: prayerLogs.length > 0 
        };
    })
    .filter(s => s.hasPrayerLogs)
    .sort((a, b) => {
        if (a.tefillahAbsences !== b.tefillahAbsences) {
            return a.tefillahAbsences - b.tefillahAbsences;
        }
        return b.tefillahScore - a.tefillahScore;
    });

  let tefillahChampions = tefillahStats.filter(s => !s.isHiddenFromPodium);
  if (tefillahChampions.length > 0) {
      const firstPlace = tefillahChampions[0];
      const allFirstPlaces = tefillahChampions.filter(s => 
          s.tefillahAbsences === firstPlace.tefillahAbsences && 
          s.tefillahScore === firstPlace.tefillahScore
      );
      if (allFirstPlaces.length > 3) {
          tefillahChampions = allFirstPlaces;
      } else {
          tefillahChampions = tefillahChampions.slice(0, 3);
      }
  }

  // Calculate all purchases for history view
  const allPurchases = (Object.values(db) as Student[]).flatMap(s => 
    (s.purchases || []).map(p => ({...p, studentName: s.name}))
  ).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div 
      className="flex flex-col h-screen bg-primary text-txt overflow-hidden font-sans transition-colors duration-300"
      style={themeVars as React.CSSProperties}
    >
      <header className="flex-none bg-primary border-b-2 border-accent p-5 flex justify-between items-center z-30 shadow-2xl relative">
        <div className="flex items-center gap-3">
          {config.logo ? (
            <img src={config.logo} className="w-10 h-10 rounded-full border-2 border-accent object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-accent/30 bg-accent/10 flex items-center justify-center text-accent">
              <Coins size={20} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-accent tracking-tight">הבנק הכיתתי</h1>
            <p className="text-[9px] font-bold text-accent/50 uppercase tracking-widest">{config.slogan}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentView('contacts')} className="p-2 bg-white/5 rounded-full text-accent border border-white/5">
            <Users size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {currentView === 'home' && (
          <div className="px-4 pt-4 space-y-4 flex flex-col min-h-full">
            <div className="flex-1 flex flex-col justify-center min-h-[30vh]">
               <Podium 
                 students={sorted.filter(s => !s.isHiddenFromPodium)} 
                 onRemoveStudent={handleRemoveFromPodium}
               />
            </div>
            
            <div className="bg-gradient-to-r from-accent/20 to-card border border-accent/30 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-accent p-2 rounded-full text-accent-fg">
                        <Coins size={20} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-accent/70 uppercase tracking-widest block">קופה כיתתית</span>
                        <span className="font-bold text-txt">סך הכל נקודות</span>
                    </div>
                </div>
                <span className="text-3xl font-black text-accent drop-shadow-md">{classTotal}₪</span>
            </div>

            {/* Tefillah Corner */}
            <div className="bg-card border border-accent/30 rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
                
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-accent flex items-center gap-2">
                        <Scroll size={18} /> פינת התפילה
                    </h3>
                    <span className="text-[10px] text-gray-400 bg-black/10 px-2 py-1 rounded-full border border-white/5">מצטייני התפילה</span>
                </div>

                <p className="text-xs text-txt/70 italic leading-relaxed border-r-2 border-accent/20 pr-2">
                    "יְהִי רָצוֹן... שֶׁתַּשְׁרֶה שְׁכִינָה בְּמַעֲשֵׂה יָדֵינוּ, וְתַצְלִיחֵנוּ בְּלִמּוּדֵנוּ..."
                </p>

                {/* Champions Display */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {tefillahChampions.map((s, idx) => (
                        <div key={idx} className="bg-black/10 p-2 rounded-xl flex flex-col items-center text-center border border-border active:scale-95 transition-transform w-[30%] min-w-[90px]" 
                             onClick={() => { setSelectedStudent(s); setDetailsFilter('תפיל'); }}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 shadow-md ${idx === 0 || (s.tefillahScore === tefillahChampions[0].tefillahScore && s.tefillahAbsences === tefillahChampions[0].tefillahAbsences) ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-500'}`}>
                            {idx + 1}
                        </div>
                        <span className="text-xs font-bold truncate w-full text-txt">{s.name}</span>
                        <span className="text-[10px] text-accent font-black">{s.tefillahScore}₪</span>
                        <div className="flex items-center gap-2 mt-1 justify-center w-full">
                            {s.goodWordsTefillah > 0 && (
                                <span className="text-[8px] text-green-500 flex items-center gap-0.5"><Star size={8} fill="currentColor"/> {s.goodWordsTefillah}</span>
                            )}
                            {s.tefillahAbsences > 0 && (
                                <span className="text-[8px] text-red-500 flex items-center gap-0.5"><AlertCircle size={8} /> {s.tefillahAbsences}</span>
                            )}
                        </div>
                        </div>
                    ))}
                    {tefillahChampions.length === 0 && (
                        <div className="w-full text-center text-[10px] text-gray-500 py-2">אין נתוני תפילה (טענו מחדש אקסל אם חסר)</div>
                    )}
                </div>

                {/* Full List Button */}
                <button onClick={() => setShowAllTefillah(!showAllTefillah)} className="w-full mt-2 py-2 text-[10px] font-bold text-accent/50 uppercase flex justify-center items-center gap-2 border-t border-border">
                    {showAllTefillah ? 'צמצם רשימת תפילה' : 'הצג את כל הכיתה'} {showAllTefillah ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>

                {/* Expanded List */}
                {showAllTefillah && (
                    <div className="mt-2 divide-y divide-border bg-black/10 rounded-xl max-h-60 overflow-y-auto">
                        {tefillahStats.map((s, i) => (
                            <div key={s.name} 
                                 onClick={() => { setSelectedStudent(s); setDetailsFilter('תפיל'); }} 
                                 className="p-3 flex justify-between items-center active:bg-white/5 cursor-pointer hover:bg-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-white/5 text-gray-500`}>{i + 1}</span>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-txt">{s.name}</span>
                                        <span className="text-[9px] text-gray-500 flex gap-2">
                                            {s.tefillahAbsences > 0 ? <span className="text-red-500">חסר: {s.tefillahAbsences}</span> : <span className="text-green-500">נוכחות מלאה</span>}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-xs font-black ${s.tefillahScore > 0 ? 'text-green-500' : s.tefillahScore < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {s.tefillahScore}₪
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

             <button onClick={() => setShowRules(true)} className="w-full bg-card border border-accent/30 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                    <div className="bg-accent/10 p-2 rounded-full text-accent">
                        <Book size={20} />
                    </div>
                    <span className="font-bold text-sm text-txt">תקנון הכיתה</span>
                </div>
                <ChevronDown size={16} className="text-gray-500"/>
             </button>

            <div className="bg-card border border-accent/30 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-accent flex items-center gap-2"><Trophy size={16} /> טבלת הניקוד</h3>
                    <input type="text" placeholder="חפש תלמיד..." className="bg-black/10 border border-border rounded-full py-1.5 px-4 text-xs w-32 outline-none text-txt placeholder-gray-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="divide-y divide-border">
                    {(searchQuery || showAll ? filtered : filtered.slice(0, 5)).map((s, i) => (
                        <div key={s.name} onClick={() => { setSelectedStudent(s); setDetailsFilter(""); }} className="p-5 flex justify-between items-center active:bg-white/5 cursor-pointer">
                            <div className="flex items-center gap-4">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-accent text-accent-fg' : 'bg-white/10 text-gray-500'}`}>{sorted.indexOf(s) + 1}</span>
                                <span className="font-bold text-txt">{s.name}</span>
                                {isEligibleForNachat(s) && (
                                  <button 
                                    onClick={(e) => handleSendNachat(e, s)}
                                    className="p-1.5 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                                    title="שלח הודעת נחת על תפקוד טוב"
                                  >
                                    <MessageCircle size={14} />
                                  </button>
                                )}
                            </div>
                            <span className="font-black text-accent">{s.total}₪</span>
                        </div>
                    ))}
                </div>
                {!searchQuery && filtered.length > 5 && (
                  <button onClick={() => setShowAll(!showAll)} className="w-full py-4 text-[10px] font-bold text-accent/50 uppercase flex justify-center items-center gap-2 border-t border-border">
                    {showAll ? 'צמצם' : 'הצג הכל'} {showAll ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                )}
            </div>
          </div>
        )}

        {currentView === 'seating' && (
          <SeatingChart 
            students={Object.values(db)} 
            onUpdateStudent={(s) => saveDb({ ...db, [s.name]: s })}
            onBatchUpdate={(updates) => {
              const newDb = { ...db };
              updates.forEach(s => newDb[s.name] = s);
              saveDb(newDb);
            }}
          />
        )}

        {currentView === 'store' && (
          <StoreView 
            students={Object.values(db)}
            config={config}
            onCheckout={handleCheckout}
            cart={cart}
            setCart={setCart}
            selectedStudentId={storeSelectedStudentId}
            setSelectedStudentId={setStoreSelectedStudentId}
          />
        )}

        {currentView === 'admin' && (
          <div className="p-6 space-y-4">
            
             <div className="flex justify-between items-center pb-2 border-b border-border">
                 <h2 className="text-2xl font-black text-accent flex items-center gap-3">
                     <ShieldCheck size={28}/> ניהול המערכת
                 </h2>
                 <button 
                    onClick={() => setIsReordering(!isReordering)}
                    className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${isReordering ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400'}`}
                 >
                     {isReordering ? 'סיום עריכת סדר' : 'שנה סדר תצוגה'}
                 </button>
             </div>

             <div className="space-y-4">
                 {adminOrder.map((sectionId, index) => {
                     const sectionDef = ADMIN_SECTIONS.find(s => s.id === sectionId);
                     if (!sectionDef) return null;
                     const isCollapsed = adminCollapsed[sectionId];
                     
                     // Force expand Import/Export as they are just buttons
                     const isAlwaysExpanded = sectionId === 'import_files' || sectionId === 'backup_reset' || sectionId === 'theme_settings';
                     
                     return (
                         <div 
                            key={sectionId}
                            className={`bg-card rounded-[2rem] border border-border shadow-lg overflow-hidden transition-all ${isReordering ? 'opacity-80 scale-[0.98] border-dashed border-accent' : ''}`}
                         >
                             {/* Header */}
                             <div 
                                className={`p-4 flex items-center justify-between ${!isAlwaysExpanded ? 'cursor-pointer active:bg-white/5' : ''}`}
                                onClick={() => {
                                    if (isReordering) return;
                                    if (!isAlwaysExpanded) toggleAdminSection(sectionId);
                                }}
                             >
                                 <div className="flex items-center gap-3">
                                     {isReordering && (
                                         <div className="flex flex-col gap-1 mr-2">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }} 
                                                disabled={index === 0} 
                                                className="text-gray-500 disabled:opacity-20 hover:text-white"
                                             >
                                                 <ArrowUp size={14}/>
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }} 
                                                disabled={index === adminOrder.length - 1} 
                                                className="text-gray-500 disabled:opacity-20 hover:text-white"
                                             >
                                                 <ArrowDown size={14}/>
                                             </button>
                                         </div>
                                     )}
                                     <div className={`p-2 rounded-xl ${sectionDef.bg} ${sectionDef.color}`}>
                                         <sectionDef.icon size={20} />
                                     </div>
                                     <h3 className="font-bold text-sm text-txt uppercase tracking-wide">{sectionDef.label}</h3>
                                 </div>
                                 {!isAlwaysExpanded && !isReordering && (
                                     isCollapsed ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronUp size={16} className="text-gray-500"/>
                                 )}
                             </div>
                             
                             {/* Content */}
                             {(!isCollapsed || isAlwaysExpanded) && (
                                 <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in">
                                     {renderAdminSectionContent(sectionId)}
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>
          </div>
        )}

        {currentView === 'contacts' && (
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-black text-accent flex items-center gap-3"><Users size={28}/> ספר טלפונים</h2>
            {sorted.map(s => (
              <div key={s.name} className="bg-card p-5 rounded-3xl border border-border flex justify-between items-center shadow-lg active:bg-white/5 cursor-pointer" onClick={() => { setSelectedStudent(s); setDetailsFilter(""); }}>
                <div>
                  <p className="font-bold text-sm text-txt">{s.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {s.nameMother ? `אמא: ${s.nameMother}` : 'חסר פרטי אם'} • {s.nameFather ? `אבא: ${s.nameFather}` : 'חסר פרטי אב'}
                  </p>
                </div>
                <div className="p-3 bg-accent/10 rounded-full text-accent">
                  <Phone size={20} />
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
      
      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 w-[90%] max-w-sm">
            <div className="bg-[#333] border border-white/10 text-white px-4 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 text-xs">הוסר מהפודיום:</span>
                    <span className="font-bold truncate max-w-[120px]">{undoState.name}</span>
                </div>
                <button 
                    onClick={handleUndoRemove} 
                    className="flex items-center gap-1 text-accent font-bold text-sm bg-white/5 px-3 py-1 rounded-full active:bg-white/10"
                >
                    <Undo size={14} /> ביטול
                </button>
            </div>
        </div>
      )}

      <nav className="flex-none bg-card p-2 flex justify-around items-center border-t border-accent/30 z-30 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button onClick={() => setCurrentView('home')} className={`p-4 rounded-2xl transition-all ${currentView === 'home' ? 'bg-accent text-accent-fg shadow-lg scale-110 -translate-y-2' : 'text-gray-400 hover:text-txt hover:bg-white/5'}`}>
          <Home size={24} />
        </button>
        <button onClick={() => setCurrentView('seating')} className={`p-4 rounded-2xl transition-all ${currentView === 'seating' ? 'bg-accent text-accent-fg shadow-lg scale-110 -translate-y-2' : 'text-gray-400 hover:text-txt hover:bg-white/5'}`}>
          <LayoutGrid size={24} />
        </button>
        <button onClick={() => setCurrentView('store')} className={`p-4 rounded-2xl transition-all ${currentView === 'store' ? 'bg-accent text-accent-fg shadow-lg scale-110 -translate-y-2' : 'text-gray-400 hover:text-txt hover:bg-white/5'}`}>
          <ShoppingBag size={24} />
        </button>
        <button onClick={() => setCurrentView('admin')} className={`p-4 rounded-2xl transition-all ${currentView === 'admin' ? 'bg-accent text-accent-fg shadow-lg scale-110 -translate-y-2' : 'text-gray-400 hover:text-txt hover:bg-white/5'}`}>
          <ShieldCheck size={24} />
        </button>
      </nav>

      {selectedStudent && (
        <StudentDetails 
          student={selectedStudent} 
          config={config} 
          filterKeyword={detailsFilter}
          onClose={() => setSelectedStudent(null)}
          onDeleteLog={(name, idx) => {
            const s = db[name];
            if (!s) return;
            const newLogs = [...s.logs];
            const [deletedLog] = newLogs.splice(idx, 1);
            const newTotal = s.total - (deletedLog?.s || 0);
            const updatedStudent = { ...s, logs: newLogs, total: newTotal };
            saveDb({ ...db, [name]: updatedStudent });
            if (selectedStudent?.name === name) setSelectedStudent(updatedStudent);
          }}
          onAddLog={(name, log) => {
            const s = db[name];
            if (s) {
               const newTotal = s.total + log.s;
               const updatedStudent = { ...s, logs: [...s.logs, log], total: newTotal };
               saveDb({ ...db, [name]: updatedStudent });
               if (selectedStudent?.name === name) setSelectedStudent(updatedStudent);
            }
          }}
          onMarkNachat={(name) => {
             const s = db[name];
             if (s) {
                 const updatedStudent = { ...s, lastNachatDate: new Date().toLocaleDateString('he-IL') };
                 saveDb({ ...db, [name]: updatedStudent });
                 if (selectedStudent?.name === name) setSelectedStudent(updatedStudent);
             }
          }}
          onUpdateStudent={(updatedStudent) => {
             saveDb({ ...db, [updatedStudent.name]: updatedStudent });
             if (selectedStudent?.name === updatedStudent.name) setSelectedStudent(updatedStudent);
          }}
          isAuthenticated={true}
        />
      )}

      {showRules && (
         <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-3xl border border-accent/30 p-6 relative shadow-2xl">
               <button onClick={() => setShowRules(false)} className="absolute top-4 left-4 p-2 bg-white/5 rounded-full text-txt hover:bg-white/10"><X size={20}/></button>
               <h2 className="text-2xl font-black text-accent mb-4 text-center">תקנון הכיתה</h2>
               <div className="text-txt/80 whitespace-pre-line leading-relaxed text-center">
                  {config.rules}
               </div>
            </div>
         </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-card w-full max-w-sm rounded-3xl border border-red-500/30 p-6 text-center">
               <h3 className="text-xl font-bold text-red-500 mb-2">אזהרה!</h3>
               <p className="text-txt/80 mb-6 text-sm">פעולה זו תמחק את כל הנתונים, התלמידים וההגדרות.<br/>האם להמשיך?</p>
               <div className="flex gap-3">
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-white/10 rounded-xl font-bold text-txt">ביטול</button>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20">כן, אפס הכל</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;