export function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(amount))} so‘m`;
}

export function formatDateUz(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const UZ_REGIONS: string[] = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand',
  'Buxoro',
  'Andijon',
  'Farg‘ona',
  'Namangan',
  'Qashqadaryo',
  'Surxondaryo',
  'Xorazm',
  'Navoiy',
  'Jizzax',
  'Sirdaryo',
  'Qoraqalpog‘iston',
];
