import AsyncStorage from '@react-native-async-storage/async-storage';
import { Training } from '../types';
import { STORAGE_KEYS } from '../constants/reglement';

const KEY = STORAGE_KEYS.TRAININGS;

export const ladeTrainings = async (): Promise<Training[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  const trainings: Training[] = raw ? JSON.parse(raw) : [];
  return trainings.sort((a, b) => b.datum.localeCompare(a.datum));
};

export const speichereTrainings = async (trainings: Training[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(trainings));
};

export const trainingHinzufügen = async (training: Training): Promise<void> => {
  const alle = await ladeTrainings();
  alle.push(training);
  await speichereTrainings(alle);
};

export const trainingAktualisieren = async (aktualisiert: Training): Promise<void> => {
  const alle = await ladeTrainings();
  const idx = alle.findIndex((t) => t.id === aktualisiert.id);
  if (idx !== -1) {
    alle[idx] = aktualisiert;
    await speichereTrainings(alle);
  }
};

export const trainingLöschen = async (id: string): Promise<void> => {
  const alle = await ladeTrainings();
  await speichereTrainings(alle.filter((t) => t.id !== id));
};

export const findeTrainingNachId = async (id: string): Promise<Training | null> => {
  const alle = await ladeTrainings();
  return alle.find((t) => t.id === id) ?? null;
};
