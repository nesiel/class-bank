

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Database, Student, AppConfig, DEFAULT_CONFIG, ThemeType, StoreItem, Purchase, UserRole, Challenge, LearningResource, ResourceType } from './types';
import { parseExcel, fileToBase64 } from './utils';
import { Podium } from './components/Podium';
import { StudentDetails } from './components/StudentDetails';
import { SeatingChart } from './components/SeatingChart';
import { StoreView } from './components/StoreView';
import { BatchCommenter } from './components/BatchCommenter';
import { LoginScreen } from './components/LoginScreen';
import { LearningCenter } from './components/LearningCenter';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, ShieldCheck, ChevronUp, ChevronDown, Settings, Trash2, Trophy, FileSpreadsheet, Coins, Users, Phone, Download, UserPlus, LayoutGrid, Book, X, PlusCircle, ArrowUp, ArrowDown, GripVertical, MessageCircle, Undo, Scroll, Star, AlertCircle, Palette, Store, Image as ImageIcon, ShoppingBag, Plus, Package, Wand2, Loader2, Save, GraduationCap, LogOut, MinusCircle, KeyRound, Lock, Target, Cloud, Upload, RefreshCw, CheckSquare, Square, Check, BookOpen, Link as LinkIcon, FileText, HardDrive, FileQuestion, Copy, ExternalLink, Crown, Search
} from 'lucide-react';

// Define the available admin sections
const ADMIN_SECTIONS = [
  { id: 'cloud_sync', label: 'סנכרון לענן (Google Sheets)', icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'import_files', label: 'ייבוא נתונים (אקסל)', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'learning_manage', label: 'ניהול מרכז למידה', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'challenges_manage', label: 'ניהול אתגרים', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'store_manage', label: 'ניהול חנות ומלאי', icon: Store, color: 'text-accent', bg: 'bg-accent/10' },
  { id: 'score_settings', label: 'הגדרות ניקוד', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'rules_manage', label: 'עריכת תקנון', icon: Book, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'general_settings', label: 'הגדרות כלליות', icon: Phone, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { id: 'backup_reset', label: 'גיבוי ואיפוס', icon: Download, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'theme_settings', label: 'עיצוב', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

export default function App() {
  const [db, setDb] = useState<Database>({});
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  // Auth State
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [loggedInStudentName, setLoggedInStudentName] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'contacts' | 'seating' | 'store' | 'learning'>('home');
  const [showAll, setShowAll] = useState(false);
  const [showAllTefillah, setShowAllTefillah] = useState(false);
  const [isTefillahOpen, setIsTefillahOpen] = useState(false); 
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsFilter, setDetailsFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBatchCommenter, setShowBatchCommenter] = useState(false);
  
  // Podium State
  const [podiumMode, setPodiumMode] = useState<'regular' | 'semester'>('regular');

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [includeImagesInSync, setIncludeImagesInSync] = useState(false);
  const skipAutoSaveRef = useRef(false); // To prevent auto-save loop after loading

  // Student Password Change State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  
  // Learning Admin State
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newResource, setNewResource] = useState<{title: string, subject: string, type: ResourceType, url: string}>({
      title: "", subject: "", type: 'link', url: ""
  });
  // Quiz Generator State
  const [quizMaterial, setQuizMaterial] = useState("");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  
  // Admin Collapsibles State
  const [adminCollapsed, setAdminCollapsed] = useState<Record<string, boolean>>({
    store_manage: true,
    score_settings: true,
    rules_manage: true,
    challenges_manage: true,
    learning_manage: true,
  });
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);

  // Store Persistent State
  const [storeSelectedStudentId, setStoreSelectedStudentId] = useState<string | null>(null);
  const [cart, setCart] = useState<StoreItem[]>([]);
  
  // Undo State
  const [undoState, setUndoState] = useState<{name: string, timestamp: number} | null>(null);

  // Admin View State - Order
  const [adminOrder, setAdminOrder] = useState<string[]>([
    'cloud_sync',
    'import_files',
    'learning_manage',
    'challenges_manage',
    'store_manage', 
    'score_settings', 
    'rules_manage',
    'general_settings',
    'backup_reset', 
    'theme_settings'
  ]);
  const [isReordering, setIsReordering] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const initApp = async () => {
        try {
            const sDb = localStorage.getItem('bank_db');
            const sCfg = localStorage.getItem('bank_cfg');
            const autoLogin = localStorage.getItem('bank_auto_login');
            // Check for the "skip cloud load" flag which is set during a full reset
            const skipCloudLoad = localStorage.getItem('bank_skip_cloud_load');

            if (sDb) {
                try {
                    setDb(JSON.parse(sDb));
                } catch (e) { console.error(e); }
            }
            
            let loadedConfig = DEFAULT_CONFIG;
            if (sCfg) {
                try {
                    const parsed = JSON.parse(sCfg);
                    loadedConfig = { ...DEFAULT_CONFIG, ...parsed };
                    
                    // Ensure URL is preserved from default if missing in local but exists in default
                    if (DEFAULT_CONFIG.googleAppsScriptUrl && !parsed.googleAppsScriptUrl) {
                        loadedConfig.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
                    }
                } catch (e) { console.error(e); }
            }
            setConfig(loadedConfig);
            
            // Auto Login Check
            if (autoLogin === 'teacher') {
                setUserRole('teacher');
            }

            // Load admin order
            const sOrder = localStorage.getItem('admin_order_v2');
            if (sOrder) {
                try {
                    const parsedOrder = JSON.parse(sOrder);
                    if (!parsedOrder.includes('learning_manage')) parsedOrder.splice(2, 0, 'learning_manage');
                    if (!parsedOrder.includes('challenges_manage')) parsedOrder.splice(3, 0, 'challenges_manage');
                    if (!parsedOrder.includes('cloud_sync')) parsedOrder.unshift('cloud_sync');
                    setAdminOrder(parsedOrder);
                } catch(e) { console.error(e); }
            }

            // --- AUTO LOAD FROM CLOUD ---
            // Only if we have a URL AND we are not in a "just reset" state
            if (skipCloudLoad === 'true') {
                 // Clean up the flag so next reload works normally
                 localStorage.removeItem('bank_skip_cloud_load');
                 console.log("Skipping cloud load due to recent reset.");
            } else if (loadedConfig.googleAppsScriptUrl) {
                await handleCloudLoad(true, loadedConfig);
            }

        } catch (e) {
            console.error("Initialization error", e);
            setConfig(DEFAULT_CONFIG);
        }
    };

    initApp();
  }, []);

  // --- Auto Save Logic ---
  useEffect(() => {
    // If we just loaded from cloud, skip the immediate save trigger
    if (skipAutoSaveRef.current) {
        skipAutoSaveRef.current = false;
        return;
    }

    // Don't auto-save if empty or default (initial render mostly)
    if (Object.keys(db).length === 0 && config === DEFAULT_CONFIG) return;

    const timer = setTimeout(() => {
        if (config.googleAppsScriptUrl) {
            handleCloudSave(true);
        }
    }, 4000); // 4 seconds debounce

    return () => clearTimeout(timer);
  }, [db, config]);


  const handleLogin = (role: UserRole, studentName?: string, remember?: boolean) => {
    setUserRole(role);
    if (role === 'student' && studentName) {
        setLoggedInStudentName(studentName);
        setCurrentView('home');
    }
    if (role === 'teacher' && remember) {
        localStorage.setItem('bank_auto_login', 'teacher');
    }
  };

  const handleLogout = () => {
    setUserRole('guest');
    setLoggedInStudentName(null);
    setCurrentView('home');
    setCart([]);
    localStorage.removeItem('bank_auto_login');
  };
  
  const handleFullReset = () => {
      // Set a flag to prevent immediate cloud reload on refresh
      localStorage.setItem('bank_skip_cloud_load', 'true');

      // Clear all local storage keys related to the app
      localStorage.removeItem('bank_db');
      localStorage.removeItem('bank_cfg');
      localStorage.removeItem('bank_auto_login');
      localStorage.removeItem('admin_order_v2');
      
      // Reset state immediately to prevent visual glitches before reload
      setDb({});
      setConfig(DEFAULT_CONFIG);
      
      // Small delay to ensure storage operations complete and UI feedback is seen
      setTimeout(() => {
          window.location.reload();
      }, 200);
  };

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

  const getThemeVariables = (theme: ThemeType) => {
    if (userRole === 'student') {
       return {
          '--c-bg': '#0f172a',
          '--c-card': '#1e293b',
          '--c-text': '#f1f5f9',
          '--c-accent': '#38bdf8',
          '--c-accent-fg': '#000000',
          '--c-border': 'rgba(56, 189, 248, 0.3)',
       };
    }

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
          '--c-accent': '#2563eb', 
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
                emailMother: studentData.emailMother || final[name].emailMother,
                nameFather: studentData.nameFather || final[name].nameFather,
                phoneFather: studentData.phoneFather || final[name].phoneFather,
                emailFather: studentData.emailFather || final[name].emailFather,
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
        alert(type === 'behavior' ? "הנקודות עודכנו!" : "האלפון עודכן בהצלחה! הנתונים נשמרו בזיכרון.");
      } catch (err) { alert("שגיאה בקובץ"); }
      e.target.value = '';
    }
  };

  const handleSemesterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          try {
              const parsedDb = await parseExcel(e.target.files[0], config);
              const final = { ...db };
              
              Object.entries(parsedDb).forEach(([name, data]) => {
                  const studentData = data as Student;
                  if (final[name]) {
                      final[name] = {
                          ...final[name],
                          semesterScore: studentData.total,
                          semesterLogs: studentData.logs // Save the logs from the excel into semesterLogs
                      };
                  } else {
                      final[name] = {
                          ...studentData,
                          total: 0,
                          logs: [],
                          semesterScore: studentData.total,
                          semesterLogs: studentData.logs // Save the logs from the excel into semesterLogs
                      };
                  }
              });
              saveDb(final);
              alert("נתוני מחצית נטענו בהצלחה! (כולל פירוט התנהגות)");
          } catch (err) {
              alert("שגיאה בטעינת הקובץ");
          }
          e.target.value = '';
      }
  };

  const updateScore = (action: string, value: number) => {
    const newScores = { ...config.actionScores, [action]: value };
    saveConfig({ ...config, actionScores: newScores });
  };
  
  const handleChangePassword = () => {
      if (!loggedInStudentName) return;
      if (newPasswordInput.length < 4) {
          alert("הסיסמה חייבת להכיל לפחות 4 תווים");
          return;
      }
      const updatedStudent = { ...db[loggedInStudentName], password: newPasswordInput };
      saveDb({ ...db, [loggedInStudentName]: updatedStudent });
      alert("הסיסמה שונתה בהצלחה!");
      setShowChangePassword(false);
      setNewPasswordInput("");
  };

  const handleAddStoreItem = () => {
    const newItem: StoreItem = {
      id: Date.now().toString(),
      name: "", emoji: "🎁", price: 50, stock: 10
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
        const base64 = await fileToBase64(e.target.files[0]);
        handleUpdateStoreItem(itemId, 'image', base64);
      } catch (err) {
        alert("שגיאה בהעלאת התמונה");
      }
    }
  };
  
  const handleAddChallenge = () => {
      const newChallenge: Challenge = { id: Date.now().toString(), title: "", reward: 50 };
      saveConfig({ ...config, challenges: [...(config.challenges || []), newChallenge] });
  };

  const handleUpdateChallenge = (id: string, field: keyof Challenge, value: any) => {
      const updated = (config.challenges || []).map(c => c.id === id ? { ...c, [field]: value } : c);
      saveConfig({ ...config, challenges: updated });
  };

  const handleDeleteChallenge = (id: string) => {
      if(window.confirm("למחוק אתגר זה?")) {
          const updated = (config.challenges || []).filter(c => c.id !== id);
          saveConfig({ ...config, challenges: updated });
      }
  };

  const handleAddSubject = () => {
      if (!newSubjectName.trim()) return;
      const current = config.learningSubjects || [];
      if (current.includes(newSubjectName)) { alert("קיים כבר"); return; }
      saveConfig({ ...config, learningSubjects: [...current, newSubjectName] });
      setNewSubjectName("");
  };

  const handleDeleteSubject = (subject: string) => {
      if (!window.confirm(`למחוק את ${subject}? זה לא ימחק את הקבצים, רק את התיקייה.`)) return;
      saveConfig({ ...config, learningSubjects: (config.learningSubjects || []).filter(s => s !== subject) });
  };

  const handleAddResource = () => {
      if (!newResource.title || !newResource.subject || !newResource.url) { alert("נא למלא את כל השדות"); return; }
      const newItem: LearningResource = { id: Date.now().toString(), ...newResource, dateAdded: new Date().toLocaleDateString('he-IL') };
      saveConfig({ ...config, learningResources: [...(config.learningResources || []), newItem] });
      setNewResource({ title: "", subject: "", type: 'link', url: "" });
      alert("התווסף בהצלחה!");
  };

  const handleDeleteResource = (id: string) => {
      if (!window.confirm("למחוק?")) return;
      saveConfig({ ...config, learningResources: (config.learningResources || []).filter(r => r.id !== id) });
  };

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          try {
              const base64 = await fileToBase64(e.target.files[0]);
              setNewResource(prev => ({ ...prev, url: base64, type: 'file' }));
          } catch(err) { alert("שגיאה בקובץ"); }
      }
  };

  const setPresetResource = (type: 'drive' | 'quiz' | 'review') => {
      if (type === 'drive') setNewResource(prev => ({...prev, type: 'link', title: 'תיקיית חומרים (דרייב)', url: ''}));
      else if (type === 'quiz') setNewResource(prev => ({...prev, type: 'form', title: 'בוחן', url: ''}));
      else if (type === 'review') setNewResource(prev => ({...prev, type: 'form', title: 'חזרה למבחן', url: ''}));
  };

  const handleGenerateQuizScript = async () => {
      if (!quizMaterial.trim()) { alert("נא להדביק חומר לימוד לבוחן"); return; }
      setIsGeneratingQuiz(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Analyze the following Hebrew text and create a quiz with 4-5 multiple choice questions.
            Return ONLY a valid JSON array of objects.
            Structure: [{ "q": "Question", "opts": ["Opt1", "Opt2"], "a": 0, "p": 20 }]
            
            Text: ${quizMaterial}
          `;
          const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
          
          let jsonStr = response.text || "[]";
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const questions = JSON.parse(jsonStr);
          const scriptCode = `
function createGeneratedQuiz() {
  var form = FormApp.create('בוחן חדש (נוצר ע"י AI)');
  form.setIsQuiz(true);
  form.addTextItem().setTitle('שם התלמיד').setRequired(true);
  var questions = ${JSON.stringify(questions)};
  questions.forEach(function(q) {
    var item = form.addMultipleChoiceItem();
    var choices = q.opts.map(function(opt, index) { return item.createChoice(opt, index === q.a); });
    item.setTitle(q.q).setPoints(q.p).setChoices(choices);
  });
  Logger.log('Form URL: ' + form.getPublishedUrl());
}`;
          setGeneratedScript(scriptCode);
          setQuizMaterial("");
      } catch (e) { console.error(e); alert("שגיאה ביצירת הבוחן."); } finally { setIsGeneratingQuiz(false); }
  };

  // --- Cloud Sync Logic ---
  const handleCloudSave = async (isAuto = false) => {
    const url = config.googleAppsScriptUrl;
    if (!url) { if (!isAuto) alert("יש להגדיר כתובת סקריפט Google Apps Script"); return; }
    setIsSyncing(true); setSyncStatus('saving');
    try {
      let configToSave = config;
      if (!includeImagesInSync || isAuto) {
          configToSave = { ...config, storeItems: config.storeItems.map(item => ({ ...item, image: undefined })), learningResources: (config.learningResources || []).map(r => r.type === 'file' && r.url.length > 1000 ? { ...r, url: 'OMITTED_AUTO_SAVE' } : r) };
      }
      const response = await fetch(url, { method: 'POST', redirect: 'follow', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ db: db, config: configToSave }) });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      if (result.status === 'success') { if (!isAuto) alert("הנתונים נשמרו בענן בהצלחה!"); setSyncStatus('saved'); setTimeout(() => setSyncStatus('idle'), 2000); } 
      else { if (!isAuto) alert("השמירה בוצעה, אך התקבל דיווח לא שגרתי מהשרת."); setSyncStatus('error'); }
    } catch (e) { console.error(e); setSyncStatus('error'); if (!isAuto) alert(`שגיאה בשמירה לענן: ${(e as Error).message}`); } finally { setIsSyncing(false); }
  };

  const handleCloudLoad = async (isAuto = false, configOverride?: AppConfig) => {
    const url = configOverride?.googleAppsScriptUrl || config.googleAppsScriptUrl;
    if (!url) { if (!isAuto) alert("יש להגדיר כתובת סקריפט Google Apps Script"); return; }
    if(!isAuto && !window.confirm("פעולה זו תדרוס את הנתונים המקומיים. להמשיך?")) return;
    setIsSyncing(true); setSyncStatus('saving');
    try {
      const response = await fetch(url, { redirect: 'follow', credentials: 'omit' });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const data = await response.json();
      skipAutoSaveRef.current = true;
      if (data.db) saveDb(data.db);
      if (data.config) {
          const mergedStoreItems = (data.config.storeItems || []).map((cloudItem: StoreItem) => {
               const localItem = config.storeItems.find(i => i.id === cloudItem.id);
               return { ...cloudItem, image: cloudItem.image || localItem?.image };
          });
          const mergedResources = (data.config.learningResources || []).map((cloudRes: LearningResource) => {
               if (cloudRes.url === 'OMITTED_AUTO_SAVE') {
                   const localRes = (config.learningResources || []).find(r => r.id === cloudRes.id);
                   return { ...cloudRes, url: localRes?.url || '' };
               }
               return cloudRes;
          });
          const mergedConfig = { ...data.config, storeItems: mergedStoreItems, learningResources: mergedResources };
          if (DEFAULT_CONFIG.googleAppsScriptUrl) mergedConfig.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
          saveConfig(mergedConfig);
      }
      if (!isAuto) { alert("הנתונים נטענו בהצלחה!"); window.location.reload(); }
      setSyncStatus('saved'); setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) { console.error(e); setSyncStatus('error'); if (!isAuto) alert(`שגיאה בטעינה: ${(e as Error).message}`); } finally { setIsSyncing(false); }
  };

  const handleGenerateProductAsset = async (item: StoreItem) => {
    setGeneratingItemId(item.id);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        if (!item.name.trim()) {
            const nameResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: "Suggest ONE popular, small, physical prize for a 5th grade classroom store (in Hebrew). Just the name.",
            });
            const suggestedName = nameResponse.text?.trim() || "הפתעה";
            handleUpdateStoreItem(item.id, 'name', suggestedName);
            item.name = suggestedName; 
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `Generate a cute, high-quality, 3D icon of ${item.name} (product) on a plain white background. It should look like a game asset.`,
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
             for (const part of parts) {
                if (part.inlineData) {
                    const base64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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
    const checkoutStudentId = userRole === 'student' ? loggedInStudentName : storeSelectedStudentId;
    if (!checkoutStudentId || cart.length === 0) return;
    
    const student = db[checkoutStudentId];
    if (!student) return;

    let totalCost = 0;
    cart.forEach(item => totalCost += item.price);

    if (student.total < totalCost) {
        alert("שגיאה: אין מספיק נקודות לביצוע העסקה.");
        return;
    }

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

    const updatedStoreItems = config.storeItems.map(storeItem => {
        const countInCart = cart.filter(c => c.id === storeItem.id).length;
        if (countInCart > 0) {
            return { ...storeItem, stock: Math.max(0, storeItem.stock - countInCart) };
        }
        return storeItem;
    });

    saveConfig({ ...config, storeItems: updatedStoreItems });
    setCart([]);
    return true; 
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
    if (userRole === 'student') return;
    const newDb = { ...db };
    if (newDb[studentName]) {
      newDb[studentName] = { ...newDb[studentName], isHiddenFromPodium: true };
      saveDb(newDb);
      const timestamp = Date.now();
      setUndoState({ name: studentName, timestamp });
      setTimeout(() => { setUndoState(current => (current && current.timestamp === timestamp) ? null : current); }, 4000);
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
    if (!phone) { alert("לא נמצא מס' טלפון להורים"); return; }
    const cleanPhone = phone.startsWith('05') ? '972' + phone.substring(1) : phone;
    const message = `שמח להודיע כי בנכם ${student.name} תפקד מצוין השבוע! 🌟`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isEligibleForNachat = (student: Student) => {
    const hasNegatives = student.logs.some(l => l.s < 0);
    const positiveCount = student.logs.filter(l => l.s > 0).length;
    return !hasNegatives && positiveCount >= 2;
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...adminOrder];
    if (direction === 'up') { if (index === 0) return; [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]; } 
    else { if (index === newOrder.length - 1) return; [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]; }
    saveAdminOrder(newOrder);
  };

  // --- Derived State Calculations ---
  // Sort ALL students for the Podium view (which now includes the full list)
  const sorted = (Object.values(db) as Student[]).sort((a, b) => b.total - a.total);
  
  const sortedSemester = (Object.values(db) as Student[])
      .map(s => ({ ...s, total: s.semesterScore || 0 })) 
      .sort((a, b) => b.total - a.total);

  // Apply search filtering to the podium lists directly
  const filteredPodiumList = (podiumMode === 'regular' ? sorted : sortedSemester)
      .filter(s => s.name.includes(searchQuery));

  // Regular filtered list for Contacts view etc
  const filtered = sorted.filter(s => s.name.includes(searchQuery));
  
  const classTotal = (Object.values(db) as Student[]).reduce((sum, s) => sum + s.total, 0);

  const allPurchases = (Object.values(db) as Student[]).flatMap(s => (s.purchases || []).map(p => ({...p, studentName: s.name}))).sort((a, b) => b.timestamp - a.timestamp);

  const tefillahStats = (Object.values(db) as Student[])
    .map(s => {
        const prayerLogs = s.logs.filter(l => l.sub && l.sub.includes('תפיל'));
        const absences = prayerLogs.filter(l => l.k.includes('חיסור') || l.k.includes('איחור')).reduce((sum, l) => sum + l.c, 0);
        const points = prayerLogs.filter(l => l.s > 0).reduce((sum, l) => sum + l.c, 0);
        return { ...s, tefillahScore: points, tefillahAbsences: absences, goodWordsTefillah: points, hasPrayerLogs: prayerLogs.length > 0 };
    })
    .filter(s => s.hasPrayerLogs)
    .sort((a, b) => { if (a.tefillahAbsences !== b.tefillahAbsences) { return a.tefillahAbsences - b.tefillahAbsences; } return b.tefillahScore - a.tefillahScore; });

  let tefillahChampions = tefillahStats.filter(s => !s.isHiddenFromPodium);
  if (tefillahChampions.length > 0) {
      const firstPlace = tefillahChampions[0];
      const allFirstPlaces = tefillahChampions.filter(s => s.tefillahAbsences === firstPlace.tefillahAbsences && s.tefillahScore === firstPlace.tefillahScore);
      if (allFirstPlaces.length > 3) { tefillahChampions = allFirstPlaces; } else { tefillahChampions = tefillahChampions.slice(0, 3); }
  }

  // --- Render Admin Content ---
  const renderAdminSectionContent = (id: string) => {
      switch(id) {
        case 'cloud_sync': return (
            <div className="space-y-4 pt-2">
                <p className="text-xs text-gray-400">סנכרון הנתונים ל-Google Sheets מאפשר גיבוי בענן ושיתוף בין מכשירים. המערכת מבצעת שמירה אוטומטית ברקע.</p>
                <div className="bg-black/20 p-3 rounded-xl border border-border">
                    <label className="text-[10px] text-gray-400 block mb-1">כתובת ה-Web App של הסקריפט</label>
                    <input type="text" value={config.googleAppsScriptUrl || ""} onChange={(e) => saveConfig({...config, googleAppsScriptUrl: e.target.value})} className="bg-transparent border-b border-accent/30 w-full text-xs text-white outline-none" placeholder="https://script.google.com/macros/s/..." />
                </div>
                <button onClick={() => setIncludeImagesInSync(!includeImagesInSync)} className="flex items-center gap-2 p-2 rounded-lg bg-black/10 border border-white/5 w-full text-xs hover:bg-black/20">
                    {includeImagesInSync ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} className="text-gray-500" />}<span className="text-white">כלול תמונות בגיבוי (עלול להיות איטי)</span>
                </button>
                <div className="flex gap-3">
                     <button onClick={() => handleCloudSave(false)} disabled={isSyncing} className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50">{isSyncing ? <RefreshCw size={14} className="animate-spin"/> : <Upload size={14} />} שמור כעת</button>
                     <button onClick={() => handleCloudLoad(false)} disabled={isSyncing} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 border border-white/10">{isSyncing ? <RefreshCw size={14} className="animate-spin"/> : <Download size={14} />} טען כעת</button>
                </div>
            </div>
        );
        case 'import_files': return (
            <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl cursor-pointer active:scale-95 transition"><FileSpreadsheet className="text-green-500 mb-2" size={24} /><span className="text-xs font-bold text-green-500">דיווחי התנהגות</span><input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'behavior')} /></label>
                <label className="flex flex-col items-center justify-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer active:scale-95 transition"><UserPlus className="text-blue-500 mb-2" size={24} /><span className="text-xs font-bold text-blue-500">אלפון כיתתי</span><input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'alfon')} /></label>
                <label className="col-span-2 flex items-center justify-center gap-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl cursor-pointer active:scale-95 transition"><Crown className="text-purple-500 mb-0" size={24} /><span className="text-xs font-bold text-purple-500">טעינת מצטייני מחצית (אקסל)</span><input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleSemesterFileUpload} /></label>
                <button onClick={() => setShowBatchCommenter(true)} className="col-span-2 flex items-center justify-center gap-2 p-4 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl active:scale-95 transition"><GraduationCap className="text-[#d4af37] mb-0" size={24} /><span className="text-xs font-bold text-[#d4af37]">מחולל הערות לתעודה (AI)</span></button>
                <div className="col-span-2 bg-black/20 p-3 rounded-xl border border-border mt-2"><label className="text-[10px] text-gray-400 block mb-1">קוד כניסה למורה</label><input type="text" value={config.teacherPin} onChange={(e) => saveConfig({...config, teacherPin: e.target.value})} className="bg-transparent border-b border-accent/30 w-full text-sm font-bold text-accent outline-none text-center" placeholder="1234" /></div>
            </div>
        );
        case 'learning_manage': return (
            <div className="space-y-4 pt-2">
                <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 p-3 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-[#d4af37] flex items-center gap-1"><Wand2 size={12}/> מחולל בחנים (AI)</h4>
                    <textarea className="w-full h-20 bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none resize-none placeholder-gray-500" placeholder="הדבק כאן את חומר הלימוד..." value={quizMaterial} onChange={(e) => setQuizMaterial(e.target.value)} />
                    <button onClick={handleGenerateQuizScript} disabled={isGeneratingQuiz || !quizMaterial} className="w-full py-2 bg-[#d4af37] text-black font-bold text-xs rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition">{isGeneratingQuiz ? <Loader2 size={14} className="animate-spin"/> : <FileQuestion size={14}/>} צור סקריפט לבוחן</button>
                </div>
                <div className="border-t border-border my-2"></div>
                <div className="flex gap-2 bg-black/20 p-2 rounded-xl border border-white/5"><input type="text" className="flex-1 bg-transparent border-none text-xs text-white outline-none px-2" placeholder="שם מקצוע/תיקייה חדשה..." value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} /><button onClick={handleAddSubject} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">הוסף</button></div>
                <div className="flex flex-wrap gap-2">{(config.learningSubjects || []).map(s => (<div key={s} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full text-xs border border-emerald-500/20"><span>{s}</span><button onClick={() => handleDeleteSubject(s)} className="hover:text-red-400"><X size={12}/></button></div>))}</div>
                <div className="border-t border-border my-2"></div>
                <div className="space-y-3 bg-black/10 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center"><h4 className="text-xs font-bold text-gray-400">הוספת חומר לימוד</h4><div className="flex gap-1"><button onClick={() => setPresetResource('drive')} className="p-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-[10px] flex items-center gap-1"><HardDrive size={10}/> דרייב</button><button onClick={() => setPresetResource('quiz')} className="p-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 text-[10px] flex items-center gap-1"><FileQuestion size={10}/> בוחן</button><button onClick={() => setPresetResource('review')} className="p-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 text-[10px] flex items-center gap-1"><FileText size={10}/> חזרה</button></div></div>
                    <input type="text" placeholder="כותרת" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" value={newResource.title} onChange={(e) => setNewResource({...newResource, title: e.target.value})} />
                    <div className="flex gap-2"><select className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none flex-1" value={newResource.subject} onChange={(e) => setNewResource({...newResource, subject: e.target.value})}><option value="">בחר מקצוע...</option>{(config.learningSubjects || []).map(s => <option key={s} value={s}>{s}</option>)}</select><select className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none flex-1" value={newResource.type} onChange={(e) => setNewResource({...newResource, type: e.target.value as ResourceType})}><option value="link">קישור / דרייב / Forms</option><option value="file">קובץ להורדה</option><option value="video">סרטון</option></select></div>
                    {newResource.type === 'file' ? (<input type="file" onChange={handleResourceFileUpload} className="text-xs text-gray-400"/>) : (<input type="text" placeholder="כתובת URL" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" value={newResource.url} onChange={(e) => setNewResource({...newResource, url: e.target.value})} />)}
                    <button onClick={handleAddResource} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-emerald-500 transition">שמור חומר לימוד</button>
                </div>
                <div className="max-h-40 overflow-y-auto pr-1 space-y-2">{(config.learningResources || []).map(res => (<div key={res.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 text-xs"><div className="truncate flex-1 flex items-center gap-2">{res.url.includes('drive') && <HardDrive size={12} className="text-blue-500"/>}{res.url.includes('forms') && <FileQuestion size={12} className="text-purple-500"/>}<span className="text-emerald-400 font-bold">{res.subject}:</span> {res.title}</div><button onClick={() => handleDeleteResource(res.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14}/></button></div>))}</div>
            </div>
        );
        case 'challenges_manage': return (
            <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-border pb-2"><span className="text-xs text-gray-400">אתגרים פעילים: {(config.challenges || []).length}</span><button onClick={handleAddChallenge} className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:brightness-110"><Plus size={14}/> הוסף אתגר</button></div>
                <div className="space-y-3">
                    {(config.challenges || []).length === 0 && <p className="text-gray-500 text-xs text-center py-2">אין אתגרים מוגדרים</p>}
                    {(config.challenges || []).map(challenge => (
                        <div key={challenge.id} className="flex gap-2 bg-black/20 p-2 rounded-xl border border-white/5 items-center">
                            <Target size={20} className="text-orange-500 shrink-0" />
                            <div className="flex-1 space-y-1"><input type="text" className="w-full bg-transparent border-b border-white/10 text-sm font-bold text-txt outline-none focus:border-orange-500" placeholder="שם האתגר" value={challenge.title} onChange={(e) => handleUpdateChallenge(challenge.id, 'title', e.target.value)} /></div>
                            <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded"><span className="text-[10px] text-gray-500">ניקוד:</span><input type="number" className="w-10 bg-transparent text-xs text-orange-400 font-bold outline-none text-center" value={challenge.reward} onChange={(e) => handleUpdateChallenge(challenge.id, 'reward', parseInt(e.target.value) || 0)} /></div>
                            <button onClick={() => handleDeleteChallenge(challenge.id)} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
        );
        case 'store_manage': return (
             <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-border pb-2"><span className="text-xs text-gray-400">מוצרים: {config.storeItems.length}</span><button onClick={handleAddStoreItem} className="text-xs bg-accent text-accent-fg px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:brightness-110"><Plus size={14}/> הוסף מוצר</button></div>
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                    {config.storeItems.map((item) => (
                        <div key={item.id} className="bg-black/20 p-3 rounded-xl border border-border flex items-center gap-3">
                            <div className="relative group shrink-0"><label className="w-14 h-14 bg-black/40 rounded-lg flex items-center justify-center cursor-pointer border border-white/10 hover:border-accent transition overflow-hidden">{item.image ? (<img src={item.image} className="w-full h-full object-cover" />) : (<span className="text-2xl">{item.emoji}</span>)}<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ImageIcon size={16} className="text-white"/></div><input type="file" className="hidden" accept="image/*" onChange={(e) => handleStoreItemImageUpload(e, item.id)} /></label></div>
                            <div className="flex-1 space-y-2 min-w-0"><div className="flex gap-2"><input value={item.name} onChange={(e) => handleUpdateStoreItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 text-sm font-bold text-txt outline-none focus:border-accent" placeholder="שם הפריט" /><button onClick={() => handleGenerateProductAsset(item)} disabled={generatingItemId === item.id} className="text-accent hover:text-white transition-colors bg-accent/10 hover:bg-accent/20 p-1.5 rounded-lg">{generatingItemId === item.id ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}</button></div><div className="flex items-center gap-2"><div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded"><span className="text-[10px] text-gray-500">מחיר:</span><input type="number" value={item.price} onChange={(e) => handleUpdateStoreItem(item.id, 'price', parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-xs text-accent font-bold outline-none focus:border-accent text-center" placeholder="0" /></div><div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded"><span className="text-[10px] text-gray-500">מלאי:</span><input type="number" value={item.stock} onChange={(e) => handleUpdateStoreItem(item.id, 'stock', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-xs text-white font-bold outline-none focus:border-accent text-center" placeholder="∞" /></div></div></div>
                            <button onClick={() => handleDeleteStoreItem(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 shrink-0"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-border"><h4 className="text-xs font-bold text-gray-400 mb-2">היסטוריית רכישות חודשית</h4><div className="bg-black/20 rounded-xl p-2 max-h-40 overflow-y-auto text-xs">{allPurchases.length === 0 && <p className="text-center text-gray-500 py-2">אין רכישות עדיין</p>}{allPurchases.map((p, i) => (<div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"><span>{p.studentName} רכש/ה <b>{p.itemName}</b></span><span className="text-gray-500 text-[10px]">{p.date}</span></div>))}</div></div>
             </div>
        );
        case 'score_settings': return (
            <div className="grid grid-cols-2 gap-3 pt-2">{Object.entries(config.actionScores).map(([action, score]) => (<div key={action} className="bg-black/20 p-3 rounded-xl border border-border"><label className="text-[10px] text-gray-400 block mb-1">{action}</label><input type="number" className="bg-transparent border-b border-accent/30 w-full text-sm font-bold text-accent outline-none text-center" value={score} onChange={(e) => updateScore(action, parseInt(e.target.value) || 0)} /></div>))}</div>
        );
        case 'rules_manage': return (<div className="pt-2"><textarea className="w-full h-32 bg-black/20 rounded-xl border border-white/10 p-4 text-sm text-txt/80 focus:border-accent outline-none resize-none" value={config.rules} onChange={(e) => saveConfig({...config, rules: e.target.value})} placeholder="הדבק כאן את התקנון הכיתתי..." /></div>);
        case 'general_settings': return (
            <div className="pt-2 space-y-3"><div className="bg-black/20 p-3 rounded-xl border border-border"><label className="text-xs font-bold text-gray-400 block mb-1 flex items-center gap-2"><Phone size={12}/> טלפון המורה (לקבלת עדכוני רכישה)</label><input type="tel" placeholder="לדוגמה: 0501234567" className="w-full bg-transparent border-b border-white/10 p-1 text-sm text-white outline-none focus:border-accent" value={config.teacherCell} onChange={(e) => saveConfig({...config, teacherCell: e.target.value})} /><p className="text-[10px] text-gray-500 mt-1">מספר זה ישמש לשליחת וואטסאפ אוטומטי של רכישות</p></div></div>
        );
        case 'backup_reset': return (<div className="grid grid-cols-2 gap-3 pt-2"><button onClick={handleBackup} className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/5 active:bg-white/10 transition-colors text-txt"><Download size={16}/> גיבוי</button><button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 p-4 bg-red-500/10 rounded-2xl text-xs font-bold text-red-500 border border-red-500/10 active:bg-red-500/20 transition-colors"><Trash2 size={16}/> איפוס מלא</button></div>);
        case 'theme_settings': return (<div className="flex gap-2 pt-2">{['current', 'modern', 'simple'].map((t) => (<button key={t} onClick={() => saveConfig({ ...config, theme: t as ThemeType })} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${config.theme === t ? 'bg-accent text-accent-fg border-accent shadow-lg scale-105' : 'bg-black/20 text-gray-400 border-transparent hover:bg-black/30'}`}>{t === 'current' ? 'נוכחי' : t === 'modern' ? 'מודרני' : 'פשוט'}</button>))}</div>);
        default: return null;
      }
  };

  if (currentView === 'learning') return <LearningCenter config={config} onClose={() => setCurrentView('home')} />;
  if (userRole === 'guest') return <LoginScreen students={Object.values(db)} teacherPin={config.teacherPin} onLogin={handleLogin} onEnterLearning={() => setCurrentView('learning')} logo={config.logo} />;

  return (
    <div className="flex flex-col h-screen bg-primary text-txt overflow-hidden font-sans transition-colors duration-300" style={themeVars as React.CSSProperties}>
      <header className="fixed top-0 left-0 right-0 h-16 bg-primary/80 backdrop-blur-md border-b border-accent/20 px-5 flex justify-between items-center z-40 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          {config.logo ? <img src={config.logo} className="w-9 h-9 rounded-full border border-accent object-cover shadow-sm" /> : <div className="w-9 h-9 rounded-full border border-accent/30 bg-accent/10 flex items-center justify-center text-accent shadow-sm"><Coins size={18} /></div>}
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-accent tracking-tight leading-none">הבנק הכיתתי</h1>
                {config.googleAppsScriptUrl && (<div title={syncStatus === 'saving' ? "שומר..." : syncStatus === 'saved' ? "נשמר בענן" : "מסונכרן"}>{syncStatus === 'saving' ? <RefreshCw size={12} className="text-gray-400 animate-spin" /> : <Check size={12} className="text-green-500" />}</div>)}
            </div>
            <p className="text-[9px] font-bold text-accent/50 uppercase tracking-widest leading-tight">{config.slogan}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {userRole === 'teacher' && <button onClick={() => setCurrentView('contacts')} className="w-9 h-9 flex items-center justify-center bg-card/50 rounded-full text-accent border border-white/5 active:bg-white/10 active:scale-95 transition-all shadow-sm"><Users size={18} /></button>}
          <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center bg-red-500/10 rounded-full text-red-400 border border-red-500/20 active:bg-red-500/20 active:scale-95 transition-all shadow-sm"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-primary">
          {userRole === 'student' && loggedInStudentName && db[loggedInStudentName] ? (
              <div className="absolute inset-0 overflow-y-auto pt-20 pb-24 px-4 scroll-smooth no-scrollbar custom-scroll-container">
                  {currentView === 'store' ? <StoreView students={Object.values(db)} config={config} onCheckout={handleCheckout} cart={cart} setCart={setCart} selectedStudentId={loggedInStudentName} setSelectedStudentId={() => {}} /> : (
                      <div className="space-y-6 pb-8">
                          {/* Student Dashboard... (Same as before) */}
                          <div className="bg-gradient-to-br from-blue-900/50 to-blue-600/20 border border-blue-500/30 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                              <div className="relative z-10 flex justify-between items-start">
                                  <div><h2 className="text-2xl font-black text-white mb-1">היי {loggedInStudentName.split(' ')[0]}! 👋</h2><p className="text-blue-200 text-xs mb-4">הנה המצב הנוכחי שלך בבנק הכיתתי</p></div>
                                  <button onClick={() => setShowChangePassword(true)} className="bg-black/20 hover:bg-black/40 p-2 rounded-xl text-white transition-colors"><Lock size={18} /></button>
                              </div>
                              <div className="flex justify-between items-end relative z-10"><div><span className="text-[10px] text-gray-400 block mb-1">היתרה שלך</span><span className="text-4xl font-black text-blue-400 tracking-tight">{db[loggedInStudentName].total}₪</span></div><div className="bg-blue-500/10 p-3 rounded-full text-blue-400 border border-blue-500/20"><Trophy size={24} /></div></div>
                          </div>
                          {/* ... other student widgets */}
                          {(config.challenges || []).length > 0 && (
                              <div className="space-y-2">
                                  <h3 className="text-sm font-bold text-gray-400 pr-2 flex items-center gap-2"><Target size={16} className="text-orange-500"/> אתגרים פעילים</h3>
                                  <div className="flex gap-3 overflow-x-auto pb-2 px-1 no-scrollbar">{config.challenges.map(challenge => (<div key={challenge.id} className="min-w-[140px] bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30 p-3 rounded-2xl flex flex-col justify-between items-start shadow-sm"><span className="text-xs font-bold text-white line-clamp-2 h-8">{challenge.title}</span><span className="text-lg font-black text-orange-400">+{challenge.reward}</span></div>))}</div>
                              </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setCurrentView('store')} className="p-4 bg-accent/10 border border-accent/20 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition"><Store size={24} className="text-accent" /><span className="text-xs font-bold text-accent">לחנות ההפתעות</span></button>
                              <button onClick={() => setCurrentView('learning')} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition"><BookOpen size={24} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-400">מרכז למידה</span></button>
                          </div>
                          <div className="space-y-3"><h3 className="text-sm font-bold text-gray-400 pr-2">היסטוריית פעולות</h3>{db[loggedInStudentName].logs.length === 0 ? (<div className="text-center py-8 text-gray-500 text-xs">עדיין אין נתונים להצגה</div>) : (db[loggedInStudentName].logs.slice().reverse().slice(0, 10).map((log, idx) => (<div key={idx} className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center shadow-sm"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${log.s > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{log.s > 0 ? <Plus size={14}/> : <MinusCircle size={14}/>}</div><div><p className="font-bold text-sm text-txt">{log.k}</p><p className="text-[10px] text-gray-500">{log.d} • {log.sub}</p></div></div><span className={`font-black ${log.s > 0 ? 'text-green-500' : 'text-red-500'}`}>{log.s > 0 ? '+' : ''}{log.s}</span></div>)))}</div>
                      </div>
                  )}
              </div>
          ) : (
            <>
            {(currentView === 'home' || currentView === 'admin' || currentView === 'contacts') && (
                <div className="absolute inset-0 overflow-y-auto pt-20 pb-40 px-4 scroll-smooth no-scrollbar custom-scroll-container">
                    {currentView === 'home' && (
                        <div className="space-y-4 flex flex-col min-h-full">
                        
                        {/* Search Bar - Moved to Top */}
                        <div className="bg-black/10 border border-white/5 rounded-2xl p-2 flex items-center gap-2">
                            <Search size={16} className="text-gray-500 mr-2" />
                            <input 
                                type="text" 
                                placeholder="חפש תלמיד בפודיום..." 
                                className="bg-transparent text-sm text-white w-full outline-none placeholder-gray-500"
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                            />
                            {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} className="text-gray-500"/></button>}
                        </div>

                        {/* Podium Toggle */}
                        <div className="flex justify-center mb-2">
                             <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                 <button onClick={() => setPodiumMode('regular')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${podiumMode === 'regular' ? 'bg-accent text-accent-fg shadow-lg' : 'text-gray-400 hover:text-white'}`}>מצטיין שבועי</button>
                                 <button onClick={() => setPodiumMode('semester')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${podiumMode === 'semester' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Crown size={12} /> אלוף המחצית</button>
                             </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center min-h-[30vh]">
                            <Podium 
                                students={filteredPodiumList.filter(s => !s.isHiddenFromPodium)} 
                                onRemoveStudent={handleRemoveFromPodium}
                                onStudentClick={(student) => { 
                                    const realStudent = db[student.name];
                                    if (realStudent) {
                                        if (podiumMode === 'semester') {
                                             // In Semester Mode, we show historical logs
                                             setSelectedStudent({
                                                 ...realStudent,
                                                 logs: realStudent.semesterLogs || [],
                                                 total: realStudent.semesterScore || 0
                                             });
                                             setDetailsFilter("SEMESTER_MODE");
                                        } else {
                                            setSelectedStudent(realStudent); 
                                            setDetailsFilter("");
                                        }
                                    }
                                }}
                            />
                        </div>
                        
                        <div className="bg-gradient-to-r from-accent/10 to-card border border-accent/20 p-5 rounded-3xl flex justify-between items-center shadow-lg active:scale-[0.99] transition-transform">
                            <div className="flex items-center gap-4">
                                <div className="bg-accent p-2.5 rounded-2xl text-accent-fg shadow-lg shadow-accent/20"><Coins size={22} /></div>
                                <div><span className="text-[10px] font-bold text-accent/70 uppercase tracking-widest block mb-0.5">קופה כיתתית</span><span className="font-bold text-txt text-sm">סך הכל נקודות</span></div>
                            </div>
                            <span className="text-3xl font-black text-accent drop-shadow-sm">{classTotal}₪</span>
                        </div>

                        {/* Tefillah Corner - Collapsible */}
                        <div className="bg-card border border-accent/30 rounded-3xl overflow-hidden shadow-lg transition-all">
                            <button onClick={() => setIsTefillahOpen(!isTefillahOpen)} className="w-full p-4 flex justify-between items-center bg-gradient-to-r from-transparent via-accent/5 to-transparent active:bg-white/5">
                                <h3 className="font-bold text-accent flex items-center gap-2"><Scroll size={18} /> פינת התפילה</h3>
                                {isTefillahOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                            </button>
                            {isTefillahOpen && (
                                <div className="p-5 pt-0 space-y-3 animate-in slide-in-from-top-2">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
                                    <div className="flex justify-between items-start mt-2"><span className="text-[10px] text-gray-400 bg-black/10 px-2 py-1 rounded-full border border-white/5">מצטייני התפילה</span></div>
                                    <p className="text-xs text-txt/70 italic leading-relaxed border-r-2 border-accent/20 pr-3">"יְהִי רָצוֹן... שֶׁתַּשְׁרֶה שְׁכִינָה בְּמַעֲשֵׂה יָדֵינוּ..."</p>
                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                        {tefillahChampions.map((s, idx) => (
                                            <div key={idx} className="bg-black/10 p-2 rounded-2xl flex flex-col items-center text-center border border-border active:scale-95 transition-transform w-[30%] min-w-[90px]" onClick={() => { setSelectedStudent(s); setDetailsFilter('תפיל'); }}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 shadow-md ${idx === 0 || (s.tefillahScore === tefillahChampions[0].tefillahScore && s.tefillahAbsences === tefillahChampions[0].tefillahAbsences) ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-500'}`}>{idx + 1}</div>
                                            <span className="text-xs font-bold truncate w-full text-txt">{s.name}</span>
                                            <span className="text-[10px] text-accent font-black">{s.tefillahScore}₪</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowAllTefillah(!showAllTefillah)} className="w-full mt-2 py-3 text-[10px] font-bold text-accent/50 uppercase flex justify-center items-center gap-2 border-t border-border bg-black/5 rounded-xl hover:bg-black/10 transition-colors">{showAllTefillah ? 'צמצם רשימת תפילה' : 'הצג את כל הכיתה'} {showAllTefillah ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                                    {showAllTefillah && (
                                        <div className="mt-2 divide-y divide-border bg-black/10 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                            {tefillahStats.map((s, i) => (
                                                <div key={s.name} onClick={() => { setSelectedStudent(s); setDetailsFilter('תפיל'); }} className="p-3 flex justify-between items-center active:bg-white/5 cursor-pointer">
                                                    <div className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/5 text-gray-500`}>{i + 1}</span><div className="flex flex-col"><span className="text-xs font-bold text-txt">{s.name}</span></div></div>
                                                    <span className={`text-xs font-black ${s.tefillahScore > 0 ? 'text-green-500' : 'text-gray-500'}`}>{s.tefillahScore}₪</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowRules(true)} className="w-full bg-card border border-accent/30 rounded-3xl p-4 flex items-center justify-between active:scale-95 transition-transform shadow-md">
                            <div className="flex items-center gap-3"><div className="bg-accent/10 p-2.5 rounded-full text-accent"><Book size={20} /></div><span className="font-bold text-sm text-txt">תקנון הכיתה</span></div>
                            <ChevronDown size={16} className="text-gray-500"/>
                        </button>

                        </div>
                    )}

                    {currentView === 'admin' && (
                        <div className="space-y-4 pb-8">
                        <div className="flex justify-between items-center pb-2 border-b border-border mb-4"><h2 className="text-2xl font-black text-accent flex items-center gap-3"><ShieldCheck size={28}/> ניהול המערכת</h2><button onClick={() => setIsReordering(!isReordering)} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${isReordering ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 border border-white/5'}`}>{isReordering ? 'סיום עריכת סדר' : 'שנה סדר'}</button></div>
                        <div className="space-y-4">
                            {adminOrder.map((sectionId, index) => {
                                const sectionDef = ADMIN_SECTIONS.find(s => s.id === sectionId);
                                if (!sectionDef) return null;
                                const isCollapsed = adminCollapsed[sectionId];
                                const isAlwaysExpanded = sectionId === 'import_files' || sectionId === 'backup_reset' || sectionId === 'theme_settings';
                                return (
                                    <div key={sectionId} className={`bg-card rounded-[2rem] border border-border shadow-md overflow-hidden transition-all ${isReordering ? 'opacity-80 scale-[0.98] border-dashed border-accent' : ''}`}>
                                        <div className={`p-4 flex items-center justify-between ${!isAlwaysExpanded ? 'cursor-pointer active:bg-white/5' : ''}`} onClick={() => { if (isReordering) return; if (!isAlwaysExpanded) toggleAdminSection(sectionId); }}>
                                            <div className="flex items-center gap-3">{isReordering && (<div className="flex flex-col gap-1 mr-2"><button onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }} disabled={index === 0} className="text-gray-500 disabled:opacity-20 hover:text-white"><ArrowUp size={14}/></button><button onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }} disabled={index === adminOrder.length - 1} className="text-gray-500 disabled:opacity-20 hover:text-white"><ArrowDown size={14}/></button></div>)}<div className={`p-2 rounded-xl ${sectionDef.bg} ${sectionDef.color}`}><sectionDef.icon size={20} /></div><h3 className="font-bold text-sm text-txt uppercase tracking-wide">{sectionDef.label}</h3></div>{!isAlwaysExpanded && !isReordering && (isCollapsed ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronUp size={16} className="text-gray-500"/>)}
                                        </div>
                                        {(!isCollapsed || isAlwaysExpanded) && (<div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in">{renderAdminSectionContent(sectionId)}</div>)}
                                    </div>
                                );
                            })}
                        </div>
                        </div>
                    )}

                    {currentView === 'contacts' && (
                        <div className="space-y-4 pb-6"><h2 className="text-2xl font-black text-accent flex items-center gap-3"><Users size={28}/> ספר טלפונים</h2>{sorted.map(s => (<div key={s.name} className="bg-card p-5 rounded-3xl border border-border flex justify-between items-center shadow-md active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { setSelectedStudent(s); setDetailsFilter(""); }}><div><p className="font-bold text-sm text-txt">{s.name}</p><p className="text-[10px] text-gray-500 mt-1">{s.nameMother ? `אמא: ${s.nameMother}` : 'חסר פרטי אם'} • {s.nameFather ? `אבא: ${s.nameFather}` : 'חסר פרטי אב'}</p></div><div className="p-3 bg-accent/10 rounded-full text-accent shadow-sm"><Phone size={20} /></div></div>))}</div>
                    )}
                </div>
            )}

            {currentView === 'seating' && (<div className="absolute inset-0 pt-16 pb-24 px-0 overflow-hidden"><SeatingChart students={Object.values(db)} onUpdateStudent={(s) => saveDb({ ...db, [s.name]: s })} onBatchUpdate={(updates) => { const newDb = { ...db }; updates.forEach(s => newDb[s.name] = s); saveDb(newDb); }} /></div>)}
            {currentView === 'store' && (<div className="absolute inset-0 pt-16 pb-24 px-0 overflow-hidden"><StoreView students={Object.values(db)} config={config} onCheckout={handleCheckout} cart={cart} setCart={setCart} selectedStudentId={storeSelectedStudentId} setSelectedStudentId={setStoreSelectedStudentId} /></div>)}
            </>
          )}

      </main>
      
      {undoState && (<div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 w-[90%] max-w-sm"><div className="bg-[#333] border border-white/10 text-white px-4 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md"><div className="flex items-center gap-2 text-sm"><span className="text-gray-400 text-xs">הוסר מהפודיום:</span><span className="font-bold truncate max-w-[120px]">{undoState.name}</span></div><button onClick={handleUndoRemove} className="flex items-center gap-1 text-accent font-bold text-sm bg-white/5 px-3 py-1 rounded-full active:bg-white/10"><Undo size={14} /> ביטול</button></div></div>)}
      {showChangePassword && (<div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in"><div className="bg-[#1e293b] border border-blue-500/30 w-full max-w-sm p-8 rounded-3xl shadow-2xl relative"><button onClick={() => {setShowChangePassword(false); setNewPasswordInput("");}} className="absolute top-4 left-4 text-gray-400 hover:text-white"><X size={20} /></button><div className="text-center mb-6"><div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400"><KeyRound size={32} /></div><h3 className="text-xl font-bold text-white">החלפת סיסמה אישית</h3><p className="text-gray-400 text-xs mt-2">הגדר קוד חדש במקום 1234</p></div><div className="mb-6"><input type="tel" maxLength={4} placeholder="הכנס קוד חדש (4 ספרות)" className="w-full bg-black/40 border border-blue-500/30 text-white text-center text-2xl tracking-widest p-4 rounded-xl outline-none focus:border-blue-500 transition-colors" value={newPasswordInput} onChange={(e) => { if (/^\d*$/.test(e.target.value)) { setNewPasswordInput(e.target.value); } }} /></div><button onClick={handleChangePassword} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform">שמור סיסמה חדשה</button></div></div>)}

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-5 left-4 right-4 bg-card/85 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 max-w-md mx-auto">
        <button onClick={() => setCurrentView('home')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView === 'home' ? 'bg-accent text-accent-fg shadow-lg shadow-accent/20 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Home size={22} /></button>
        {userRole === 'teacher' && (<button onClick={() => setCurrentView('seating')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView === 'seating' ? 'bg-accent text-accent-fg shadow-lg shadow-accent/20 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><LayoutGrid size={22} /></button>)}
        <button onClick={() => setCurrentView('store')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView === 'store' ? 'bg-accent text-accent-fg shadow-lg shadow-accent/20 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><ShoppingBag size={22} /></button>
        {userRole === 'teacher' && (<button onClick={() => setCurrentView('admin')} className={`p-3.5 rounded-full transition-all duration-300 ${currentView === 'admin' ? 'bg-accent text-accent-fg shadow-lg shadow-accent/20 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><ShieldCheck size={22} /></button>)}
      </nav>

      {selectedStudent && (
        <StudentDetails 
          student={selectedStudent} 
          config={config} 
          filterKeyword={detailsFilter}
          onClose={() => setSelectedStudent(null)}
          onDeleteLog={(name, idx) => { if (userRole === 'student') return; const s = db[name]; if (!s) return; const newLogs = [...s.logs]; const [deletedLog] = newLogs.splice(idx, 1); const newTotal = s.total - (deletedLog?.s || 0); const updatedStudent = { ...s, logs: newLogs, total: newTotal }; saveDb({ ...db, [name]: updatedStudent }); if (selectedStudent?.name === name) setSelectedStudent(updatedStudent); }}
          onAddLog={(name, log) => { if (userRole === 'student') return; const s = db[name]; if (s) { const newTotal = s.total + log.s; const updatedStudent = { ...s, logs: [...s.logs, log], total: newTotal }; saveDb({ ...db, [name]: updatedStudent }); if (selectedStudent?.name === name) setSelectedStudent(updatedStudent); } }}
          onMarkNachat={(name) => { const s = db[name]; if (s) { const updatedStudent = { ...s, lastNachatDate: new Date().toLocaleDateString('he-IL') }; saveDb({ ...db, [name]: updatedStudent }); if (selectedStudent?.name === name) setSelectedStudent(updatedStudent); } }}
          onUpdateStudent={(updatedStudent) => { if (userRole === 'student') return; saveDb({ ...db, [updatedStudent.name]: updatedStudent }); if (selectedStudent?.name === updatedStudent.name) setSelectedStudent(updatedStudent); }}
          isAuthenticated={userRole === 'teacher'}
        />
      )}

      {showRules && (
         <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-[2rem] border border-accent/30 p-8 relative shadow-2xl">
               <button onClick={() => setShowRules(false)} className="absolute top-4 left-4 p-2 bg-white/5 rounded-full text-txt hover:bg-white/10 active:scale-90 transition-transform"><X size={20}/></button>
               <div className="text-center mb-6"><div className="inline-block p-3 rounded-full bg-accent/10 text-accent mb-2"><Book size={32} /></div><h2 className="text-2xl font-black text-accent">תקנון הכיתה</h2></div>
               <div className="text-txt/80 whitespace-pre-line leading-relaxed text-center text-sm font-medium">{config.rules}</div>
            </div>
         </div>
      )}
      
      {generatedScript && (
         <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-card w-full max-w-lg rounded-[2rem] border border-[#d4af37]/30 p-8 shadow-2xl relative flex flex-col gap-4">
                <button onClick={() => setGeneratedScript(null)} className="absolute top-4 left-4 p-2 bg-white/5 rounded-full text-txt hover:bg-white/10 active:scale-90 transition-transform"><X size={20}/></button>
                <div className="text-center"><div className="inline-block p-3 rounded-full bg-[#d4af37]/10 text-[#d4af37] mb-2"><FileQuestion size={32} /></div><h2 className="text-2xl font-black text-[#d4af37]">הסקריפט מוכן!</h2><p className="text-txt/70 text-sm mt-1">העתק את הקוד והדבק אותו בעורך הסקריפטים של גוגל</p></div>
                <div className="relative group"><textarea readOnly value={generatedScript} className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-green-400 outline-none resize-none focus:border-[#d4af37]/50" /><button onClick={() => { navigator.clipboard.writeText(generatedScript).then(() => alert("הקוד הועתק!")).catch(e => alert("שגיאה בהעתקה: " + e)); }} className="absolute top-2 left-2 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5" title="העתק ללוח"><Copy size={16} /></button></div>
                <button onClick={() => window.open('https://script.google.com/home', '_blank')} className="w-full py-3 bg-[#d4af37] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-95"><ExternalLink size={18} /> פתח את Google Apps Script</button>
            </div>
         </div>
      )}

      {showBatchCommenter && <BatchCommenter db={db} onSave={(updatedDb) => { saveDb(updatedDb); setShowBatchCommenter(false); }} onClose={() => setShowBatchCommenter(false)} />}
      {showResetConfirm && (<div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in"><div className="bg-card w-full max-w-sm rounded-[2rem] border border-red-500/30 p-8 text-center"><div className="inline-block p-4 rounded-full bg-red-500/10 text-red-500 mb-4"><Trash2 size={40} /></div><h3 className="text-2xl font-bold text-red-500 mb-2">אזהרה!</h3><p className="text-txt/70 mb-8 text-sm leading-relaxed">פעולה זו תמחק את כל הנתונים, התלמידים וההגדרות.<br/>האם להמשיך?</p><div className="flex gap-3"><button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3.5 bg-white/10 rounded-2xl font-bold text-txt active:scale-95 transition-transform">ביטול</button><button onClick={handleFullReset} className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-transform">כן, אפס הכל</button></div></div></div>)}
    </div>
  );
}
