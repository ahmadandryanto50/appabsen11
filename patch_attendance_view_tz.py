with open('src/components/AttendanceView.tsx', 'r') as f:
    code = f.read()

code = code.replace("import { User, Student, AttendanceRecord } from '../types';", "import { User, Student, AttendanceRecord, getLocalDateString, getLocalTimeString } from '../types';")

target_block = """    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const tanggalStr = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const waktuStr = `${hours}:${minutes}:${seconds}`;"""

replacement_block = """    const now = new Date();
    const tanggalStr = getLocalDateString(now);
    const waktuStr = getLocalTimeString(now);"""

if target_block in code:
    code = code.replace(target_block, replacement_block)
    with open('src/components/AttendanceView.tsx', 'w') as f:
        f.write(code)
    print("Updated AttendanceView.tsx successfully!")
else:
    print("target_block not found in AttendanceView.tsx")

