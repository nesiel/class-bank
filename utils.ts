
import { Database, Student, LogEntry, AppConfig } from './types';
import * as XLSX from 'xlsx';

// Helper to compress images before saving to LocalStorage
// This prevents the "QuotaExceededError" and keeps the app fast.
export const compressImage = (file: File, maxWidth = 300, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output as JPEG with reduced quality
        resolve(elem.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  // We now route through the compressor by default for safer storage
  if (file.type.startsWith('image/')) {
      return compressImage(file);
  }
  
  // Fallback for non-image files (though not used currently)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const parseExcel = async (file: File, config: AppConfig): Promise<Database> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find the first sheet with actual data (sometimes the first sheet is empty or just instructions)
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with raw headers first to find the "real" header row
        const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Find the row index that contains "Shem Talmid" or similar
        let headerRowIndex = 0;
        rawJson.forEach((row, index) => {
            const rowStr = row.join(' ');
            if (rowStr.includes('שם התלמיד') || rowStr.includes('שם פרטי')) {
                headerRowIndex = index;
            }
        });

        // Re-parse with the correct header row
        const json = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];
        
        const db: Database = {};
        
        // Enhanced Header Mapping
        const headersMap = {
          name: ['שם התלמיד', 'שם פרטי', 'שם משפחה', 'שם מלא', 'תלמיד', 'שם'],
          lastName: ['שם משפחה', 'משפחה'],
          firstName: ['שם פרטי', 'פרטי'],
          
          // Student Contact
          studentCell: ['סלולרי של התלמיד', 'נייד תלמיד', 'טלפון תלמיד', 'פלאפון תלמיד', 'נייד של התלמיד'],
          studentEmail: ['מייל תלמיד', 'דוא"ל תלמיד', 'אימייל תלמיד', 'Student Email'],
          homePhone: ['טלפון בבית', 'טלפון בית', 'בבית', 'Home Phone', 'טלפון נייח'],

          // Mother
          motherName: ['שם האמא', 'שם האם', 'אמא', 'שם הורה 1', 'הורה 1', 'Mother Name', 'שם אם'],
          motherPhone: ['טלפון נייד של אמא', 'נייד של אמא', 'טלפון אמא', 'נייד אמא', 'נייד הורה 1', 'טלפון הורה 1', 'נייד 1', 'Mother Phone', 'סלולרי אם'],
          motherEmail: ['דוא"ל של אמא', 'דוא"ל אמא', 'מייל אמא', 'אימייל אמא', 'Email Mother'],

          // Father
          fatherName: ['שם האבא', 'שם האב', 'אבא', 'שם הורה 2', 'הורה 2', 'Father Name', 'שם אב'],
          fatherPhone: ['טלפון נייד של אבא', 'נייד של אבא', 'טלפון אבא', 'נייד אבא', 'נייד הורה 2', 'טלפון הורה 2', 'נייד 2', 'Father Phone', 'סלולרי אב'],
          fatherEmail: ['דוא"ל של אבא', 'דוא"ל אבא', 'מייל אבא', 'אימייל אבא', 'Email Father'],

          // General
          teacher: ['מורה', 'שם המורה', 'דווח ע"י', 'מדווח']
        };

        json.forEach((row: any) => {
          const getValue = (aliases: string[]) => {
            const key = Object.keys(row).find(k => aliases.some(alias => k.trim() === alias || k.includes(alias)));
            return key ? row[key] : undefined;
          };

          // Identify Name
          let name = "";
          const fName = getValue(headersMap.firstName);
          const lName = getValue(headersMap.lastName);
          
          if (fName && lName) {
            name = `${fName} ${lName}`.trim();
          } else {
            const fullName = getValue(headersMap.name);
            if (fullName) name = String(fullName).trim();
          }

          if (!name || name === "undefined") return;

          // Init Student
          if (!db[name]) db[name] = { name, total: 0, logs: [] };

          // === Contact Info ===
          const sCell = getValue(headersMap.studentCell);
          const sEmail = getValue(headersMap.studentEmail);
          const hPhone = getValue(headersMap.homePhone);

          const mName = getValue(headersMap.motherName);
          const mPhone = getValue(headersMap.motherPhone);
          const mEmail = getValue(headersMap.motherEmail);

          const fNameVal = getValue(headersMap.fatherName);
          const fPhone = getValue(headersMap.fatherPhone);
          const fEmail = getValue(headersMap.fatherEmail);

          if (sCell) db[name].studentCell = String(sCell).replace(/[^0-9+]/g, '');
          if (sEmail) db[name].studentEmail = String(sEmail).trim();
          if (hPhone) db[name].homePhone = String(hPhone).replace(/[^0-9+]/g, '');

          if (mName) db[name].nameMother = String(mName).trim();
          if (mPhone) db[name].phoneMother = String(mPhone).replace(/[^0-9+]/g, '');
          if (mEmail) db[name].emailMother = String(mEmail).trim();

          if (fNameVal) db[name].nameFather = String(fNameVal).trim();
          if (fPhone) db[name].phoneFather = String(fPhone).replace(/[^0-9+]/g, '');
          if (fEmail) db[name].emailFather = String(fEmail).trim();

          // === Behavior Logic ===
          const teacherName = getValue(headersMap.teacher) || "צוות";

          // Method 1: Explicit Columns
          Object.keys(row).forEach(header => {
            const cleanHeader = header.trim().replace(/\s+/g, ' '); 
            
            const matchedAction = Object.keys(config.actionScores).find(action => 
              cleanHeader === action || cleanHeader.includes(action)
            );

            if (matchedAction) {
              const val = row[header];
              if (typeof val === 'number' && val > 0) {
                 const scorePerAction = config.actionScores[matchedAction];
                 const totalScore = scorePerAction * val;
                 
                 db[name].logs.push({
                   sub: "ייבוא מאקסל",
                   teach: teacherName,
                   k: matchedAction,
                   c: val,
                   s: totalScore,
                   d: new Date().toLocaleDateString('he-IL')
                 });
                 db[name].total += totalScore;
              }
            }
          });

          // Method 2: Text parsing within cells
          Object.keys(row).forEach(key => {
            if (headersMap.name.some(h => key.includes(h)) || key.includes('שם') || key.includes('כיתה') || key.includes('שכבה') || key === "מס'") return;
            
            const content = String(row[key] || "");
            const regex = /([^:0-9,]+):\s*(\d+)/g;
            
            let match;
            while ((match = regex.exec(content)) !== null) {
              const rawActionType = match[1].trim();
              const actionType = rawActionType.replace(/\s+/g, ' '); 
              
              const count = parseInt(match[2]);
              
              const knownAction = Object.keys(config.actionScores).find(k => actionType.includes(k));
              
              if (knownAction) {
                  const baseScore = config.actionScores[knownAction];
                  const totalActionScore = baseScore * count;

                  let subject = "כללי";
                  if (key.includes('-')) {
                      subject = key.split('-')[0].trim();
                  } else if (key.includes('...')) {
                      subject = key.split('...')[0].trim();
                  } else {
                      subject = key; 
                  }
                  
                  let teacher = teacherName;
                  if (teacher === "צוות" && key.includes('-')) {
                      teacher = key.split('-')[1].trim();
                  }

                  db[name].logs.push({
                    sub: subject,
                    teach: teacher,
                    k: knownAction,
                    c: count,
                    s: totalActionScore,
                    d: new Date().toLocaleDateString('he-IL')
                  });
                  db[name].total += totalActionScore;
              }
            }
          });
        });
        resolve(db);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportCommentsToExcel = (db: Database) => {
  const data = Object.values(db).map((student: Student) => ({
    'שם התלמיד': student.name,
    'הערה לתעודה': student.certificateComment || '',
    'דגשים': student.academicReinforcement || '',
    'ציונים': (student.grades || []).map(g => `${g.subject}: ${g.score}`).join(', ')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "הערות לתעודה");
  XLSX.writeFile(wb, `הערות_לתעודה_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.xlsx`);
};