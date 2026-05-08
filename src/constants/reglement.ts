import { StrafTyp } from '../types';

// ADAC Kartslalom Reglement 2026 – §9.1 Wertungsstrafen
export const STRAF_SEKUNDEN: Record<StrafTyp, number> = {
  PYLONE_UMGEWORFEN: 2,
  PYLONE_VERSCHOBEN: 2,
  AUFGABE_AUSGELASSEN: 10,
  AUFGABE_FALSCH: 10,
  HALTELINIE: 2,
};

export const STRAF_LABELS: Record<StrafTyp, string> = {
  PYLONE_UMGEWORFEN: 'Pylone umgeworfen',
  PYLONE_VERSCHOBEN: 'Pylone verschoben',
  AUFGABE_AUSGELASSEN: 'Aufgabe ausgelassen',
  AUFGABE_FALSCH: 'Aufgabe falsch',
  HALTELINIE: 'Haltelinie überfahren',
};

export const STRAF_KURZ: Record<StrafTyp, string> = {
  PYLONE_UMGEWORFEN: '+2s Pylone ↓',
  PYLONE_VERSCHOBEN: '+2s Pylone →',
  AUFGABE_AUSGELASSEN: '+10s Ausgelassen',
  AUFGABE_FALSCH: '+10s Falsch',
  HALTELINIE: '+2s Haltelinie',
};

// Max. Strafzeit pro Aufgabe (§9.1): 10 Sekunden für Pylonen-Fehler
export const MAX_STRAF_PRO_AUFGABE_MS = 10000;

// Klassen-Altersgrenzen (Jahrgangsprinzip)
export const KLASSEN_GRENZEN = [
  { klasse: 1 as const, minAlter: 7, maxAlter: 9 },
  { klasse: 2 as const, minAlter: 10, maxAlter: 11 },
  { klasse: 3 as const, minAlter: 12, maxAlter: 13 },
  { klasse: 4 as const, minAlter: 14, maxAlter: 15 },
  { klasse: 5 as const, minAlter: 16, maxAlter: 18 },
];

export const KLASSEN_ALTER_LABELS = ['7–9', '10–11', '12–13', '14–15', '16–18'];

// Standard-Wertungsmodus: 1 Training + 2 Wertungsläufe
export const DEFAULT_LAUF_TYPEN: Array<'training' | 'wertung'> = [
  'training',
  'wertung',
  'wertung',
];

// AsyncStorage-Keys
export const STORAGE_KEYS = {
  FAHRER: '@kartslalom/fahrer',
  TRAININGS: '@kartslalom/trainings',
  LAEUFE: '@kartslalom/laeufe',
  EINSTELLUNGEN: '@kartslalom/einstellungen',
};
