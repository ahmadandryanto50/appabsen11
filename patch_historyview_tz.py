with open('src/components/HistoryView.tsx', 'r') as f:
    code = f.read()

# Add timeZone: 'Asia/Jakarta' to toLocaleDateString calls
code = code.replace("toLocaleDateString('id-ID', {", "toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta',")

with open('src/components/HistoryView.tsx', 'w') as f:
    f.write(code)

print("Patched HistoryView.tsx toLocaleDateString with Asia/Jakarta successfully!")

