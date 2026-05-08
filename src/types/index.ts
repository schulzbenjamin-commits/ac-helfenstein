export interface Fahrer {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string; // ISO-8601: "YYYY-MM-DD"
  geburtsjahr: number;
  klasse: 1 | 2 | 3 | 4 | 5 | null;
  aktiv: boolean;
  notizen?: string;
  erstelltAm: string;
}

export type StrafTyp =
  | 'PYLONE_UMGEWORFEN'
  | 'PYLONE_VERSCHOBEN'
  | 'AUFGABE_AUSGELASSEN'
  | 'AUFGABE_FALSCH'
  | 'HALTELINIE';

export interface Strafzeit {
  typ: StrafTyp;
  sekunden: number;
  anzahl: number;
}

export interface Lauf {
  id: string;
  fahrerId: string;
  trainingId: string;
  laufNummer: number;
  laufTyp: 'training' | 'wertung';
  rohzeit: number | null; // ms
  strafzeiten: Strafzeit[];
  gesamtzeit: number | null; // ms
  status: 'offen' | 'gefahren' | 'dsq' | 'dns';
  erfasstAm: string;
  erfasstPer: 'stoppuhr' | 'manuell';
}

export interface Training {
  id: string;
  name: string;
  datum: string; // ISO-8601: "YYYY-MM-DD"
  ort?: string;
  anzahlLauefe: number;
  laufTypen: Array<'training' | 'wertung'>;
  teilnehmerIds: string[];
  notizen?: string;
  erstelltAm: string;
}

export interface Vereinseinstellungen {
  vereinsname: string;
  saison: number;
}

// Navigation param types
export type FahrerStackParamList = {
  FahrerListe: undefined;
  FahrerDetail: { fahrerId: string };
  FahrerBearbeiten: { fahrerId?: string };
};

export type TrainingStackParamList = {
  TrainingListe: undefined;
  TrainingDetail: { trainingId: string };
  TrainingErstellen: { trainingId?: string };
  Rennmodus: { trainingId: string };
  Ergebnisliste: { trainingId: string };
};

export type AnalyseStackParamList = {
  Analyse: undefined;
};

export type EinstellungenStackParamList = {
  Einstellungen: undefined;
};
