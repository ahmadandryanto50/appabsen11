with open('src/types.ts', 'r') as f:
    code = f.read()

target_func = """export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}"""

replacement_func = """export function getLocalDateString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    let day = '', month = '', year = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
    }
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (e) {}

  const tzOffset = 7 * 60; // WIB UTC+7 in minutes
  const localMs = d.getTime() + (d.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    let hour = '', minute = '', second = '';
    for (const p of parts) {
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'second') second = p.value;
    }
    if (hour && minute && second) {
      return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    }
  } catch (e) {}

  const tzOffset = 7 * 60;
  const localMs = d.getTime() + (d.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}"""

if target_func in code:
    code = code.replace(target_func, replacement_func)
    with open('src/types.ts', 'w') as f:
        f.write(code)
    print("Updated getLocalDateString in src/types.ts successfully!")
else:
    print("target_func not found in src/types.ts")

