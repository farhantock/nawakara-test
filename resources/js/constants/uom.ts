export const UOM_OPTIONS = [
  'Pcs',
  'Unit',
  'Box',
  'Set',
  'Pack',
  'Rim',
  'Kg',
  'Meter',
  'Roll',
  'Lot',
  'Lusin',
  'Lembar',
  'Bulan',
  'Tahun',
  'Paket',
] as const;

export type UomOption = (typeof UOM_OPTIONS)[number];
