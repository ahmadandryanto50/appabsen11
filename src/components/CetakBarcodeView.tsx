import React, { useState, useEffect, useRef } from 'react';
import { CrudRow, AppCustomization } from '../types';
import QRCode from 'qrcode';
import { Printer, Filter, Users, CreditCard, Layers, QrCode, Barcode, ShieldAlert, ChevronDown, Download, FileText, FileDown } from 'lucide-react';
import { normalizeImageUrl, getUserPhotoUrl } from '../utils/imageUrl';
import { getStudentColorInfo } from '../utils/studentColor';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CetakBarcodeViewProps {
  students: CrudRow[];
  kelasList: string[];
  customization?: AppCustomization;
}

// Full character set mapping for standard Code 39 barcode encoding
const Code39Patterns: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100' // Start/Stop Character
};

/**
 * Pure SVG Code 39 Barcode Renderer Component.
 * Guaranteed to be pixel-perfect, lightweight, and responsive.
 */
function Code39Barcode({ value }: { value: string }) {
  const sanitized = String(value || '').trim().toUpperCase();
  if (!sanitized) return null;

  // Code 39 wraps value with '*'
  const fullCode = `*${sanitized}*`;
  const narrowWidth = 1.5;
  const wideWidth = 3.5;
  const gapWidth = 1.5; // Gap between characters

  let currentX = 0;
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < fullCode.length; i++) {
    const char = fullCode[i];
    const pattern = Code39Patterns[char] || Code39Patterns[' '];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={width}
            height={50}
            fill="#000000"
          />
        );
      }
      currentX += width;
    }
    currentX += gapWidth;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg
        viewBox={`0 0 ${currentX} 50`}
        width="100%"
        height="45"
        className="max-h-[45px] w-full"
        preserveAspectRatio="none"
      >
        {rects}
      </svg>
      <span className="text-[9px] font-bold font-mono mt-1 text-slate-700 tracking-[0.25em]">{sanitized}</span>
    </div>
  );
}

/**
 * Responsive QR Code generator relying on existing qrcode library.
 */
function QRCodeCard({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code', err);
      });
    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-slate-50 text-slate-400 text-xs rounded-lg"
      >
        Memuat QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR-${value}`}
      width={size}
      height={size}
      className="w-full h-auto max-w-full object-contain block mx-auto"
      referrerPolicy="no-referrer"
    />
  );
}

/**
 * Highly polished Student Photo Placeholder with Gender specific silhouettes.
 */
function StudentPhotoPlaceholder({ gender, isPondok }: { gender?: string; isPondok?: boolean }) {
  const isFemale = String(gender || '').toLowerCase().startsWith('p');
  return (
    <div className={`w-[75px] h-[95px] border border-slate-200 rounded-lg flex flex-col items-center justify-center relative overflow-hidden ${
      isPondok ? 'bg-emerald-50/50' : 'bg-indigo-50/30'
    }`}>
      <svg className={`w-10 h-10 ${isPondok ? 'text-emerald-300' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24">
        {isFemale ? (
          <path d="M12 2C8.69 2 6 4.69 6 8c0 2.24 1.25 4.19 3.09 5.21C5.19 14.21 2 17.74 2 22h20c0-4.26-3.19-7.79-7.09-8.79C16.75 12.19 18 10.24 18 8c0-3.31-2.69-6-6-6zm0 1.8c2.32 0 4.2 1.88 4.2 4.2S14.32 12.2 12 12.2 7.8 10.32 7.8 8c0-2.32 1.88-4.2 4.2-4.2zm0 10.4c4.15 0 7.6 2.85 8.12 6.8H3.88c.52-3.95 3.97-6.8 8.12-6.8z" />
        ) : (
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        )}
      </svg>
      <span className={`text-[7px] font-black tracking-wider absolute bottom-1 py-0.5 px-1 rounded-sm uppercase ${
        isPondok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
      }`}>
        {isPondok ? '🕌 SANTRI' : 'SISWA'}
      </span>
    </div>
  );
}

interface StudentCardFrontProps {
  student: CrudRow;
  customization?: AppCustomization;
  codeType: 'qr' | 'barcode';
  orientation?: 'landscape' | 'portrait';
}

/**
 * Front Side Card Design Component.
 */
const StudentCardFront: React.FC<StudentCardFrontProps> = ({ 
  student, 
  customization, 
  codeType,
  orientation = 'portrait'
}) => {
  const nisn = student.data[1];
  const nama = student.data[2];
  const kelas = student.data[3];
  const gender = student.data[4];
  const colorInfo = getStudentColorInfo(student);

  const studentPhotoUrl = getUserPhotoUrl(customization, {
    nama: nama,
    nip: nisn,
    id: student.data[0],
  });

  // Render Portrait Layout (54mm x 86mm)
  if (orientation === 'portrait') {
    return (
      <div
        className={`id-card-print w-[54mm] h-[86mm] border-[1.5px] rounded-[16px] relative overflow-hidden flex flex-col bg-white shadow-md print:shadow-none print:break-inside-avoid flex-shrink-0 select-none ${
          colorInfo.isPondok ? 'border-emerald-800' : 'border-[#181d33]'
        }`}
      >
        {/* Header Banner */}
        <div
          className={`text-white px-2 py-2 flex flex-col items-center text-center relative z-10 ${
            colorInfo.isPondok ? 'bg-emerald-800' : 'bg-[#181d33]'
          }`}
        >
          <img
            src={normalizeImageUrl(customization?.logoUrl?.trim() || '/logo_smpn11.jpg')}
            alt="Logo Sekolah"
            className="w-6 h-6 rounded-full bg-white p-0.5 object-contain flex-shrink-0 mb-0.5 shadow-sm"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
            }}
          />
          <h4 className="font-black text-[9px] tracking-wider uppercase leading-tight truncate w-full text-white">
            {(!customization?.appName || customization.appName === 'APP_11') ? 'ABSENSI' : customization.appName}
          </h4>
          <p className="text-[6.5px] font-semibold opacity-90 leading-none uppercase truncate w-full mt-0.5 text-slate-200">
            {customization?.appSubtitle || 'SMP NEGERI 11 PALU'}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-grow flex flex-col items-center justify-between p-2 bg-white relative">
          {/* Photo Box */}
          <div className="my-0.5 flex justify-center flex-shrink-0">
            {studentPhotoUrl ? (
              <img
                src={studentPhotoUrl}
                alt={nama}
                className="w-[60px] h-[76px] object-cover rounded-xl border border-slate-200 shadow-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><circle fill="%23cbd5e1" cx="50" cy="40" r="20"/><path fill="%23cbd5e1" d="M20,100 Q50,70 80,100 Z"/></svg>';
                }}
              />
            ) : (
              <div className="scale-95">
                <StudentPhotoPlaceholder gender={gender} isPondok={colorInfo.isPondok} />
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="text-center space-y-1 w-full px-1 flex-grow flex flex-col justify-center">
            <div>
              <span className="text-[5.5px] text-slate-400 block font-bold leading-none uppercase tracking-wider">
                NAMA SISWA
              </span>
              <span className="text-[9.5px] font-extrabold text-slate-900 leading-tight uppercase truncate block max-w-[170px] mt-0.5" title={colorInfo.cleanName}>
                {colorInfo.cleanName}
              </span>
            </div>

            <div className="flex justify-center items-center gap-4 pt-0.5">
              <div>
                <span className="text-[5.5px] text-slate-400 block font-bold leading-none uppercase tracking-wider">
                  NISN
                </span>
                <span className="text-[8px] font-extrabold text-slate-800 tracking-wider leading-none mt-0.5 block">
                  {nisn}
                </span>
              </div>
              <div>
                <span className="text-[5.5px] text-slate-400 block font-bold leading-none uppercase tracking-wider">
                  KELAS
                </span>
                <span className="text-[8px] font-black text-indigo-700 leading-none mt-0.5 block">
                  {kelas}
                </span>
              </div>
            </div>

            <div className="pt-1 flex justify-center">
              <span className={`inline-flex items-center gap-1 text-[7px] font-black px-2.5 py-0.5 rounded-full ${
                colorInfo.isPondok
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colorInfo.isPondok ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span>{colorInfo.isPondok ? 'SANTRI PONDOK' : 'SISWA REGULER'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="py-1 border-t border-slate-100 flex items-center justify-center bg-white">
          <span className="text-[5.5px] font-black text-slate-800 uppercase tracking-widest leading-none">
            DISIPLIN • KARTU VALID
          </span>
        </div>
      </div>
    );
  }

  // Render Landscape Layout (86mm x 54mm)
  return (
    <div
      className={`id-card-print w-[86mm] h-[54mm] border-2 rounded-2xl relative overflow-hidden flex flex-col bg-white shadow-md print:shadow-none print:break-inside-avoid flex-shrink-0 select-none ${
        colorInfo.isPondok ? 'border-emerald-800' : 'border-slate-800'
      }`}
    >
      {/* Dynamic Header */}
      <div
        className={`text-white px-3 py-2 flex items-center justify-start gap-2 relative z-10 ${
          colorInfo.isPondok ? 'bg-emerald-800' : 'bg-indigo-950'
        }`}
      >
        <img
          src={normalizeImageUrl(customization?.logoUrl?.trim() || '/logo_smpn11.jpg')}
          alt="Logo Sekolah"
          className="w-7 h-7 rounded bg-white p-0.5 object-contain flex-shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
          }}
        />
        <div className="text-left flex-grow">
          <h4 className="font-black text-[11px] tracking-wider uppercase leading-tight truncate max-w-[200px]">
            {customization?.appName || 'KARTU ABSENSI DIGITAL'}
          </h4>
          <p className="text-[8px] font-semibold opacity-90 leading-none uppercase truncate max-w-[200px] mt-0.5">
            {customization?.appSubtitle || 'SMP Negeri 11 Balikpapan'}
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-12 bg-white/5 skew-x-12 transform origin-top-right"></div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-row items-center justify-between p-3 flex-grow bg-white">
        {/* Profile Column */}
        <div className="flex flex-col items-center justify-center pr-2 border-r border-slate-100 flex-shrink-0">
          {studentPhotoUrl ? (
            <img
              src={studentPhotoUrl}
              alt={nama}
              className="w-[75px] h-[95px] object-cover rounded-lg border-2 border-slate-200 shadow-sm"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><circle fill="%2394a3b8" cx="50" cy="40" r="20"/><path fill="%2394a3b8" d="M20,100 Q50,70 80,100 Z"/></svg>';
              }}
            />
          ) : (
            <StudentPhotoPlaceholder gender={gender} isPondok={colorInfo.isPondok} />
          )}
        </div>

        {/* Info Column */}
        <div className="flex-grow pl-3 flex flex-col justify-between text-left h-full py-0.5">
          <div className="space-y-1.5">
            <div>
              <span className="text-[6.5px] text-slate-400 block font-bold leading-none uppercase">Nama Siswa</span>
              <span className="text-[11.5px] font-black text-slate-800 leading-tight uppercase truncate block max-w-[195px]">
                {colorInfo.cleanName}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[6.5px] text-slate-400 block font-bold leading-none uppercase">NISN</span>
                <span className="text-[10px] font-extrabold text-slate-700 tracking-wider leading-none">
                  {nisn}
                </span>
              </div>
              <div>
                <span className="text-[6.5px] text-slate-400 block font-bold leading-none uppercase">Kelas</span>
                <span className="text-[10px] font-black text-indigo-700 leading-none">
                  {kelas}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[6.5px] text-slate-400 block font-bold leading-none uppercase">Status</span>
              <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-md mt-0.5 ${
                colorInfo.isPondok
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}>
                {colorInfo.isPondok ? '🕌 SANTRI PONDOK' : '🔴 SISWA REGULER'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stamp Overlay / Verification */}
      <div className="absolute bottom-1 right-2.5 flex flex-col items-center opacity-80 pointer-events-none">
        <span className="text-[5px] text-slate-400 font-bold uppercase leading-none">ID Card Valid</span>
        <div className="w-5 h-4 flex items-center justify-center my-0.5 relative">
          <div className={`border text-[4.5px] font-extrabold px-1.5 py-0.2 rounded-full rotate-12 ${
            colorInfo.isPondok ? 'border-emerald-600/40 text-emerald-600/60' : 'border-indigo-600/40 text-indigo-600/60'
          }`}>
            DISIPLIN
          </div>
        </div>
        <span className="text-[4px] font-bold text-slate-400 uppercase tracking-wider">PRESENSI ONLINE</span>
      </div>
    </div>
  );
}

interface StudentCardBackProps {
  student: CrudRow;
  customization?: AppCustomization;
  codeType: 'qr' | 'barcode';
  orientation?: 'landscape' | 'portrait';
}

/**
 * Back Side Card Design Component.
 */
const StudentCardBack: React.FC<StudentCardBackProps> = ({ 
  student, 
  customization, 
  codeType,
  orientation = 'portrait'
}) => {
  const nisn = student.data[1];
  const colorInfo = getStudentColorInfo(student);

  // Render Portrait Layout (54mm x 86mm)
  if (orientation === 'portrait') {
    return (
      <div
        className={`id-card-print w-[54mm] h-[86mm] border-[1.5px] rounded-[16px] relative overflow-hidden flex flex-col bg-white shadow-md print:shadow-none print:break-inside-avoid flex-shrink-0 select-none ${
          colorInfo.isPondok ? 'border-emerald-800' : 'border-[#181d33]'
        }`}
      >
        {/* Top Accent Stripe */}
        <div className={`h-2 w-full ${colorInfo.isPondok ? 'bg-emerald-800' : 'bg-[#181d33]'}`}></div>

        {/* Rules Section */}
        <div className="px-3 pt-2 text-center flex-shrink-0">
          <h5 className="text-[8px] font-black text-slate-900 tracking-wider uppercase border-b border-slate-200 pb-1 mb-1.5 text-center">
            TATA TERTIB KARTU
          </h5>
          <ol className="text-left list-decimal list-inside text-[5.5px] text-slate-700 space-y-0.5 leading-tight font-medium">
            <li>Kartu wajib dibawa setiap hari untuk presensi Kiosk.</li>
            <li>Dilarang mencoret, merusak, atau melipat kartu ini.</li>
            <li>Penyalahgunaan kartu dapat dikenai sanksi disiplin.</li>
            <li>Jika kartu hilang, segera melapor ke admin sekolah.</li>
          </ol>
        </div>

        {/* QR Code Container */}
        <div className="flex-grow flex flex-col items-center justify-center px-2 py-1">
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full max-w-[155px] flex items-center justify-center">
            {codeType === 'barcode' ? (
              <div className="scale-x-95">
                <Code39Barcode value={nisn} />
              </div>
            ) : (
              <div className="w-[68px] h-[68px] flex items-center justify-center">
                <QRCodeCard value={nisn} size={68} />
              </div>
            )}
          </div>
          
          <span className="text-[6px] font-extrabold text-slate-400 mt-1 uppercase tracking-widest leading-none text-center block w-full truncate">
            SCAN {codeType === 'barcode' ? 'BARCODE' : 'QR CODE'}
          </span>
        </div>

        {/* Bottom Banner */}
        <div className={`py-1.5 text-center text-[6.5px] text-white font-extrabold tracking-wider leading-none uppercase ${
          colorInfo.isPondok ? 'bg-emerald-800' : 'bg-[#181d33]'
        }`}>
          {customization?.appSubtitle || 'SMP NEGERI 11 PALU'}
        </div>
      </div>
    );
  }

  // Render Landscape Layout (86mm x 54mm)
  return (
    <div
      className={`id-card-print w-[86mm] h-[54mm] border-2 rounded-2xl relative overflow-hidden flex flex-col bg-slate-50 shadow-md print:shadow-none print:break-inside-avoid flex-shrink-0 select-none ${
        colorInfo.isPondok ? 'border-emerald-800 bg-emerald-50/10' : 'border-slate-800'
      }`}
    >
      {/* Decorative Top Accent Stripe */}
      <div className={`h-1.5 w-full ${colorInfo.isPondok ? 'bg-emerald-800' : 'bg-indigo-950'}`}></div>

      {/* Rules / Terms of Use */}
      <div className="px-4 pt-3 text-left">
        <h5 className="text-[9px] font-black text-slate-700 tracking-wider uppercase border-b border-slate-200 pb-1 mb-1.5 text-center">
          Ketentuan & Tata Tertib Kartu
        </h5>
        <ol className="list-decimal list-inside text-[7px] text-slate-600 space-y-0.5 leading-normal">
          <li>Kartu wajib dibawa setiap hari untuk presensi Kiosk.</li>
          <li>Dilarang mencoret, merusak, atau melipat kartu ini.</li>
          <li>Penyalahgunaan kartu dapat dikenakan sanksi disiplin.</li>
          <li>Jika kartu hilang, segera melapor ke bagian administrasi.</li>
        </ol>
      </div>

      {/* Barcode/QR Code Container */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 pb-2 mt-1">
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full max-w-[260px] flex items-center justify-center">
          {codeType === 'barcode' ? (
            <Code39Barcode value={nisn} />
          ) : (
            <div className="w-[85px] h-[85px] flex items-center justify-center">
              <QRCodeCard value={nisn} size={85} />
            </div>
          )}
        </div>
        
        <span className="text-[6.5px] font-black text-slate-400 mt-1 uppercase tracking-widest leading-none text-center block">
          Scan {codeType === 'barcode' ? 'Barcode' : 'QR Code'} di atas untuk Presensi
        </span>
      </div>

      {/* Address Strip / Card Footer */}
      <div className={`py-1 text-center text-[5.5px] text-white font-bold tracking-wider leading-none uppercase ${
        colorInfo.isPondok ? 'bg-emerald-800/90' : 'bg-slate-800'
      }`}>
        {customization?.appSubtitle || 'SMP Negeri 11 Balikpapan'}
      </div>
    </div>
  );
}

interface StandardCompactCardProps {
  student: CrudRow;
  customization?: AppCustomization;
  codeType: 'qr' | 'barcode';
}

/**
 * Standard Minimal Label Layout (Original Layout with customizations)
 */
const StandardCompactCard: React.FC<StandardCompactCardProps> = ({
  student,
  customization,
  codeType
}) => {
  const nisn = student.data[1];
  const nama = student.data[2];
  const kelas = student.data[3];
  const colorInfo = getStudentColorInfo(student);

  return (
    <div 
      className={`border-2 rounded-2xl overflow-hidden flex flex-col print:break-inside-avoid relative w-full ${
        colorInfo.isPondok ? 'border-emerald-800 shadow-sm' : 'border-slate-800'
      }`}
    >
      <div className={`text-white text-center py-3 px-4 flex items-center justify-center gap-2 ${
        colorInfo.isPondok ? 'bg-emerald-800' : 'bg-slate-800'
      }`}>
        <img
          src={normalizeImageUrl(customization?.logoUrl?.trim() || '/logo_smpn11.jpg')}
          alt="Logo Sekolah"
          className="w-6 h-6 rounded bg-white p-0.5 object-contain flex-shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
          }}
        />
        <div className="text-left">
          <h4 className="font-bold text-sm tracking-widest uppercase truncate max-w-[150px]">
            {customization?.appName || 'Kartu Presensi'}
          </h4>
          <p className="text-[10px] font-medium opacity-80 uppercase truncate max-w-[150px]">
            {customization?.appSubtitle || 'Sekolah Digital'}
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col items-center bg-white flex-grow justify-between gap-4">
        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm w-full flex items-center justify-center">
          {codeType === 'barcode' ? (
            <Code39Barcode value={nisn} />
          ) : (
            <div className="w-[120px] h-[120px] flex items-center justify-center">
              <QRCodeCard value={nisn} size={120} />
            </div>
          )}
        </div>
        <div className="text-center w-full">
          <p 
            className={`font-black text-sm truncate uppercase ${
              colorInfo.isPondok ? 'text-emerald-900 font-extrabold' : 'text-slate-800'
            }`} 
            title={nama}
            style={colorInfo.fontColor ? { color: colorInfo.fontColor } : undefined}
          >
            {colorInfo.cleanName}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{nisn}</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{kelas}</span>
            {colorInfo.isPondok && (
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                🕌 PONDOK
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CetakBarcodeView({ students, kelasList, customization }: CetakBarcodeViewProps) {
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'standard' | 'front-only' | 'double-sided'>('standard');
  const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = selectedKelas 
    ? students.filter(s => s.data[3] === selectedKelas)
    : students;

  const handlePrintWindow = () => {
    setIsDropdownOpen(false);
    if (!printAreaRef.current) return;

    const htmlContent = printAreaRef.current.innerHTML;
    const gridClass = layoutMode === 'standard'
      ? 'grid-cols-4 gap-2.5'
      : orientation === 'portrait'
        ? 'grid-cols-4 gap-2.5'
        : 'grid-cols-2 gap-x-6 gap-y-3';

    const printWin = window.open('', '_blank');
    
    if (!printWin) {
      // Fallback if window.open was blocked by pop-up blocker
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Cetak Kartu Siswa - Ready to Print</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            body {
              background-color: #f8fafc;
              margin: 0;
              padding: 16px;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                background: white !important;
                padding: 0 !important;
              }
            }
            .id-card-print {
              width: ${orientation === 'portrait' ? '46mm' : '76mm'} !important;
              height: ${orientation === 'portrait' ? '74mm' : '48mm'} !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border-radius: 3.5mm !important;
              border: 1.5px solid #181d33 !important;
              box-shadow: none !important;
              background-color: white !important;
            }
          </style>
        </head>
        <body>
          <div class="no-print mb-6 p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl border border-slate-800">
            <div>
              <h2 class="font-bold text-base text-white flex items-center gap-2">
                <span>🖨️</span> Halaman Siap Cetak Kartu Siswa
              </h2>
              <p class="text-xs text-slate-300 mt-0.5">
                Dialog cetak peramban akan terbuka otomatis. Jika tidak, klik tombol di sebelah kanan atau tekan <kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white">Ctrl + P</kbd>.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="window.close()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all">
                Tutup Halaman
              </button>
              <button onclick="window.print()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2 animate-pulse">
                <span>🖨️ CETAK SEKARANG</span>
              </button>
            </div>
          </div>

          <div class="grid ${gridClass} justify-items-center">
            ${htmlContent}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handlePrintDirect = () => {
    setIsDropdownOpen(false);
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDropdownOpen(false);
    if (!printAreaRef.current) return;
    
    try {
      // Create a high-resolution canvas of the print area
      const canvas = await html2canvas(printAreaRef.current, { 
        scale: 3, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      
      const margin = 8;
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = (imgProps.height * printWidth) / imgProps.width;
      
      let heightLeft = printHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight, '', 'FAST');
      heightLeft -= (pdfHeight - (margin * 2));

      while (heightLeft > 5) {
        position = heightLeft - printHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight, '', 'FAST');
        heightLeft -= (pdfHeight - (margin * 2));
      }

      pdf.save('Kartu_Siswa_SMPN_11_Palu.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Maaf, terjadi kesalahan saat membuat file PDF.');
    }
  };

  const handleDownloadWord = () => {
    setIsDropdownOpen(false);
    if (!printAreaRef.current) return;
    
    const content = printAreaRef.current.innerHTML;
    const gridClass = layoutMode === 'standard'
      ? 'grid-cols-4 gap-2.5'
      : orientation === 'portrait'
        ? 'grid-cols-4 gap-2.5'
        : 'grid-cols-2 gap-x-6 gap-y-3';

    const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Kartu Siswa - SMP Negeri 11 Palu</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { 
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          background-color: #ffffff;
          margin: 10px;
        }
        .id-card-print {
          width: ${orientation === 'portrait' ? '46mm' : '76mm'} !important;
          height: ${orientation === 'portrait' ? '74mm' : '48mm'} !important;
          border-radius: 3.5mm !important;
          border: 1.5px solid #181d33 !important;
          background-color: #ffffff !important;
          display: inline-block !important;
          vertical-align: top !important;
          margin: 6px !important;
        }
      </style>
    </head>
    <body>
      <div class="grid ${gridClass} justify-items-center">
        ${content}
      </div>
    </body>
    </html>`;
    
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Kartu_Siswa_SMPN_11_Palu.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print-area">
      {/* Header Panel (Hidden during Print) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cetak Barcode & Kartu Siswa</h2>
            <p className="text-slate-500 mt-1 font-medium">Buat Kartu Identitas & ID Card Siswa Siap Cetak & Scan</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none appearance-none min-w-[120px]"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={filteredStudents.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Cetak / Ekspor</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && filteredStudents.length > 0 && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-fade-in origin-top-right">
                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={handlePrintWindow}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-indigo-600" />
                      <span>Cetak (Buka Tab Cetak Baru)</span>
                    </button>
                    <button
                      onClick={handlePrintDirect}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Cetak Halaman Ini (Direct)</span>
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-rose-500" />
                      <span>Download File PDF</span>
                    </button>
                    <button
                      onClick={handleDownloadWord}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Download Word (.doc)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Segmented Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
          {/* Layout Mode Control */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Format Tampilan Kartu
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setLayoutMode('standard')}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center gap-1.5 justify-center cursor-pointer ${
                  layoutMode === 'standard'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Label Biasa</span>
              </button>
              
              <button
                onClick={() => setLayoutMode('front-only')}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center gap-1.5 justify-center cursor-pointer ${
                  layoutMode === 'front-only'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Depan Saja</span>
              </button>

              <button
                onClick={() => setLayoutMode('double-sided')}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center gap-1.5 justify-center cursor-pointer relative ${
                  layoutMode === 'double-sided'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/10'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>2 Sisi</span>
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              </button>
            </div>
          </div>

          {/* Orientation Control (Only shown when not Standard Label format) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Orientasi Kartu {layoutMode === 'standard' && <span className="text-slate-400 font-normal">(Tidak Aktif)</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={layoutMode === 'standard'}
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  layoutMode === 'standard'
                    ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                    : orientation === 'portrait'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-3.5 h-4 border-2 border-current rounded-sm block"></span>
                <span>Potret (54x86 mm)</span>
              </button>
              
              <button
                disabled={layoutMode === 'standard'}
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  layoutMode === 'standard'
                    ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                    : orientation === 'landscape'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-4 h-3 border-2 border-current rounded-sm block"></span>
                <span>Lanskap (86x54 mm)</span>
              </button>
            </div>
          </div>

          {/* Scan Code Type Control */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Jenis Kode Scan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCodeType('qr')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  codeType === 'qr'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </button>
              
              <button
                onClick={() => setCodeType('barcode')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  codeType === 'barcode'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Barcode className="w-4 h-4" />
                <span>Barcode (Code 39)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of ID Cards for Printing */}
      <div className="bg-white rounded-3xl p-6 md:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20 print:hidden">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Belum Ada Data</h3>
            <p className="text-slate-500 font-medium">Pilih kelas yang memiliki data siswa untuk dicetak.</p>
          </div>
        ) : (
          <div 
            ref={printAreaRef}
            className={`grid gap-4 justify-items-center ${
              layoutMode === 'standard'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-4 print:gap-2.5'
                : orientation === 'portrait'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 print:grid-cols-4 print:gap-2.5'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 print:grid-cols-2 print:gap-x-6 print:gap-y-3'
            }`}
          >
            {filteredStudents.map((student, idx) => {
              const nisn = student.data[1];
              if (!nisn) return null;

              if (layoutMode === 'standard') {
                return (
                  <StandardCompactCard
                    key={student.data[0] || idx}
                    student={student}
                    customization={customization}
                    codeType={codeType}
                  />
                );
              }

              if (layoutMode === 'front-only') {
                return (
                  <StudentCardFront
                    key={student.data[0] || idx}
                    student={student}
                    customization={customization}
                    codeType={codeType}
                    orientation={orientation}
                  />
                );
              }

              // Double Sided Card Rendering Layout
              return (
                <React.Fragment key={student.data[0] || idx}>
                  <StudentCardFront
                    student={student}
                    customization={customization}
                    codeType={codeType}
                    orientation={orientation}
                  />
                  <StudentCardBack
                    student={student}
                    customization={customization}
                    codeType={codeType}
                    orientation={orientation}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          nav, header, aside, .print\\:hidden {
            display: none !important;
          }
          
          /* Keep cards at high-precision card dimensions when printing */
          .id-card-print {
            width: ${orientation === 'portrait' ? '46mm' : '76mm'} !important;
            height: ${orientation === 'portrait' ? '74mm' : '48mm'} !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-radius: 3.5mm !important;
            border: 1.5px solid #181d33 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}
