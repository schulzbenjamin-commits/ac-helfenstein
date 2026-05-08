// AC Helfenstein Kartslalom – Styleguide Farben
export const Colors = {
  // Primär
  adacGelb: '#FFD700',
  adacGelbDunkel: '#E6C200',

  // Hintergründe
  hintergrundHell: '#FFFFFF',
  hintergrundGrau: '#F5F5F5',
  hintergrundDunkel: '#1A1A1A',   // Rennmodus
  hintergrundKarte: '#FFFFFF',

  // Text
  textPrimär: '#1A1A1A',
  textSekundär: '#666666',
  textHell: '#FFFFFF',
  textDeaktiviert: '#AAAAAA',

  // Status & Feedback
  fehler: '#E53E3E',
  warnung: '#F6AD55',
  erfolg: '#48BB78',
  info: '#4299E1',

  // Stoppuhr
  stoppuhrStart: '#48BB78',       // Grün
  stoppuhrStopp: '#E53E3E',       // Rot
  stoppuhrReset: '#A0AEC0',

  // Strafen (Buttons)
  strafePylone: '#ED8936',        // Orange
  strafeAufgabe: '#E53E3E',       // Rot
  strafeHaltelinie: '#9F7AEA',    // Lila

  // Klassen-Badges
  klasseKolors: ['#E53E3E', '#ED8936', '#48BB78', '#4299E1', '#9F7AEA'] as string[],

  // UI
  trennlinie: '#E2E8F0',
  schatten: '#00000020',
  overlay: '#00000060',

  // Tab-Bar
  tabAktiv: '#FFD700',
  tabInaktiv: '#A0AEC0',
  tabHintergrund: '#FFFFFF',

  // Rennmodus spezifisch
  rennmodusPanel: '#2D2D2D',
  rennmodusText: '#FFFFFF',
  rennmodusZeit: '#FFD700',
};

export const klasseZuFarbe = (klasse: number | null): string => {
  if (!klasse) return Colors.textDeaktiviert;
  return Colors.klasseKolors[klasse - 1];
};
