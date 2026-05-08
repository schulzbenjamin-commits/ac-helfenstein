import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fahrer } from '../types';
import { STORAGE_KEYS } from '../constants/reglement';

const KEY = STORAGE_KEYS.FAHRER;

export const ladeFahrer = async (): Promise<Fahrer[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

export const speichereFahrer = async (fahrer: Fahrer[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(fahrer));
};

export const fahrerHinzufügen = async (neuerFahrer: Fahrer): Promise<void> => {
  const alle = await ladeFahrer();
  alle.push(neuerFahrer);
  await speichereFahrer(alle);
};

export const fahrerAktualisieren = async (aktualisiert: Fahrer): Promise<void> => {
  const alle = await ladeFahrer();
  const idx = alle.findIndex((f) => f.id === aktualisiert.id);
  if (idx !== -1) {
    alle[idx] = aktualisiert;
    await speichereFahrer(alle);
  }
};

export const fahrerLöschen = async (id: string): Promise<void> => {
  const alle = await ladeFahrer();
  await speichereFahrer(alle.filter((f) => f.id !== id));
};

export const findefahrerNachId = async (id: string): Promise<Fahrer | null> => {
  const alle = await ladeFahrer();
  return alle.find((f) => f.id === id) ?? null;
};

// Prüft ob ein Fahrer mit gleichem Namen + Geburtsdatum bereits existiert
export const findeKonflikt = (
  alle: Fahrer[],
  vorname: string,
  nachname: string,
  geburtsdatum: string
): Fahrer | null => {
  return (
    alle.find(
      (f) =>
        f.vorname.toLowerCase() === vorname.toLowerCase() &&
        f.nachname.toLowerCase() === nachname.toLowerCase() &&
        f.geburtsdatum === geburtsdatum
    ) ?? null
  );
};
