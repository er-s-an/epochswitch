export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtApr(n: number): string {
  return `${fmt(n, 2)}%`
}

export function trimAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  return n.toFixed(6).replace(/\.?0+$/, '')
}

export function fmtTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Hong_Kong',
  }).format(date)
}
