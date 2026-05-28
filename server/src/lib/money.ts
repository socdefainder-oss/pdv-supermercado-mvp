export function centsFromNumber(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

export function calculateDiscount(grossTotalCents: number, discountType: 'NONE' | 'FIXED' | 'PERCENTAGE', discountValue: number) {
  if (discountType === 'NONE') return 0;
  if (discountType === 'FIXED') return Math.min(centsFromNumber(discountValue), grossTotalCents);
  return Math.min(Math.round(grossTotalCents * (discountValue / 100)), grossTotalCents);
}

export function ensureNonNegativeCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} deve ser informado em centavos positivos.`);
}
