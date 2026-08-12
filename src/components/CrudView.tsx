/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CrudRow } from '../types';
import { Plus, Pencil, Trash2, FolderEdit, Save, X, Loader2, Database, Search } from 'lucide-react';

interface CrudViewProps {
  currentCrudSheet: string;
  headers: string[];
  rows: CrudRow[];
  onAddRow: (rowData: string[]) => Promise<void>;
  onEditRow: (rowIndex: number, rowData: string[]) => Promise<void>;
  onDeleteRow: (rowIndex: number) => Promise<void>;
  isLoading: boolean;
}

export function CrudView({
  currentCrudSheet,
  headers,
  rows,
  onAddRow,
  onEditRow,
  onDeleteRow,
  isLoading,
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

  const handleDelete = async (row: CrudRow) => {
    const displayVal = row.data[2] || row.data[1] || `Row #${row._rowIndex}`;
    if (confirm(`Apakah Anda yakin ingin menghapus "${displayVal}" dari ${getFriendlySheetName()}?`)) {
      await onDeleteRow(row._rowIndex);
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
                      {row.data.map((val, cIdx) => (
                        <td key={cIdx} className="p-3.5 font-semibold text-slate-700 text-sm">
                          {val}
                        </td>
                      ))}
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
                  ) : (
                    <input
                      type="text"
                      value={formRowValues[i] || ''}
                      onChange={(e) => handleInputChange(i, e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                      placeholder={`Masukkan ${head}...`}
                    />
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
    </div>
  );
}
