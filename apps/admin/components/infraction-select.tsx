import { CHARTER_SANCTIONS, INFRACTIONS } from '@kle/shared';
import { input } from './ui';

/** Infractions de la charte ; la sanction suit l'échelle prévue (suspension et bannissement : superviseur). */
export function InfractionSelect({ defaultValue, optional = false }: { defaultValue?: string; optional?: boolean }) {
  return (
    <select name="infraction" className={input} defaultValue={defaultValue ?? ''}>
      {optional && <option value="">Infraction correspondant au motif</option>}
      {INFRACTIONS.map((i) => (
        <option key={i} value={i}>
          {CHARTER_SANCTIONS[i].label}
          {CHARTER_SANCTIONS[i].defined ? '' : ' (sanction à confirmer)'}
        </option>
      ))}
    </select>
  );
}
