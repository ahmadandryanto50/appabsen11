/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Code, Copy, Check, ExternalLink, FileCode2, Database, ListOrdered, CheckCircle2, AlertCircle, Lock, KeyRound, Save, X } from 'lucide-react';
import { apiClient } from '../api';

interface AppsScriptViewProps {
  customization?: {
    logoColor?: string;
  };
}

export function AppsScriptView({ customization }: AppsScriptViewProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'guide' | 'schema' | 'manifest'>('code');
  const [copied, setCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [isSettingUpDb, setIsSettingUpDb] = useState(false);
  const [setupDbMessage, setSetupDbMessage] = useState('');

  const handleRunSetupDatabase = async () => {
    setIsSettingUpDb(true);
    setSetupDbMessage('');
    try {
      const res = await apiClient.setupDatabase();
      if (res.status === 'success') {
        setSetupDbMessage('✅ Re-Sync Database Berhasil! Kolom Tipe Absen pada sheet Absen_Tendik telah dikonfigurasi.');
      } else {
        setSetupDbMessage('❌ Gagal: ' + (res.message || 'Terjadi kesalahan.'));
      }
    } catch (e: any) {
      setSetupDbMessage('❌ Error: ' + e.message);
    } finally {
      setIsSettingUpDb(false);
    }
  };

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const res = await apiClient.getCrud('Pengaturan');
        if (res.status === 'success' && res.rows) {
          const passRow = res.rows.find((row: any) => row.data && row.data[0] === 'apps_script_password');
          if (passRow && passRow.data[1]) {
            localStorage.setItem('absensi_as_password', passRow.data[1]);
          } else {
            localStorage.setItem('absensi_as_password', 'ahmad91');
          }
        }
      } catch (e) {
        if (!localStorage.getItem('absensi_as_password')) {
           localStorage.setItem('absensi_as_password', 'ahmad91');
        }
      } finally {
        setIsLoadingAuth(false);
      }
    };
    fetchPassword();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem('absensi_as_password') || 'ahmad91';
    if (passwordInput === stored) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Kata sandi salah.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setAuthError('Kata sandi tidak boleh kosong.');
      return;
    }
    setIsChangingPassword(true);
    setChangePasswordSuccess('');
    setAuthError('');
    
    try {
      const res = await apiClient.getCrud('Pengaturan');
      let targetRowIndex = null;
      if (res.status === 'success' && res.rows) {
        const passRow = res.rows.find((row: any) => row.data && row.data[0] === 'apps_script_password');
        if (passRow) targetRowIndex = passRow._rowIndex;
      }

      await apiClient.saveCrud('Pengaturan', ['apps_script_password', newPassword], targetRowIndex);
      localStorage.setItem('absensi_as_password', newPassword);
      setChangePasswordSuccess('Kata sandi berhasil diubah!');
      setNewPassword('');
      setTimeout(() => setShowChangePassword(false), 2000);
    } catch (e) {
      setAuthError('Gagal menyimpan kata sandi baru.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSENSI SEKOLAH DIGITAL
 * Author: AI Coding Agent & Admin
 * Spreadsheet ID: ID_DARI_URL_SPREADSHEET
 * 
 * @oauthScope https://www.googleapis.com/auth/spreadsheets
 * @oauthScope https://www.googleapis.com/auth/drive
 * @oauthScope https://www.googleapis.com/auth/script.external_request
 */

const SPREADSHEET_ID = "ID_DARI_URL_SPREADSHEET";

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
// FUNGSI SATU-KLIK: INISIALISASI DATABASE & OTORISASI IZIN GOOGLE DRIVE + SHEETS
// (JALANKAN FUNGSI INI 1x DENGAN MENGLIK 'JALANKAN' DI EDITOR APPS SCRIPT)
// ===========================================================================
function inialisasiDanIzinAksesSemuaGCP() {
  var ss = getDb();
  // PENTING: Panggilan createFile langsung ini MEMAKSA Google meminta Izin Akses LENGKAP ke Google Drive (https://www.googleapis.com/auth/drive)
  var folderTarget;
  try {
    folderTarget = DriveApp.getFolderById("1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m");
  } catch(e) {
    folderTarget = DriveApp.getRootFolder();
  }
  var testFile = folderTarget.createFile("Pemeriksaan_Izin_Drive.txt", "Izin Akses Google Drive Berhasil Diberikan pada " + new Date());
  testFile.setTrashed(true);
  
  Logger.log("Izin Akses LENGKAP Google Drive & Sheets BERHASIL DIBERIKAN!");
  return setupDatabase();
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
      case "setupDatabase":
        result = setupDatabase();
        break;
      case "login":
        result = loginUser(contents.username, contents.password);
        break;
      case "getStudents":
        result = getStudentsByClass(contents.kelas);
        break;
      case "submitAttendance":
        result = submitStudentAttendance(contents.payload);
        break;
      case "submitKioskScan":
        result = submitKioskScan(contents.payload);
        break;
      case "getKioskAttendanceHistory":
        result = getKioskAttendanceHistory(contents.tanggal, contents.kelas);
        break;
      case "deleteKioskAttendanceRecord":
        result = deleteKioskAttendanceRecord(contents.rowIndex, contents.timestamp, contents.nisn);
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
      case "submitGuruAttendance":
        result = submitGuruAttendance(contents.payload);
        break;
      case "getGuruAttendanceHistory":
        result = getGuruAttendanceHistory(contents.tanggal);
        break;
      case "deleteGuruAttendanceRecord":
        result = deleteGuruAttendanceRecord(contents.rowIndex);
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
      case "saveStudentClassRecap":
        result = saveStudentClassRecap(contents.payload);
        break;
      case "uploadToDrive":
        result = uploadToDrive(contents.payload || contents);
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
      sheetAbsenTendik.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Tipe Absen", "Foto Bukti Base64"]);
    } else {
      var col6Header = sheetAbsenTendik.getRange(1, 6).getValue().toString();
      if (col6Header.toLowerCase().indexOf("tipe") === -1 && col6Header.toLowerCase().indexOf("status") === -1) {
        if (col6Header.toLowerCase().indexOf("foto") >= 0 || col6Header.toLowerCase().indexOf("base64") >= 0) {
          sheetAbsenTendik.insertColumnAfter(5);
        }
        sheetAbsenTendik.getRange(1, 6).setValue("Tipe Absen");
        if (sheetAbsenTendik.getRange(1, 7).getValue().toString() === "") {
          sheetAbsenTendik.getRange(1, 7).setValue("Foto Bukti Base64");
        }
      }
    }

    // 8.1. Tabel Absen_Guru (Presensi Mandiri Guru)
    let sheetAbsenGuru = ss.getSheetByName("Absen_Guru");
    if (!sheetAbsenGuru) {
      sheetAbsenGuru = ss.insertSheet("Absen_Guru");
      sheetAbsenGuru.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Guru", "Tipe Absen", "Foto Bukti Base64"]);
    } else {
      var col6HeaderG = sheetAbsenGuru.getRange(1, 6).getValue().toString();
      if (col6HeaderG.toLowerCase().indexOf("tipe") === -1 && col6HeaderG.toLowerCase().indexOf("status") === -1) {
        if (col6HeaderG.toLowerCase().indexOf("foto") >= 0 || col6HeaderG.toLowerCase().indexOf("base64") >= 0) {
          sheetAbsenGuru.insertColumnAfter(5);
        }
        sheetAbsenGuru.getRange(1, 6).setValue("Tipe Absen");
        if (sheetAbsenGuru.getRange(1, 7).getValue().toString() === "") {
          sheetAbsenGuru.getRange(1, 7).setValue("Foto Bukti Base64");
        }
      }
    }

    // 9. Tabel Izin_Tendik
    let sheetIzinTendik = ss.getSheetByName("Izin_Tendik");
    if (!sheetIzinTendik) {
      sheetIzinTendik = ss.insertSheet("Izin_Tendik");
      sheetIzinTendik.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Status/Kategori", "Detail Alasan", "Foto Bukti Base64"]);
    }

    // 10. Tabel Presensi (Kiosk Log)
    let sheetKioskPresensi = ss.getSheetByName("Presensi");
    if (!sheetKioskPresensi) {
      sheetKioskPresensi = ss.insertSheet("Presensi");
      sheetKioskPresensi.appendRow(["Timestamp", "NISN", "Nama", "Kelas", "Status Presensi"]);
    }

    // 11. Tabel Rekap_Kehadiran_Siswa (Rekap Per Kelas Guru)
    let sheetRekapSiswa = ss.getSheetByName("Rekap_Kehadiran_Siswa");
    if (!sheetRekapSiswa) {
      sheetRekapSiswa = ss.insertSheet("Rekap_Kehadiran_Siswa");
      sheetRekapSiswa.appendRow(["ID_Rekap", "TanggalRekap", "GuruPengampu", "MataPelajaran", "Kelas", "NISN", "NamaSiswa", "Hadir", "Sakit", "Izin", "Alpa", "Terlambat", "PersentaseKehadiran", "Status"]);
    }

    // 12. Tabel Rekap_Kehadiran Guru (Rekap Bulanan Perseorangan Guru)
    let sheetRekapGuru = ss.getSheetByName("Rekap_Kehadiran Guru") || ss.getSheetByName("Rekap_Kehadiran_Guru");
    if (!sheetRekapGuru) {
      sheetRekapGuru = ss.insertSheet("Rekap_Kehadiran Guru");
      sheetRekapGuru.appendRow(["ID_Rekap", "Bulan_Tahun", "NIP", "Nama_Guru", "Hadir", "Izin", "Sakit", "Cuti_DL", "Alpa", "Total_Hari_Kerja", "Persentase_Kehadiran", "Tanggal_Simpan", "Catatan"]);
    }

    // 12.1. Tabel Rekap_Kehadiran_Detail_Guru (Log Harian Jam Datang & Pulang)
    let sheetRekapGuruDetail = ss.getSheetByName("Rekap_Kehadiran_Detail_Guru");
    if (!sheetRekapGuruDetail) {
      sheetRekapGuruDetail = ss.insertSheet("Rekap_Kehadiran_Detail_Guru");
      sheetRekapGuruDetail.appendRow(["ID_Detail", "Bulan_Tahun", "NIP", "Nama_Guru", "Tanggal", "Hari", "Status", "Jam_Datang", "Jam_Pulang", "Keterangan"]);
    }

    // 13. Tabel Rekap_Kehadiran Tendik (Rekap Bulanan Perseorangan Tendik)
    let sheetRekapTendik = ss.getSheetByName("Rekap_Kehadiran Tendik") || ss.getSheetByName("Rekap_Kehadiran_Tendik");
    if (!sheetRekapTendik) {
      sheetRekapTendik = ss.insertSheet("Rekap_Kehadiran Tendik");
      sheetRekapTendik.appendRow(["ID_Rekap", "Bulan_Tahun", "NIP", "Nama_Tendik", "Hadir", "Izin", "Sakit", "Cuti_DL", "Alpa", "Total_Hari_Kerja", "Persentase_Kehadiran", "Tanggal_Simpan", "Catatan"]);
    }

    // 13.1. Tabel Rekap_Kehadiran_Detail_Tendik (Log Harian Jam Datang & Pulang)
    let sheetRekapTendikDetail = ss.getSheetByName("Rekap_Kehadiran_Detail_Tendik");
    if (!sheetRekapTendikDetail) {
      sheetRekapTendikDetail = ss.insertSheet("Rekap_Kehadiran_Detail_Tendik");
      sheetRekapTendikDetail.appendRow(["ID_Detail", "Bulan_Tahun", "NIP", "Nama_Tendik", "Tanggal", "Hari", "Status", "Jam_Datang", "Jam_Pulang", "Keterangan"]);
    }

    // 14. Tabel Data_Berkas
    let sheetBerkas = ss.getSheetByName("Data_Berkas");
    if (!sheetBerkas) {
      sheetBerkas = ss.insertSheet("Data_Berkas");
      sheetBerkas.appendRow(["Tanggal Upload", "Nama File", "URL Berkas", "Pengupload"]);
    }

    return { status: "success", message: "Setup Database Berhasil! Seluruh tabel dasar telah dibuat." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI UPLOAD BERKAS KE GOOGLE DRIVE
// ===========================================================================

// ===========================================================================
// FUNGSI OTO-FOLDER & UPLOAD KE GOOGLE DRIVE DAHULU -> LALU SIMPAN KE DATABASE
// ===========================================================================

function buatFolderOtomatisDrive() {
  var folderName = "Berkas_E-Absensi";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  Logger.log("Folder Otomatis Siap di Google Drive! ID: " + folder.getId() + " | URL: " + folder.getUrl());
  return folder;
}

function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var uploader = p.uploader || "Unknown";
    var TARGET_FOLDER_ID = "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";

    // 1. CARI / BUAT FOLDER TARGET DI GOOGLE DRIVE
    var folder;
    try {
      if (TARGET_FOLDER_ID && TARGET_FOLDER_ID.trim() !== "") {
        folder = DriveApp.getFolderById(TARGET_FOLDER_ID.trim());
      } else {
        folder = buatFolderOtomatisDrive();
      }
    } catch(fErr) {
      folder = buatFolderOtomatisDrive();
    }

    // 2. SIMPAN BERKAS FISIK KE GOOGLE DRIVE
    var parts = base64Data.split(',');
    var base64Content = parts.length > 1 ? parts[1] : parts[0];
    var contentType = "application/octet-stream";
    if (parts.length > 1 && parts[0].indexOf(':') !== -1 && parts[0].indexOf(';') !== -1) {
      contentType = parts[0].split(':')[1].split(';')[0];
    }

    var bytes = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(bytes, contentType, filename);
    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(sErr) {}

    var fileUrl = file.getUrl();

    // 3. CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas) DENGAN RUMUS HYPERLINK AKTIF BISA DIKLIK
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Link Berkas", "Pengupload"]);
    }
    
    // Formula =HYPERLINK("URL", "URL") memastikan Google Sheets menjadikannya LINK AKTIF YANG BISA DIKLIK 100%
    var formulaHyperlink = '=HYPERLINK("' + fileUrl + '", "' + fileUrl + '")';
    sheet.appendRow([new Date(), filename, formulaHyperlink, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      message: "Berkas berhasil terupload ke Google Drive & URL Link Aktif tersimpan di Spreadsheet!" 
    };
  } catch (err) {
    return { 
      status: "error", 
      message: "Gagal menyimpan ke Google Drive (" + err.message + "). Silakan jalankan fungsi 'inialisasiDanIzinAksesSemuaGCP' di Editor Apps Script 1 kali untuk memberikan izin Drive!" 
    };
  }
}

// ===========================================================================
// FUNGSI UNTUK MEMBERIKAN IZIN GOOGLE DRIVE (JALANKAN SEKALI DI APPS SCRIPT EDITOR)
// ===========================================================================

function izinkanAksesGoogleDrive() {
  var folder = DriveApp.getRootFolder();
  Logger.log("Akses Google Drive Berhasil Diberikan! Nama Folder Root: " + folder.getName());
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
      const u = values[i][4] ? values[i][4].toString().trim() : "";
      const p = values[i][5] ? values[i][5].toString().trim() : "";
      const status = values[i][7] ? values[i][7].toString().trim() : "Aktif";

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
            role: values[i][6]
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
      if (!values[i] || values[i].length < 3) continue;
      const k = values[i][3] ? values[i][3].toString().trim() : "";
      const status = values[i][5] ? values[i][5].toString().trim() : "Aktif";

      if (k === kelas && (status.toLowerCase() === "aktif" || status === "")) {
        students.push({
          id: values[i][0] ? values[i][0].toString() : (i + 1).toString(),
          nisn: values[i][1] ? values[i][1].toString() : "",
          nama: values[i][2] ? values[i][2].toString() : "Siswa " + (i + 1),
          kelas: k,
          gender: values[i][4] ? values[i][4].toString() : "Laki-laki"
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
    const tz = "Asia/Makassar";
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

function saveStudentClassRecap(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Rekap_Kehadiran_Siswa");
    if (!sheet) {
      sheet = ss.insertSheet("Rekap_Kehadiran_Siswa");
      sheet.appendRow(["ID_Rekap", "TanggalRekap", "GuruPengampu", "MataPelajaran", "Kelas", "NISN", "NamaSiswa", "Hadir", "Sakit", "Izin", "Alpa", "Terlambat", "PersentaseKehadiran", "Status"]);
    }

    const now = new Date();
    const tz = "Asia/Makassar";
    const defaultTanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const tanggalRekap = payload.tanggal || defaultTanggal;
    const guru = payload.guru || "";
    const mapel = payload.mapel || "";
    const kelas = payload.kelas || "";

    const rows = payload.recapRows || [];
    let savedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const idRekap = "RK_" + kelas + "_" + (r.nisn || i) + "_" + now.getTime();
      sheet.appendRow([
        idRekap,
        tanggalRekap,
        guru,
        mapel,
        kelas,
        r.nisn || "",
        r.nama || "",
        r.hadir || 0,
        r.sakit || 0,
        r.izin || 0,
        r.alpa || 0,
        r.terlambat || 0,
        (r.persentase !== undefined ? r.persentase : 0) + "%",
        r.status || "Aktif"
      ]);
      savedCount++;
    }

    return { status: "success", message: "Berhasil menyimpan " + savedCount + " data rekap siswa kelas " + kelas + " ke Spreadsheet!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function submitKioskScan(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Presensi");
    if (!sheet) {
      sheet = ss.insertSheet("Presensi");
      sheet.appendRow(["Timestamp", "NISN", "Nama", "Kelas", "Status Presensi", "Keterlambatan"]);
    } else {
      // Pastikan header Keterlambatan tersedia pada kolom ke-6
      const lastCol = sheet.getLastColumn();
      if (lastCol < 6) {
        sheet.getRange(1, 6).setValue("Keterlambatan");
      }
    }

    const now = new Date();
    const tz = "Asia/Makassar";
    const timestamp = Utilities.formatDate(now, tz, "yyyy-MM-dd HH:mm:ss");

    const keterlambatan = payload.keterlambatan || (payload.menitTerlambat ? payload.menitTerlambat + " menit" : "-");

    sheet.appendRow([
      timestamp,
      payload.nisn || "",
      payload.nama || "",
      payload.kelas || "",
      payload.status || "Hadir",
      keterlambatan
    ]);

    return { status: "success", message: "Scan Presensi " + payload.nama + " berhasil disimpan!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getKioskAttendanceHistory(tanggal, kelas) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Presensi");
    if (!sheet) {
      sheet = ss.getSheetByName("Presensi_Kiosk") || ss.getSheetByName("Presensi Masuk") || ss.getSheetByName("Log_Presensi");
    }
    if (!sheet) return { status: "success", history: [] };

    const values = sheet.getDataRange().getValues();
    if (!values || values.length <= 1) return { status: "success", history: [] };

    const headers = values[0].map(function(h) { return (h || "").toString().toLowerCase().trim(); });
    
    // Dynamic column index resolution
    var tsIdx = -1, nisnIdx = -1, namaIdx = -1, kelasIdx = -1, statusIdx = -1, telatIdx = -1, tglIdx = -1, wktIdx = -1;
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      if (tsIdx === -1 && (h.indexOf("timestamp") !== -1 || h.indexOf("waktu scan") !== -1)) tsIdx = j;
      if (tglIdx === -1 && (h === "tanggal" || h.indexOf("tgl") !== -1)) tglIdx = j;
      if (wktIdx === -1 && (h === "waktu" || h === "jam" || h.indexOf("pukul") !== -1)) wktIdx = j;
      if (nisnIdx === -1 && (h.indexOf("nisn") !== -1 || h.indexOf("nis") !== -1 || h.indexOf("no induk") !== -1)) nisnIdx = j;
      if (namaIdx === -1 && h.indexOf("nama") !== -1) namaIdx = j;
      if (kelasIdx === -1 && (h.indexOf("kelas") !== -1 || h.indexOf("rombel") !== -1)) kelasIdx = j;
      if (statusIdx === -1 && (h.indexOf("status") !== -1 || h.indexOf("kehadiran") !== -1 || h.indexOf("presensi") !== -1)) statusIdx = j;
      if (telatIdx === -1 && (h.indexOf("terlambat") !== -1 || h.indexOf("keterlambatan") !== -1 || h.indexOf("menit") !== -1)) telatIdx = j;
    }

    if (headers.length >= 7) {
      if (tglIdx === -1) tglIdx = 0;
      if (wktIdx === -1) wktIdx = 1;
      if (nisnIdx === -1) nisnIdx = 2;
      if (namaIdx === -1) namaIdx = 3;
      if (kelasIdx === -1) kelasIdx = 4;
      if (statusIdx === -1) statusIdx = 5;
      if (telatIdx === -1) telatIdx = 6;
    } else {
      if (tsIdx === -1) tsIdx = 0;
      if (nisnIdx === -1) nisnIdx = 1;
      if (namaIdx === -1) namaIdx = 2;
      if (kelasIdx === -1) kelasIdx = 3;
      if (statusIdx === -1) statusIdx = 4;
      if (telatIdx === -1) telatIdx = 5;
    }

    const history = [];
    const tz = "Asia/Makassar";

    function normalizeDateForMatch(dVal) {
      if (!dVal) return "";
      if (dVal instanceof Date) {
        return Utilities.formatDate(dVal, tz, "yyyy-MM-dd");
      }
      var str = dVal.toString().trim();
      var ymd = str.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})/);
      if (ymd) {
        var m = ("0" + ymd[2]).slice(-2);
        var d = ("0" + ymd[3]).slice(-2);
        return ymd[1] + "-" + m + "-" + d;
      }
      var dmy = str.match(/^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})/);
      if (dmy) {
        var m2 = ("0" + dmy[2]).slice(-2);
        var d2 = ("0" + dmy[1]).slice(-2);
        return dmy[3] + "-" + m2 + "-" + d2;
      }
      return str.split(" ")[0] || "";
    }

    var targetNormalized = tanggal ? normalizeDateForMatch(tanggal) : "";

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row || row.length === 0) continue;

      var rawTs = row[tsIdx];
      var rowTimestamp = "";
      if (rawTs instanceof Date) {
        rowTimestamp = Utilities.formatDate(rawTs, tz, "yyyy-MM-dd HH:mm:ss");
      } else {
        rowTimestamp = rawTs ? rawTs.toString() : "";
      }

      function formatTimeForOutput(wVal) {
        if (!wVal) return "-";
        if (wVal instanceof Date) {
          return Utilities.formatDate(wVal, tz, "HH:mm:ss");
        }
        var str = wVal.toString().trim();
        if (str.indexOf("GMT") !== -1 || str.indexOf("WIB") !== -1 || str.match(/[a-zA-Z]{3}\s+[a-zA-Z]{3}/)) {
          var dObj = new Date(str);
          if (!isNaN(dObj.getTime())) {
            return Utilities.formatDate(dObj, tz, "HH:mm:ss");
          }
        }
        if (str.indexOf("T") !== -1) {
          var p = str.split("T")[1];
          return p ? p.split(".")[0] : str;
        }
        return str;
      }

      var rowTanggal = tglIdx !== -1 && row[tglIdx] ? normalizeDateForMatch(row[tglIdx]) : normalizeDateForMatch(rawTs || rowTimestamp);
      var rowWaktu = wktIdx !== -1 && row[wktIdx] ? formatTimeForOutput(row[wktIdx]) : (rowTimestamp.split(" ")[1] || "-");

      var rowNisn = row[nisnIdx] ? row[nisnIdx].toString().trim() : "";
      var rowNama = row[namaIdx] ? row[namaIdx].toString().trim() : "";
      var rowKelas = row[kelasIdx] ? row[kelasIdx].toString().trim() : "";
      var rowStatus = row[statusIdx] ? row[statusIdx].toString().trim() : "Hadir";
      var rowKeterlambatan = row[telatIdx] ? row[telatIdx].toString().trim() : "-";

      var dateMatches = !targetNormalized || rowTanggal === targetNormalized || rowTimestamp.indexOf(tanggal) === 0 || (rawTs && rawTs.toString().indexOf(tanggal) !== -1);
      var classMatches = !kelas || rowKelas.toLowerCase() === kelas.toString().toLowerCase().trim();

      if (dateMatches && classMatches) {
        history.unshift({
          rowIndex: i + 1,
          timestamp: rowTimestamp || rawTs,
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nisn: rowNisn,
          nama: rowNama,
          kelas: rowKelas,
          status: rowStatus,
          keterlambatan: rowKeterlambatan
        });
      }
    }

    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function deleteKioskAttendanceRecord(rowIndex, timestamp, nisn) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Presensi");
    if (!sheet) {
      sheet = ss.getSheetByName("Presensi_Kiosk") || ss.getSheetByName("Presensi Masuk") || ss.getSheetByName("Log_Presensi");
    }
    if (!sheet) return { status: "error", message: "Tabel Presensi tidak ditemukan." };

    const rIdx = Number(rowIndex);
    if (rIdx && rIdx >= 2 && rIdx <= sheet.getLastRow()) {
      sheet.deleteRow(rIdx);
      return { status: "success", message: "Data presensi berhasil dihapus." };
    }

    if (timestamp || nisn) {
      var data = sheet.getDataRange().getValues();
      for (var i = data.length - 1; i >= 1; i--) {
        var rowTs = data[i][0] ? data[i][0].toString() : "";
        var rowNisn = data[i][1] ? data[i][1].toString() : "";
        if ((timestamp && rowTs.indexOf(timestamp) !== -1) || (nisn && rowNisn === nisn.toString())) {
          sheet.deleteRow(i + 1);
          return { status: "success", message: "Data presensi berhasil dihapus." };
        }
      }
    }

    return { status: "error", message: "Baris data presensi tidak ditemukan." };
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
    const tz = "Asia/Makassar";
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
    const tz = "Asia/Makassar";

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

    const rowNum = Number(rowIndex);
    if (rowNum && rowNum > 1) {
      const range = sheet.getRange(rowNum, 1, 1, rowData.length);
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

    const rowNum = Number(rowIndex);
    if (rowNum && rowNum > 1) {
      sheet.deleteRow(rowNum);
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
    const tz = "Asia/Makassar";

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
// FUNGSI KHUSUS GURU (PRESENSI MANDIRI)
// ===========================================================================

function submitGuruAttendance(payload) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName("Absen_Guru");
    if (!sheet) {
      sheet = ss.insertSheet("Absen_Guru");
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Guru", "Tipe Absen", "Foto Bukti Base64"]);
    }

    const now = new Date();
    const tz = "Asia/Makassar";
    const tanggalDefault = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const waktuDefault = Utilities.formatDate(now, tz, "HH:mm:ss");

    const tgl = payload.tanggal || tanggalDefault;
    let wkt = payload.waktu || waktuDefault;
    wkt = String(wkt).replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

    var rawTipe = String(payload.tipeAbsen || payload.kategori || "Datang");
    var tipeAbsen = rawTipe.toLowerCase().indexOf("pulang") >= 0 ? "Absen Pulang" : "Absen Datang";

    const rIdx = "GRU-ABS-" + Date.now();

    var col6Header = sheet.getRange(1, 6).getValue().toString();
    if (col6Header.toLowerCase().indexOf("tipe") === -1 && col6Header.toLowerCase().indexOf("status") === -1) {
      if (col6Header.toLowerCase().indexOf("foto") >= 0 || col6Header.toLowerCase().indexOf("base64") >= 0) {
        sheet.insertColumnAfter(5);
      }
      sheet.getRange(1, 6).setValue("Tipe Absen");
      if (sheet.getRange(1, 7).getValue().toString() === "") {
        sheet.getRange(1, 7).setValue("Foto Bukti Base64");
      }
    }

    sheet.appendRow([
      rIdx,
      tgl,
      wkt,
      payload.nip || "",
      payload.namaGuru || "",
      tipeAbsen,
      payload.photo || payload.photoBase64 || ""
    ]);

    return { status: "success", message: "Presensi " + tipeAbsen + " Guru berhasil disimpan!" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function getGuruAttendanceHistory(tanggal) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Absen_Guru");
    if (!sheet) return { status: "success", history: [] };

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return { status: "success", history: [] };

    const history = [];
    const tz = "Asia/Makassar";

    for (let i = 1; i < values.length; i++) {
      let rawTgl = values[i][1];
      let tglStr = "";
      if (rawTgl instanceof Date) {
        tglStr = Utilities.formatDate(rawTgl, tz, "yyyy-MM-dd");
      } else if (rawTgl) {
        tglStr = rawTgl.toString().trim();
      }

      if (!tanggal || tglStr === tanggal) {
        let rawWkt = values[i][2];
        let wktStr = "";
        if (rawWkt instanceof Date) {
          wktStr = Utilities.formatDate(rawWkt, tz, "HH:mm:ss");
        } else if (rawWkt) {
          wktStr = rawWkt.toString().trim();
        }

        history.push({
          rowIndex: values[i][0] ? values[i][0].toString() : i + 1,
          tanggal: tglStr,
          waktu: wktStr,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaGuru: values[i][4] ? values[i][4].toString() : "",
          tipeAbsen: values[i][5] ? values[i][5].toString() : "Absen Datang",
          photo: values[i][6] ? values[i][6].toString() : ""
        });
      }
    }

    history.reverse();
    return { status: "success", history: history };
  } catch (err) {
    return { status: "error", message: err.message, history: [] };
  }
}

function deleteGuruAttendanceRecord(rowIndex) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName("Absen_Guru");
    if (!sheet) return { status: "error", message: "Tabel Absen_Guru tidak ditemukan." };

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === rowIndex.toString()) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Data presensi Guru berhasil dihapus!" };
      }
    }
    return { status: "error", message: "Data presensi Guru tidak ditemukan." };
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
      sheet.appendRow(["RowIndex", "Tanggal", "Waktu", "NIP", "Nama Tendik", "Tipe Absen", "Foto Bukti Base64"]);
    }

    const now = new Date();
    const tz = "Asia/Makassar";
    const tanggalDefault = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const waktuDefault = Utilities.formatDate(now, tz, "HH:mm:ss");

    const tgl = payload.tanggal || tanggalDefault;
    let wkt = payload.waktu || waktuDefault;
    wkt = String(wkt).replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

    var rawTipe = String(payload.tipeAbsen || payload.kategori || "Datang");
    var tipeAbsen = rawTipe.toLowerCase().indexOf("pulang") >= 0 ? "Absen Pulang" : "Absen Datang";

    const rIdx = "TND-ABS-" + Date.now();

    var col6Header = sheet.getRange(1, 6).getValue().toString();
    if (col6Header.toLowerCase().indexOf("tipe") === -1 && col6Header.toLowerCase().indexOf("status") === -1) {
      if (col6Header.toLowerCase().indexOf("foto") >= 0 || col6Header.toLowerCase().indexOf("base64") >= 0) {
        sheet.insertColumnAfter(5);
      }
      sheet.getRange(1, 6).setValue("Tipe Absen");
      if (sheet.getRange(1, 7).getValue().toString() === "") {
        sheet.getRange(1, 7).setValue("Foto Bukti Base64");
      }
    }

    sheet.appendRow([
      rIdx,
      tgl,
      wkt,
      payload.nip || "",
      payload.namaTendik || "",
      tipeAbsen,
      payload.photo || payload.photoBase64 || ""
    ]);

    return { status: "success", message: "Presensi " + tipeAbsen + " Tendik berhasil disimpan!" };
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
    const tz = "Asia/Makassar";
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

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: "success", history: [] };

    const numCols = Math.max(sheet.getLastColumn(), 6);
    const values = sheet.getRange(1, 1, lastRow, numCols).getValues();
    const history = [];
    const tz = "Asia/Makassar";

    for (let i = values.length - 1; i >= 1; i--) {
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

      let tipeAbsen = "Datang";
      let photo = "";

      const col5 = values[i][5] ? values[i][5].toString().trim() : "";
      const col6 = values[i][6] ? values[i][6].toString().trim() : "";

      const lowerCol5 = col5.toLowerCase();
      if (lowerCol5.includes("pulang")) {
        tipeAbsen = "Pulang";
        photo = col6;
      } else if (lowerCol5.includes("datang")) {
        tipeAbsen = "Datang";
        photo = col6;
      } else if (col5.length < 30 && !col5.startsWith("data:")) {
        tipeAbsen = col5 || "Datang";
        photo = col6;
      } else {
        // Col 5 is photo base64 (legacy 6-column sheet layout)
        photo = col5;
        tipeAbsen = "Datang";
      }

      if (!tanggal || rowTanggal === tanggal) {
        history.push({
          rowIndex: values[i][0] ? values[i][0].toString() : (i + 1).toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaTendik: values[i][4] ? values[i][4].toString() : "",
          tipeAbsen: tipeAbsen,
          photo: photo
        });
      }

      if (!tanggal && history.length >= 100) {
        break;
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

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: "success", history: [] };

    const values = sheet.getRange(1, 1, lastRow, 8).getValues();
    const history = [];
    const tz = "Asia/Makassar";

    for (let i = values.length - 1; i >= 1; i--) {
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
          rowIndex: values[i][0] ? values[i][0].toString() : (i + 1).toString(),
          tanggal: rowTanggal,
          waktu: rowWaktu,
          nip: values[i][3] ? values[i][3].toString() : "",
          namaTendik: values[i][4] ? values[i][4].toString() : "",
          status: values[i][5] ? values[i][5].toString() : "Izin",
          alasan: values[i][6] ? values[i][6].toString() : "",
          photo: values[i][7] ? values[i][7].toString() : ""
        });
      }

      if (!tanggal && history.length >= 100) {
        break;
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

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memverifikasi keamanan...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[500px] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Area Terbatas</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Silakan masukkan kata sandi Anda untuk mengakses Kode Apps Script dan konfigurasi database.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Kata Sandi"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none"
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-xs text-rose-500 font-medium">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Akses Sekarang
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            <button 
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-full text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              <span>Ubah Sandi</span>
            </button>
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



      {showChangePassword && (
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Ubah Sandi Menu Apps Script
            </h4>
            <button 
              onClick={() => setShowChangePassword(false)}
              className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Masukkan sandi baru..."
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setAuthError('');
              }}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none"
            />
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Sandi
            </button>
          </form>
          {authError && <p className="mt-2 text-xs text-rose-500 font-medium">{authError}</p>}
          {changePasswordSuccess && <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{changePasswordSuccess}</p>}
        </div>
      )}

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
        <button
          onClick={() => setActiveTab('manifest')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'manifest'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Izin Google Drive (appsscript.json)</span>
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


        {activeTab === 'manifest' && (
          <div className="space-y-6 animate-fade-in text-slate-600 text-xs sm:text-sm">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Penting Khusus Akun belajar.id / Google Workspace:</span>
                <p className="mt-1">Akun Google Workspace sekolah/organisasi memerlukan file deklarasi izin <code className="bg-amber-100 px-1 rounded font-bold">appsscript.json</code> agar Google Drive mengizinkan pembuatan berkas secara langsung.</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800">4 Langkah Mudah Mengaktifkan Izin Drive di Apps Script:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 1:</span>
                  <p>Di editor Apps Script, klik ikon <strong>⚙️ Setelan Project</strong> (Project Settings) pada menu bilah kiri.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 2:</span>
                  <p>Centang kotak: <strong>"Tampilkan file manifes 'appsscript.json' di editor"</strong>.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 3:</span>
                  <p>Kembali ke ikon <strong>&lt;&gt; Editor</strong>, klik file <strong>appsscript.json</strong> yang baru muncul di daftar file.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 4:</span>
                  <p>Hapus isi lamanya, tempel kode JSON di bawah ini, klik <strong>Simpan (Ctrl+S)</strong>, lalu ikuti langkah <strong>Deploy Versi Baru</strong>.</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>appsscript.json (File Manifes Izin Google Drive)</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`{\n  "timeZone": "Asia/Makassar",\n  "dependencies": {},\n  "exceptionLogging": "STACKDRIVER",\n  "runtimeVersion": "V8",\n  "webapp": {\n    "executeAs": "USER_DEPLOYING",\n    "access": "ANYONE"\n  },\n  "oauthScopes": [\n    "https://www.googleapis.com/auth/spreadsheets",\n    "https://www.googleapis.com/auth/drive",\n    "https://www.googleapis.com/auth/script.external_request"\n  ]\n}`)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-sans text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Manifes appsscript.json</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[11px] text-emerald-400 font-mono leading-relaxed bg-slate-900">
{`{
  "timeZone": "Asia/Makassar",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}`}
              </pre>
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

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2 md:col-span-2">
                <span className="text-teal-600 font-extrabold uppercase text-[10px] tracking-wider block">7. Presensi (Kiosk Scanner Log)</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all text-[11px]">
                  Timestamp, NISN, Nama, Kelas, Status Presensi
                </p>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2 md:col-span-2">
                <span className="text-blue-600 font-extrabold uppercase text-[10px] tracking-wider block">8. Rekap_Kehadiran Guru (Rekap Bulanan Guru)</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all text-[11px]">
                  ID_Rekap, Bulan_Tahun, NIP, Nama_Guru, Hadir, Izin, Sakit, Cuti_DL, Alpa, Total_Hari_Kerja, Persentase_Kehadiran, Tanggal_Simpan, Catatan
                </p>
              </div>

              <div className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 space-y-2 md:col-span-2">
                <span className="text-emerald-600 font-extrabold uppercase text-[10px] tracking-wider block">9. Rekap_Kehadiran Tendik (Rekap Bulanan Tendik)</span>
                <p className="text-slate-500 font-mono bg-white p-2 rounded-xl border border-slate-100 select-all text-[11px]">
                  ID_Rekap, Bulan_Tahun, NIP, Nama_Tendik, Hadir, Izin, Sakit, Cuti_DL, Alpa, Total_Hari_Kerja, Persentase_Kehadiran, Tanggal_Simpan, Catatan
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
