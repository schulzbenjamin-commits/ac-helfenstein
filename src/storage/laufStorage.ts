import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lauf } from '../types';
import { STORAGE_KEYS } from '../constants/reglement';

const KEY = STORAGE_KEYS.LAEUFE;

export const ladeLäufe = async (): Promise<Lauf[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

export const speichereLäufe = async (läufe: Lauf[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(läufe));
};

export const laufHinzufügen = async (lauf: Lauf): Promise<void> => {
  const alle = await ladeLäufe();
  alle.push(lauf);
  await speichereLäufe(alle);
};

export const laufAktualisieren = async (aktualisiert: Lauf): Promise<void> => {
  const alle = await ladeLäufe();
  const idx = alle.findIndex((l) => l.id === aktualisiert.id);
  if (idx !== -1) {
    alle[idx] = aktualisiert;
  } else {
    alle.push(aktualisiert);
  }
  await speichereLäufe(alle);
};

export const laufLöschen = async (id: string): Promise<void> => {
  const alle = await ladeLäufe();
  await speichereLäufe(alle.filter((l) => l.id !== id));
};

export const ladeLäufeVonTraining = async (trainingId: string): Promise<Lauf[]> => {
  const alle = await ladeLäufe();
  return alle.filter((l) => l.trainingId === trainingId);
};

export const ladeLäufeVonFahrer = async (fahrerId: string): Promise<Lauf[]> => {
  const alle = await ladeLäufe();
  return alle
    .filter((l) => l.fahrerId === fahrerId && l.status === 'gefahren')
    .sort((a, b) => a.erfasstAm.localeCompare(b.erfasstAm));
};

export const löscheLäufeVonTraining = async (trainingId: string): Promise<void> => {
  const alle = await ladeLäufe();
  await speichereLäufe(alle.filter((l) => l.trainingId !== trainingId));
};
