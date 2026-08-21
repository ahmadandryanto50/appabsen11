/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CrudRow } from '../types';
import { Plus, Pencil, Trash2, FolderEdit, Save, X, Loader2, Database, Search, AlertCircle, ExternalLink } from 'lucide-react';
import { apiClient } from '../api';

interface CrudViewProps {
  currentCrudSheet: string;
  headers: string[];
  rows: CrudRow[];
  onAddRow: (rowData: string[]) => Promise<void>;
  onEditRow: (rowIndex: number, rowData: string[]) => Promise<void>;
  onDeleteRow: (rowIndex: number) => Promise<void>;
  isLoading: boolean;
  allTeachers?: any[];
}

export function CrudView({
  currentCrudSheet,
  headers,
  rows,
  onAddRow,
  onEditRow,
  onDeleteRow,
  isLoading,
  allTeachers,
}: CrudViewProps) {
  // Search and limit states
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState<number | 'all'>(30);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [formRowValues, setFormRowValues] = useState<string[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRow, setDeletingRow] = useState<CrudRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Teacher & Tendik options for Wali Kelas dropdown
  const [fetchedTeacherNames, setFetchedTeacherNames] = useState<string[]>([]);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await apiClient.getCrud('Master_Guru');
        if (res && res.status === 'success' && Array.isArray(res.rows) && res.rows.length > 0) {
          let nameIdx = 2; // Default column for "Nama Lengkap"
          if (res.headers && Array.isArray(res.headers)) {
            const foundIdx = res.headers.findIndex((h: string) => h.toLowerCase().includes('nama'));
            if (foundIdx !== -1) nameIdx = foundIdx;
          }
          const names = res.rows
            .map((r: any) => {
              if (r && Array.isArray(r.data)) return r.data[nameIdx];
              if (Array.isArray(r)) return r[nameIdx];
              return '';
            })
            .filter((val): val is string => typeof val === 'string' && val.trim().length > 0);

          if (names.length > 0) {
            setFetchedTeacherNames([...new Set(names)]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch teachers for Wali Kelas dropdown:', err);
      }
    };

    loadTeachers();
  }, []);

  // Helper to compile list of Wali Kelas options
  const getWaliKelasOptions = (currentVal?: string) => {
    const defaultList = ['Budi Santoso, S.Pd.', 'Siti Rahma, M.Pd.', 'Ahmad Subagyo, S.Si.'];
    const propNames = (allTeachers || [])
      .map((r: any) => {
        if (r && Array.isArray(r.data)) return r.data[2];
        if (Array.isArray(r)) return r[2];
        return '';
      })
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    const merged = [
      ...propNames,
      ...fetchedTeacherNames,
      ...defaultList,
      ...(currentVal ? [currentVal] : [])
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    return Array.from(new Set(merged));
  };

  const getFriendlySheetName = () => {
    if (currentCrudSheet === 'Master_Guru') return 'Data Guru & Tendik';
    return currentCrudSheet.replace('Master_', 'Data ');
  };

  const openAddModal = () => {
    setModalTitle(`Tambah ${getFriendlySheetName()}`);
    setFormRowValues(new Array(headers.length).fill(''));
    setEditingRowIndex(null);
    setShowFormModal(true);
  };

  const openEditModal = (row: CrudRow) => {
    setModalTitle(`Edit ${getFriendlySheetName()}`);
    setFormRowValues([...row.data]);
    setEditingRowIndex(row._rowIndex);
    setShowFormModal(true);
  };

  const handleInputChange = (index: number, value: string) => {
    setFormRowValues((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingRowIndex === null) {
        await onAddRow(formRowValues);
      } else {
        await onEditRow(editingRowIndex, formRowValues);
      }
      setShowFormModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (row: CrudRow) => {
    setDeletingRow(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setIsDeleting(true);
    try {
      await onDeleteRow(deletingRow._rowIndex);
      setShowDeleteModal(false);
      setDeletingRow(null);
    } catch (err) {
      console.error('Gagal menghapus data:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and limit rows based on search input and dropdown selection
  const filteredRows = rows.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    // Search across all data cells in the row (e.g. Nama, NISN, etc.)
    return row.data.some((val) => (val || '').toLowerCase().includes(q));
  });

  const displayedRows = limit === 'all' ? filteredRows : filteredRows.slice(0, limit);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100/60">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>Kelola {getFriendlySheetName()}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan, ubah, atau hapus entitas data master sekolah secara mandiri.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={currentCrudSheet === 'Master_Siswa' ? "Cari nama siswa atau NISN..." : "Cari data..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'all' ? 'all' : Number(val));
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none cursor-pointer transition-colors"
              >
                <option value={30}>30 Baris</option>
                <option value={50}>50 Baris</option>
                <option value="all">Semua</option>
              </select>
            </div>

            {/* Add Data Button */}
            <button
              type="button"
              onClick={openAddModal}
              className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Baru</span>
            </button>
          </div>
        </div>

        {/* Dynamic Table Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Mengambil data dari server...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4 w-12 text-center">No</th>
                  {headers.map((h, hIdx) => (
                    <th key={`head-${h}-${hIdx}`} className="p-3.5">
                      {h}
                    </th>
                  ))}
                  <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRows.length > 0 ? (
                  displayedRows.map((row, idx) => (
                    <tr key={`row-${row._rowIndex || idx}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 pl-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                      {row.data.map((val, cIdx) => {
                        const headerName = headers[cIdx] || '';
                        const isPhotoField = headerName.toLowerCase().includes('foto') || headerName.toLowerCase().includes('photo');
                        const isLink = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                        
                        if (isPhotoField && isLink) {
                          // Clean Google Drive photo URL for small file size / quick loading
                          let optimizedUrl = val;
                          if (val.includes('lh3.googleusercontent.com/d/')) {
                            const withoutParams = val.split('=')[0];
                            optimizedUrl = `${withoutParams}=s60`; // Small thumbnail for grid
                          }
                          return (
                            <td key={cIdx} className="p-3.5">
                              <a href={val} target="_blank" rel="noopener noreferrer" className="inline-block relative group" title="Klik untuk membuka file asli">
                                <img
                                  src={optimizedUrl}
                                  alt="Foto Profil"
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm group-hover:scale-110 transition-transform"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><circle fill="%2394a3b8" cx="50" cy="40" r="20"/><path fill="%2394a3b8" d="M20,100 Q50,70 80,100 Z"/></svg>';
                                  }}
                                />
                              </a>
                            </td>
                          );
                        } else if (isPhotoField) {
                          return (
                            <td key={cIdx} className="p-3.5 text-slate-400 text-xs italic font-medium">
                              Belum ada foto
                            </td>
                          );
                        } else if (isLink) {
                          return (
                            <td key={cIdx} className="p-3.5 font-semibold text-sm max-w-xs truncate">
                              <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                <span className="truncate max-w-[150px]">{val}</span>
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              </a>
                            </td>
                          );
                        }

                        return (
                          <td key={cIdx} className="p-3.5 font-semibold text-slate-700 text-sm">
                            {val}
                          </td>
                        );
                      })}
                      <td className="p-3.5 pr-4 text-center space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Ubah data"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Hapus data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length + 2} className="p-12 text-center text-slate-400 font-medium">
                      {searchQuery
                        ? 'Tidak ada data ditemukan yang cocok dengan kata kunci pencarian Anda.'
                        : `Tidak ada data ditemukan pada lembar ${getFriendlySheetName()}.`
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Data summary metadata */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 font-bold gap-2 px-1">
            <span>
              {searchQuery ? (
                <span>
                  Ditemukan <strong className="text-slate-600">{filteredRows.length}</strong> data dari <strong className="text-slate-500">{rows.length}</strong> total data cocok
                </span>
              ) : (
                <span>
                  Total <strong className="text-slate-600">{rows.length}</strong> data master
                </span>
              )}
            </span>
            <span>
              Menampilkan {displayedRows.length} baris data
            </span>
          </div>
        )}
      </div>

      {/* CRUD POPUP DIALOG FORM */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-150 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base">{modalTitle}</h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {headers.map((head, i) => (
                <div key={head}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">{head}</label>
                  {head.toLowerCase() === 'role' ? (
                    <select
                      value={formRowValues[i] || ''}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- Pilih Role --</option>
                      <option value="Admin Utama">Admin Utama</option>
                      <option value="Admin">Admin</option>
                      <option value="Guru">Guru</option>
                      <option value="Tendik">Tendik</option>
                    </select>
                  ) : head.toLowerCase() === 'status' ? (
                    <select
                      value={formRowValues[i] || ''}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- Pilih Status --</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  ) : head.toLowerCase() === 'jenis kelamin' ? (
                    <select
                      value={formRowValues[i] || ''}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- Pilih Jenis Kelamin --</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  ) : head.toLowerCase().includes('wali kelas') ? (
                    <select
                      value={formRowValues[i] || ''}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- Pilih Wali Kelas (Guru & Tendik) --</option>
                      {getWaliKelasOptions(formRowValues[i]).map((tName) => (
                        <option key={tName} value={tName}>
                          {tName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={formRowValues[i] || ''}
                        onChange={(e) => handleInputChange(i, e.target.value)}
                        required={!head.toLowerCase().includes('foto') && !head.toLowerCase().includes('photo') && !head.toLowerCase().includes('deskripsi') && !head.toLowerCase().includes('keterangan')}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                        placeholder={`Masukkan ${head}...`}
                      />
                      {(head.toLowerCase().includes('foto') || head.toLowerCase().includes('photo')) && (
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                          Saran: Masukkan link Google Drive (Contoh: Drive Shared Link). Sistem otomatis mengompres gambar agar sangat ringan dibuka di HP.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Data</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION DIALOG MODAL */}
      {showDeleteModal && deletingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Hapus {getFriendlySheetName()}</h3>
                <p className="text-[11px] text-slate-400 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              Apakah Anda yakin ingin menghapus data <strong className="text-slate-900 font-bold">"{deletingRow.data[2] || deletingRow.data[1] || `Baris #${deletingRow._rowIndex}`}"</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingRow(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
