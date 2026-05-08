import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Fahrer } from '../types';
import { berechneKlasse, geburtsdatumZuJahr } from './klassenBerechnung';
import { parseDatum } from './zeitFormatierung';
import { v4 as uuidv4 } from 'uuid';

export interface ImportZeile {
  zeile: number;
  vorname: string;
  nachname: string;
  geburtsdatum: string; // "YYYY-MM-DD"
  geburtsjahr: number;
  klasse: 1 | 2 | 3 | 4 | 5 | null;
  fehler: string[];
  gültig: boolean;
}

export interface ImportErgebnis {
  zeilen: ImportZeile[];
  fehlerAnzahl: number;
}

const normalizeGeburtsdatum = (raw: unknown): string | null => {
  if (!raw) return null;
  const str = String(raw).trim();

  // DD.MM.YYYY
  const de = parseDatum(str);
  if (de) return de;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Excel-Seriennummer
  if (!isNaN(Number(str))) {
    const date = XLSX.SSF.parse_date_code(Number(str));
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
};

export const parseExcelDatei = (workbook: XLSX.WorkBook): ImportErgebnis => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const zeilen: ImportZeile[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fehler: string[] = [];

    const vorname = String(row['Vorname'] ?? row['vorname'] ?? '').trim();
    const nachname = String(row['Nachname'] ?? row['nachname'] ?? '').trim();
    const geburtsdatumRaw = row['Geburtsdatum'] ?? row['geburtsdatum'] ?? '';

    if (!vorname) fehler.push('Vorname fehlt');
    if (!nachname) fehler.push('Nachname fehlt');

    const geburtsdatum = normalizeGeburtsdatum(geburtsdatumRaw);
    if (!geburtsdatum) {
      fehler.push(`Ungültiges Geburtsdatum: "${geburtsdatumRaw}"`);
    }

    const geburtsjahr = geburtsdatum ? geburtsdatumZuJahr(geburtsdatum) : 0;
    const klasse = geburtsdatum ? berechneKlasse(geburtsjahr) : null;

    if (geburtsdatum && !klasse) {
      fehler.push('Fahrer nicht startberechtigt (Alter außerhalb 7–18)');
    }

    zeilen.push({
      zeile: i + 2,
      vorname,
      nachname,
      geburtsdatum: geburtsdatum ?? '',
      geburtsjahr,
      klasse,
      fehler,
      gültig: fehler.length === 0,
    });
  }

  return {
    zeilen,
    fehlerAnzahl: zeilen.filter((z) => !z.gültig).length,
  };
};

export const importZeileZuFahrer = (zeile: ImportZeile): Fahrer => ({
  id: uuidv4(),
  vorname: zeile.vorname,
  nachname: zeile.nachname,
  geburtsdatum: zeile.geburtsdatum,
  geburtsjahr: zeile.geburtsjahr,
  klasse: zeile.klasse,
  aktiv: true,
  erstelltAm: new Date().toISOString(),
});

export const öffneExcelDatei = async (): Promise<XLSX.WorkBook | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const uri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return XLSX.read(base64, { type: 'base64' });
};

// Erzeugt eine Vorlage-Arbeitsmappe
export const erstelleVorlage = (): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Vorname', 'Nachname', 'Geburtsdatum'],
    ['Max', 'Mustermann', '15.03.2016'],
    ['Lisa', 'Schmidt', '22.07.2014'],
    ['Tom', 'Klein', '01.01.2018'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Fahrer');
  return wb;
};
