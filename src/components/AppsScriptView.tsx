/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code, Copy, Check, ExternalLink, FileCode2, Database, ListOrdered, CheckCircle2, AlertCircle } from 'lucide-react';

interface AppsScriptViewProps {
  customization?: {
    logoColor?: string;
  };
}

export function AppsScriptView({ customization }: AppsScriptViewProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'guide' | 'schema'>('code');
  const [copied, setCopied] = useState(false);

  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSENSI SEKOLAH DIGITAL
 * Author: AI Coding Agent & Admin
 * Spreadsheet ID: 108dYMsw03-1jhD3HbOvuvPwW2rrx9uBJ3RbhgwhNBV4
 */

const SPREADSHEET_ID = "108dYMsw03-1jhD3HbOvuvPwW2rrx9uBJ3RbhgwhNBV4";

function getDb() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "" && SPREADSHEET_ID !== "ID_DARI_URL_SPREADSHEET") {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    Logger.log("Error opening spreadsheet: " + err.message);
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

// ===========================================================================
// FUNGSI UTAMA DEPLOYMENT WEB API
// ===========================================================================

function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('E-Absensi Sekolah')
      .setXframeOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      message: "Layanan Backend API E-Absensi Sekolah Aktif."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let contents = {};
    if (e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      contents = e.parameter;
    }

    const action = contents.action;
    var ss = getDb();
    let result = { status: "error", message: "Aksi tidak dikenal." };

    switch (action) {
      case "login":
        result = loginUser(contents.username, contents.password);
        break;
      case "getStudents":
        result = getStudentsByClass(contents.kelas);
        break;
      case "submitAttendance":
        result = submitStudentAttendance(contents.payload);
        break;
      case "submitTeacherAbsence":
        result = submitTeacherAbsence(contents.payload);
        break;
      case "getCrud":
        result = getMasterData(contents.sheetName);
        break;
      case "saveCrud":
        result = saveMasterDataRow(contents.sheetName, contents.rowData, contents.rowIndex);
        break;
      case "deleteCrud":
        result = deleteMasterDataRow(contents.sheetName, contents.rowIndex);
        break;
      case "getRecap":
        result = getAttendanceRecap();
        break;
      case "getAttendanceHistory":
        result = getAttendanceHistory(contents.tanggal, contents.kelas);
        break;
      case "getTeacherAbsenceHistory":
        result = getTeacherAbsenceHistory(contents.tanggal);
        break;
      case "resetAttendance":
        result = resetAttendanceByDateClass(contents.tanggal, contents.kelas);
        break;
      case "updateAttendanceRecord":
        result = updateStudentAttendanceRecord(contents.rowIndex, contents.newStatus, contents.newKeterangan);
        break;
      case "deleteAttendanceRecord":
        result = deleteStudentAttendanceRecord(contents.rowIndex);
        break;
      case "updateTeacherAbsenceRecord":
        result = updateTeacherAbsenceRecord(contents.rowIndex, contents.status, contents.alasan);
        break;
      case "deleteTeacherAbsenceRecord":
        result = deleteTeacherAbsenceRecord(contents.rowIndex);
        break;
      case "submitTendikAttendance":
        result = submitTendikAttendance(contents.payload);
        break;
      case "submitTendikPermit":
        result = submitTendikPermit(contents.payload);
        break;
      case "getTendikAttendanceHistory":
        result = getTendikAttendanceHistory(contents.tanggal);
        break;
      case "getTendikPermitHistory":
        result = getTendikPermitHistory(contents.tanggal);
        break;
      case "deleteTendikAttendanceRecord":
        result = deleteTendikAttendanceRecord(contents.rowIndex);
        break;
      case "deleteTendikPermitRecord":
        result = deleteTendikPermitRecord(contents.rowIndex);
        break;
      case "setup":
        result = setupDatabase();
        break;
      case "getCustomization":
        result = getCustomization();
        break;
      case "saveCustomization":
        result = saveCustomization(contents.customization);
        break;
      default:
        result = { status: "error", message: "Aksi '" + action + "' tidak didukung." };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===========================================================================
// FUNGSI SETUP OTOMATIS TABEL SPREADSHEET
// ===========================================================================

function setupDatabase() {
  try {
    const ss = getDb();
    if (!ss) {
      return { status: "error", message: "Spreadsheet tidak ditemukan! Periksa SPREADSHEET_ID." };
    }

    // 1. Tabel Master_Guru
    let sheetGuru = ss.getSheetByName("Master_Guru");
    if (!sheetGuru) {
      sheetGuru = ss.insertSheet("Master_Guru");
      sheetGuru.appendRow(["ID", "NIP", "Nama Lengkap", "Jenis Kelamin", "Username", "Password", "Role", "Status"]);
      sheetGuru.appendRow(["G01", "19850101201001", "Administrator Utama", "Laki-laki", "admin", "admin123", "Admin", "Aktif"]);
      sheetGuru.appendRow(["G02", "19900202201502", "Budi Santoso, S.Pd.", "Laki-laki", "guru", "guru123", "Guru", "Aktif"]);
      sheetGuru.appendRow(["G03", "19920303201803", "Siti Rahma, M.Pd.", "Perempuan", "siti", "siti123", "Guru", "Aktif"]);
    }

    // 2. Tabel Master_Siswa
    let sheetSiswa = ss.getSheetByName("Master_Siswa");
    if (!sheetSiswa) {
      sheetSiswa = ss.insertSheet("Master_Siswa");
      sheetSiswa.appendRow(["ID", "NISN", "Nama Siswa", "Kelas", "Jenis Kelamin", "Status"]);
      sheetSiswa.appendRow(["S01", "0051234561", "Ahmad Rizky", "X-A", "Laki-laki", "Aktif"]);
      sheetSiswa.appendRow(["S02", "0051234562", "Anisa Putri", "X-A", "Perempuan", "Aktif"]);
      sheetSiswa.appendRow(["S03", "0051234563", "Bagus Pratama", "X-A", "Laki-laki", "Aktif"]);
      sheetSiswa.appendRow(["S04", "0051234564", "Citra Dewi", "X-B", "Perempuan", "Aktif"]);
      sheetSiswa.appendRow(["S05", "0051234565", "Dedi Kurniawan", "X-B", "Laki-laki", "Aktif"]);
    }

    // 3. Tabel Master_Kelas
    let sheetKelas = ss.getSheetByName("Master_Kelas");
    if (!sheetKelas) {
      sheetKelas = ss.insertSheet("Master_Kelas");
      sheetKelas.appendRow(["ID", "Nama Kelas", "Wali Kelas", "Tahun Ajaran"]);
      sheetKelas.appendRow(["K01", "X-A", "Budi Santoso, S.Pd.", "2025/2026"]);
      sheetKelas.appendRow(["K02", "X-B", "Siti Rahma, M.Pd.", "2025/2026"]);
      sheetKelas.appendRow(["K03", "XI-A", "Ahmad Subagyo, S.Si.", "2025/2026"]);
    }

    // 4. Tabel Master_Mapel
    let sheetMapel = ss.getSheetByName("Master_Mapel");
    if (!sheetMapel) {
      sheetMapel = ss.insertSheet("Master_Mapel");
      sheetMapel.appendRow(["ID", "Kode Mapel", "Nama Mata Pelajaran", "Kelompok", "Status"]);
      sheetMapel.appendRow(["M01", "MTK", "Matematika", "Wajib", "Aktif"]);
      sheetMapel.appendRow(["M02", "BIN", "Bahasa Indonesia", "Wajib", "Aktif"]);
      sheetMapel.appendRow(["M03", "BIG", "Bahasa Inggris", "Wajib", "Aktif"]);
      sheetMapel.appendRow(["M04", "FIS", "Fisika", "Peminatan IPA", "Aktif"]);
    }

    // 5. Tabel Absensi_Siswa (Log_Siswa)
    let sheetAbsensiSiswa = ss.getSheetByName("Log_Siswa");
    if (!sheetAbsensiSiswa) {
      sheetAbsensiSiswa = ss.insertSheet("Log_Siswa");
      sheetAbsensiSiswa.appendRow(["RowIndex", "Tanggal", "Waktu", "Kelas", "Mata Pelajaran", "Hadir", "Sakit", "Izin", "Alpa", "Ringkasan Keterangan", "Guru Pengampu", "Foto Bukti Base64"]);
    }

    // 6. Tabel Absensi_Guru (Log_Guru)
    let sheetAbsensiGuru = ss.getSheetByName("Log_Guru");
    if (!sheetAbsensiGuru) {
      sheetAbsensiGuru = ss.insertSheet("Log_Guru");
      sheetAbsensiGuru.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Guru", "Status/Kategori", "Detail Alasan"]);
    }

    // 7. Tabel Pengaturan
    let sheetPengaturan = ss.getSheetByName("Pengaturan");
    if (!sheetPengaturan) {
      sheetPengaturan = ss.insertSheet("Pengaturan");
      sheetPengaturan.appendRow(["Kunci", "Nilai"]);
      sheetPengaturan.appendRow(["customization", "{}"]);
    }

    // 8. Tabel Absen_Tendik
    let sheetAbsenTendik = ss.getSheetByName("Absen_Tendik");
    if (!sheetAbsenTendik) {
      sheetAbsenTendik = ss.insertSheet("Absen_Tendik");
      sheetAbsenTendik.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Foto Bukti Base64"]);
    }

    // 9. Tabel Izin_Tendik
    let sheetIzinTendik = ss.getSheetByName("Izin_Tendik");
    if (!sheetIzinTendik) {
      sheetIzinTendik = ss.insertSheet("Izin_Tendik");
      sheetIzinTendik.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Status/Kategori", "Detail Alasan", "Foto Bukti Base64"]);
    }

    return { status: "success", message: "Setup Database Berhasil! Seluruh tabel dasar telah dibuat." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI LOGIN & AUTENTIKASI
// ===========================================================================

function loginUser(username, password) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Master_Guru");
    if (!sheet) return { status: "error", message: "Tabel Master_Guru tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const u = values[i][3] ? values[i][3].toString().trim() : "";
      const p = values[i][4] ? values[i][4].toString().trim() : "";
      const status = values[i][6] ? values[i][6].toString().trim() : "Aktif";

      if (u === username && p === password) {
        if (status.toLowerCase() !== "aktif") {
          return { status: "error", message: "Akun Anda sedang dinonaktifkan." };
        }
        return {
          status: "success",
          user: {
            id: values[i][0],
            nip: values[i][1],
            nama: values[i][2],
            username: u,
            role: values[i][5]
          }
        };
      }
    }
    return { status: "error", message: "Nama pengguna atau kata sandi salah!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getStudentsByClass(kelas) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Master_Siswa");
    if (!sheet) return { status: "error", message: "Tabel Master_Siswa tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    const students = [];

    for (let i = 1; i < values.length; i++) {
      const k = values[i][3] ? values[i][3].toString().trim() : "";
      const status = values[i][5] ? values[i][5].toString().trim() : "Aktif";

      if (k === kelas && status.toLowerCase() === "aktif") {
        students.push({
          id: values[i][0].toString(),
          nisn: values[i][1].toString(),
          nama: values[i][2],
          kelas: k,
          gender: values[i][4]
        });
      }
    }
    return { status: "success", students: students };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI PRESENSI SISWA & GURU
// ===========================================================================

function submitStudentAttendance(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Log_Siswa");
    if (!sheet) {
      sheet = ss.insertSheet("Log_Siswa");
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "Kelas", "Mata Pelajaran", "Hadir", "Sakit", "Izin", "Alpa", "Ringkasan Keterangan", "Guru Pengampu", "Foto Bukti Base64"]);
    }

    const now = new Date();
    const tz = Session.getScriptTimeZone();
    const defaultTanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const defaultWaktu = Utilities.formatDate(now, tz, "HH:mm:ss");

    const tanggal = payload.tanggal || defaultTanggal;
    const waktu = payload.waktu || defaultWaktu;
    const rowIndex = now.getTime().toString();

    let countHadir = payload.countHadir !== undefined ? payload.countHadir : 0;
    let countSakit = payload.countSakit !== undefined ? payload.countSakit : 0;
    let countIzin = payload.countIzin !== undefined ? payload.countIzin : 0;
    let countAlpa = payload.countAlpa !== undefined ? payload.countAlpa : 0;
    let keteranganDetail = payload.keterangan || "";

    let finalPhoto = payload.photoBase64 || "";
    if (finalPhoto && finalPhoto.indexOf("data:image") === 0) {
      try {
        let folder;
        const folders = DriveApp.getFoldersByName("Absensi_Foto_Bukti");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Absensi_Foto_Bukti");
        }

        const splitData = finalPhoto.split(",");
        const contentType = splitData[0].match(/:(.*?);/)[1];
        const rawData = splitData[1];
        const decoded = Utilities.base64Decode(rawData);
        const blob = Utilities.newBlob(decoded, contentType, "Bukti_Absen_" + (payload.kelas || "Kelas") + "_" + rowIndex + ".jpg");

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        finalPhoto = file.getUrl();
      } catch (driveErr) {
        // Fallback to storing raw base64 or message
      }
    }

    sheet.appendRow([
      rowIndex,
      tanggal,
      waktu,
      payload.kelas || "",
      payload.mapel || "",
      countHadir,
      countSakit,
      countIzin,
      countAlpa,
      keteranganDetail,
      payload.guruPengampu || "",
      finalPhoto
    ]);

    return { status: "success", message: "Absensi kelas " + payload.kelas + " jam " + waktu + " berhasil disimpan!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function submitTeacherAbsence(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Log_Guru");
    if (!sheet) {
      sheet = ss.insertSheet("Log_Guru");
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Guru", "Status/Kategori", "Detail Alasan"]);
    }

    const now = new Date();
    const tz = Session.getScriptTimeZone();
    const tanggal = payload.tanggal || Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const waktu = payload.waktu || Utilities.formatDate(now, tz, "HH:mm:ss");
    const rowIndex = now.getTime().toString();

    sheet.appendRow([
      rowIndex,
      tanggal,
      waktu,
      payload.nip || "",
      payload.namaGuru || "",
      payload.status || "Sakit",
      payload.alasan || ""
    ]);

    return { status: "success", message: "Laporan ketidakhadiran berhasil dikirim pada jam " + waktu + "." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getTeacherAbsenceHistory(tanggal) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Guru");
    if (!sheet) return { status: "error", message: "Tabel Log_Guru tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    const history = [];
    const tz = Session.getScriptTimeZone();

    for (let i = 1; i < values.length; i++) {
      let rowTanggal = values[i][1];
      if (rowTanggal instanceof Date) {
        rowTanggal = Utilities.formatDate(rowTanggal, tz, "yyyy-MM-dd");
      } else {
        rowTanggal = rowTanggal ? rowTanggal.toString() : "";
      }

      let rowWaktu = values[i][2];
      if (rowWaktu instanceof Date) {
        rowWaktu = Utilities.formatDate(rowWaktu, tz, "HH:mm:ss");
      } else {
        rowWaktu = rowWaktu ? rowWaktu.toString() : "";
      }

      if (!tanggal || rowTanggal === tanggal) {
        history.push({
          rowIndex: values[i][0].toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaGuru: values[i][4] ? values[i][4].toString() : "",
          status: values[i][5] ? values[i][5].toString() : "",
          alasan: values[i][6] ? values[i][6].toString() : ""
        });
      }
    }

    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI CRUD MASTER DATA (GURU / SISWA / KELAS / MAPEL)
// ===========================================================================

function getMasterData(sheetName) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      if (sheetName === "Pengaturan") {
        sheet = ss.insertSheet("Pengaturan");
        sheet.appendRow(["Kunci", "Nilai"]);
        sheet.appendRow(["customization", "{}"]);
      } else {
        return { status: "error", message: "Tabel " + sheetName + " tidak ditemukan." };
      }
    }

    const values = sheet.getDataRange().getValues();
    if (values.length === 0) return { status: "success", headers: [], rows: [] };

    const headers = values[0];
    const rows = [];
    for (let i = 1; i < values.length; i++) {
      rows.push({
        _rowIndex: i + 1,
        data: values[i].map(function(val) { return val.toString(); })
      });
    }

    return { status: "success", headers: headers, rows: rows };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function saveMasterDataRow(sheetName, rowData, rowIndex) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      if (sheetName === "Pengaturan") {
        sheet = ss.insertSheet("Pengaturan");
        sheet.appendRow(["Kunci", "Nilai"]);
      } else {
        return { status: "error", message: "Tabel " + sheetName + " tidak ditemukan." };
      }
    }

    if (rowIndex && rowIndex > 1) {
      const range = sheet.getRange(rowIndex, 1, 1, rowData.length);
      range.setValues([rowData]);
      return { status: "success", message: "Data berhasil diperbarui." };
    } else {
      sheet.appendRow(rowData);
      return { status: "success", message: "Data baru berhasil ditambahkan." };
    }
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteMasterDataRow(sheetName, rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { status: "error", message: "Tabel " + sheetName + " tidak ditemukan." };

    if (rowIndex && rowIndex > 1) {
      sheet.deleteRow(rowIndex);
      return { status: "success", message: "Data berhasil dihapus." };
    }
    return { status: "error", message: "Indeks baris tidak valid." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI REKAP, RIWAYAT, EDIT INDIVIDU & RESET ABSEN
// ===========================================================================

function getAttendanceHistory(tanggal, kelas) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Siswa");
    if (!sheet) return { status: "error", message: "Tabel Log_Siswa tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    const history = [];
    const tz = Session.getScriptTimeZone();

    for (let i = 1; i < values.length; i++) {
      let rowTanggal = values[i][1];
      if (rowTanggal instanceof Date) {
        rowTanggal = Utilities.formatDate(rowTanggal, tz, "yyyy-MM-dd");
      } else {
        rowTanggal = rowTanggal ? rowTanggal.toString() : "";
      }

      let rowWaktu = values[i][2];
      if (rowWaktu instanceof Date) {
        rowWaktu = Utilities.formatDate(rowWaktu, tz, "HH:mm:ss");
      } else {
        rowWaktu = rowWaktu ? rowWaktu.toString() : "";
      }

      const rowKelas = values[i][3] ? values[i][3].toString() : "";

      if ((!tanggal || rowTanggal === tanggal) && (!kelas || rowKelas === kelas)) {
        history.unshift({
          rowIndex: values[i][0].toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          kelas: rowKelas,
          mapel: values[i][4] ? values[i][4].toString() : "",
          hadir: Number(values[i][5]) || 0,
          sakit: Number(values[i][6]) || 0,
          izin: Number(values[i][7]) || 0,
          alpa: Number(values[i][8]) || 0,
          keterangan: values[i][9] ? values[i][9].toString() : "",
          guru: values[i][10] ? values[i][10].toString() : "",
          photo: values[i][11] ? values[i][11].toString() : ""
        });
      }
    }

    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function updateStudentAttendanceRecord(rowIndex, newStatus, newKeterangan) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Siswa");
    if (!sheet) return { status: "error", message: "Tabel Log_Siswa tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.getRange(i + 1, 10).setValue(newKeterangan || "");
        return { status: "success", message: "Keterangan log kehadiran berhasil diperbarui!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteStudentAttendanceRecord(rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Siswa");
    if (!sheet) return { status: "error", message: "Tabel Log_Siswa tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Log kehadiran siswa berhasil dihapus!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function updateTeacherAbsenceRecord(rowIndex, status, alasan) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Guru");
    if (!sheet) return { status: "error", message: "Tabel Log_Guru tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.getRange(i + 1, 6).setValue(status || "");
        sheet.getRange(i + 1, 7).setValue(alasan || "");
        return { status: "success", message: "Log perizinan guru berhasil diperbarui!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteTeacherAbsenceRecord(rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Log_Guru");
    if (!sheet) return { status: "error", message: "Tabel Log_Guru tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Log perizinan guru berhasil dihapus!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getCustomization() {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Pengaturan");
    if (!sheet) {
      sheet = ss.insertSheet("Pengaturan");
      sheet.appendRow(["Kunci", "Nilai"]);
      sheet.appendRow(["customization", "{}"]);
      return { status: "success", customization: {} };
    }

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === "customization") {
        try {
          const parsed = JSON.parse(values[i][1].toString());
          return { status: "success", customization: parsed };
        } catch (e) {
          return { status: "success", customization: {} };
        }
      }
    }
    sheet.appendRow(["customization", "{}"]);
    return { status: "success", customization: {} };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function saveCustomization(customizationObj) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Pengaturan");
    if (!sheet) {
      sheet = ss.insertSheet("Pengaturan");
      sheet.appendRow(["Kunci", "Nilai"]);
    }

    const jsonString = typeof customizationObj === "string" ? customizationObj : JSON.stringify(customizationObj);
    const values = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === "customization") {
        foundIndex = i + 1;
        break;
      }
    }

    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 2).setValue(jsonString);
    } else {
      sheet.appendRow(["customization", jsonString]);
    }

    return { status: "success", message: "Pengaturan berhasil disinkronkan ke Spreadsheet!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI KHUSUS TENDIK (PRESENSI MANDIRI & PERIZINAN)
// ===========================================================================

function submitTendikAttendance(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Absen_Tendik");
    if (!sheet) {
      sheet = ss.insertSheet("Absen_Tendik");
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Foto Bukti Base64"]);
    }

    const now = new Date();
    const tz = Session.getScriptTimeZone();
    const tanggalDefault = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const waktuDefault = Utilities.formatDate(now, tz, "HH:mm:ss");

    const tgl = payload.tanggal || tanggalDefault;
    const wkt = payload.waktu || waktuDefault;
    const rIdx = "TND-ABS-" + Date.now();

    sheet.appendRow([
      rIdx,
      tgl,
      wkt,
      payload.nip || "",
      payload.namaTendik || "",
      payload.photo || payload.photoBase64 || ""
    ]);

    return { status: "success", message: "Presensi Tendik berhasil disimpan!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function submitTendikPermit(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Izin_Tendik");
    if (!sheet) {
      sheet = ss.insertSheet("Izin_Tendik");
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Status/Kategori", "Detail Alasan", "Foto Bukti Base64"]);
    }

    const now = new Date();
    const tz = Session.getScriptTimeZone();
    const tanggalDefault = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const waktuDefault = Utilities.formatDate(now, tz, "HH:mm:ss");

    const tgl = payload.tanggal || tanggalDefault;
    const wkt = payload.waktu || waktuDefault;
    const rIdx = "TND-IZN-" + Date.now();

    sheet.appendRow([
      rIdx,
      tgl,
      wkt,
      payload.nip || "",
      payload.namaTendik || "",
      payload.status || "Izin",
      payload.alasan || "",
      payload.photo || payload.photoBase64 || ""
    ]);

    return { status: "success", message: "Formulir izin Tendik berhasil disimpan!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getTendikAttendanceHistory(tanggal) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Absen_Tendik");
    if (!sheet) return { status: "success", history: [] };

    const values = sheet.getDataRange().getValues();
    const history = [];
    const tz = Session.getScriptTimeZone();

    for (let i = 1; i < values.length; i++) {
      let rowTanggal = values[i][1];
      if (rowTanggal instanceof Date) {
        rowTanggal = Utilities.formatDate(rowTanggal, tz, "yyyy-MM-dd");
      } else {
        rowTanggal = rowTanggal ? rowTanggal.toString() : "";
      }

      let rowWaktu = values[i][2];
      if (rowWaktu instanceof Date) {
        rowWaktu = Utilities.formatDate(rowWaktu, tz, "HH:mm:ss");
      } else {
        rowWaktu = rowWaktu ? rowWaktu.toString() : "";
      }

      if (!tanggal || rowTanggal === tanggal) {
        history.unshift({
          rowIndex: values[i][0].toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaTendik: values[i][4] ? values[i][4].toString() : "",
          photo: values[i][5] ? values[i][5].toString() : ""
        });
      }
    }

    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getTendikPermitHistory(tanggal) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Izin_Tendik");
    if (!sheet) return { status: "success", history: [] };

    const values = sheet.getDataRange().getValues();
    const history = [];
    const tz = Session.getScriptTimeZone();

    for (let i = 1; i < values.length; i++) {
      let rowTanggal = values[i][1];
      if (rowTanggal instanceof Date) {
        rowTanggal = Utilities.formatDate(rowTanggal, tz, "yyyy-MM-dd");
      } else {
        rowTanggal = rowTanggal ? rowTanggal.toString() : "";
      }

      let rowWaktu = values[i][2];
      if (rowWaktu instanceof Date) {
        rowWaktu = Utilities.formatDate(rowWaktu, tz, "HH:mm:ss");
      } else {
        rowWaktu = rowWaktu ? rowWaktu.toString() : "";
      }

      if (!tanggal || rowTanggal === tanggal) {
        history.unshift({
          rowIndex: values[i][0].toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaTendik: values[i][4] ? values[i][4].toString() : "",
          status: values[i][5] ? values[i][5].toString() : "Izin",
          alasan: values[i][6] ? values[i][6].toString() : "",
          photo: values[i][7] ? values[i][7].toString() : ""
        });
      }
    }

    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteTendikAttendanceRecord(rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Absen_Tendik");
    if (!sheet) return { status: "error", message: "Tabel Absen_Tendik tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Data presensi Tendik berhasil dihapus!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteTendikPermitRecord(rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Izin_Tendik");
    if (!sheet) return { status: "error", message: "Tabel Izin_Tendik tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Data perizinan Tendik berhasil dihapus!" };
      }
    }
    return { status: "error", message: "RowIndex '" + rowIndex + "' tidak ditemukan." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header card with developer instructions */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold border border-blue-500/30 flex items-center gap-1">
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Google Apps Script (.gs)</span>
            </span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Koneksi Database & Integrasi Sheets</h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            E-Absensi mendukung integrasi penuh secara real-time. Salin kode Apps Script di bawah ke editor Spreadsheet Anda untuk beralih dari Mode Demo Offline ke Cloud Run Live Spreadsheet.
          </p>
        </div>
        <div className="flex-shrink-0 z-10 self-stretch md:self-auto">
          <button
            onClick={copyToClipboard}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Kode Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Lengkap Code.gs</span>
              </>
            )}
          </button>
        </div>
        <Code className="w-64 h-64 text-white/5 absolute -right-16 -bottom-16 pointer-events-none transform rotate-12" />
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'code'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Kode Code.gs</span>
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Panduan Deployment</span>
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Struktur Tabel (Headers)</span>
        </button>
      </div>

      {/* Tab contents */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
        {activeTab === 'code' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">File Code.gs Lengkap</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Salin seluruh kode di bawah ini lalu tempel di editor Google Apps Script Anda.</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-3.5 py-2 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>Code.gs (Google Apps Script API Engine)</span>
                <span className="text-blue-400 font-bold">JavaScript</span>
              </div>
              <pre className="p-4 overflow-x-auto text-[10px] sm:text-xs text-slate-300 font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre">
                {appsScriptCode}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-6 animate-fade-in text-slate-600 text-xs sm:text-sm">
            <h4 className="text-sm font-extrabold text-slate-800">Panduan Integrasi Spreadsheet Anda</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">1</div>
                <h5 className="font-bold text-slate-800">Buat Spreadsheet Baru</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Buka Google Sheets, buat lembar kerja baru, lalu salin ID unik spreadsheet dari URL browser Anda. (ID berupa deretan karakter acak setelah <code className="bg-slate-100 px-1 rounded">/d/</code>).
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">2</div>
                <h5 className="font-bold text-slate-800">Buka Google Apps Script</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pada menu bagian atas Spreadsheet Anda, klik <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>. Hapus semua fungsi default di dalamnya.
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">3</div>
                <h5 className="font-bold text-slate-800">Tempel & Jalankan Setup</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tempelkan kode dari tab <strong>Kode Code.gs</strong> ke editor. Masukkan ID Spreadsheet Anda ke variabel <code className="bg-slate-100 px-1 rounded">SPREADSHEET_ID</code>, simpan (ikon disket), lalu Deploy sebagai Web App!
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Penting: Aturan Penerapan Baru (Deploy Web App)</span>
              </h5>
              <ul className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-600 font-semibold pl-1">
                <li>Klik tombol <strong>Deploy (Terapkan)</strong> di kanan atas &rarr; pilih <strong>New deployment (Penerapan baru)</strong>.</li>
                <li>Pilih jenis <strong>Web app (Aplikasi web)</strong> lewat ikon roda gigi.</li>
                <li>Pilih <strong>Execute as: Me (email Anda)</strong>.</li>
                <li>Ubah <strong>Who has access: Anyone (Siapa saja)</strong> agar aplikasi dapat bertukar data tanpa terhalang izin login akun ganda Google.</li>
                <li>Klik <strong>Deploy</strong>, lalu berikan otorisasi akses (Authorize Access) ketika diminta pop-up konfirmasi Google.</li>
                <li>Salin Web App URL yang berakhiran <code className="bg-slate-100 px-1 rounded text-rose-600 font-mono">/exec</code>.</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Inisialisasi Tabel Otomatis:</span>
                <p className="leading-relaxed">
                  Setelah menempelkan kode ini dan memasukkan URL-nya ke pengaturan API aplikasi Anda, Anda bisa membuka tab data guru/siswa atau mengklik tombol <strong>Setup Database</strong> jika tersedia untuk otomatis membuat semua lembar kerja (Master_Guru, Master_Siswa, dll.) dan menyemai data awal yang siap dipakai!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-6 animate-fade-in text-slate-600">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Format Kolom Spreadsheet Anda</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Berikut adalah struktur headers kolom utama pada setiap lembar kerja (Tab Lembar) Spreadsheet Anda:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2">
                <span className="text-blue-600 font-extrabold uppercase text-[10px] tracking-wider block">1. Master_Guru</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all">
                  ID, NIP, Nama Lengkap, Username, Password, Role, Status
                </p>
                <span className="text-[10px] text-slate-400 block font-normal">Contoh data: G01 | 1985... | Administrator Utama | admin | admin123 | Admin | Aktif</span>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2">
                <span className="text-blue-600 font-extrabold uppercase text-[10px] tracking-wider block">2. Master_Siswa</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all">
                  ID, NISN, Nama Siswa, Kelas, Jenis Kelamin, Status
                </p>
                <span className="text-[10px] text-slate-400 block font-normal">Contoh data: S01 | 0051... | Ahmad Rizky | X-A | Laki-laki | Aktif</span>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2">
                <span className="text-blue-600 font-extrabold uppercase text-[10px] tracking-wider block">3. Master_Kelas</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all">
                  ID, Nama Kelas, Wali Kelas, Tahun Ajaran
                </p>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2">
                <span className="text-blue-600 font-extrabold uppercase text-[10px] tracking-wider block">4. Master_Mapel</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all">
                  ID, Kode Mapel, Nama Mata Pelajaran, Kelompok, Status
                </p>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2 md:col-span-2">
                <span className="text-indigo-600 font-extrabold uppercase text-[10px] tracking-wider block">5. Log_Siswa (Absensi Siswa)</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all text-[11px]">
                  RowIndex, Tanggal, Waktu, Kelas, Mata Pelajaran, Hadir, Sakit, Izin, Alpa, Ringkasan Keterangan, Guru Pengampu, Foto Bukti Base64
                </p>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2 md:col-span-2">
                <span className="text-indigo-600 font-extrabold uppercase text-[10px] tracking-wider block">6. Log_Guru (Absensi Guru)</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all text-[11px]">
                  RowIndex, Tanggal, Waktu, NIP, Nama Guru, Status/Kategori, Detail Alasan
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
