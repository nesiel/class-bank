
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Database, Student, AppConfig, DEFAULT_CONFIG, ThemeType, StoreItem, Purchase, UserRole, Challenge, LearningResource, ResourceType } from './types';
import { parseExcel, fileToBase64, parseGradesExcel } from './utils';
import { Podium } from './components/Podium';
import { StudentDetails } from './components/StudentDetails';
import { SeatingChart } from './components/SeatingChart';
import { StoreView } from './components/StoreView';
import { BatchCommenter } from './components/BatchCommenter';
import { LoginScreen } from './components/LoginScreen';
import { LearningCenter } from './components/LearningCenter';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, ShieldCheck, ChevronUp, ChevronDown, Settings, Trash2, Trophy, FileSpreadsheet, Coins, Users, Phone, Download, UserPlus, LayoutGrid, Book, X, PlusCircle, ArrowUp, ArrowDown, GripVertical, MessageCircle, Undo, Scroll, Star, AlertCircle, Palette, Store, Image as ImageIcon, ShoppingBag, Plus, Package, Wand2, Loader2, Save, GraduationCap, LogOut, MinusCircle, KeyRound, Lock, Target, Cloud, Upload, RefreshCw, CheckSquare, Square, Check, BookOpen, Link as LinkIcon, FileText, HardDrive, FileQuestion, Copy, ExternalLink, Crown, Search, Activity, Eye, EyeOff, Power, BrainCircuit, FileType
} from 'lucide-react';

// Define the available admin sections
const ADMIN_SECTIONS = [
  { id: 'cloud_sync', label: 'סנכרון לענן (Google Sheets)', icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'import_files', label: 'ייבוא נתונים (אקסל)', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'learning_manage', label: 'ניהול מרכז למידה ו-AI', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'challenges_manage', label: 'ניהול אתגרים', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'store_manage', label: 'ניהול חנות ומלאי', icon: Store, color: 'text-accent', bg: 'bg-accent/10' },
  { id: 'score_settings', label: 'הגדרות ניקוד', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'rules_manage', label: 'עריכת תקנון', icon: Book, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'general_settings', label: 'הגדרות כלליות ואבטחה', icon: Phone, color: 'text-gray-400', bg: 'bg-gray-500/10' },
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
  const [isStudentListExpanded, setIsStudentListExpanded] = useState(false); // Default collapsed
  
  // Podium State
  const [podiumMode, setPodiumMode] = useState<'regular' | 'grades'>('regular');

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
  
  // AI Generator State (Quiz & Study Guide)
  const [aiSourceText, setAiSourceText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{type: 'script' | 'text', content: string} | null>(null);
  
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
                    // FIXED: Ensure parsed is an object and not null before spreading
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        loadedConfig = Object.assign({}, DEFAULT_CONFIG, parsed);
                        
                        // Ensure URL is preserved from default if missing in local but exists in default
                        if (DEFAULT_CONFIG.googleAppsScriptUrl && !loadedConfig.googleAppsScriptUrl) {
                            loadedConfig.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
                        }
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
      // Create a clean version of the DB: Keep students, reset scores/logs
      const newDb: Database = {};
      Object.entries(db).forEach(([key, student]) => {
          newDb[key] = {
              ...(student as Student),
              total: 0,
              logs: [],
              purchases: [],
              requests: [], // Reset requests
              lastNachatDate: undefined,
              semesterScore: undefined,
              semesterLogs: undefined,
              grades: undefined,
              academicReinforcement: undefined,
              certificateComment: undefined
          };
      });

      // Save the cleaned DB
      saveDb(newDb);
      
      // We DO NOT reset the config (so Learning Center, Store, Rules remain)
      // saveConfig(DEFAULT_CONFIG); 

      // Set a flag to prevent immediate cloud reload on refresh overriding our reset
      localStorage.setItem('bank_skip_cloud_load', 'true');
      
      alert("התקופה אופסה בהצלחה!\n\nנשמרו:\n✅ רשימת התלמידים (אלפון)\n✅ מרכז הלמידה והחנות\n✅ הגדרות וסיסמאות\n\nנמחקו:\n❌ ניקוד והיסטוריית פעולות");
      
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
          const currentStudent = final[name]; // Alias to prevent TS spread error
          if (currentStudent) {
            if (type === 'behavior') {
              final[name] = { 
                ...currentStudent, 
                total: currentStudent.total + studentData.total, 
                logs: [...currentStudent.logs, ...studentData.logs] 
              };
            } else {
              final[name] = { 
                ...currentStudent,
                nameMother: studentData.nameMother || currentStudent.nameMother,
                phoneMother: studentData.phoneMother || currentStudent.phoneMother,
                emailMother: studentData.emailMother || currentStudent.emailMother,
                nameFather: studentData.nameFather || currentStudent.nameFather,
                phoneFather: studentData.phoneFather || currentStudent.phoneFather,
                emailFather: studentData.emailFather || currentStudent.emailFather,
                studentCell: studentData.studentCell || currentStudent.studentCell,
                studentEmail: studentData.studentEmail || currentStudent.studentEmail,
                homePhone: studentData.homePhone || currentStudent.homePhone
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

  const handleGradesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          try {
              const gradesData = await parseGradesExcel(e.target.files[0]);
              const final = { ...db };
              
              let updatedCount = 0;
              Object.entries(gradesData).forEach(([name, grades]) => {
                  const currentStudent = final[name]; // Alias to prevent TS spread error
                  if (currentStudent) {
                      final[name] = { ...currentStudent, grades: grades };
                      updatedCount++;
                  }
              });
              
              saveDb(final);
              alert(`ציונים עודכנו עבור ${updatedCount} תלמידים בהצלחה!`);
          } catch (err) {
              console.error(err);
              alert("שגיאה בטעינת קובץ הציונים. ודא שהמבנה תקין.");
          }
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
                  const currentStudent = final[name]; // Alias to prevent TS spread error
                  if (currentStudent) {
                      final[name] = {
                          ...currentStudent,
                          semesterScore: studentData.total,
                          semesterLogs: studentData.logs 
                      };
                  } else {
                      final[name] = {
                          ...studentData,
                          total: 0,
                          logs: [],
                          semesterScore: studentData.total,
                          semesterLogs: studentData.logs 
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

  // --- AI Logic (Quiz & Study Guide) ---

  const handleGenerateQuiz = async () => {
      if (!aiSourceText.trim()) { alert("נא להדביק חומר לימוד"); return; }
      setIsGeneratingAi(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Analyze the following Hebrew text and create a quiz with 5 multiple choice questions.
            Return ONLY a valid JSON array of objects.
            Structure: [{ "q": "Question", "opts": ["Opt1", "Opt2", "Opt3", "Opt4"], "a": 0, "p": 20 }]
            index "a" is the correct answer (0-3).
            
            Text: ${aiSourceText}
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
  var questions = ${JSON.stringify(questions, null, 2)};
  
  questions.forEach(function(q) {
    var item = form.addMultipleChoiceItem();
    var choices = q.opts.map(function(opt, index) { 
      return item.createChoice(opt, index === q.a); 
    });
    item.setTitle(q.q).setPoints(q.p).setChoices(choices);
  });
  
  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());
}`;
          setAiResult({ type: 'script', content: scriptCode });
      } catch (e) { 
          console.error(e); 
          alert("שגיאה ביצירת הבוחן. נסה שוב או קצר את הטקסט."); 
      } finally { 
          setIsGeneratingAi(false); 
      }
  };

  const handleGenerateStudyGuide = async () => {
      if (!aiSourceText.trim()) { alert("נא להדביק חומר לימוד"); return; }
      setIsGeneratingAi(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Act as a teacher. Create a study guide summary based on the following text in Hebrew.
            
            Structure:
            1. Title: "דף חזרה למבחן"
            2. "סיכום קצר": 3-4 sentences summarizing the core topic.
            3. "מושגים חשובים": A list of key terms and their short definitions.
            4. "שאלות חזרה": 3-4 open-ended review questions for the student to practice.
            
            Keep it clean, formatted, and easy to read.
            
            Text: ${aiSourceText}
          `;
          const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
          
          setAiResult({ type: 'text', content: response.text || "שגיאה ביצירת התוכן." });
      } catch (e) {
          console.error(e);
          alert("שגיאה ביצירת הסיכום.");
      } finally {
          setIsGeneratingAi(false);
      }
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
          const mergedConfig = { ...(data.config as any), storeItems: mergedStoreItems, learningResources: mergedResources };
          if (DEFAULT_CONFIG.googleAppsScriptUrl) mergedConfig.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
          saveConfig(mergedConfig);
      }
      setSyncStatus('saved'); setTimeout(() => setSyncStatus('idle'), 2000);
      if (!isAuto) alert("הנתונים נטענו בהצלחה!");
    } catch (e) { console.error(e); setSyncStatus('error'); if (!isAuto) alert(`שגיאה בטעינה מהענן: ${(e as Error).message}`); } finally { setIsSyncing(false); }
  };

  // --- Render Logic ---
  
  if (userRole === 'guest') {
    return <LoginScreen 
        students={Object.values(db) as Student[]} 
        teacherPin={config.teacherPin} 
        onLogin={handleLogin} 
        onEnterLearning={() => setCurrentView('learning')} 
        logo={config.logo} 
        isSystemLocked={config.isSystemLocked}
    />;
  }
  
  if (currentView === 'learning') {
      return <LearningCenter config={config} onClose={() => { setCurrentView(userRole === 'guest' ? 'home' : 'home'); if(userRole === 'guest') handleLogout(); }} />;
  }
  
  const getPodiumStudents = () => {
    let list = (Object.values(db) as Student[]).filter(s => !s.isHiddenFromPodium);
    
    // Mode: Average Grades
    if (podiumMode === 'grades') {
         return list.map(s => {
            const grades = s.grades || [];
            const avg = grades.length > 0 
                ? Math.round(grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / grades.length)
                : 0;
            return { ...s, total: avg }; // Overwrite total just for display in Podium
        }).sort((a, b) => b.total - a.total);
    }
    
    // Mode: Points (Regular)
    return list.sort((a, b) => b.total - a.total);
  };
  
  const handleStudentClick = (student: Student) => {
      // Always look up the real student from DB to get fresh data (including real total points, not average)
      const realStudent = db[student.name] || student;
      setSelectedStudent(realStudent);
  };
  
  return (
    <div className="min-h-screen bg-primary text-txt font-sans" style={themeVars as React.CSSProperties}>
      
      {/* Modals & Overlays */}
      {selectedStudent && (
        <StudentDetails 
          student={selectedStudent} 
          config={config} 
          onClose={() => { setSelectedStudent(null); setDetailsFilter(""); }} 
          onDeleteLog={(name, idx) => {
             const s = db[name];
             if (!s) return;
             // We need to find the real index if we are filtered
             // But onDeleteLog in StudentDetails passes the originalIndex now
             const log = s.logs[idx];
             const newLogs = [...s.logs];
             newLogs.splice(idx, 1);
             const newTotal = s.total - log.s;
             saveDb({ ...db, [name]: { ...s, logs: newLogs, total: newTotal } });
             setSelectedStudent({ ...s, logs: newLogs, total: newTotal }); // Update view
          }}
          onAddLog={(name, log) => {
             const s = db[name];
             if (!s) return;
             const newLogs = [...s.logs, log];
             const newTotal = s.total + log.s;
             saveDb({ ...db, [name]: { ...s, logs: newLogs, total: newTotal } });
             setSelectedStudent({ ...s, logs: newLogs, total: newTotal }); // Update view
          }}
          onMarkNachat={(name) => {
             saveDb({ ...db, [name]: { ...db[name], lastNachatDate: new Date().toLocaleDateString('he-IL') } });
          }}
          onUpdateStudent={(updated) => {
             saveDb({ ...db, [updated.name]: updated });
             setSelectedStudent(updated);
          }}
          isAuthenticated={userRole === 'teacher'}
          filterKeyword={detailsFilter}
        />
      )}
      
      {/* ... (Rest of the application: Sidebar, Admin Views, etc.) ... */}
      
      {/* Main View Container */}
      <div className={`flex flex-col h-screen ${userRole === 'teacher' ? 'pb-20' : ''}`}> {/* Add padding for bottom nav */}
         
         {/* Top Bar */}
         <div className="bg-card p-4 flex justify-between items-center shadow-lg border-b border-accent/20 z-20">
             <div className="flex items-center gap-3">
                {config.logo && <img src={config.logo} className="w-10 h-10 rounded-full border-2 border-accent" />}
                <div>
                   <h1 className="text-xl font-black tracking-tight text-white">{config.slogan}</h1>
                   {userRole === 'student' && loggedInStudentName && (
                       <span className="text-xs text-accent font-bold">שלום, {loggedInStudentName}</span>
                   )}
                </div>
             </div>
             
             {userRole === 'teacher' ? (
                <div className="flex items-center gap-2">
                   {syncStatus === 'saving' && <Loader2 size={18} className="animate-spin text-accent" />}
                   {syncStatus === 'saved' && <Check size={18} className="text-green-500" />}
                   {syncStatus === 'error' && <AlertCircle size={18} className="text-red-500" />}
                   
                   <button onClick={() => setCurrentView('learning')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full hover:bg-emerald-500/20"><BookOpen size={20}/></button>
                   <button onClick={() => setShowRules(true)} className="p-2 bg-purple-500/10 text-purple-400 rounded-full hover:bg-purple-500/20"><Book size={20}/></button>
                   <button onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')} className={`p-2 rounded-full transition ${currentView === 'admin' ? 'bg-accent text-accent-fg' : 'bg-white/10 text-gray-300'}`}>
                      {currentView === 'admin' ? <Home size={20}/> : <Settings size={20}/>}
                   </button>
                   <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20"><LogOut size={20}/></button>
                </div>
             ) : (
                <div className="flex items-center gap-2">
                   <button onClick={() => setCurrentView('learning')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full hover:bg-emerald-500/20"><BookOpen size={20}/></button>
                   <button onClick={() => setShowRules(true)} className="p-2 bg-purple-500/10 text-purple-400 rounded-full hover:bg-purple-500/20"><Book size={20}/></button>
                   <button onClick={handleLogout} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20"><LogOut size={20}/></button>
                </div>
             )}
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-hidden relative">
             
             {/* HOME VIEW (Podium & Lists) */}
             {currentView === 'home' && (
                 <div className="h-full overflow-y-auto p-4 pb-24">
                     
                     {/* Podium Toggle */}
                     <div className="flex justify-center gap-2 mb-4">
                        <button 
                            onClick={() => setPodiumMode('regular')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${podiumMode === 'regular' ? 'bg-accent text-accent-fg shadow-lg scale-105' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                            <Coins size={12} /> נקודות זכות
                        </button>
                        <button 
                            onClick={() => setPodiumMode('grades')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${podiumMode === 'grades' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                            <GraduationCap size={12} /> מצטייני לימודים
                        </button>
                     </div>

                     <Podium 
                        students={getPodiumStudents()} 
                        onRemoveStudent={(name) => {
                             if(window.confirm(`להסיר את ${name} מהפודיום? (הניקוד יישמר)`)) {
                                 const s = db[name];
                                 if(s) saveDb({...db, [name]: {...s, isHiddenFromPodium: true}});
                             }
                        }}
                        onStudentClick={handleStudentClick}
                        scoreSuffix={podiumMode === 'grades' ? '' : '₪'} 
                     />
                     
                     {/* Student List Grid (If not student view) */}
                     {userRole === 'teacher' && (
                         <div className="mt-8">
                             <div className="flex justify-between items-center mb-4 px-2">
                                 <h3 className="font-bold text-gray-400 flex items-center gap-2"><Users size={16}/> כל התלמידים</h3>
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setIsStudentListExpanded(!isStudentListExpanded)}
                                        className={`p-2 rounded-full hover:bg-white/10 text-gray-400 transition ${isStudentListExpanded ? 'bg-white/10 text-white' : 'bg-white/5'}`}
                                     >
                                         {isStudentListExpanded ? <EyeOff size={16}/> : <Eye size={16}/>}
                                     </button>
                                     <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                                         <Search size={14} className="text-gray-500 ml-1"/>
                                         <input 
                                            className="bg-transparent border-none outline-none text-xs text-white w-24" 
                                            placeholder="חיפוש..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                         />
                                     </div>
                                 </div>
                             </div>
                             
                             {/* Collapsible List */}
                             {isStudentListExpanded && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4">
                                    {(Object.values(db) as Student[])
                                        .filter(s => s.name.includes(searchQuery))
                                        .sort((a,b) => a.name.localeCompare(b.name))
                                        .map(s => (
                                        <button 
                                            key={s.name}
                                            onClick={() => handleStudentClick(s)}
                                            className="bg-card hover:bg-white/5 p-3 rounded-xl border border-border flex flex-col items-center gap-2 transition active:scale-95 text-center group"
                                        >
                                            <span className="font-bold text-sm text-txt group-hover:text-accent truncate w-full">{s.name}</span>
                                            <span className={`text-xs font-black ${s.total < 0 ? 'text-red-500' : 'text-accent'}`}>{s.total}₪</span>
                                        </button>
                                    ))}
                                </div>
                             )}
                             {!isStudentListExpanded && (
                                 <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                                     <p className="text-xs text-gray-500 italic">רשימת התלמידים מוסתרת. לחץ על העין כדי להציג.</p>
                                 </div>
                             )}
                         </div>
                     )}

                     {/* Student View Specifics */}
                     {userRole === 'student' && loggedInStudentName && db[loggedInStudentName] && (
                        <div className="mt-6 flex flex-col items-center">
                            <div className="bg-card p-6 rounded-3xl border border-accent/20 shadow-2xl w-full max-w-sm text-center transform hover:scale-[1.02] transition duration-300">
                                <h2 className="text-2xl font-black text-white mb-2">{db[loggedInStudentName].name}</h2>
                                <div className="text-5xl font-black text-accent mb-4 drop-shadow-md">{db[loggedInStudentName].total}₪</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setCurrentView('store')}
                                        className="bg-accent text-accent-fg py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                                    >
                                        <Store size={18} /> לחנות
                                    </button>
                                    <button 
                                        onClick={() => handleStudentClick(db[loggedInStudentName])}
                                        className="bg-white/10 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition hover:bg-white/20"
                                    >
                                        <Activity size={18} /> ציונים ופירוט
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setShowChangePassword(true)}
                                    className="mt-4 text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1 w-full"
                                >
                                    <KeyRound size={10} /> שינוי סיסמה
                                </button>
                            </div>
                        </div>
                     )}
                 </div>
             )}

             {/* CONTACTS VIEW */}
             {currentView === 'contacts' && (
                 <div className="h-full overflow-y-auto p-4 pb-24">
                     <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                         <Phone size={24} className="text-gray-400"/> אנשי קשר
                     </h2>
                     <div className="mb-4 relative">
                         <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                         <input 
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white text-sm outline-none focus:border-accent"
                            placeholder="חפש תלמיד..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                         />
                     </div>
                     <div className="space-y-2">
                         {(Object.values(db) as Student[])
                            .filter(s => s.name.includes(searchQuery))
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(s => (
                                <button 
                                    key={s.name}
                                    onClick={() => handleStudentClick(s)}
                                    className="w-full bg-card hover:bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group transition active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-gray-400 font-bold group-hover:text-accent group-hover:border group-hover:border-accent/30 transition-colors">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div className="text-right">
                                            <h3 className="font-bold text-white text-sm">{s.name}</h3>
                                            <p className="text-xs text-gray-500 truncate">
                                                {s.phoneMother ? `אמא: ${s.phoneMother}` : s.phoneFather ? `אבא: ${s.phoneFather}` : 'לחץ לפרטים מלאים'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronUp className="text-gray-600 rotate-90" size={20}/>
                                </button>
                            ))
                         }
                     </div>
                 </div>
             )}

             {/* ADMIN VIEW */}
             {currentView === 'admin' && (
                 <div className="h-full overflow-y-auto p-4 pb-24 space-y-4">
                     <h2 className="text-2xl font-black text-white mb-6">לוח בקרה</h2>
                     
                     {/* Reorderable Grid Logic would go here, simplified for now to list */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Admin Cards - mapped from ADMIN_SECTIONS based on adminOrder */}
                        {adminOrder.map(sectionId => {
                            const section = ADMIN_SECTIONS.find(s => s.id === sectionId);
                            if (!section) return null;
                            const Icon = section.icon;
                            const isCollapsed = adminCollapsed[sectionId];
                            
                            return (
                                <div key={sectionId} className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <button 
                                        onClick={() => toggleAdminSection(sectionId)}
                                        className="w-full p-4 flex items-center justify-between bg-black/20 hover:bg-black/30 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${section.bg} ${section.color}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="font-bold text-white">{section.label}</span>
                                        </div>
                                        {isCollapsed ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronUp size={16} className="text-gray-500"/>}
                                    </button>
                                    
                                    {!isCollapsed && (
                                        <div className="p-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
                                            
                                            {/* --- CLOUD SYNC --- */}
                                            {sectionId === 'cloud_sync' && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-gray-400">כתובת סקריפט Google Apps Script לגיבוי בענן.</p>
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white"
                                                        value={config.googleAppsScriptUrl || ""}
                                                        onChange={(e) => saveConfig({...config, googleAppsScriptUrl: e.target.value})}
                                                        placeholder="https://script.google.com/..."
                                                    />
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <input type="checkbox" checked={includeImagesInSync} onChange={(e) => setIncludeImagesInSync(e.target.checked)} id="incImg" className="rounded bg-white/10 border-white/20" />
                                                        <label htmlFor="incImg" className="text-xs text-gray-300">כלול תמונות בגיבוי (איטי יותר)</label>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCloudSave(false)} disabled={isSyncing} className="flex-1 bg-sky-600 hover:bg-sky-500 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2">
                                                            {isSyncing ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>} שמור לענן
                                                        </button>
                                                        <button onClick={() => handleCloudLoad(false)} disabled={isSyncing} className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2">
                                                            {isSyncing ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>} טען מהענן
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- IMPORT FILES --- */}
                                            {sectionId === 'import_files' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 mb-2">טעינת קובץ התנהגות (Smart School)</label>
                                                        <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'behavior')} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-green-500/10 file:text-green-500 hover:file:bg-green-500/20"/>
                                                    </div>
                                                    <div className="border-t border-white/5 pt-3">
                                                        <label className="block text-xs font-bold text-gray-400 mb-2">טעינת קובץ ציונים (משו"ב/אקסל)</label>
                                                        <input type="file" accept=".xlsx,.xls" onChange={handleGradesFileUpload} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"/>
                                                    </div>
                                                    <div className="border-t border-white/5 pt-3">
                                                        <label className="block text-xs font-bold text-gray-400 mb-2">טעינת נתוני מחצית (ארכיון)</label>
                                                        <input type="file" accept=".xlsx,.xls" onChange={handleSemesterFileUpload} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-500/10 file:text-purple-500 hover:file:bg-purple-500/20"/>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Score Settings */}
                                            {sectionId === 'score_settings' && (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {(Object.entries(config.actionScores) as [string, number][]).map(([action, score]) => (
                                                        <div key={action} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                                                            <span className="text-xs text-gray-300">{action}</span>
                                                            <input 
                                                                type="number" 
                                                                value={score} 
                                                                onChange={(e) => updateScore(action, parseInt(e.target.value))}
                                                                className={`w-12 bg-black/20 border rounded p-1 text-center text-xs font-bold ${score > 0 ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {sectionId === 'store_manage' && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-accent text-center bg-accent/10 p-2 rounded-lg">
                                                        שים לב: ניהול המלאי המלא הועבר למסך החנות בלשונית "ניהול מלאי".
                                                    </p>
                                                    <button onClick={handleAddStoreItem} className="w-full py-2 bg-accent/20 text-accent border border-accent/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-accent/30">
                                                        <Plus size={14}/> הוסף מוצר חדש
                                                    </button>
                                                    {/* Keeping basic list for backup */}
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                        {config.storeItems.map(item => (
                                                            <div key={item.id} className="bg-white/5 p-3 rounded-xl flex gap-3 items-start">
                                                                <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center relative overflow-hidden group">
                                                                    {item.image ? <img src={item.image} className="w-full h-full object-cover"/> : <span className="text-xl">{item.emoji}</span>}
                                                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                                                        <ImageIcon size={14} className="text-white"/>
                                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleStoreItemImageUpload(e, item.id)}/>
                                                                    </label>
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <input type="text" value={item.name} onChange={(e) => handleUpdateStoreItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 text-xs font-bold text-white focus:border-accent outline-none" placeholder="שם המוצר"/>
                                                                    <div className="flex gap-2">
                                                                        <input type="number" value={item.price} onChange={(e) => handleUpdateStoreItem(item.id, 'price', parseInt(e.target.value))} className="w-16 bg-black/20 border border-white/10 rounded p-1 text-xs text-accent text-center" placeholder="מחיר"/>
                                                                        <input type="number" value={item.stock} onChange={(e) => handleUpdateStoreItem(item.id, 'stock', parseInt(e.target.value))} className="w-16 bg-black/20 border border-white/10 rounded p-1 text-xs text-gray-400 text-center" placeholder="מלאי"/>
                                                                        <input type="text" value={item.emoji} onChange={(e) => handleUpdateStoreItem(item.id, 'emoji', e.target.value)} className="w-10 bg-black/20 border border-white/10 rounded p-1 text-xs text-center" placeholder="🎉"/>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => handleDeleteStoreItem(item.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14}/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {sectionId === 'learning_manage' && (
                                                <div className="space-y-4">
                                                    {/* Folders & Resources */}
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={newSubjectName} 
                                                            onChange={(e) => setNewSubjectName(e.target.value)}
                                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white"
                                                            placeholder="שם תיקייה חדשה..."
                                                        />
                                                        <button onClick={handleAddSubject} className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 rounded-xl text-xs font-bold">הוסף</button>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap gap-2">
                                                        {(config.learningSubjects || []).map(sub => (
                                                            <div key={sub} className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                                                <span className="text-xs text-gray-300">{sub}</span>
                                                                <button onClick={() => handleDeleteSubject(sub)} className="text-red-400 hover:text-red-300"><X size={10}/></button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="border-t border-white/5 my-2"></div>

                                                    <div className="space-y-2 bg-black/10 p-3 rounded-xl">
                                                        <p className="text-xs font-bold text-gray-400">הוספת קובץ / קישור</p>
                                                        <input 
                                                            type="text" 
                                                            value={newResource.title} 
                                                            onChange={(e) => setNewResource(prev => ({...prev, title: e.target.value}))}
                                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white"
                                                            placeholder="כותרת (למשל: דף עבודה במתמטיקה)"
                                                        />
                                                        <div className="flex gap-2">
                                                            <select 
                                                                value={newResource.subject}
                                                                onChange={(e) => setNewResource(prev => ({...prev, subject: e.target.value}))}
                                                                className="flex-1 bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"
                                                            >
                                                                <option value="">בחר תיקייה...</option>
                                                                {(config.learningSubjects || []).map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                            <select 
                                                                value={newResource.type}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === 'quiz' || val === 'review') {
                                                                        setPresetResource(val as 'quiz' | 'review');
                                                                    } else {
                                                                        setNewResource(prev => ({...prev, type: val as ResourceType}));
                                                                    }
                                                                }}
                                                                className="w-24 bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"
                                                            >
                                                                <option value="link">קישור</option>
                                                                <option value="file">קובץ</option>
                                                                <option value="video">וידאו</option>
                                                                <option value="form">טופס</option>
                                                            </select>
                                                        </div>
                                                        
                                                        {newResource.type === 'file' ? (
                                                            <input type="file" onChange={handleResourceFileUpload} className="text-xs text-gray-400"/>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={newResource.url} 
                                                                onChange={(e) => setNewResource(prev => ({...prev, url: e.target.value}))}
                                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white ltr"
                                                                placeholder="URL..."
                                                            />
                                                        )}
                                                        
                                                        <button onClick={handleAddResource} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold mt-2">שמור במרכז הלמידה</button>
                                                    </div>

                                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                                        {(config.learningResources || []).map(r => (
                                                            <div key={r.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                                                <div className="truncate flex-1">
                                                                    <span className="text-xs text-emerald-400 font-bold">[{r.subject}]</span> <span className="text-xs text-gray-300">{r.title}</span>
                                                                </div>
                                                                <button onClick={() => handleDeleteResource(r.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={12}/></button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* AI GENERATOR SECTION */}
                                                    <div className="border-t border-white/5 pt-4 mt-4">
                                                        <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-2">
                                                            <BrainCircuit size={16}/> מחולל תוכן למידה (AI)
                                                        </h4>
                                                        
                                                        <textarea 
                                                            className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white mb-2 focus:border-purple-500 outline-none"
                                                            placeholder="הדבק כאן את חומר הלימוד (טקסט)..."
                                                            value={aiSourceText}
                                                            onChange={(e) => setAiSourceText(e.target.value)}
                                                        />
                                                        
                                                        <div className="flex gap-2 mb-4">
                                                            <button 
                                                                onClick={handleGenerateQuiz}
                                                                disabled={isGeneratingAi}
                                                                className="flex-1 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-600/30 flex justify-center items-center gap-2"
                                                            >
                                                                {isGeneratingAi ? <Loader2 className="animate-spin" size={14}/> : <FileQuestion size={14}/>} צור בוחן (Forms)
                                                            </button>
                                                            <button 
                                                                onClick={handleGenerateStudyGuide}
                                                                disabled={isGeneratingAi}
                                                                className="flex-1 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 flex justify-center items-center gap-2"
                                                            >
                                                                {isGeneratingAi ? <Loader2 className="animate-spin" size={14}/> : <FileType size={14}/>} צור דף חזרה
                                                            </button>
                                                        </div>

                                                        {aiResult && (
                                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3 animate-in fade-in">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-xs text-gray-400 font-bold">
                                                                        {aiResult.type === 'script' ? 'קוד ל-Google Apps Script (העתק והדבק בעורך)' : 'סיכום למבחן'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(aiResult.content);
                                                                            alert("הועתק ללוח!");
                                                                        }}
                                                                        className="text-xs text-accent hover:underline flex items-center gap-1"
                                                                    >
                                                                        <Copy size={12}/> העתק
                                                                    </button>
                                                                </div>
                                                                <pre className={`text-[10px] text-gray-300 overflow-auto max-h-40 p-2 bg-black/30 rounded border border-white/5 ${aiResult.type === 'text' ? 'whitespace-pre-wrap font-sans' : 'font-mono'}`}>
                                                                    {aiResult.content}
                                                                </pre>
                                                                {aiResult.type === 'script' && (
                                                                    <a href="https://script.google.com/home" target="_blank" className="text-[10px] text-blue-400 mt-2 block hover:underline">
                                                                        פתח את עורך הסקריפטים של גוגל &rarr;
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ... Rest of Admin Sections ... */}
                                            {sectionId === 'challenges_manage' && (
                                                <div className="space-y-3">
                                                    <button onClick={handleAddChallenge} className="w-full py-2 bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                                        <Plus size={14}/> הוסף אתגר חדש
                                                    </button>
                                                    <div className="space-y-2">
                                                        {(config.challenges || []).map(c => (
                                                            <div key={c.id} className="bg-white/5 p-2 rounded-xl flex gap-2 items-center">
                                                                <input type="text" value={c.title} onChange={(e) => handleUpdateChallenge(c.id, 'title', e.target.value)} className="flex-1 bg-transparent border-b border-white/10 text-xs text-white" placeholder="תיאור האתגר"/>
                                                                <input type="number" value={c.reward} onChange={(e) => handleUpdateChallenge(c.id, 'reward', parseInt(e.target.value))} className="w-12 bg-black/20 rounded p-1 text-xs text-orange-400 text-center"/>
                                                                <button onClick={() => handleDeleteChallenge(c.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={12}/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {sectionId === 'rules_manage' && (
                                                <textarea 
                                                    className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed"
                                                    value={config.rules}
                                                    onChange={(e) => saveConfig({...config, rules: e.target.value})}
                                                />
                                            )}

                                            {sectionId === 'theme_settings' && (
                                                <div className="flex gap-2">
                                                    {(['current', 'modern', 'simple'] as ThemeType[]).map(t => (
                                                        <button 
                                                            key={t}
                                                            onClick={() => saveConfig({...config, theme: t})}
                                                            className={`flex-1 py-3 rounded-xl border capitalize text-xs font-bold ${config.theme === t ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10'}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {sectionId === 'general_settings' && (
                                                <div className="space-y-3">
                                                    {/* Site Lock Toggle */}
                                                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-2 rounded-lg ${config.isSystemLocked ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                                {config.isSystemLocked ? <Lock size={18}/> : <Power size={18}/>}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-white">נעילת אתר לתלמידים</p>
                                                                <p className="text-[10px] text-gray-400">{config.isSystemLocked ? "האתר נעול כעת" : "האתר פתוח לשימוש"}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => saveConfig({...config, isSystemLocked: !config.isSystemLocked})}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition ${config.isSystemLocked ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                                                        >
                                                            {config.isSystemLocked ? "פתח נעילה" : "נעל אתר"}
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs text-gray-500">סיסמת מורה</label>
                                                        <input type="text" value={config.teacherPin} onChange={(e) => saveConfig({...config, teacherPin: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">טלפון מורה (לוואטסאפ)</label>
                                                        <input type="text" value={config.teacherCell} onChange={(e) => saveConfig({...config, teacherCell: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">סלוגן</label>
                                                        <input type="text" value={config.slogan} onChange={(e) => saveConfig({...config, slogan: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">לוגו (URL)</label>
                                                        <input type="text" value={config.logo} onChange={(e) => saveConfig({...config, logo: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-xs text-white"/>
                                                    </div>
                                                </div>
                                            )}

                                            {sectionId === 'backup_reset' && (
                                                <div className="space-y-2">
                                                    <button onClick={() => {
                                                        const blob = new Blob([JSON.stringify({db, config}, null, 2)], {type : 'application/json'});
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `backup_${new Date().toLocaleDateString()}.json`;
                                                        a.click();
                                                    }} className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold">
                                                        הורד גיבוי מקומי (JSON)
                                                    </button>
                                                    
                                                    {!showResetConfirm ? (
                                                        <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold">
                                                            איפוס תקופה מלא
                                                        </button>
                                                    ) : (
                                                        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                                                            <p className="text-red-500 text-xs font-bold mb-2 text-center">בטוח? הפעולה תמחק את כל הנקודות!</p>
                                                            <div className="flex gap-2">
                                                                <button onClick={handleFullReset} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold">כן, אפס הכל</button>
                                                                <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white/10 text-white py-2 rounded-lg text-xs font-bold">ביטול</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>

                     <div className="mt-6 pt-6 border-t border-white/10">
                         <button onClick={() => setShowBatchCommenter(true)} className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2">
                             <Wand2 size={20}/> מחולל הערות לתעודה (AI)
                         </button>
                     </div>
                 </div>
             )}

             {/* OTHER VIEWS */}
             {currentView === 'seating' && (
                <SeatingChart 
                    students={Object.values(db) as Student[]} 
                    onUpdateStudent={(s) => {
                        saveDb({ ...db, [s.name]: s });
                    }}
                    onBatchUpdate={(updates) => {
                        const newDb = { ...db };
                        updates.forEach(s => newDb[s.name] = s);
                        saveDb(newDb);
                    }}
                />
             )}

             {currentView === 'store' && (
                <StoreView 
                    students={Object.values(db) as Student[]}
                    config={config}
                    userRole={userRole}
                    loggedInStudentName={loggedInStudentName}
                    cart={cart}
                    setCart={setCart}
                    onUpdateConfig={saveConfig}
                    onUpdateStudent={(updatedStudent) => saveDb({ ...db, [updatedStudent.name]: updatedStudent })}
                    onCheckout={() => true} // Legacy prop, no longer critical in new logic but kept for safety
                    selectedStudentId={null} // Legacy
                    setSelectedStudentId={() => {}} // Legacy
                />
             )}
         </div>

         {/* Bottom Navigation (Teacher only) */}
         {userRole === 'teacher' && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-accent/20 p-2 flex justify-around items-center z-30 pb-safe">
                <button onClick={() => setCurrentView('home')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'home' ? 'text-accent' : 'text-gray-500'}`}>
                    <Home size={20} /> <span className="text-[10px] font-bold">בית</span>
                </button>
                <button onClick={() => setCurrentView('seating')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'seating' ? 'text-accent' : 'text-gray-500'}`}>
                    <LayoutGrid size={20} /> <span className="text-[10px] font-bold">כיתה</span>
                </button>
                <button onClick={() => setCurrentView('store')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'store' ? 'text-accent' : 'text-gray-500'}`}>
                    <Store size={20} /> <span className="text-[10px] font-bold">חנות</span>
                </button>
                <button onClick={() => setCurrentView('contacts')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'contacts' ? 'text-accent' : 'text-gray-500'}`}>
                    <Users size={20} /> <span className="text-[10px] font-bold">קשר</span>
                </button>
            </div>
         )}
      </div>

      {/* Overlays */}
      {showRules && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-card w-full max-w-lg rounded-3xl border border-accent/30 shadow-2xl relative overflow-hidden">
                  <div className="p-6 border-b border-border bg-black/20 flex justify-between items-center">
                      <h2 className="text-2xl font-black text-accent flex items-center gap-2"><Book size={24}/> תקנון הכיתה</h2>
                      <button onClick={() => setShowRules(false)}><X className="text-gray-400"/></button>
                  </div>
                  <div className="p-8 max-h-[60vh] overflow-y-auto">
                      <p className="whitespace-pre-wrap text-lg leading-relaxed text-white">{config.rules}</p>
                  </div>
                  <div className="p-4 bg-primary border-t border-border flex justify-center">
                      <button onClick={() => setShowRules(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold">סגור</button>
                  </div>
              </div>
          </div>
      )}

      {showChangePassword && loggedInStudentName && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-card w-full max-w-sm rounded-3xl border border-blue-500/30 p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">החלפת סיסמה אישית</h3>
                  <input 
                    type="text" 
                    placeholder="הזן סיסמה חדשה (לפחות 4 תווים)" 
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-blue-500"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                  />
                  <div className="flex gap-2">
                      <button onClick={handleChangePassword} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">שמור</button>
                      <button onClick={() => setShowChangePassword(false)} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl">ביטול</button>
                  </div>
              </div>
          </div>
      )}

      {showBatchCommenter && (
          <BatchCommenter 
            db={db}
            onSave={(updatedDb) => {
                saveDb(updatedDb);
                setShowBatchCommenter(false);
            }}
            onClose={() => setShowBatchCommenter(false)}
          />
      )}

    </div>
  );
}
