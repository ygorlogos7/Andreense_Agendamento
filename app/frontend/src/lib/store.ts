// Modelo de dados, persistência e regras da clínica (agenda odontológica)

export type ServiceColor = 'teal' | 'blue' | 'violet' | 'amber' | 'rose' | 'emerald';

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  color: ServiceColor;
  description?: string;
}

export type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
}

export interface DayHours {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

// índice 0 = Segunda ... 6 = Domingo
export type WeeklyConfig = DayHours[];

export interface ClinicData {
  services: Service[];
  appointments: Appointment[];
  weekly: WeeklyConfig;
}

export const DAY_NAMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const SERVICE_COLORS: Record<
  ServiceColor,
  { dot: string; bg: string; border: string; text: string; soft: string }
> = {
  teal: { dot: '#0d9488', bg: 'rgba(13,148,136,0.10)', border: '#0d9488', text: '#115e59', soft: '#ccfbf1' },
  blue: { dot: '#2563eb', bg: 'rgba(37,99,235,0.10)', border: '#2563eb', text: '#1e40af', soft: '#dbeafe' },
  violet: { dot: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: '#7c3aed', text: '#5b21b6', soft: '#ede9fe' },
  amber: { dot: '#d97706', bg: 'rgba(217,119,6,0.12)', border: '#d97706', text: '#92400e', soft: '#fef3c7' },
  rose: { dot: '#e11d48', bg: 'rgba(225,29,72,0.10)', border: '#e11d48', text: '#9f1239', soft: '#ffe4e6' },
  emerald: { dot: '#059669', bg: 'rgba(5,150,105,0.10)', border: '#059669', text: '#065f46', soft: '#d1fae5' },
};

export const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: '#92400e', bg: '#fef3c7' },
  confirmado: { label: 'Confirmado', color: '#115e59', bg: '#ccfbf1' },
  concluido: { label: 'Concluído', color: '#1e40af', bg: '#dbeafe' },
  cancelado: { label: 'Cancelado', color: '#9f1239', bg: '#ffe4e6' },
};

// ---------- utilidades de data/hora ----------

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMin = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.round(n) % 60).padStart(2, '0')}`;

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// segunda-feira como início da semana
export const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const dayIndex = (d: Date) => (d.getDay() + 6) % 7; // 0 = Segunda

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- regras de agenda ----------

export function dayHoursFor(weekly: WeeklyConfig, d: Date): DayHours | null {
  const h = weekly[dayIndex(d)];
  return h && h.enabled ? h : null;
}

export function generateSlots(hours: DayHours, step = 15): string[] {
  const out: string[] = [];
  for (let t = toMin(hours.start); t + step <= toMin(hours.end); t += step) out.push(fromMin(t));
  return out;
}

export function findConflicts(
  appts: Appointment[],
  services: Service[],
  date: string,
  start: string,
  durMin: number,
  ignoreId?: string
): Appointment[] {
  const s = toMin(start);
  const e = s + durMin;
  return appts.filter((a) => {
    if (a.date !== date || a.id === ignoreId || a.status === 'cancelado') return false;
    const as = toMin(a.start);
    const svc = services.find((x) => x.id === a.serviceId);
    const ae = as + (svc?.durationMin ?? 30);
    return as < e && ae > s;
  });
}

export function availableSlots(
  data: ClinicData,
  date: string,
  durMin: number,
  ignoreId?: string
): string[] {
  const hours = dayHoursFor(data.weekly, parseKey(date));
  if (!hours) return [];
  return generateSlots(hours, 15).filter((s) => {
    if (toMin(s) + durMin > toMin(hours.end)) return false;
    return findConflicts(data.appointments, data.services, date, s, durMin, ignoreId).length === 0;
  });
}

// ---------- persistência ----------

const KEY = 'agenda-odonto-v1';

function seedData(): ClinicData {
  const services: Service[] = [
    { id: 'svc-limpeza', name: 'Limpeza', durationMin: 30, color: 'teal', description: 'Profilaxia e higiene dental' },
    { id: 'svc-restauracao', name: 'Restauração', durationMin: 45, color: 'blue', description: 'Obturação e reparo de dentes' },
    { id: 'svc-canal', name: 'Tratamento de Canal', durationMin: 60, color: 'violet', description: 'Endodontia' },
    { id: 'svc-extracao', name: 'Extração', durationMin: 40, color: 'rose', description: 'Exodontia simples ou siso' },
    { id: 'svc-clareamento', name: 'Clareamento', durationMin: 50, color: 'emerald', description: 'Clareamento dental' },
    { id: 'svc-ortodontia', name: 'Ortodontia', durationMin: 30, color: 'amber', description: 'Manutenção de aparelho' },
  ];

  const weekly: WeeklyConfig = [
    { enabled: true, start: '08:00', end: '18:00' },
    { enabled: true, start: '08:00', end: '18:00' },
    { enabled: true, start: '08:00', end: '18:00' },
    { enabled: true, start: '08:00', end: '18:00' },
    { enabled: true, start: '08:00', end: '18:00' },
    { enabled: true, start: '08:00', end: '12:00' },
    { enabled: false, start: '08:00', end: '18:00' },
  ];

  const mon = startOfWeek(new Date());
  const d = (i: number) => dateKey(addDays(mon, i));

  const appointments: Appointment[] = [
    { id: uid(), clientName: 'Maria Oliveira', clientPhone: '(11) 98877-1234', serviceId: 'svc-limpeza', date: d(0), start: '09:00', status: 'confirmado' },
    { id: uid(), clientName: 'João Pereira', clientPhone: '(11) 97766-5544', serviceId: 'svc-restauracao', date: d(0), start: '10:30', status: 'confirmado' },
    { id: uid(), clientName: 'Ana Souza', clientPhone: '(11) 96655-4433', serviceId: 'svc-ortodontia', date: d(1), start: '14:00', status: 'pendente' },
    { id: uid(), clientName: 'Carlos Lima', clientPhone: '(11) 95544-3322', serviceId: 'svc-canal', date: d(2), start: '09:30', status: 'confirmado' },
    { id: uid(), clientName: 'Fernanda Alves', clientPhone: '(11) 94433-2211', serviceId: 'svc-clareamento', date: d(2), start: '15:00', status: 'confirmado' },
    { id: uid(), clientName: 'Ricardo Gomes', clientPhone: '(11) 93322-1100', serviceId: 'svc-extracao', date: d(3), start: '11:00', status: 'concluido' },
    { id: uid(), clientName: 'Beatriz Nunes', clientPhone: '(11) 92211-0099', serviceId: 'svc-limpeza', date: d(4), start: '08:30', status: 'confirmado' },
    { id: uid(), clientName: 'Paulo Ribeiro', clientPhone: '(11) 91100-9988', serviceId: 'svc-restauracao', date: d(4), start: '16:00', status: 'pendente' },
    { id: uid(), clientName: 'Lúcia Martins', clientPhone: '(11) 90011-8877', serviceId: 'svc-ortodontia', date: d(5), start: '10:00', status: 'confirmado' },
  ];

  return { services, appointments, weekly };
}

export function loadData(): ClinicData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClinicData;
      if (parsed.services && parsed.appointments && parsed.weekly) return parsed;
    }
  } catch {
    // ignora e re-semeia
  }
  const seed = seedData();
  try {
    localStorage.setItem(KEY, JSON.stringify(seed));
  } catch {
    // storage indisponível
  }
  return seed;
}

export function saveData(d: ClinicData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // storage indisponível
  }
}