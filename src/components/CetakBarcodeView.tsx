import React, { useState, useEffect } from 'react';
import { CrudRow, AppCustomization } from '../types';
import QRCode from 'qrcode';
import { Printer, Filter, Users } from 'lucide-react';
import { normalizeImageUrl } from '../utils/imageUrl';
import { getStudentColorInfo } from '../utils/studentColor';

interface CetakBarcodeViewProps {
  students: CrudRow[];
  kelasList: string[];
  customization?: AppCustomization;
}

function QRCodeCard({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'H',
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
        className="flex items-center justify-center bg-slate-50 text-slate-400 text-xs rounded"
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
      className="w-full h-auto max-w-[120px] object-contain block mx-auto"
      referrerPolicy="no-referrer"
    />
  );
}

export function CetakBarcodeView({ students, kelasList, customization }: CetakBarcodeViewProps) {
  const [selectedKelas, setSelectedKelas] = useState<string>('');

  const filteredStudents = selectedKelas 
    ? students.filter(s => s.data[3] === selectedKelas)
    : students;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 print-area">
      {/* Header Panel (Hidden during Print) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cetak Barcode & QR</h2>
            <p className="text-slate-500 mt-1 font-medium">Buat Kartu Identitas Siswa Siap Scan</p>
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
            
            <button
              onClick={handlePrint}
              disabled={filteredStudents.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>Cetak Sekarang</span>
            </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
            {filteredStudents.map((student, idx) => {
              const nisn = student.data[1]; // NISN
              const nama = student.data[2]; // Nama
              const kelas = student.data[3]; // Kelas
              const colorInfo = getStudentColorInfo(student);
              
              if (!nisn) return null; // Skip if no NISN

              return (
                <div 
                  key={idx} 
                  className={`border-2 rounded-2xl overflow-hidden flex flex-col print:break-inside-avoid relative ${
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
                    <div>
                      <h4 className="font-bold text-sm tracking-widest uppercase truncate max-w-[150px]">
                        {customization?.appName || 'Kartu Presensi'}
                      </h4>
                      <p className="text-[10px] font-medium opacity-80 uppercase truncate max-w-[150px]">
                        {customization?.appSubtitle || 'Sekolah Digital'}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col items-center bg-white flex-grow justify-between gap-4">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                      <QRCodeCard value={nisn} size={120} />
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
            })}
          </div>
        )}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* We will target the parent container holding the grid in App.tsx */
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* specifically hide sidebar and mobile headers inside App.tsx when printing */
          nav, header, aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
