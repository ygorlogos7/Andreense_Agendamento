import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SERVICE_COLORS,
  STATUS_META,
  availableSlots,
  dateKey,
  findConflicts,
  uid,
} from '@/lib/store';
import type { Appointment, AppointmentStatus, ClinicData } from '@/lib/store';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: ClinicData;
  editing: Appointment | null;
  preset: { date: string; start: string } | null;
  onSave: (a: Appointment) => void;
  onCancelAppointment: (id: string) => void;
  onHardDelete: (id: string) => void;
}

export default function AppointmentDialog({
  open,
  onOpenChange,
  data,
  editing,
  preset,
  onSave,
  onCancelAppointment,
  onHardDelete,
}: AppointmentDialogProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('pendente');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setClientName(editing.clientName);
      setClientPhone(editing.clientPhone);
      setServiceId(editing.serviceId);
      setDate(editing.date);
      setTime(editing.start);
      setStatus(editing.status);
      setNotes(editing.notes ?? '');
    } else {
      setClientName('');
      setClientPhone('');
      setServiceId(data.services[0]?.id ?? '');
      setDate(preset?.date ?? dateKey(new Date()));
      setTime(preset?.start ?? '');
      setStatus('pendente');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const service = data.services.find((s) => s.id === serviceId);
  const dur = service?.durationMin ?? 30;

  const slots = useMemo(() => {
    if (!serviceId || !date) return [];
    const list = availableSlots(data, date, dur, editing?.id);
    if (editing && editing.date === date && !list.includes(editing.start)) {
      list.unshift(editing.start);
    }
    if (!editing && preset && preset.date === date && !list.includes(preset.start)) {
      list.unshift(preset.start);
    }
    return list;
  }, [data, date, serviceId, dur, editing, preset]);

  const handleSave = () => {
    if (!clientName.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }
    if (!clientPhone.trim()) {
      toast.error('Informe o contato do cliente.');
      return;
    }
    if (!serviceId || !date || !time) {
      toast.error('Selecione serviço, data e horário.');
      return;
    }
    const conflicts = findConflicts(data.appointments, data.services, date, time, dur, editing?.id);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      toast.error(`Conflito de horário com ${c.clientName} às ${c.start}.`);
      return;
    }
    onSave({
      id: editing?.id ?? uid(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceId,
      date,
      start: time,
      status,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Ajuste os dados do compromisso. Conflitos são verificados ao salvar.' : 'Cadastre o cliente e escolha um horário livre na agenda.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="clientName">Nome do cliente</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex.: Maria Oliveira"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clientPhone">Contato</Label>
            <Input
              id="clientPhone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label>Serviço odontológico</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {data.services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERVICE_COLORS[s.color].dot }} />
                      {s.name} · {s.durationMin} min
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Horário</Label>
              <Select value={time} onValueChange={setTime} disabled={slots.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={slots.length === 0 ? 'Sem horários livres' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {service && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Duração estimada: {service.durationMin} min · horários em blocos de 15 min
            </p>
          )}

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as AppointmentStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STATUS_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: primeira consulta, paciente com receio de dental..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {editing && editing.status !== 'cancelado' && (
            <Button
              variant="outline"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={() => {
                onCancelAppointment(editing.id);
                onOpenChange(false);
              }}
            >
              Cancelar agendamento
            </Button>
          )}
          {editing && editing.status === 'cancelado' && (
            <Button
              variant="outline"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={() => {
                onHardDelete(editing.id);
                onOpenChange(false);
              }}
            >
              Excluir definitivamente
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Descartar
          </Button>
          <Button onClick={handleSave}>{editing ? 'Salvar alterações' : 'Criar agendamento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}