
export interface LogEntry {
  sub: string;
  teach: string;
  k: string;
  c: number;
  s: number;
  d?: string;
}

export interface GradeEntry {
  subject: string;
  score: number; // Changed to number for calculations
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseRequest {
  id: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  date: string;
  timestamp: number;
  status: RequestStatus;
}

export interface ChallengeRequest {
  id: string;
  challengeId: string;
  challengeTitle: string;
  reward: number;
  date: string;
  timestamp: number;
  status: RequestStatus;
}

export interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  date: string;
  timestamp: number;
}

export interface Challenge {
  id: string;
  title: string;
  reward: number;
  approved: boolean; // New: If false, it's a suggestion waiting for teacher
  suggestedBy?: string; // New: Name of student who suggested it
}

export interface Student {
  name: string;
  total: number;
  logs: LogEntry[];
  purchases?: Purchase[];
  requests?: PurchaseRequest[]; 
  challengeRequests?: ChallengeRequest[]; // New: Pending challenge completions
  lastNachatDate?: string;
  
  // Semester Data
  semesterScore?: number;
  semesterLogs?: LogEntry[]; 

  // Auth
  password?: string; 

  // Contact Details
  studentCell?: string;
  studentEmail?: string; 
  homePhone?: string; 
  
  nameMother?: string;
  phoneMother?: string;
  emailMother?: string;
  
  nameFather?: string;
  phoneFather?: string;
  emailFather?: string;
  
  isHiddenFromPodium?: boolean;
  
  // Certificate generation & Academic Tracking
  grades?: GradeEntry[];
  academicReinforcement?: string;
  certificateComment?: string;
  academicGoal?: string; // New: Specific goal set by teacher
  
  // Seating
  seatId?: string;
}

export interface Database {
  [key: string]: Student;
}

export interface StoreItem {
  id: string;
  name: string;
  emoji: string;
  image?: string; 
  price: number;
  stock: number; 
}

export type ThemeType = 'current' | 'modern' | 'simple';
export type UserRole = 'teacher' | 'student' | 'guest';

// --- Learning Center Types ---
export type ResourceType = 'link' | 'file' | 'video' | 'form';

export interface LearningResource {
    id: string;
    title: string;
    subject: string;
    type: ResourceType;
    url: string; 
    dateAdded: string;
}

export interface AppConfig {
  slogan: string;
  logo: string;
  teacherCell: string; 
  teacherPin: string; 
  pastWinners: string[];
  actionScores: Record<string, number>;
  storeItems: StoreItem[]; 
  challenges: Challenge[]; 
  
  // Learning Center
  learningSubjects: string[];
  learningResources: LearningResource[];

  // Security & Site Management
  isSystemLocked?: boolean; // New: Prevents student access

  rules: string;
  theme: ThemeType;
  googleAppsScriptUrl?: string; 
}

export const DEFAULT_SCORES: Record<string, number> = {
  // Positive (+1)
  'מילה טובה': 1,
  'הצטיינות': 1,
  'שיתוף פעולה': 1,
  'שותף במהלך השיעור': 1,
  'עזרה לחבר': 1,
  'יוזמה': 1,
  'הגעה בזמן': 1,
  'השתתפות': 1,
  'שיעורי בית': 1,
  'תפילה': 1,
  'תפילת מנחה': 1,
  
  // Negative (-1)
  'איחור': -1,
  'חיסור': -1,
  'אי הבאת ציוד': -1,
  'הפרעה': -1,
  'הפרעה במהלך שיעור': -1,
  'פטפוט': -1,
  'שוטטות': -1,
  'אי השתתפות': -1,
  'חוצפה': -1,
  'סרבנות': -1,
  'חוצפה/סרבנות': -1
};

export const DEFAULT_CONFIG: AppConfig = {
  slogan: "יישר כוח!",
  logo: "",
  teacherCell: "",
  teacherPin: "1234",
  pastWinners: [],
  actionScores: DEFAULT_SCORES,
  storeItems: [
    { id: '1', name: 'עיפרון חודים', emoji: '✏️', price: 50, stock: 20 },
    { id: '2', name: 'מחק ריחני', emoji: '🧼', price: 30, stock: 15 },
    { id: '3', name: 'פטור משיעורים', emoji: '📜', price: 100, stock: 5 },
    { id: '4', name: 'החלפת מקום ליום', emoji: '🪑', price: 80, stock: 10 },
    { id: '5', name: 'כדור גומי', emoji: '🎾', price: 60, stock: 8 }
  ],
  challenges: [
    { id: '1', title: 'שבוע תפילה בזמן', reward: 50, approved: true },
    { id: '2', title: 'שבוע ללא איחורים', reward: 40, approved: true },
    { id: '3', title: 'עזרה לחבר בלימודים', reward: 20, approved: true },
    { id: '4', title: 'סיום מסכת משניות', reward: 100, approved: true },
    { id: '5', title: 'שבוע תפילת מנחה', reward: 30, approved: true },
  ],
  learningSubjects: ['משנה', 'גמרא', 'חומש', 'הלכה', 'כללי'],
  learningResources: [],
  isSystemLocked: false,
  rules: `תקנון הכיתה:
1. יש להגיע בזמן לשיעורים.
2. יש להביא ציוד לימודי מלא.
3. מדברים בכבוד אחד לשני.
4. שומרים על רכוש בית הספר.
(ניתן לערוך טקסט זה במסך הניהול)`,
  theme: 'current',
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbzAsMNv-RG0Pnx2VM7zDe26Id6zcDuZIZxpYy8ra6Tif1RMYaoYFuom8lMTobTe53d3UA/exec"
};
