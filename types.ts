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
  score: string;
}

export interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  date: string;
  timestamp: number;
}

export interface Student {
  name: string;
  total: number;
  logs: LogEntry[];
  purchases?: Purchase[]; // Added purchases history
  lastNachatDate?: string;
  
  // Contact Details
  studentCell?: string;
  studentEmail?: string; // Added student email explicitly
  homePhone?: string; 
  
  nameMother?: string;
  phoneMother?: string;
  emailMother?: string;
  
  nameFather?: string;
  phoneFather?: string;
  emailFather?: string;
  
  isHiddenFromPodium?: boolean;
  
  // Certificate generation
  grades?: GradeEntry[];
  academicReinforcement?: string;
  certificateComment?: string;
  
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
  image?: string; // Base64 image string
  price: number;
  stock: number; // Inventory count
}

export type ThemeType = 'current' | 'modern' | 'simple';

export interface AppConfig {
  slogan: string;
  logo: string;
  teacherCell: string; // Teacher's phone for notifications
  pastWinners: string[];
  actionScores: Record<string, number>;
  storeItems: StoreItem[]; 
  rules: string;
  theme: ThemeType;
}

export const DEFAULT_SCORES: Record<string, number> = {
  // Positive
  'מילה טובה': 10,
  'הצטיינות': 15,
  'שיתוף פעולה': 12,
  'שותף במהלך השיעור': 12,
  'עזרה לחבר': 10,
  'יוזמה': 10,
  'הגעה בזמן': 5,
  'השתתפות': 5,
  'שיעורי בית': 5,
  'תפילה': 5,
  'תפילת מנחה': 5,
  
  // Negative
  'איחור': -5,
  'חיסור': -10,
  'אי הבאת ציוד': -5,
  'הפרעה': -10,
  'הפרעה במהלך שיעור': -10,
  'פטפוט': -5,
  'שוטטות': -10,
  'אי השתתפות': -5
};

export const DEFAULT_CONFIG: AppConfig = {
  slogan: "יישר כוח!",
  logo: "",
  teacherCell: "",
  pastWinners: [],
  actionScores: DEFAULT_SCORES,
  storeItems: [
    { id: '1', name: 'עיפרון חודים', emoji: '✏️', price: 50, stock: 20 },
    { id: '2', name: 'מחק ריחני', emoji: '🧼', price: 30, stock: 15 },
    { id: '3', name: 'פטור משיעורים', emoji: '📜', price: 100, stock: 5 },
    { id: '4', name: 'החלפת מקום ליום', emoji: '🪑', price: 80, stock: 10 },
    { id: '5', name: 'כדור גומי', emoji: '🎾', price: 60, stock: 8 }
  ],
  rules: `תקנון הכיתה:
1. יש להגיע בזמן לשיעורים.
2. יש להביא ציוד לימודי מלא.
3. מדברים בכבוד אחד לשני.
4. שומרים על רכוש בית הספר.
(ניתן לערוך טקסט זה במסך הניהול)`,
  theme: 'current'
};