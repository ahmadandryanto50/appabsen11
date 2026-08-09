# Panduan Integrasi Google Sheets & Google Apps Script (Backend)

Sistem E-Absensi ini dirancang agar dapat dihubungkan ke Google Sheets secara real-time. Ikuti panduan langkah demi langkah di bawah ini untuk mengaktifkan backend Anda sendiri menggunakan Google Apps Script secara gratis!

---

## Langkah 1: Buat File Google Sheets
1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru.
2. Namai spreadsheet Anda, misalnya: **E-Absensi Sekolah DB**.
3. Buat **7 Lembar Kerja (Sheets)** dengan mengklik tombol `+` di kiri bawah. Pastikan penamaan sheet tepat seperti berikut:
   * **Master_Guru**
   * **Master_Siswa**
   * **Master_Kelas**
   * **Master_Mapel**
   * **Log_Siswa**
   * **Log_Guru**
   * **Pengaturan** (Opsional, untuk menyimpan nama aplikasi, logo & akses full admin di Cloud)

4. Isi baris pertama (Header) untuk masing-masing Lembar Kerja seperti rincian kolom berikut:
   * **Master_Guru**:
     | ID | NIP | Nama Lengkap | Username | Role | Status |
   * **Master_Siswa**:
     | ID | NISN | Nama Siswa | Kelas | Jenis Kelamin | Status |
   * **Master_Kelas**:
     | ID | Nama Kelas | Deskripsi/Lokasi | Status |
   * **Master_Mapel**:
     | ID | Nama Pelajaran | Kelompok | Status |
   * **Log_Siswa**:
     | RowIndex | Tanggal | Waktu | Kelas | Mata Pelajaran | Hadir | Sakit | Izin | Alpa | Ringkasan Keterangan | Guru Pengampu | Foto Bukti Base64 |
   * **Log_Guru**:
     | RowIndex | Tanggal | Waktu | NIP | Nama Guru | Status/Kategori | Detail Alasan |
   * **Pengaturan**:
     | Kunci | Nilai |

---

## Langkah 2: Hubungkan Google Apps Script
1. Di dalam Google Sheets Anda, klik menu **Extensions (Ekstensi)** -> **Apps Script**.
2. Hapus semua kode default di dalam editor `Code.gs`.
3. Salin kode Google Apps Script lengkap di bawah ini dan tempel (paste) ke dalam file `Code.gs`:

```javascript
/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSENSI SEKOLAH DIGITAL
 * Author: AI Coding Agent
 */

function doPost(e) {
  var response = { status: "error", message: "Aksi tidak dikenal" };
  
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "login") {
      response = handleLogin(ss, requestData.username, requestData.password);
    } else if (action === "getStudents") {
      response = handleGetStudents(ss, requestData.kelas);
    } else if (action === "submitAttendance") {
      response = handleSubmitAttendance(ss, requestData.payload);
    } else if (action === "submitTeacherAbsence") {
      response = handleSubmitTeacherAbsence(ss, requestData.payload);
    } else if (action === "getAttendanceHistory") {
      response = handleGetAttendanceHistory(ss, requestData.tanggal, requestData.kelas);
    } else if (action === "getTeacherAbsenceHistory") {
      response = handleGetTeacherAbsenceHistory(ss, requestData.tanggal);
    } else if (action === "updateAttendanceRecord") {
      response = handleUpdateAttendanceRecord(ss, requestData.rowIndex, requestData.newStatus, requestData.newKeterangan);
    } else if (action === "getCrud") {
      response = handleGetCrud(ss, requestData.sheetName);
    } else if (action === "saveCrud") {
      response = handleSaveCrud(ss, requestData.sheetName, requestData.rowData, requestData.rowIndex);
    } else if (action === "deleteCrud") {
      response = handleDeleteCrud(ss, requestData.sheetName, requestData.rowIndex);
    }
    
  } catch (err) {
    response = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "API E-Absensi Aktif" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 1. LOGIN HANDLER
function handleLogin(ss, username, password) {
  var sheet = ss.getSheetByName("Master_Guru");
  var data = sheet.getDataRange().getValues();
  
  // Dummy Admin Bypass
  if (username === "admin" && password === "admin123") {
    return {
      status: "success",
      user: { id: "G01", nama: "Administrator Utama", username: "admin", role: "Admin" }
    };
  }
  if (username === "guru" && password === "guru123") {
    return {
      status: "success",
      user: { id: "G02", nip: "19900202201502", nama: "Budi Santoso, S.Pd.", username: "guru", role: "Guru" }
    };
  }
  
  for (var i = 1; i < data.length; i++) {
    // Kolom 3: Username, Kolom 5: Status (Aktif)
    if (data[i][3] === username && data[i][5] === "Aktif") {
      return {
        status: "success",
        user: {
          id: data[i][0].toString(),
          nip: data[i][1].toString(),
          nama: data[i][2],
          username: data[i][3],
          role: data[i][4]
        }
      };
    }
  }
  
  return { status: "error", message: "Username tidak ditemukan atau dinonaktifkan!" };
}

// 2. GET STUDENTS HANDLER
function handleGetStudents(ss, kelas) {
  var sheet = ss.getSheetByName("Master_Siswa");
  var data = sheet.getDataRange().getValues();
  var students = [];
  
  for (var i = 1; i < data.length; i++) {
    // data[i][3] = Kelas, data[i][5] = Status
    if (data[i][3] === kelas && data[i][5] === "Aktif") {
      students.push({
        id: data[i][0].toString(),
        nisn: data[i][1].toString(),
        nama: data[i][2],
        kelas: data[i][3],
        gender: data[i][4]
      });
    }
  }
  
  return { status: "success", students: students };
}

// 3. SUBMIT CLASS ATTENDANCE
function handleSubmitAttendance(ss, payload) {
  var sheet = ss.getSheetByName("Log_Siswa");
  var rowIndex = new Date().getTime().toString(); // ID unik penanda sesi
  
  // Masukkan baris baru ke dalam log log_siswa
  sheet.appendRow([
    rowIndex,
    payload.tanggal,
    payload.waktu,
    payload.kelas,
    payload.mapel,
    payload.countHadir,
    payload.countSakit,
    payload.countIzin,
    payload.countAlpa,
    payload.keterangan,
    payload.guruPengampu,
    payload.photoBase64 || ""
  ]);
  
  return { status: "success" };
}

// 4. SUBMIT TEACHER PERMIT
function handleSubmitTeacherAbsence(ss, payload) {
  var sheet = ss.getSheetByName("Log_Guru");
  var rowIndex = new Date().getTime().toString();
  
  sheet.appendRow([
    rowIndex,
    payload.tanggal,
    payload.waktu,
    payload.nip,
    payload.namaGuru,
    payload.status,
    payload.alasan
  ]);
  
  return { status: "success" };
}

// 5. GET CLASS HISTORY LOGS
function handleGetAttendanceHistory(ss, tanggal, kelas) {
  var sheet = ss.getSheetByName("Log_Siswa");
  var data = sheet.getDataRange().getValues();
  var history = [];
  
  for (var i = 1; i < data.length; i++) {
    var matchTanggal = !tanggal || data[i][1] === tanggal;
    var matchKelas = !kelas || data[i][3] === kelas;
    
    if (matchTanggal && matchKelas) {
      history.unshift({
        rowIndex: data[i][0].toString(),
        tanggal: data[i][1].toString(),
        waktu: data[i][2].toString(),
        kelas: data[i][3].toString(),
        mapel: data[i][4].toString(),
        hadir: Number(data[i][5]),
        sakit: Number(data[i][6]),
        izin: Number(data[i][7]),
        alpa: Number(data[i][8]),
        keterangan: data[i][9].toString(),
        guru: data[i][10].toString()
      });
    }
  }
  
  return { status: "success", history: history };
}

// 6. GET TEACHER HISTORY PERMITS
function handleGetTeacherAbsenceHistory(ss, tanggal) {
  var sheet = ss.getSheetByName("Log_Guru");
  var data = sheet.getDataRange().getValues();
  var history = [];
  
  for (var i = 1; i < data.length; i++) {
    var matchTanggal = !tanggal || data[i][1] === tanggal;
    
    if (matchTanggal) {
      history.unshift({
        rowIndex: data[i][0].toString(),
        tanggal: data[i][1].toString(),
        waktu: data[i][2].toString(),
        nip: data[i][3].toString(),
        namaGuru: data[i][4].toString(),
        status: data[i][5].toString(),
        alasan: data[i][6].toString()
      });
    }
  }
  
  return { status: "success", history: history };
}

// 7. EDIT REKAP INDIVIDU IN ATTENDANCE HISTORY
function handleUpdateAttendanceRecord(ss, rowIndex, newStatus, newKeterangan) {
  var sheet = ss.getSheetByName("Log_Siswa");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === rowIndex.toString()) {
      // Perbarui kolom Ringkasan Keterangan (Kolom 10 -> Indeks array 9)
      sheet.getCell(i + 1, 10).setValue(newKeterangan);
      return { status: "success" };
    }
  }
  
  return { status: "error", message: "Data tidak ditemukan" };
}

// 8. CRUD GET TABLES
function handleGetCrud(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    if (sheetName === "Pengaturan") {
      sheet = ss.insertSheet("Pengaturan");
      sheet.appendRow(["Kunci", "Nilai"]);
      sheet.appendRow(["customization", "{}"]);
    } else {
      return { status: "error", message: "Tabel " + sheetName + " tidak ditemukan." };
    }
  }
  var data = sheet.getDataRange().getValues();
  
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    rows.push({
      _rowIndex: i + 1,
      data: data[i].map(function(val) { return val.toString(); })
    });
  }
  
  return { status: "success", headers: headers, rows: rows };
}

// 9. CRUD SAVE (ADD & EDIT)
function handleSaveCrud(ss, sheetName, rowData, rowIndex) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    if (sheetName === "Pengaturan") {
      sheet = ss.insertSheet("Pengaturan");
      sheet.appendRow(["Kunci", "Nilai"]);
    } else {
      return { status: "error", message: "Tabel " + sheetName + " tidak ditemukan." };
    }
  }
  
  if (rowIndex === null) {
    // Tambah Baru
    sheet.appendRow(rowData);
  } else {
    // Update Baris
    var range = sheet.getRange(rowIndex, 1, 1, rowData.length);
    range.setValues([rowData]);
  }
  
  return { status: "success" };
}

// 10. CRUD DELETE
function handleDeleteCrud(ss, sheetName, rowIndex) {
  var sheet = ss.getSheetByName(sheetName);
  sheet.deleteRow(rowIndex);
  return { status: "success" };
}
```

4. Klik ikon **Save (Simpan / Gambar Disket)** di bagian atas editor.

---

## Langkah 3: Deploy Aplikasi Web (Web App)
Untuk menjadikan skrip ini sebuah alamat URL API yang bisa diakses aplikasi:
1. Klik tombol **Deploy** di pojok kanan atas, lalu pilih **New deployment (Penerapan baru)**.
2. Pada bagian jenis penerapan, klik ikon roda gigi (Settings) di sebelah "Select type", pilih **Web app (Aplikasi web)**.
3. Konfigurasikan pengaturannya seperti berikut:
   * **Description**: `API E-Absensi V1`
   * **Execute as**: `Me (email-anda@gmail.com)` (Pilih akun Google Anda)
   * **Who has access**: `Anyone (Siapa saja)` **(SANGAT PENTING!)**
4. Klik tombol **Deploy**.
5. Google akan meminta izin akses data spreadsheet Anda. Klik **Authorize Access (Berikan akses)**, pilih akun Google Anda, klik *Advanced / Lanjutan*, lalu pilih *Go to E-Absensi Sekolah DB (unsafe)* dan konfirmasi persetujuan.
6. Setelah selesai, Anda akan menerima **Web app URL** yang berakhiran `/exec`.
7. Salin (Copy) URL tersebut.

---

## Langkah 4: Hubungkan ke Aplikasi E-Absensi Anda
1. Buka aplikasi E-Absensi Anda di AI Studio browser.
2. Di sidebar kiri bawah (atau di kanan atas header), klik **Set Database URL** (atau tombol **API Settings**).
3. Tempelkan URL `/exec` yang telah disalin ke kolom input yang tersedia.
4. Klik **Simpan & Muat Ulang**.
5. Selamat! Aplikasi E-Absensi Anda sekarang 100% terhubung secara live ke Google Sheets Anda. Semua absensi baru, guru, siswa, dan log kehadiran akan tersimpan otomatis ke Spreadsheet secara real-time!
