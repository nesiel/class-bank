
import { Database, Student, LogEntry, AppConfig, GradeEntry } from './types';
import * as XLSX from 'xlsx';

// Helper to compress images before saving to LocalStorage
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
  if (file.type.startsWith('image/')) {
      return compressImage(file);
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const parseGradesExcel = async (file: File): Promise<Record<string, GradeEntry[]>> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet) as any[];
                
                const result: Record<string, GradeEntry[]> = {};

                json.forEach((row) => {
                    // Identify student name key (heuristic)
                    const nameKey = Object.keys(row).find(k => k.includes('שם') || k.includes('תלמיד') || k === 'Name');
                    if (!nameKey) return;
                    
                    const name = String(row[nameKey]).trim();
                    const grades: GradeEntry[] = [];

                    Object.keys(row).forEach(key => {
                        if (key === nameKey) return; // Skip name column
                        
                        // Attempt to parse score
                        const val = row[key];
                        const score = parseFloat(val);
                        
                        // Only add if it's a valid number
                        if (!isNaN(score)) {
                            grades.push({
                                subject: key.trim(),
                                score: score
                            });
                        }
                    });

                    result[name] = grades;
                });
                
                resolve(result);
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const parseExcel = async (file: File, config: AppConfig): Promise<Database> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Find header row index
        let headerRowIndex = 0;
        rawJson.forEach((row, index) => {
            const rowStr = row.join(' ');
            // Relaxed header detection
            if (rowStr.includes('שם התלמיד') || 
               (rowStr.includes('שם') && rowStr.includes('משפחה')) ||
               (rowStr.includes('שם') && rowStr.includes('כיתה'))) {
                headerRowIndex = index;
            }
        });

        const json = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];
        const db: Database = {};
        
        const headersMap = {
          name: ['שם התלמיד', 'שם פרטי', 'שם משפחה', 'שם מלא', 'תלמיד', 'שם'],
          lastName: ['שם משפחה', 'משפחה'],
          firstName: ['שם פרטי', 'פרטי'],
          // Contact mappings...
          studentCell: ['סלולרי של התלמיד', 'נייד תלמיד', 'טלפון תלמיד', 'פלאפון תלמיד', 'נייד של התלמיד'],
          studentEmail: ['מייל תלמיד', 'דוא"ל תלמיד', 'אימייל תלמיד', 'Student Email'],
          homePhone: ['טלפון בבית', 'טלפון בית', 'בבית', 'Home Phone', 'טלפון נייח'],
          motherName: ['שם האמא', 'שם האם', 'אמא', 'שם הורה 1', 'הורה 1', 'Mother Name', 'שם אם'],
          motherPhone: ['טלפון נייד של אמא', 'נייד של אמא', 'טלפון אמא', 'נייד אמא', 'נייד הורה 1', 'טלפון הורה 1', 'נייד 1', 'Mother Phone', 'סלולרי אם'],
          motherEmail: ['דוא"ל של אמא', 'דוא"ל אמא', 'מייל אמא', 'אימייל אמא', 'Email Mother'],
          fatherName: ['שם האבא', 'שם האב', 'אבא', 'שם הורה 2', 'הורה 2', 'Father Name', 'שם אב'],
          fatherPhone: ['טלפון נייד של אבא', 'נייד של אבא', 'טלפון אבא', 'נייד אבא', 'נייד הורה 2', 'טלפון הורה 2', 'נייד 2', 'Father Phone', 'סלולרי אב'],
          fatherEmail: ['דוא"ל של אבא', 'דוא"ל אבא', 'מייל אבא', 'אימייל אבא', 'Email Father'],
          teacher: ['מורה', 'שם המורה', 'דווח ע"י', 'מדווח'],
          
          // Expanded Total Score Keywords for Semester/Summary files
          totalScore: [
              'סה"כ', 'ניקוד סופי', 'ציון כולל', 'סה"כ נקודות', 'Total Score', 'Total', 
              'סיכום', 'מאזן', 'ניקוד', 'ציון', 'ממוצע', 'לתעודה', 'מחצית', 'מצטיין'
          ]
        };

        json.forEach((row: any) => {
          const getValue = (aliases: string[]) => {
            const key = Object.keys(row).find(k => aliases.some(alias => k.trim() === alias || k.includes(alias)));
            return key ? row[key] : undefined;
          };

          // --- Student Name Logic ---
          let name = "";
          const fName = getValue(headersMap.firstName);
          const lName = getValue(headersMap.lastName);
          
          if (fName && lName) {
            name = `${fName} ${lName}`.trim();
          } else {
            const fullName = getValue(headersMap.name);
            if (fullName) name = String(fullName).trim();
          }

          // Skip rows without valid name
          if (!name || name === "undefined" || name.includes("סה'כ") || name.length < 2) return;

          if (!db[name]) db[name] = { name, total: 0, logs: [] };

          // --- Contact Info ---
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

          // --- Behavior / Score Logic ---
          let foundDetails = false;
          const defaultTeacher = getValue(headersMap.teacher) || "צוות";

          // Sort action keys by length desc to match specific actions first (e.g. "Specific Action" before "Action")
          const sortedActionKeys = Object.keys(config.actionScores).sort((a, b) => b.length - a.length);

          Object.keys(row).forEach(key => {
            // Ignore basic info columns
            if (headersMap.name.some(alias => key.includes(alias)) || 
                headersMap.firstName.some(alias => key.includes(alias)) ||
                headersMap.lastName.some(alias => key.includes(alias)) ||
                ['מס', "מס'", 'כיתה', 'שכבה', 'ת.ז'].some(x => key === x || key.trim() === x)) {
                return;
            }

            let subject = "כללי";
            let teacher = defaultTeacher;

            if (key.includes('-')) {
                const parts = key.split('-');
                subject = parts[0].trim();
                if (parts.length > 1) teacher = parts[1].trim();
            } else {
                subject = key.trim();
            }

            const val = row[key];
            const content = String(val || "");

            // Method 1: Robust Digit-Based Split
            // Splits string into pairs of [Text][Number]
            // Handles "Action:5", "Action: 5", "Action5", "Action:5Action:6"
            // Captures any sequence of non-digits as the name, and the following digits as the count.
            const regex = /([^\d]+)(\d+(\.\d+)?)/g;
            let match;
            let matchedInCell = false;

            while ((match = regex.exec(content)) !== null) {
                let rawAction = match[1].trim();
                // Remove trailing separators that might have been captured (e.g. "Late:" -> "Late")
                rawAction = rawAction.replace(/[:\-\(\)]+$/, '').trim();
                
                // NORMALIZE WHITESPACE: Replace multiple spaces/tabs with single space
                // This fixes "מילה  טובה" (double space) not matching "מילה טובה" (single space)
                rawAction = rawAction.replace(/\s+/g, ' ');

                const count = parseFloat(match[2]);
                
                // Find matching action in config (longest match first)
                const actionKey = sortedActionKeys.find(k => rawAction.includes(k));
                
                if (actionKey) {
                    const score = config.actionScores[actionKey];
                    const totalActionScore = score * count;
                    
                    db[name].logs.push({
                        sub: subject,
                        teach: teacher,
                        k: actionKey,
                        c: count,
                        s: totalActionScore,
                        d: new Date().toLocaleDateString('he-IL')
                    });
                    db[name].total += totalActionScore;
                    matchedInCell = true;
                    foundDetails = true;
                }
            }

            // Method 2: Header itself is the Action name
            if (!matchedInCell && typeof val === 'number') {
                const actionKey = sortedActionKeys.find(k => key.includes(k));
                if (actionKey) {
                    const score = config.actionScores[actionKey];
                    const totalActionScore = score * val;
                     db[name].logs.push({
                        sub: subject,
                        teach: teacher,
                        k: actionKey,
                        c: val,
                        s: totalActionScore,
                        d: new Date().toLocaleDateString('he-IL')
                    });
                    db[name].total += totalActionScore;
                    foundDetails = true;
                }
            }
          });

          // Method 3: Semester Total Fallback
          if (!foundDetails || db[name].total === 0) {
              const explicitTotal = getValue(headersMap.totalScore);
              
              if (explicitTotal !== undefined) {
                  const parsedTotal = parseFloat(String(explicitTotal));
                  if (!isNaN(parsedTotal)) {
                      db[name].total = parsedTotal;
                  }
              } else {
                 const fallbackTotalKey = Object.keys(row).find(k => k.includes('סה"כ') || k.includes('ניקוד') || k.includes('ציון'));
                 if (fallbackTotalKey && !isNaN(parseFloat(row[fallbackTotalKey]))) {
                     db[name].total = parseFloat(row[fallbackTotalKey]);
                 }
              }
          }

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
