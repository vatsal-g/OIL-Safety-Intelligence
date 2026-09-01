export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatPercent(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}
