import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DAY_NAMES,
  DAY_SHORT,
  MONTHS_PT,
  SERVICE_COLORS,
  STATUS_META,
  addDays,
  dateKey,
  dayHoursFor,
  fromMin,
  isSameDay,
  startOfWeek,
  toMin,
} from '@/lib/store';
import type { Appointment, ClinicData } from '@/lib/store';

export type AgendaMode = 'day' | 'week' | 'month';

interface AgendaViewProps {
  mode: AgendaMode;
  anchor: Date;
  data: ClinicData;
  onModeChange: (m: AgendaMode) => void;
  onAnchorChange: (d: Date) => void;
  onNew: (date: string, start: string) => void;
  onEdit: (a: Appointment) => void;
}

function fmtLong(d: Date) {
  return `${DAY_NAMES[(d.getDay() + 6) % 7]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
}

function capMonth(m: number) {
  const s = MONTHS_PT[m];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AgendaView({ mode, anchor, data, onModeChange, onAnchorChange, onNew, onEdit }: AgendaViewProps) {
  const days = mode === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)) : [new Date(anchor)];

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const shift = (dir: number) => {
    if (mode === 'month') {
      onAnchorChange(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    } else {
      onAnchorChange(addDays(anchor, mode === 'week' ? dir * 7 : dir));
    }
  };

  // ---------- grade do mês ----------
  const monthWeeks: Date[][] = [];
  if (mode === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const totalDays = Math.round((monthEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    const numWeeks = Math.ceil(totalDays / 7);
    for (let w = 0; w < numWeeks; w++) {
      monthWeeks.push(Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
    }
  }

  // ---------- faixa de horários (dia/semana) ----------
  let startMin = 480;
  let endMin = 1080;
  if (mode !== 'month') {
    let minStart = 480;
    let maxEnd = 1080;
    const openHours = days.map((d) => dayHoursFor(data.weekly, d)).filter(Boolean) as { start: string; end: string }[];
    if (openHours.length) {
      minStart = Math.min(...openHours.map((h) => toMin(h.start)));
      maxEnd = Math.max(...openHours.map((h) => toMin(h.end)));
    }
    startMin = Math.floor(minStart / 60) * 60;
    endMin = Math.ceil(maxEnd / 60) * 60;
  }
  const hoursCount = (endMin - startMin) / 60;
  const ppm = mode === 'week' ? 1.15 : 1.7; // pixels por minuto
  const gridHeight = (endMin - startMin) * ppm;

  const label =
    mode === 'week'
      ? `${days[0].getDate()} de ${MONTHS_PT[days[0].getMonth()]} – ${days[6].getDate()} de ${MONTHS_PT[days[6].getMonth()]}`
      : mode === 'month'
      ? `${capMonth(anchor.getMonth())} ${anchor.getFullYear()}`
      : fmtLong(days[0]);

  const handleColumnClick = (d: Date, e: MouseEvent) => {
    const hours = dayHoursFor(data.weekly, d);
    if (!hours) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let t = startMin + y / ppm;
    t = Math.round(t / 15) * 15;
    t = Math.max(toMin(hours.start), Math.min(t, toMin(hours.end) - 15));
    onNew(dateKey(d), fromMin(t));
  };

  const gridTemplate = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="flex h-full flex-col">
      {/* controles */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => onAnchorChange(new Date())}>
          Hoje
        </Button>
        <h2 className="ml-1 text-sm font-semibold text-foreground md:text-base">{label}</h2>
        <div className="ml-auto">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && onModeChange(v as AgendaMode)}
            className="rounded-lg border bg-card p-0.5"
          >
            <ToggleGroupItem value="day" className="h-7 rounded-md px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Dia
            </ToggleGroupItem>
            <ToggleGroupItem value="week" className="h-7 rounded-md px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="h-7 rounded-md px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Mês
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {mode === 'month' ? (
        /* ---------------- VISÃO MÊS ---------------- */
        <div className="flex-1 overflow-auto rounded-xl border bg-card">
          <div style={{ minWidth: 640 }}>
            {/* cabeçalho dos dias da semana */}
            <div className="sticky top-0 z-10 grid grid-cols-7 border-b bg-card">
              {DAY_SHORT.map((d) => (
                <div key={d} className="border-r py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* semanas */}
            <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${monthWeeks.length}, minmax(104px, 1fr))` }}>
              {monthWeeks.flat().map((d) => {
                const key = dateKey(d);
                const inMonth = d.getMonth() === anchor.getMonth();
                const today = isSameDay(d, now);
                const dayAppts = data.appointments
                  .filter((a) => a.date === key)
                  .sort((a, b) => toMin(a.start) - toMin(b.start));
                const visible = dayAppts.slice(0, 3);
                const extra = dayAppts.length - visible.length;

                return (
                  <div
                    key={key}
                    className={`group relative flex cursor-pointer flex-col gap-0.5 border-b border-r p-1 transition-colors hover:bg-accent/40 ${
                      inMonth ? '' : 'bg-muted/30'
                    }`}
                    onClick={() => {
                      onAnchorChange(new Date(d));
                      onModeChange('day');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                          today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                      <button
                        aria-label={`Novo agendamento em ${key}`}
                        className="hidden h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-primary hover:text-primary-foreground group-hover:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNew(key, '');
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {visible.map((a) => {
                      const svc = data.services.find((s) => s.id === a.serviceId);
                      const color = SERVICE_COLORS[svc?.color ?? 'teal'];
                      const status = STATUS_META[a.status];
                      const canceled = a.status === 'cancelado';
                      return (
                        <button
                          key={a.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(a);
                          }}
                          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-shadow hover:shadow-sm"
                          style={{
                            backgroundColor: canceled ? 'hsl(var(--muted))' : color.bg,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: canceled ? STATUS_META.cancelado.color : status.color }}
                          />
                          <span
                            className={`shrink-0 text-[10px] font-semibold tabular-nums ${canceled ? 'text-muted-foreground line-through' : ''}`}
                            style={{ color: canceled ? undefined : color.text }}
                          >
                            {a.start}
                          </span>
                          <span
                            className={`truncate text-[10px] font-medium ${canceled ? 'text-muted-foreground line-through' : ''}`}
                            style={{ color: canceled ? undefined : color.text }}
                          >
                            {a.clientName}
                          </span>
                        </button>
                      );
                    })}

                    {extra > 0 && (
                      <span
                        className="px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnchorChange(new Date(d));
                          onModeChange('day');
                        }}
                      >
                        +{extra} mais
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- VISÃO DIA / SEMANA ---------------- */
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
          <div className="h-full overflow-auto">
            <div style={{ minWidth: mode === 'week' ? 860 : 460 }}>
              {/* cabeçalho dos dias */}
              <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="border-r" />
                {days.map((d) => {
                  const today = isSameDay(d, now);
                  return (
                    <div key={d.toISOString()} className="flex flex-col items-center border-r py-2 last:border-r-0">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {DAY_SHORT[(d.getDay() + 6) % 7]}
                      </span>
                      <span
                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                          today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* corpo */}
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                {/* coluna de horas */}
                <div className="relative border-r" style={{ height: gridHeight }}>
                  {Array.from({ length: hoursCount }, (_, i) => (
                    <div
                      key={i}
                      className={`absolute right-1.5 text-[11px] tabular-nums text-muted-foreground ${i === 0 ? '' : '-translate-y-1/2'}`}
                      style={{ top: i * 60 * ppm + (i === 0 ? 2 : 0) }}
                    >
                      {fromMin(startMin + i * 60)}
                    </div>
                  ))}
                </div>

                {/* colunas dos dias */}
                {days.map((d) => {
                  const key = dateKey(d);
                  const hours = dayHoursFor(data.weekly, d);
                  const dayAppts = data.appointments
                    .filter((a) => a.date === key)
                    .sort((a, b) => toMin(a.start) - toMin(b.start));
                  const showNow = isSameDay(d, now) && nowMin >= startMin && nowMin <= endMin;

                  return (
                    <div
                      key={key}
                      className={`relative border-r last:border-r-0 ${hours ? 'cursor-copy hover:bg-accent/40' : ''}`}
                      style={{ height: gridHeight }}
                      onClick={(e) => handleColumnClick(d, e)}
                    >
                      {/* linhas de hora */}
                      {Array.from({ length: hoursCount + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 border-t"
                          style={{ top: i * 60 * ppm, borderColor: i === 0 ? 'transparent' : 'hsl(var(--border))' }}
                        />
                      ))}

                      {/* linha do horário atual */}
                      {showNow && (
                        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMin - startMin) * ppm }}>
                          <div className="relative border-t-2 border-rose-500">
                            <span className="absolute -top-1 left-0 h-2 w-2 rounded-full bg-rose-500" />
                          </div>
                        </div>
                      )}

                      {/* eventos */}
                      {dayAppts.map((a) => {
                        const svc = data.services.find((s) => s.id === a.serviceId);
                        const color = SERVICE_COLORS[svc?.color ?? 'teal'];
                        const status = STATUS_META[a.status];
                        const dur = svc?.durationMin ?? 30;
                        const top = (toMin(a.start) - startMin) * ppm + 1;
                        const height = Math.max(dur * ppm - 2, 26);
                        const canceled = a.status === 'cancelado';
                        return (
                          <button
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(a);
                            }}
                            className={`absolute inset-x-1 z-[5] overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:shadow-md ${
                              canceled ? 'opacity-50' : ''
                            }`}
                            style={{
                              top,
                              height,
                              backgroundColor: canceled ? 'hsl(var(--muted))' : color.bg,
                              borderLeftColor: canceled ? STATUS_META.cancelado.color : color.border,
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                              <span className="truncate text-[11px] font-semibold tabular-nums" style={{ color: canceled ? 'hsl(var(--muted-foreground))' : color.text }}>
                                {a.start}
                              </span>
                            </div>
                            {height > 40 && (
                              <div className={`truncate text-[11px] font-medium ${canceled ? 'text-muted-foreground line-through' : ''}`} style={{ color: canceled ? undefined : color.text }}>
                                {a.clientName}
                              </div>
                            )}
                            {height > 62 && !canceled && (
                              <div className="truncate text-[10px]" style={{ color: color.text, opacity: 0.75 }}>
                                {svc?.name ?? 'Serviço'}
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* dia fechado */}
                      {!hours && (
                        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            Fechado
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
        <span className="font-medium">Status:</span>
        {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[k].color }} />
            {STATUS_META[k].label}
          </span>
        ))}
        <span className="ml-auto hidden md:inline">
          {mode === 'month' ? 'Clique em um dia para abrir a agenda do dia; passe o mouse para agendar' : 'Clique em um horário livre para agendar'}
        </span>
      </div>
    </div>
  );
}