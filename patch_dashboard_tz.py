with open('src/components/DashboardView.tsx', 'r') as f:
    code = f.read()

code = code.replace("import { User, AttendanceRecord, AppCustomization } from '../types';", "import { User, AttendanceRecord, AppCustomization, getLocalDateString } from '../types';")

target_local_func = """  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };"""

if target_local_func in code:
    code = code.replace(target_local_func, "")
    with open('src/components/DashboardView.tsx', 'w') as f:
        f.write(code)
    print("Updated DashboardView.tsx successfully!")
else:
    print("target_local_func not found")

