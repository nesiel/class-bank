
import React, { useState, useEffect, useRef } from 'react';
import { Database, Student, AppConfig, DEFAULT_CONFIG, ThemeType, StoreItem, UserRole, Challenge, LearningResource, ResourceType } from './types';
import { parseExcel, fileToBase64, parseGradesExcel } from './utils';
import { Podium } from './components/Podium';
import { StudentDetails } from './components/StudentDetails';
import { SeatingChart } from './components/SeatingChart';
import { StoreView } from './components/StoreView';
import { ChallengesView } from './components/ChallengesView';
import { BatchCommenter } from './components/BatchCommenter';
import { LoginScreen } from './components/LoginScreen';
import { LearningCenter } from './components/LearningCenter';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, ChevronUp, ChevronDown, Settings, Trash2, Trophy, FileSpreadsheet, Coins, Users, Phone, Download, LayoutGrid, Book, X, Scroll, AlertCircle, Palette, Store, Image as ImageIcon, Plus, Wand2, Loader2, GraduationCap, LogOut, KeyRound, Lock, Target, Cloud, Upload, Check, BookOpen, FileQuestion, Copy, FileType, Search, Activity, ChevronRight, Power, BrainCircuit, FileUp, Folder, RefreshCcw, Gift, ListChecks, Contact, MessageCircle, User
} from 'lucide-react';

// Define the available admin sections
const ADMIN_SECTIONS = [
  { id: 'cloud_sync', label: 'סנכרון לענן (Google Sheets)', icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'import_files', label: 'ייבוא נתונים (אקסל)', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'learning_manage', label: 'ניהול מרכז למידה ו-AI', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'store_manage', label: 'ניהול חנות ומלאי', icon: Store, color: 'text-accent', bg: 'bg-accent/10' },
  { id: 'score_settings', label: 'הגדרות ניקוד', icon: Settings, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'rules_manage', label: 'עריכת תקנון', icon: Book, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'general_settings', label: 'הגדרות כלליות ואבטחה', icon: Phone, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { id: 'backup_reset', label: 'גיבוי ואיפוס תקופה', icon: Download, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'theme_settings', label: 'עיצוב', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

export default function App() {
  const [db, setDb] = useState<Database>({});
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  // Auth State
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [loggedInStudentName, setLoggedInStudentName] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'contacts' | 'seating' | 'store' | 'learning' | 'challenges'>('home');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsFilter, setDetailsFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBatchCommenter, setShowBatchCommenter] = useState(false);
  
  // New Modals
  const [showWinners, setShowWinners] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  
  // Podium State
  const [podiumMode, setPodiumMode] = useState<'regular' | 'grades' | 'tefillah'>('regular');

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [includeImagesInSync, setIncludeImagesInSync] = useState(true); // Changed default to true
  const skipAutoSaveRef = useRef(false); // To prevent auto-save loop after loading

  // Student Password Change State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  
  // Learning Admin State
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newResource, setNewResource] = useState<{title: string, subject: string, type: ResourceType, url: string}>({
      title: "", subject: "", type: 'link', url: ""
  });
  const [isDragOver, setIsDragOver] = useState(false); // Drag state
  
  // AI Generator State (Quiz & Study Guide)
  const [aiSourceText, setAiSourceText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{type: 'script' | 'text', content: string} | null>(null);
  
  // Admin Collapsibles State - Initialized from Default Config
  const [adminCollapsed, setAdminCollapsed] = useState<Record<string, boolean>>(DEFAULT_CONFIG.uiPreferences?.adminCollapsed || {});

  // Reset Options State - Initialized from Default Config
  const [resetOptions, setResetOptions] = useState(DEFAULT_CONFIG.uiPreferences?.resetOptions || {
      points: true,
      logs: true,
      purchases: true,
      requests: true,
      grades: false,
      scholastic: true,
      alfon: false
  });

  // Store Persistent State
  const [cart, setCart] = useState<StoreItem[]>([]);
  
  // Contacts View State
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});
  
  // Admin View State - Order
  const [adminOrder, setAdminOrder] = useState<string[]>([
    'cloud_sync',
    'import_files',
    'learning_manage',
    'store_manage', 
    'score_settings', 
    'rules_manage',
    'general_settings',
    'backup_reset', 
    'theme_settings'
  ]);

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
                        
                        // FIX: Ensure all resources have IDs for reliable deletion
                        let modified = false;
                        if (loadedConfig.learningResources && Array.isArray(loadedConfig.learningResources)) {
                            loadedConfig.learningResources = loadedConfig.learningResources.map((r: any) => {
                                if (!r.id) {
                                    modified = true;
                                    return { ...r, id: 'res_' + Math.random().toString(36).substr(2, 9) };
                                }
                                return r;
                            });
                        }
                        
                        // Persist IDs immediately if we patched them
                        if (modified) {
                            localStorage.setItem('bank_cfg', JSON.stringify(loadedConfig));
                        }

                        // Ensure URL is preserved from default if missing in local but exists in default
                        if (DEFAULT_CONFIG.googleAppsScriptUrl && !loadedConfig.googleAppsScriptUrl) {
                            loadedConfig.googleAppsScriptUrl = DEFAULT_CONFIG.googleAppsScriptUrl;
                        }
                    }
                } catch (e) { console.error(e); }
            }
            
            // Set State from Config
            setConfig(loadedConfig);
            if (loadedConfig.uiPreferences) {
                if (loadedConfig.uiPreferences.adminCollapsed) setAdminCollapsed(loadedConfig.uiPreferences.adminCollapsed);
                if (loadedConfig.uiPreferences.resetOptions) setResetOptions(loadedConfig.uiPreferences.resetOptions);
            }
            
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
      // Create a clean version of the DB based on selected options
      const newDb: Database = {};
      Object.entries(db).forEach(([key, student]) => {
          const s = student as Student;
          newDb[key] = {
              ...s,
              // Conditional Resets based on checkboxes
              total: resetOptions.points ? 0 : s.total,
              logs: resetOptions.logs ? [] : s.logs,
              purchases: resetOptions.purchases ? [] : s.purchases,
              requests: resetOptions.requests ? [] : s.requests,
              
              // PRESERVED: Challenges and Goals are preserved!
              challengeRequests: s.challengeRequests, 
              academicGoal: s.academicGoal,
              
              // Reset timestamps usually goes with logs
              lastNachatDate: resetOptions.logs ? undefined : s.lastNachatDate,
              
              // Archive data
              semesterScore: resetOptions.points ? undefined : s.semesterScore,
              semesterLogs: resetOptions.logs ? undefined : s.semesterLogs,
              
              // Grades - RESPECT THE OPTION
              grades: resetOptions.grades ? undefined : s.grades,
              
              // Scholastic Comments
              academicReinforcement: resetOptions.scholastic ? undefined : s.academicReinforcement,
              certificateComment: resetOptions.scholastic ? undefined : s.certificateComment,

              // Alfon (Contacts)
              nameMother: resetOptions.alfon ? undefined : s.nameMother,
              phoneMother: resetOptions.alfon ? undefined : s.phoneMother,
              emailMother: resetOptions.alfon ? undefined : s.emailMother,
              nameFather: resetOptions.alfon ? undefined : s.nameFather,
              phoneFather: resetOptions.alfon ? undefined : s.phoneFather,
              emailFather: resetOptions.alfon ? undefined : s.emailFather,
              studentCell: resetOptions.alfon ? undefined : s.studentCell,
              studentEmail: resetOptions.alfon ? undefined : s.studentEmail,
              homePhone: resetOptions.alfon ? undefined : s.homePhone,
          };
      });

      // Save the cleaned DB
      saveDb(newDb);
      
      // Set a flag to prevent immediate cloud reload on refresh overriding our reset
      localStorage.setItem('bank_skip_cloud_load', 'true');
      
      let message = "התקופה אופסה בהצלחה!\n\n";
      if (resetOptions.grades) message += "❌ הציונים נמחקו.\n";
      else message += "✅ הציונים נשמרו.\n";
      if (resetOptions.alfon) message += "❌ אנשי הקשר נמחקו.\n";
      else message += "✅ אנשי הקשר נשמרו.\n";
      message += "✅ היעדים והאתגרים נשמרו.\n";
      
      message += "\nהעמוד ירענן כעת.";
      
      alert(message);
      
      setTimeout(() => {
          window.location.reload();
      }, 500);
  };

  const saveDb = (newDb: Database) => {
    setDb(newDb);
    localStorage.setItem('bank_db', JSON.stringify(newDb));
  };

  const saveConfig = (newCfg: AppConfig) => {
    setConfig(newCfg);
    localStorage.setItem('bank_cfg', JSON.stringify(newCfg));
  };

  const toggleAdminSection = (id: string) => {
    setAdminCollapsed(prev => {
        const newState = { ...prev, [id]: !prev[id] };
        // Persist to config immediately
        const newConfig = {
            ...config,
            uiPreferences: {
                ...(config.uiPreferences || DEFAULT_CONFIG.uiPreferences!),
                adminCollapsed: newState
            }
        };
        saveConfig(newConfig);
        return newState;
    });
  };

  // Helper to save reset options
  const handleResetOptionChange = (key: keyof typeof resetOptions, value: boolean) => {
      setResetOptions(prev => {
          const newState = { ...prev, [key]: value };
          const newConfig = {
              ...config,
              uiPreferences: {
                  ...(config.uiPreferences || DEFAULT_CONFIG.uiPreferences!),
                  resetOptions: newState
              }
          };
          saveConfig(newConfig);
          return newState;
      });
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
          const currentStudent = final[name];
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
                  const currentStudent = final[name];
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

  // --- LOGO UPLOAD HANDLER ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        saveConfig({ ...config, logo: base64 });
      } catch (err) {
        alert("שגיאה בהעלאת התמונה");
      }
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
      const newItem: LearningResource = { 
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
          ...newResource, 
          dateAdded: new Date().toLocaleDateString('he-IL') 
      };
      saveConfig({ ...config, learningResources: [...(config.learningResources || []), newItem] });
      setNewResource({ title: "", subject: "", type: 'link', url: "" });
      alert("התווסף בהצלחה!");
  };

  const handleDeleteResource = (id: string) => {
      if (!window.confirm("בטוח שברצונך למחוק קובץ זה?")) return;
      
      setConfig(prev => {
          const updatedResources = (prev.learningResources || []).filter(r => r.id !== id);
          
          // Persist immediately to avoid stale state issues
          const newConfig = { ...prev, learningResources: updatedResources };
          localStorage.setItem('bank_cfg', JSON.stringify(newConfig));
          
          return newConfig;
      });
  };

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          try {
              const base64 = await fileToBase64(e.target.files[0]);
              setNewResource(prev => ({ ...prev, url: base64, type: 'file' }));
          } catch(err) { alert("שגיאה בקובץ"); }
      }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!newResource.subject) {
          alert("נא לבחור תיקייה/נושא מהרשימה לפני גרירת קבצים!");
          return;
      }

      const files: File[] = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const newResources: LearningResource[] = [];

      for (const file of files) {
          try {
              const base64 = await fileToBase64(file);
              const newItem: LearningResource = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  title: file.name,
                  subject: newResource.subject,
                  type: 'file',
                  url: base64,
                  dateAdded: new Date().toLocaleDateString('he-IL')
              };
              newResources.push(newItem);
          } catch (err) {
              console.error("Failed to process file", file.name, err);
          }
      }

      if (newResources.length > 0) {
          saveConfig({ 
              ...config, 
              learningResources: [...(config.learningResources || []), ...newResources] 
          });
          alert(`${newResources.length} קבצים הועלו בהצלחה לתיקיית ${newResource.subject}`);
      }
  };

  const setPresetResource = (type: 'drive' | 'quiz' | 'review') => {
      if (type === 'drive') setNewResource(prev => ({...prev, type: 'link', title: 'תיקיית חומרים (דרייב)', url: ''}));
      else if (type === 'quiz') setNewResource(prev => ({...prev, type: 'form', title: 'בוחן', url: ''}));
      else if (type === 'review') setNewResource(prev => ({...prev, type: 'form', title: 'חזרה למבחן', url: ''}));
  };

  const handleGenerateQuiz = async () => {
      if (!aiSourceText.trim()) { alert("נא להדביק חומר לימוד"); return; }
      setIsGeneratingAi(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Analyze the following Hebrew text and create a quiz.
            Return ONLY a valid JSON object with the following structure:
            {
              "title": "A short, descriptive title for the quiz based on the text (Hebrew)",
              "questions": [
                { "q": "Question", "opts": ["Opt1", "Opt2", "Opt3", "Opt4"], "a": 0, "p": 20 }
              ]
            }
            index "a" is the correct answer (0-3).
            
            Text: ${aiSourceText}
          `;
          const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
          
          let jsonStr = response.text || "{}";
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const data = JSON.parse(jsonStr);
          const scriptCode = `
function createGeneratedQuiz() {
  // Config
  var data = ${JSON.stringify(data, null, 2)};
  
  var form = FormApp.create(data.title);
  form.setIsQuiz(true);
  form.addTextItem().setTitle('שם התלמיד').setRequired(true);
  
  data.questions.forEach(function(q) {
    var item = form.addMultipleChoiceItem();
    var choices = q.opts.map(function(opt, index) { 
      return item.createChoice(opt, index === q.a); 
    });
    item.setTitle(q.q).setPoints(q.p).setChoices(choices);
  });
  
  // Custom confirmation message
  form.setConfirmationMessage('כל הכבוד! סיימת את הבוחן. לחץ על "הצג ציון" כדי לראות את התוצאה שלך.');
  form.setPublishingSummary(true);

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
            Analyze the following Hebrew text and extract content for a study guide (Google Doc).
            Return ONLY a valid JSON object with the following structure:
            {
              "title": "Title of the study guide (e.g., 'דף חזרה למבחן')",
              "summary": "A concise summary paragraph (3-4 sentences)",
              "terms": [ {"term": "Term Name", "def": "Short definition"} ],
              "questions": [ "Review question 1", "Review question 2" ]
            }
            
            Text: ${aiSourceText}
          `;
          const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
          
          let jsonStr = response.text || "{}";
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const data = JSON.parse(jsonStr);
          
          const scriptCode = `
function createStudyGuideDoc() {
  var data = ${JSON.stringify(data, null, 2)};
  
  var doc = DocumentApp.create(data.title);
  var body = doc.getBody();
  
  // Title
  var titleStyle = {};
  titleStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  titleStyle[DocumentApp.Attribute.BOLD] = true;
  titleStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
  
  var par1 = body.appendParagraph(data.title);
  par1.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  par1.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Summary
  body.appendParagraph("סיכום הנושא");
  body.appendParagraph(data.summary).setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph(""); // Spacer
  
  // Terms
  if (data.terms && data.terms.length > 0) {
    body.appendParagraph("מושגים חשובים").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    for (var i = 0; i < data.terms.length; i++) {
      var t = data.terms[i];
      var item = body.appendListItem(t.term + ": " + t.def);
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
    }
  }
  
  // Questions
  if (data.questions && data.questions.length > 0) {
    body.appendParagraph("שאלות חזרה").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    for (var j = 0; j < data.questions.length; j++) {
      body.appendParagraph((j+1) + ". " + data.questions[j]);
      body.appendParagraph(""); // Space for answer
    }
  }
  
  doc.saveAndClose();
  Logger.log('Doc URL: ' + doc.getUrl());
}`;
          setAiResult({ type: 'script', content: scriptCode });
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
          // Apply UI Preferences immediately from cloud
          if (mergedConfig.uiPreferences) {
              if (mergedConfig.uiPreferences.adminCollapsed) setAdminCollapsed(mergedConfig.uiPreferences.adminCollapsed);
              if (mergedConfig.uiPreferences.resetOptions) setResetOptions(mergedConfig.uiPreferences.resetOptions);
          }
      }
      setSyncStatus('saved'); setTimeout(() => setSyncStatus('idle'), 2000);
      if (!isAuto) alert("הנתונים נטענו בהצלחה!");
    } catch (e) { console.error(e); setSyncStatus('error'); if (!isAuto) alert(`שגיאה בטעינה מהענן: ${(e as Error).message}`); } finally { setIsSyncing(false); }
  };

  // --- Render Logic ---
  
  if (currentView === 'learning') {
      return <LearningCenter config={config} onClose={() => { setCurrentView(userRole === 'guest' ? 'home' : 'home'); if(userRole === 'guest') handleLogout(); }} />;
  }

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
    
    // Mode: Tefillah (Prayer Excellence)
    if (podiumMode === 'tefillah') {
         return list.map(s => {
            const score = s.logs
                .filter(l => l.k.includes('תפילה') || l.sub === 'תפילה') // Check action name or subject
                .reduce((acc, log) => acc + log.s, 0);
            return { ...s, total: score };
        }).sort((a, b) => b.total - a.total);
    }
    
    // Mode: Points (Regular)
    return list.sort((a, b) => b.total - a.total);
  };
  
  const handleStudentClick = (student: Student) => {
      // Always look up the real student from DB to get fresh data
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
      
      {/* Main View Container */}
      <div className={`flex flex-col h-screen ${userRole === 'teacher' ? 'pb-20' : ''}`}> {/* Add padding for bottom nav */}
         
         {/* Top Bar */}
         <div className="bg-card p-4 flex justify-between items-center shadow-lg border-b border-accent/20 z-20">
             <div className="flex items-center gap-3">
                {/* Back Button */}
                {currentView !== 'home' && (
                    <button 
                        onClick={() => setCurrentView('home')} 
                        className="p-2 -mr-2 text-gray-400 hover:text-white transition"
                    >
                        <ChevronRight size={28} />
                    </button>
                )}
                
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
                   <button onClick={() => setCurrentView(currentView === 'challenges' ? 'home' : 'challenges')} className={`p-2 rounded-full transition ${currentView === 'challenges' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'}`}><Target size={20}/></button>
                   
                   {/* Store Button - Moved to Top */}
                   <button onClick={() => setCurrentView('store')} className={`p-2 rounded-full transition ${currentView === 'store' ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'}`} title="חנות">
                      <Store size={20}/>
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
             
             {/* HOME VIEW (Podium & Lists OR Student Dashboard) */}
             {currentView === 'home' && (
                 <div className="h-full overflow-y-auto p-4 pb-24">
                     
                     {/* Teacher View: Podium & Class List */}
                     {userRole === 'teacher' && (
                         <>
                            <div className="flex justify-center gap-2 mb-2">
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
                                <button 
                                    onClick={() => setPodiumMode('tefillah')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${podiumMode === 'tefillah' ? 'bg-purple-500 text-white shadow-lg scale-105' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                >
                                    <Scroll size={12} /> מצטייני תפילה
                                </button>
                            </div>
                            
                            <div className="flex justify-center gap-2 mb-4">
                                <button 
                                    onClick={() => setShowWinners(true)}
                                    className="px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg"
                                >
                                    <Gift size={12} /> זוכים בפרסים
                                </button>
                                <button 
                                    onClick={() => setShowGoals(true)}
                                    className="px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                                >
                                    <ListChecks size={12} /> רשימת יעדים
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
                                scoreSuffix={['grades', 'tefillah'].includes(podiumMode) ? '' : '₪'} 
                                isAuthenticated={userRole === 'teacher'}
                            />
                         </>
                     )}

                     {/* Student View: Personal Dashboard ONLY */}
                     {userRole === 'student' && loggedInStudentName && db[loggedInStudentName] && (
                        <div className="mt-6 flex flex-col items-center gap-4">
                            
                            {/* Balance Card */}
                            <div className="bg-card p-8 rounded-[2.5rem] border-2 border-accent/30 shadow-[0_0_40px_rgba(var(--c-accent),0.2)] w-full max-w-sm text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none"></div>
                                <h2 className="text-3xl font-black text-white mb-2 relative z-10">{db[loggedInStudentName].name}</h2>
                                <div className="text-6xl font-black text-accent mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] relative z-10">{db[loggedInStudentName].total}₪</div>
                                <p className="text-sm text-accent/70 uppercase tracking-widest font-bold">יתרה נוכחית</p>
                            </div>

                            {/* Actions Grid */}
                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                <button 
                                    onClick={() => setCurrentView('store')}
                                    className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 rounded-2xl font-bold shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition"
                                >
                                    <Store size={28} />
                                    <span>חנות</span>
                                </button>
                                
                                <button 
                                    onClick={() => setCurrentView('challenges')}
                                    className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 rounded-2xl font-bold shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition"
                                >
                                    <Target size={28} />
                                    <span>אתגרים</span>
                                </button>

                                <button 
                                    onClick={() => handleStudentClick(db[loggedInStudentName])}
                                    className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-2xl font-bold shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition"
                                >
                                    <Activity size={28} />
                                    <span>הציונים שלי</span>
                                </button>

                                <button 
                                    onClick={() => setShowChangePassword(true)}
                                    className="bg-white/10 text-gray-300 p-4 rounded-2xl font-bold shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-white/20"
                                >
                                    <KeyRound size={28} />
                                    <span>סיסמה</span>
                                </button>
                            </div>
                        </div>
                     )}
                 </div>
             )}

             {/* CHALLENGES VIEW */}
             {currentView === 'challenges' && (
                 <ChallengesView 
                    config={config}
                    students={Object.values(db) as Student[]}
                    userRole={userRole}
                    loggedInStudentName={loggedInStudentName}
                    onUpdateConfig={saveConfig}
                    onUpdateStudent={(updatedStudent) => saveDb({ ...db, [updatedStudent.name]: updatedStudent })}
                 />
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
                     <div className="space-y-3">
                         {(Object.values(db) as Student[])
                            .filter(s => s.name.includes(searchQuery))
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(s => {
                                const isExpanded = expandedContacts[s.name];
                                const hasPhone = s.studentCell || s.phoneMother || s.phoneFather || s.homePhone;
                                
                                const ContactRow = ({ label, phone }: { label: string, phone?: string }) => {
                                    if (!phone) return null;
                                    const cleanPhone = phone.replace(/\D/g, '');
                                    const waPhone = cleanPhone.startsWith('972') ? cleanPhone : '972' + cleanPhone.replace(/^0/, '');
                                    
                                    return (
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition">
                                            <div>
                                                <span className="text-[10px] text-gray-500 font-bold block">{label}</span>
                                                <a href={`tel:${phone}`} className="text-sm text-white font-mono font-bold hover:underline dir-ltr block text-right">{phone}</a>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={`tel:${phone}`} className="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500 hover:text-white transition shadow-lg">
                                                    <Phone size={16} />
                                                </a>
                                                <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" className="p-2 bg-green-500/20 text-green-500 rounded-full hover:bg-green-500 hover:text-white transition shadow-lg">
                                                    <MessageCircle size={16} />
                                                </a>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <div key={s.name} className="bg-card border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
                                        <button 
                                            onClick={() => setExpandedContacts(prev => ({...prev, [s.name]: !isExpanded}))}
                                            className="w-full p-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${isExpanded ? 'bg-accent text-accent-fg' : 'bg-black/30 text-gray-400'}`}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div className="text-right">
                                                    <h3 className={`font-bold text-sm ${isExpanded ? 'text-accent' : 'text-white'}`}>{s.name}</h3>
                                                    {!isExpanded && (
                                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                            {hasPhone ? <Check size={10} className="text-green-500"/> : <X size={10}/>}
                                                            {hasPhone ? 'פרטי קשר זמינים' : 'אין פרטי קשר'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp className="text-accent" size={20}/> : <ChevronDown className="text-gray-500" size={20}/>}
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="p-3 space-y-2 bg-black/20 border-t border-white/5 animate-in slide-in-from-top-2">
                                                <button 
                                                    onClick={() => handleStudentClick(s)}
                                                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-lg mb-2 flex items-center justify-center gap-2"
                                                >
                                                    <User size={12}/> כרטיס תלמיד מלא
                                                </button>

                                                <ContactRow label="תלמיד" phone={s.studentCell} />
                                                <ContactRow label={s.nameMother ? `אמא (${s.nameMother})` : "אמא"} phone={s.phoneMother} />
                                                <ContactRow label={s.nameFather ? `אבא (${s.nameFather})` : "אבא"} phone={s.phoneFather} />
                                                <ContactRow label="טלפון בבית" phone={s.homePhone} />
                                                
                                                {!hasPhone && <div className="text-center text-gray-500 text-xs py-2">לא הוזנו מספרי טלפון</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                         }
                     </div>
                 </div>
             )}

             {/* ADMIN VIEW */}
             {currentView === 'admin' && (
                 <div className="h-full overflow-y-auto p-4 pb-24 space-y-4">
                     <h2 className="text-2xl font-black text-white mb-6">לוח בקרה</h2>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                        <label className="block text-xs font-bold text-gray-400 mb-2">טעינת קובץ אלפון (אנשי קשר)</label>
                                                        <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'alfon')} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-pink-500/10 file:text-pink-500 hover:file:bg-pink-500/20"/>
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

                                                    {/* DRAG AND DROP ZONE */}
                                                    <div 
                                                        onDragOver={handleDragOver}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={handleDrop}
                                                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors duration-200 mt-4 ${
                                                            isDragOver 
                                                                ? 'border-emerald-400 bg-emerald-500/10' 
                                                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <div className={`p-4 rounded-full mb-2 ${isDragOver ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                                                            {isDragOver ? <FileUp size={32} /> : <Folder size={32} />}
                                                        </div>
                                                        <p className="text-sm font-bold text-white mb-1">
                                                            {isDragOver ? 'שחרר קבצים כאן' : 'גרירת קבצים לתיקייה'}
                                                        </p>
                                                        <p className="text-xs text-gray-400 text-center">
                                                            {newResource.subject 
                                                                ? `העלאה לתיקייה: "${newResource.subject}"` 
                                                                : 'יש לבחור תיקייה מהרשימה למעלה כדי להפעיל'}
                                                        </p>
                                                    </div>

                                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                                        {(config.learningResources || []).map((r) => (
                                                            <div key={r.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg relative group">
                                                                <div className="truncate flex-1">
                                                                    <span className="text-xs text-emerald-400 font-bold">[{r.subject}]</span> <span className="text-xs text-gray-300">{r.title}</span>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteResource(r.id);
                                                                    }} 
                                                                    className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 rounded-lg transition z-10 hover:bg-red-500/20 cursor-pointer flex-shrink-0 ml-2"
                                                                    title="מחק קובץ"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
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
                                                                {isGeneratingAi ? <Loader2 className="animate-spin" size={14}/> : <FileType size={14}/>} צור דף חזרה (Docs)
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
                                                <div className="space-y-4">
                                                    <div className="bg-white/5 p-3 rounded-xl">
                                                        <p className="text-xs text-gray-400 mb-2">גיבוי מקומי מלא (כולל תמונות בחנות)</p>
                                                        <button onClick={() => {
                                                            const blob = new Blob([JSON.stringify({db, config}, null, 2)], {type : 'application/json'});
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `backup_${new Date().toLocaleDateString()}.json`;
                                                            a.click();
                                                        }} className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                                            <Download size={14}/> הורד קובץ גיבוי
                                                        </button>
                                                    </div>
                                                    
                                                    {!showResetConfirm ? (
                                                        <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/20">
                                                            <RefreshCcw size={14}/> איפוס תקופה
                                                        </button>
                                                    ) : (
                                                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30 animate-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <h4 className="text-red-500 font-bold text-sm">מה ברצונך למחוק?</h4>
                                                                <button onClick={() => setShowResetConfirm(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={resetOptions.points} onChange={e => handleResetOptionChange('points', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    ניקוד מצטבר
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={resetOptions.logs} onChange={e => handleResetOptionChange('logs', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    היסטוריית פעולות
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={resetOptions.purchases} onChange={e => handleResetOptionChange('purchases', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    רכישות בחנות
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={resetOptions.requests} onChange={e => handleResetOptionChange('requests', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    בקשות ואתגרים
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={resetOptions.scholastic} onChange={e => handleResetOptionChange('scholastic', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    הערות לתעודה
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer border border-green-500/30">
                                                                    <input type="checkbox" checked={resetOptions.grades} onChange={e => handleResetOptionChange('grades', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    <span className={resetOptions.grades ? "text-red-400 font-bold" : "text-gray-400"}>מחיקת ציונים</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-black/20 rounded-lg cursor-pointer border border-pink-500/30">
                                                                    <input type="checkbox" checked={resetOptions.alfon} onChange={e => handleResetOptionChange('alfon', e.target.checked)} className="rounded bg-black border-red-500/50 text-red-500 focus:ring-0"/>
                                                                    <span className={resetOptions.alfon ? "text-red-400 font-bold" : "text-gray-400"}>מחיקת אנשי קשר (אלפון)</span>
                                                                </label>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <button onClick={handleFullReset} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold shadow-lg">ביצוע איפוס</button>
                                                                <button onClick={() => setShowResetConfirm(false)} className="px-4 bg-white/10 text-white py-2 rounded-lg text-xs font-bold">ביטול</button>
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
                    onCheckout={() => true} // Legacy prop
                    selectedStudentId={null} // Legacy prop
                    setSelectedStudentId={() => {}} // Legacy prop
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
                <button onClick={() => setCurrentView('contacts')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'contacts' ? 'text-accent' : 'text-gray-500'}`}>
                    <Users size={20} /> <span className="text-[10px] font-bold">קשר</span>
                </button>
                <button onClick={() => setCurrentView('admin')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${currentView === 'admin' ? 'text-accent' : 'text-gray-500'}`}>
                    <Settings size={20} /> <span className="text-[10px] font-bold">ניהול</span>
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
      
      {/* Prize Winners Modal */}
      {showWinners && (
          <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-card w-full max-w-md rounded-3xl border border-[#d4af37] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                  {/* Confetti effect background (simplified) */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-bounce delay-100"></div>
                      <div className="absolute top-0 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></div>
                      <div className="absolute top-10 left-1/2 w-2 h-2 bg-green-500 rounded-full animate-bounce delay-500"></div>
                  </div>

                  <div className="p-6 border-b border-[#d4af37]/30 bg-gradient-to-r from-yellow-900/40 to-black/40 flex justify-between items-center z-10">
                      <h2 className="text-2xl font-black text-[#d4af37] flex items-center gap-2 drop-shadow-sm">
                          <Gift size={28} className="animate-pulse"/> זוכים בפרסים!
                      </h2>
                      <button onClick={() => setShowWinners(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10 custom-scrollbar">
                       {(Object.values(db) as Student[]).filter(s => s.total > 0).length === 0 ? (
                           <div className="text-center py-10 text-gray-500">
                               <Coins size={48} className="mx-auto mb-2 opacity-20"/>
                               <p>עדיין אין תלמידים עם ניקוד חיובי.</p>
                           </div>
                       ) : (
                           (Object.values(db) as Student[])
                            .filter(s => s.total > 0)
                            .sort((a,b) => b.total - a.total)
                            .map((s, idx) => (
                               <div key={s.name} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-[#d4af37]/10 hover:border-[#d4af37]/30 transition group">
                                   <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-black/40 text-gray-500'}`}>
                                           {idx + 1}
                                       </div>
                                       <span className="font-bold text-white group-hover:text-[#d4af37] transition-colors">{s.name}</span>
                                   </div>
                                   <span className="font-black text-xl text-[#d4af37]">{s.total}₪</span>
                               </div>
                            ))
                       )}
                  </div>
                  
                  <div className="p-4 bg-black/40 text-center text-xs text-[#d4af37] font-bold border-t border-[#d4af37]/20">
                      כל הכבוד לזוכים! 👏
                  </div>
              </div>
          </div>
      )}
      
      {/* Goals List Modal */}
      {showGoals && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-card w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-border bg-black/20 flex justify-between items-center">
                      <h2 className="text-xl font-black text-white flex items-center gap-2"><ListChecks size={24} className="text-blue-400"/> רשימת יעדים</h2>
                      <button onClick={() => setShowGoals(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                       {(Object.values(db) as Student[]).filter(s => s.academicGoal).length === 0 ? (
                           <div className="text-center py-10 text-gray-500">
                               <Target size={48} className="mx-auto mb-2 opacity-20"/>
                               <p>טרם הוגדרו יעדים לתלמידים.</p>
                               <p className="text-xs mt-2">ניתן להגדיר יעד אישי בלחיצה על שם התלמיד > לשונית "ציונים ויעדים".</p>
                           </div>
                       ) : (
                           (Object.values(db) as Student[])
                            .filter(s => s.academicGoal)
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map((s) => (
                               <div key={s.name} className="bg-white/5 p-4 rounded-xl border border-white/5">
                                   <h4 className="font-bold text-accent text-sm mb-1">{s.name}</h4>
                                   <div className="flex items-start gap-2">
                                       <Target size={16} className="text-gray-500 mt-0.5 shrink-0"/>
                                       <p className="text-sm text-gray-300 leading-relaxed">{s.academicGoal}</p>
                                   </div>
                               </div>
                            ))
                       )}
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
