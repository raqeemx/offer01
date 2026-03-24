export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-gray-700', bg: 'bg-gray-100' },
  sent: { label: 'مُرسل', color: 'text-blue-700', bg: 'bg-blue-100' },
  accepted: { label: 'مقبول', color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { label: 'مرفوض', color: 'text-red-700', bg: 'bg-red-100' },
};
