import { Strafzeit, StrafTyp } from '../types';
import { STRAF_SEKUNDEN, MAX_STRAF_PRO_AUFGABE_MS } from '../constants/reglement';

// Pylonen-Fehler unterliegen dem 10s-Cap pro Aufgabe
const PYLONEN_TYPEN: StrafTyp[] = ['PYLONE_UMGEWORFEN', 'PYLONE_VERSCHOBEN'];

export const berechneStrafSummeMs = (strafzeiten: Strafzeit[]): number => {
  let pylonSummeMs = 0;
  let sonstigeSummeMs = 0;

  for (const s of strafzeiten) {
    const betragMs = s.sekunden * s.anzahl * 1000;
    if (PYLONEN_TYPEN.includes(s.typ)) {
      pylonSummeMs += betragMs;
    } else {
      sonstigeSummeMs += betragMs;
    }
  }

  // Cap für Pylonen-Fehler
  const pylonGekappt = Math.min(pylonSummeMs, MAX_STRAF_PRO_AUFGABE_MS);
  return pylonGekappt + sonstigeSummeMs;
};

export const berechneGesamtzeit = (
  rohzeit: number | null,
  strafzeiten: Strafzeit[]
): number | null => {
  if (rohzeit === null) return null;
  return rohzeit + berechneStrafSummeMs(strafzeiten);
};

export const initialStrafzeiten = (): Strafzeit[] =>
  (['PYLONE_UMGEWORFEN', 'PYLONE_VERSCHOBEN', 'AUFGABE_AUSGELASSEN', 'AUFGABE_FALSCH', 'HALTELINIE'] as StrafTyp[]).map(
    (typ) => ({
      typ,
      sekunden: STRAF_SEKUNDEN[typ],
      anzahl: 0,
    })
  );

export const istPylonCapErreicht = (strafzeiten: Strafzeit[]): boolean => {
  const pylonSummeMs = strafzeiten
    .filter((s) => PYLONEN_TYPEN.includes(s.typ))
    .reduce((sum, s) => sum + s.sekunden * s.anzahl * 1000, 0);
  return pylonSummeMs >= MAX_STRAF_PRO_AUFGABE_MS;
};
