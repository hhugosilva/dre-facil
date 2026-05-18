export function fmtBRL(v: number): string {
  return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function mesLabel(key: string): string {
  const [y, m] = key.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(m) - 1]} ${y}`;
}

export function mesLabelFull(key: string): string {
  const [y, m] = key.split('-');
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${names[parseInt(m) - 1]} ${y}`;
}

export function toMesKey(d: string | Date): string {
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const m = d.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}`;
  const m2 = d.match(/^(\d{4})[\/\-](\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return d.slice(0, 7);
}
