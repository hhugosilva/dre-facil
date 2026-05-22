export const darkColors = {
  bg:'#08090b', s1:'#0f1014', s2:'#16171c', s3:'#1e1f26', s4:'#26272f',
  b1:'rgba(255,255,255,0.05)', b2:'rgba(255,255,255,0.09)', b3:'rgba(255,255,255,0.16)',
  t1:'#f2f0e8', t2:'#7e7d88', t3:'#3e3d48',
  green:'#4ade80', red:'#f87171', blue:'#60a5fa', amber:'#fbbf24', purple:'#a78bfa', cyan:'#22d3ee',
  r:14, rs:9,
};
export const lightColors = {
  bg:'#f2f1ed', s1:'#ffffff', s2:'#ebe9e4', s3:'#e0ddd8', s4:'#d4d1cc',
  b1:'rgba(0,0,0,0.06)', b2:'rgba(0,0,0,0.10)', b3:'rgba(0,0,0,0.18)',
  t1:'#1a1918', t2:'#6b6a72', t3:'#9c9ba5',
  green:'#16a34a', red:'#dc2626', blue:'#2563eb', amber:'#d97706', purple:'#7c3aed', cyan:'#0891b2',
  r:14, rs:9,
};
export const colors = darkColors;

export const DEFAULT_CATS = [
  { name: 'Receita',               color: '#4ade80', cost: false },
  { name: 'Fornecedores',          color: '#60a5fa', cost: true  },
  { name: 'Operacional',           color: '#22d3ee', cost: true  },
  { name: 'Marketing',             color: '#fbbf24', cost: true  },
  { name: 'Impostos',              color: '#f87171', cost: true  },
  { name: 'Pessoal',               color: '#a78bfa', cost: true  },
  { name: 'Retirada PF',           color: '#f472b6', cost: true  },
  { name: 'Transferência Interna', color: '#3e3d48', cost: false, neutral: true },
  { name: 'Outros',                color: '#6b7280', cost: true  },
];

export type Category = { name: string; color: string; cost: boolean; neutral?: boolean };
