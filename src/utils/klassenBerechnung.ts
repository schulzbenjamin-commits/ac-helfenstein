import { KLASSEN_GRENZEN, KLASSEN_ALTER_LABELS } from '../constants/reglement';

export const berechneKlasse = (geburtsjahr: number): 1 | 2 | 3 | 4 | 5 | null => {
  const aktuellesJahr = new Date().getFullYear();
  const alter = aktuellesJahr - geburtsjahr;
  for (const { klasse, minAlter, maxAlter } of KLASSEN_GRENZEN) {
    if (alter >= minAlter && alter <= maxAlter) return klasse;
  }
  return null;
};

export const klassenLabel = (klasse: number | null): string => {
  if (!klasse) return 'Nicht startberechtigt';
  return `Klasse ${klasse} (${KLASSEN_ALTER_LABELS[klasse - 1]} Jahre)`;
};

export const klassenKurzLabel = (klasse: number | null): string => {
  if (!klasse) return '—';
  return `K${klasse}`;
};

export const geburtsdatumZuJahr = (geburtsdatum: string): number => {
  return parseInt(geburtsdatum.substring(0, 4), 10);
};
