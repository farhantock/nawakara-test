import React, { useState, useEffect, useRef } from 'react';
import * as yup from 'yup';
import { PurchaseRequest, CreateRequestPayload, RequestPriority } from '../types';
import { formatRupiah } from '../utils/formatters';
import { UOM_OPTIONS, PRIORITY_OPTIONS } from '../constants';
import SearchableSelect from './SearchableSelect';
import { X, Plus, Trash2 } from 'lucide-react';

const requestItemSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Nama item wajib diisi')
    .min(1, 'Minimal 1 karakter')
    .max(200, 'Maksimal 200 karakter'),
  uom: yup
    .string()
    .trim()
    .nullable()
    .max(50, 'Satuan maksimal 50 karakter'),
  qty: yup
    .number()
    .typeError('Qty wajib angka')
    .required('Qty wajib diisi')
    .integer('Qty harus bilangan bulat')
    .min(1, 'Qty minimal 1 dan tidak boleh minus'),
  unit_price: yup
    .number()
    .typeError('Harga satuan harus berupa angka')
    .required('Harga satuan wajib diisi')
    .moreThan(0, 'Harga harus lebih besar dari 0 dan tidak boleh minus'),
});

const purchaseRequestSchema = yup.object({
  notes: yup
    .string()
    .trim()
    .nullable()
    .max(1000, 'Catatan maksimal 1.000 karakter'),
  items: yup
    .array()
    .of(requestItemSchema)
    .min(1, 'Minimal 1 item diperlukan.')
    .max(100, 'Maksimal 100 item per request'),
});

interface FormItemState {
  name: string;
  uom: string;
  qty: number | string;
  unit_price: number | string;
  price_display: string;
}

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateRequestPayload) => void;
  initialData: PurchaseRequest | null;
  loading: boolean;
}

function formatInitialPriceDisplay(val: number | string | null | undefined): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '';
  const parts = num.toString().split('.');
  const intPart = new Intl.NumberFormat('id-ID').format(BigInt(parts[0]));
  return parts[1] ? `Rp ${intPart},${parts[1]}` : `Rp ${intPart}`;
}

export default function RequestFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
}: RequestFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEditing = Boolean(initialData);

  const [notes, setNotes] = useState<string>('');
  const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
  const [items, setItems] = useState<FormItemState[]>([
    { name: '', uom: 'Pcs', qty: 1, unit_price: '', price_display: '' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setNotes(initialData.notes || '');
      setPriority(initialData.priority || 'MEDIUM');
      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((it) => ({
            name: it.name,
            uom: it.uom || 'Pcs',
            qty: it.qty,
            unit_price: it.unit_price,
            price_display: formatInitialPriceDisplay(it.unit_price),
          }))
        );
      } else {
        setItems([{ name: '', uom: 'Pcs', qty: 1, unit_price: '', price_display: '' }]);
      }
    } else {
      setNotes('');
      setPriority('MEDIUM');
      setItems([{ name: '', uom: 'Pcs', qty: 1, unit_price: '', price_display: '' }]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialogDimensions = dialogRef.current?.getBoundingClientRect();
    if (dialogDimensions) {
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        onClose();
      }
    }
  };

  const handleAddItem = () => {
    if (items.length >= 100) return;
    setItems([...items, { name: '', uom: 'Pcs', qty: 1, unit_price: '', price_display: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItemState, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleQtyChange = (index: number, rawInput: string) => {
    const digitsOnly = rawInput.replace(/[^0-9]/g, '');
    const updated = [...items];
    if (digitsOnly === '') {
      updated[index] = { ...updated[index], qty: '' };
    } else {
      const num = Math.max(1, parseInt(digitsOnly, 10));
      updated[index] = { ...updated[index], qty: num };
    }
    setItems(updated);
  };

  const handlePriceChange = (index: number, rawInput: string) => {
    const noMinus = rawInput.replace(/-/g, '');

    let cleanInput = noMinus;
    if (!cleanInput.includes(',') && cleanInput.includes('.')) {
      const dotParts = cleanInput.split('.');
      if (dotParts.length === 2 && dotParts[1].length <= 2) {
        cleanInput = `${dotParts[0]},${dotParts[1]}`;
      }
    }

    const parts = cleanInput.replace(/Rp\s?/gi, '').replace(/\s/g, '').split(',');
    const intDigits = parts[0].replace(/\D/g, '');
    const decDigits = parts.length > 1 ? parts[1].replace(/\D/g, '').slice(0, 2) : null;

    const updated = [...items];

    if (intDigits === '' && decDigits === null) {
      updated[index] = {
        ...updated[index],
        unit_price: '',
        price_display: '',
      };
      setItems(updated);
      return;
    }

    const formattedInt = intDigits
      ? new Intl.NumberFormat('id-ID').format(BigInt(intDigits))
      : '0';

    let display = `Rp ${formattedInt}`;
    let numericVal = 0;

    if (decDigits !== null) {
      display = `Rp ${formattedInt},${decDigits}`;
      numericVal = parseFloat(`${intDigits || '0'}.${decDigits || '0'}`);
    } else {
      numericVal = parseFloat(intDigits || '0');
    }

    updated[index] = {
      ...updated[index],
      unit_price: numericVal,
      price_display: display,
    };
    setItems(updated);
  };

  const previewTotal = items.reduce((acc, it) => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.unit_price) || 0;
    return acc + Math.max(0, qty * price);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsedItems = items.map((it) => ({
      name: it.name.trim(),
      uom: it.uom.trim() || 'Pcs',
      qty: it.qty === '' ? NaN : Number(it.qty),
      unit_price: it.unit_price === '' ? NaN : Number(it.unit_price),
    }));

    try {
      await purchaseRequestSchema.validate(
        {
          notes: notes.trim() || null,
          items: parsedItems,
        },
        { abortEarly: false }
      );

      onSave({
        notes: notes.trim() || null,
        priority,
        items: parsedItems.map((it) => ({
          name: it.name,
          uom: it.uom,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
        })),
      });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const validationErrors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path) {
            const normalizedPath = error.path.replace(/\[(\d+)\]/g, '.$1');
            if (!validationErrors[normalizedPath]) {
              validationErrors[normalizedPath] = error.message;
            }
            if (!validationErrors[error.path]) {
              validationErrors[error.path] = error.message;
            }
          }
        });
        setErrors(validationErrors);
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto rounded-xl p-0 bg-transparent shadow-2xl max-w-3xl w-full border-0 focus:outline-none backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
      aria-labelledby="request-modal-title"
    >
      <div className="bg-white rounded-xl w-full p-6 shadow-xl border border-slate-200">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 id="request-modal-title" className="text-sm font-bold text-slate-900">
              {isEditing ? `Edit Purchase Request ${initialData?.number}` : 'Buat Purchase Request Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Priority & Notes (Compact Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Prioritas
              </label>
              <SearchableSelect
                options={PRIORITY_OPTIONS.map((p) => ({
                  value: p.value,
                  label: p.label,
                  sublabel: p.desc,
                }))}
                value={priority}
                onChange={(val) => setPriority(val as RequestPriority)}
                placeholder="Pilih prioritas..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan / Alasan Pengadaan (Opsional)
              </label>
              <textarea
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pengadaan monitor dan docking station tim baru..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#005696] focus:border-[#005696] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Items Header */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-800">
                Rincian Barang / Jasa
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#004578] hover:text-[#004d87] px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            {/* Table with Column Headers */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f5f6f9] border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5">Nama Barang / Jasa</th>
                      <th className="px-3 py-2.5 w-28">Satuan</th>
                      <th className="px-3 py-2.5 w-20">Qty</th>
                      <th className="px-3 py-2.5 w-40">Harga Satuan (Rp)</th>
                      <th className="px-3 py-2.5 w-32 text-right">Subtotal</th>
                      <th className="px-2 py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => {
                      const qtyNum = Number(item.qty) || 0;
                      const priceNum = Number(item.unit_price) || 0;
                      const subtotal = Math.max(0, qtyNum * priceNum);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 align-top">
                            <input
                              type="text"
                              placeholder="Nama barang / jasa (1-200 karakter)"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 ${errors[`items.${idx}.name`]
                                ? 'border-red-400 focus:ring-red-400'
                                : 'border-slate-300 focus:ring-[#005696] focus:border-[#005696]'
                                }`}
                            />
                            {errors[`items.${idx}.name`] && (
                              <span className="text-[10px] text-[#cf1d1d] mt-1 block font-semibold">
                                {errors[`items.${idx}.name`]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <SearchableSelect
                              options={UOM_OPTIONS.map((opt) => ({
                                value: opt,
                                label: opt,
                              }))}
                              value={item.uom || 'Pcs'}
                              onChange={(val) => handleItemChange(idx, 'uom', val)}
                              placeholder="Pcs"
                              allowCustom={true}
                              compact={true}
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="1"
                              value={item.qty}
                              onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 text-center ${errors[`items.${idx}.qty`]
                                ? 'border-red-400 focus:ring-red-400'
                                : 'border-slate-300 focus:ring-[#005696] focus:border-[#005696]'
                                }`}
                            />
                            {errors[`items.${idx}.qty`] && (
                              <span className="text-[10px] text-[#cf1d1d] mt-1 block font-semibold">
                                {errors[`items.${idx}.qty`]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Rp 0"
                              value={item.price_display}
                              onKeyDown={(e) => {
                                if (['-', '+'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 ${errors[`items.${idx}.unit_price`]
                                ? 'border-red-400 focus:ring-red-400'
                                : 'border-slate-300 focus:ring-[#005696] focus:border-[#005696]'
                                }`}
                            />
                            {errors[`items.${idx}.unit_price`] && (
                              <span className="text-[10px] text-[#cf1d1d] mt-1 block font-semibold">
                                {errors[`items.${idx}.unit_price`]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top pt-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatRupiah(subtotal)}
                          </td>
                          <td className="px-2 py-2 align-top pt-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1}
                              className="p-1 text-slate-400 hover:text-[#cf1d1d] rounded transition-colors disabled:opacity-20 cursor-pointer"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Live Preview Summary */}
          <div className="p-3.5 rounded-lg bg-[#e6eef5] border border-[#b0cbde] flex justify-between items-center text-xs">
            <span className="text-[#004578] font-medium">Estimasi Total ({items.length} item)</span>
            <span className="font-bold text-base text-[#004578]">
              {formatRupiah(previewTotal)}
            </span>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-[#004578] hover:bg-[#004d87] active:bg-[#005696] text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Draft'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
