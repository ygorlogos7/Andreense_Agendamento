import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { SERVICE_COLORS, uid } from '@/lib/store';
import type { Service, ServiceColor } from '@/lib/store';

interface ServicesPanelProps {
  services: Service[];
  onSave: (s: Service) => void;
  onDelete: (id: string) => void;
}

const COLOR_KEYS = Object.keys(SERVICE_COLORS) as ServiceColor[];

export default function ServicesPanel({ services, onSave, onDelete }: ServicesPanelProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [color, setColor] = useState<ServiceColor>('teal');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDuration(String(editing.durationMin));
      setColor(editing.color);
      setDescription(editing.description ?? '');
    } else {
      setName('');
      setDuration('30');
      setColor(COLOR_KEYS[services.length % COLOR_KEYS.length]);
      setDescription('');
    }
  }, [open, editing, services.length]);

  const handleSave = () => {
    const dur = Number(duration);
    if (!name.trim()) {
      toast.error('Informe o nome do serviço.');
      return;
    }
    if (!dur || dur < 5 || dur > 480) {
      toast.error('A duração deve ser entre 5 e 480 minutos.');
      return;
    }
    onSave({
      id: editing?.id ?? uid(),
      name: name.trim(),
      durationMin: dur,
      color,
      description: description.trim() || undefined,
    });
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Serviços da clínica</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os procedimentos odontológicos, a duração de cada um e a cor usada na agenda.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">Nenhum serviço cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os procedimentos para poder agendá-los na agenda.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Cadastrar primeiro serviço
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const c = SERVICE_COLORS[s.color];
            return (
              <div key={s.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{s.name}</p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Editar ${s.name}`}
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Excluir ${s.name}`}
                        onClick={() => onDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.description ?? 'Sem descrição'}</p>
                  <span
                    className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {s.durationMin} min
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
            <DialogDescription>Defina o nome, a duração padrão e a cor do procedimento.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="svcName">Nome do serviço</Label>
              <Input
                id="svcName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Aplicação de flúor"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svcDur">Duração (minutos)</Label>
              <Input
                id="svcDur"
                type="number"
                min={5}
                max={480}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Cor na agenda</Label>
              <div className="flex gap-2">
                {COLOR_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={`Cor ${k}`}
                    onClick={() => setColor(k)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === k ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: SERVICE_COLORS[k].dot }}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svcDesc">Descrição</Label>
              <Textarea
                id="svcDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: procedimento preventivo de rotina"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Descartar
            </Button>
            <Button onClick={handleSave}>{editing ? 'Salvar alterações' : 'Cadastrar serviço'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}