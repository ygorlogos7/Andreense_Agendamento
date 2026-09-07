import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Menu, Plus, Smile, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AgendaView from '@/components/AgendaView';
import AppointmentDialog from '@/components/AppointmentDialog';
import AvailabilityPanel from '@/components/AvailabilityPanel';
import ServicesPanel from '@/components/ServicesPanel';
import {
  STATUS_META,
  dateKey,
  loadData,
  saveData,
} from '@/lib/store';
import type { Appointment, AppointmentStatus, ClinicData, Service, WeeklyConfig } from '@/lib/store';

type Tab = 'agenda' | 'servicos' | 'disponibilidade';

const NAV: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'servicos', label: 'Serviços', icon: Stethoscope },
  { id: 'disponibilidade', label: 'Disponibilidade', icon: Clock },
];

export default function Index() {
  const [data, setData] = useState<ClinicData>(() => loadData());
  const [tab, setTab] = useState<Tab>('agenda');
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [preset, setPreset] = useState<{ date: string; start: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const persist = (next: ClinicData) => {
    setData(next);
    saveData(next);
  };

  const todayKey = dateKey(new Date());
  const todayCounts = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      pendente: 0,
      confirmado: 0,
      concluido: 0,
      cancelado: 0,
    };
    data.appointments
      .filter((a) => a.date === todayKey)
      .forEach((a) => {
        counts[a.status] += 1;
      });
    return counts;
  }, [data.appointments, todayKey]);

  const openNew = (date: string, start: string) => {
    if (data.services.length === 0) {
      toast.error('Cadastre pelo menos um serviço na aba Serviços antes de agendar.');
      setTab('servicos');
      return;
    }
    setEditing(null);
    setPreset({ date, start });
    setDialogOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setPreset(null);
    setDialogOpen(true);
  };

  const saveAppointment = (a: Appointment) => {
    const exists = data.appointments.some((x) => x.id === a.id);
    const next = exists
      ? data.appointments.map((x) => (x.id === a.id ? a : x))
      : [...data.appointments, a];
    persist({ ...data, appointments: next });
    setDialogOpen(false);
    setEditing(null);
    toast.success(exists ? 'Agendamento atualizado.' : 'Agendamento criado.');
    if (a.date !== dateKey(anchor)) setAnchor(new Date(a.date + 'T00:00:00'));
  };

  const cancelAppointment = (id: string) => {
    const next = data.appointments.map((x) => (x.id === id ? { ...x, status: 'cancelado' as AppointmentStatus } : x));
    persist({ ...data, appointments: next });
    toast.success('Agendamento cancelado.');
  };

  const hardDelete = (id: string) => {
    persist({ ...data, appointments: data.appointments.filter((x) => x.id !== id) });
    toast.success('Agendamento excluído.');
  };

  const saveService = (s: Service) => {
    const exists = data.services.some((x) => x.id === s.id);
    const next = exists ? data.services.map((x) => (x.id === s.id ? s : x)) : [...data.services, s];
    persist({ ...data, services: next });
    toast.success(exists ? 'Serviço atualizado.' : 'Serviço cadastrado.');
  };

  const deleteService = (id: string) => {
    const inUse = data.appointments.some((a) => a.serviceId === id && a.status !== 'cancelado');
    if (inUse) {
      toast.error('Este serviço possui agendamentos ativos e não pode ser excluído.');
      return;
    }
    persist({ ...data, services: data.services.filter((x) => x.id !== id) });
    toast.success('Serviço excluído.');
  };

  const setWeekly = (weekly: WeeklyConfig) => persist({ ...data, weekly });

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setTab(item.id);
              onNavigate?.();
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Smile className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">OdontoAgenda</p>
            <p className="text-[11px] text-muted-foreground">Clínica interna</p>
          </div>
        </div>
        <NavContent />
        <div className="mt-auto rounded-lg border bg-card p-3 text-[11px] text-muted-foreground">
          Versão de demonstração — dados salvos neste navegador.
        </div>
      </aside>

      {/* conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 lg:hidden" aria-label="Abrir menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Smile className="h-4 w-4" />
                  </span>
                  OdontoAgenda
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <NavContent onNavigate={() => setMobileNavOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold md:text-lg">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {tab === 'agenda'
                ? 'Consulte e gerencie os compromissos da clínica'
                : tab === 'servicos'
                ? 'Procedimentos, duração e cores da agenda'
                : 'Dias e horários de atendimento da semana'}
            </p>
          </div>

          {tab === 'agenda' && (
            <div className="ml-auto hidden items-center gap-2 md:flex">
              {(Object.keys(STATUS_META) as AppointmentStatus[]).map((k) => (
                <span
                  key={k}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums"
                  style={{ backgroundColor: STATUS_META[k].bg, color: STATUS_META[k].color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[k].color }} />
                  {STATUS_META[k].label} {todayCounts[k]}
                </span>
              ))}
            </div>
          )}

          <Button className={`${tab === 'agenda' ? 'md:ml-4' : 'ml-auto'}`} size="sm" onClick={() => openNew(todayKey, '')}>
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Novo agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </header>

        {/* área principal */}
        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
          {tab === 'agenda' && (
            <AgendaView
              mode={mode}
              anchor={anchor}
              data={data}
              onModeChange={setMode}
              onAnchorChange={setAnchor}
              onNew={openNew}
              onEdit={openEdit}
            />
          )}
          {tab === 'servicos' && (
            <ServicesPanel services={data.services} onSave={saveService} onDelete={deleteService} />
          )}
          {tab === 'disponibilidade' && (
            <AvailabilityPanel weekly={data.weekly} onChange={setWeekly} />
          )}
        </main>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={data}
        editing={editing}
        preset={preset}
        onSave={saveAppointment}
        onCancelAppointment={cancelAppointment}
        onHardDelete={hardDelete}
      />
    </div>
  );
}