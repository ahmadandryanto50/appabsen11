with open('src/api.ts', 'r') as f:
    code = f.read()

code = code.replace("import { Student, AttendanceRecord, TeacherAbsenceRecord } from './types';", "import { Student, AttendanceRecord, TeacherAbsenceRecord, getLocalDateString, getLocalTimeString } from './types';")

target_api_kiosk = """    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeClockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;"""

replacement_api_kiosk = """    const now = new Date();
    const dateStr = getLocalDateString(now);
    const timeClockStr = getLocalTimeString(now);"""

if target_api_kiosk in code:
    code = code.replace(target_api_kiosk, replacement_api_kiosk)
    with open('src/api.ts', 'w') as f:
        f.write(code)
    print("Updated src/api.ts successfully!")
else:
    print("target_api_kiosk not found in src/api.ts")

