for filepath in ['src/components/TeacherAttendanceView.tsx', 'src/components/TendikAttendanceView.tsx']:
    with open(filepath, 'r') as f:
        code = f.read()

    code = code.replace("getLocalDateString", "getLocalDateString, getLocalTimeString")
    code = code.replace("const timeString = now.toTimeString().split(' ')[0];", "const timeString = getLocalTimeString(now);")

    with open(filepath, 'w') as f:
        f.write(code)
    print(f"Patched {filepath} successfully!")

