import re

with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

switch_target = """      case "saveStudentClassRecap":
        result = saveStudentClassRecap(contents.payload);
        break;"""

switch_replacement = """      case "saveStudentClassRecap":
        result = saveStudentClassRecap(contents.payload);
        break;
      case "uploadToDrive":
        result = uploadToDrive(contents.payload);
        break;"""

if 'case "uploadToDrive":' not in code:
    code = code.replace(switch_target, switch_replacement)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)

