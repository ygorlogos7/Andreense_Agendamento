import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DAY_NAMES, toMin } from '@/lib/store';
import type { WeeklyConfig } from '@/lib/store';

interface AvailabilityPanelProps {
  weekly: WeeklyConfig;
  onChange: (w: WeeklyConfig) => void;
}

export default function AvailabilityPanel({ weekly, onChange }: AvailabilityPanelProps) {
  const updateDay = (i: number, patch: Partial<WeeklyConfig[number]>) => {
    const next = weekly.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    const h = next[i];
    if (h.enabled && toMin(h.start) >= toMin(h.end)) {
      toast.error('O horário de início deve ser antes do término.');
      return;
    }
    onChange(next);
  };

  const copyToWeekdays = () => {
    const mon = weekly[0];
    onChange(weekly.map((d, i) => (i >= 1 && i <= 4 ? { ...mon } : d)));
    toast.success('Horários de segunda aplicados aos dias úteis.');
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Horários de atendimento</h2>
          <p className="text-sm text-muted-foreground">
            Defina os dias e horários disponíveis da semana. A agenda considera esses horários para oferecer slots livres.
          </p>
        </div>
        <Button variant="outline" onClick={copyToWeekdays}>
          Copiar segunda para dias úteis
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {weekly.map((h, i) => (
          <div
            key={i}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${i > 0 ? 'border-t' : ''}`}
          >
            <div className="flex w-36 items-center gap-3">
              <Switch
                id={`day-${i}`}
                checked={h.enabled}
                onCheckedChange={(v) => updateDay(i, { enabled: v })}
              />
              <Label htmlFor={`day-${i}`} className="cursor-pointer font-medium">
                {DAY_NAMES[i]}
              </Label>
            </div>

            {h.enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={h.start}
                  onChange={(e) => updateDay(i, { start: e.target.value })}
                  className="h-9 w-28 tabular-nums"
                  aria-label={`Início ${DAY_NAMES[i]}`}
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="time"
                  value={h.end}
                  onChange={(e) => updateDay(i, { end: e.target.value })}
                  className="h-9 w-28 tabular-nums"
                  aria-label={`Término ${DAY_NAMES[i]}`}
                />
              </div>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Fechado
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        As alterações são salvas automaticamente neste navegador e valem para todas as semanas.
      </p>
    </div>
  );
}