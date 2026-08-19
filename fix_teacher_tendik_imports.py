for filepath in ['src/components/TeacherAttendanceView.tsx', 'src/components/TendikAttendanceView.tsx']:
    with open(filepath, 'r') as f:
        code = f.read()

    code = code.replace("getLocalDateString, getLocalTimeString(new Date())", "getLocalDateString(new Date())")

    with open(filepath, 'w') as f:
        f.write(code)
    print(f"Fixed {filepath} successfully!")

