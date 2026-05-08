import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { Vereinseinstellungen } from '../types';
import { Colors } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/reglement';
import { ladeFahrer } from '../storage/fahrerStorage';
import { ladeTrainings } from '../storage/trainingStorage';
import { ladeLäufe } from '../storage/laufStorage';
import { erstelleVorlage } from '../utils/excelImport';
import { formatDatum, formatZeit } from '../utils/zeitFormatierung';

const DEFAULT_EINSTELLUNGEN: Vereinseinstellungen = {
  vereinsname: 'AC Helfenstein e.V.',
  saison: new Date().getFullYear(),
};

export const EinstellungenScreen: React.FC = () => {
  const [einstellungen, setEinstellungen] = useState<Vereinseinstellungen>(DEFAULT_EINSTELLUNGEN);
  const [loading, setLoading] = useState(true);
  const [gespeichert, setGespeichert] = useState(false);
  const [exportLäuft, setExportLäuft] = useState(false);

  useEffect(() => {
    laden();
  }, []);

  const laden = async () => {
    setLoading(true);
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EINSTELLUNGEN);
    if (raw) setEinstellungen(JSON.parse(raw));
    setLoading(false);
  };

  const speichern = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.EINSTELLUNGEN, JSON.stringify(einstellungen));
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  };

  const handleVorlagenExport = async () => {
    try {
      const wb = erstelleVorlage();
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      const uri = FileSystem.cacheDirectory + 'fahrer_vorlage.csv';
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Fahrer-Vorlage exportieren' });
      }
    } catch {
      Alert.alert('Fehler', 'Export fehlgeschlagen.');
    }
  };

  const handleDatenExport = async () => {
    setExportLäuft(true);
    try {
      const [alleFahrer, alleTrainings, alleLäufe] = await Promise.all([
        ladeFahrer(),
        ladeTrainings(),
        ladeLäufe(),
      ]);

      const wb = XLSX.utils.book_new();

      // Fahrer-Sheet
      const fahrerDaten = alleFahrer.map((f) => ({
        Vorname: f.vorname,
        Nachname: f.nachname,
        Geburtsdatum: formatDatum(f.geburtsdatum),
        Klasse: f.klasse ?? 'N/A',
        Aktiv: f.aktiv ? 'Ja' : 'Nein',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fahrerDaten), 'Fahrer');

      // Ergebnisse-Sheet
      const ergebnisDaten = alleLäufe
        .filter((l) => l.status === 'gefahren')
        .map((l) => {
          const f = alleFahrer.find((x) => x.id === l.fahrerId);
          const t = alleTrainings.find((x) => x.id === l.trainingId);
          return {
            Fahrer: f ? `${f.vorname} ${f.nachname}` : 'Unbekannt',
            Training: t?.name ?? 'Unbekannt',
            Datum: t ? formatDatum(t.datum) : '',
            Lauf: l.laufNummer,
            Typ: l.laufTyp,
            Rohzeit: l.rohzeit !== null ? formatZeit(l.rohzeit) : 'DNS',
            Strafzeit: `${l.strafzeiten.reduce((s, x) => s + x.sekunden * x.anzahl, 0)}s`,
            Gesamtzeit: l.gesamtzeit !== null ? formatZeit(l.gesamtzeit) : 'DNS',
          };
        });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ergebnisDaten), 'Ergebnisse');

      const csvInhalt = XLSX.utils.sheet_to_csv(wb.Sheets['Ergebnisse']);
      const uri = FileSystem.cacheDirectory + `kartslalom_export_${einstellungen.saison}.csv`;
      await FileSystem.writeAsStringAsync(uri, csvInhalt, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Daten exportieren' });
      }
    } catch {
      Alert.alert('Fehler', 'Export fehlgeschlagen.');
    } finally {
      setExportLäuft(false);
    }
  };

  const handleAllesLöschen = () => {
    Alert.alert(
      'Alle Daten löschen',
      'Alle Fahrer, Trainings und Läufe werden unwiderruflich gelöscht. Fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.FAHRER,
              STORAGE_KEYS.TRAININGS,
              STORAGE_KEYS.LAEUFE,
            ]);
            Alert.alert('Gelöscht', 'Alle Daten wurden gelöscht.');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={Colors.adacGelb} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt}>
      {/* Vereinseinstellungen */}
      <Text style={styles.sectionLabel}>Vereinsdaten</Text>
      <View style={styles.formKarte}>
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Vereinsname</Text>
          <TextInput
            style={styles.input}
            value={einstellungen.vereinsname}
            onChangeText={(v) => setEinstellungen((e) => ({ ...e, vereinsname: v }))}
            placeholder="AC Helfenstein e.V."
          />
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Saison</Text>
          <TextInput
            style={styles.input}
            value={String(einstellungen.saison)}
            onChangeText={(v) => {
              const jahr = parseInt(v, 10);
              if (!isNaN(jahr)) setEinstellungen((e) => ({ ...e, saison: jahr }));
            }}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.speichernButton, gespeichert && styles.speichernButtonErfolg]}
        onPress={speichern}
      >
        <Ionicons name={gespeichert ? 'checkmark' : 'save-outline'} size={20} color={Colors.textPrimär} />
        <Text style={styles.speichernText}>
          {gespeichert ? 'Gespeichert!' : 'Einstellungen speichern'}
        </Text>
      </TouchableOpacity>

      {/* Export */}
      <Text style={styles.sectionLabel}>Daten-Export</Text>
      <View style={styles.aktionenKarte}>
        <TouchableOpacity style={styles.aktionZeile} onPress={handleVorlagenExport}>
          <Ionicons name="document-text-outline" size={24} color={Colors.adacGelb} />
          <View style={styles.aktionInfo}>
            <Text style={styles.aktionTitel}>Fahrer-Vorlage exportieren</Text>
            <Text style={styles.aktionUnter}>CSV-Vorlage für Excel-Import herunterladen</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSekundär} />
        </TouchableOpacity>

        <View style={styles.trennlinie} />

        <TouchableOpacity style={styles.aktionZeile} onPress={handleDatenExport} disabled={exportLäuft}>
          {exportLäuft
            ? <ActivityIndicator color={Colors.adacGelb} />
            : <Ionicons name="cloud-download-outline" size={24} color={Colors.adacGelb} />
          }
          <View style={styles.aktionInfo}>
            <Text style={styles.aktionTitel}>Alle Ergebnisse exportieren</Text>
            <Text style={styles.aktionUnter}>Fahrer & Läufe als CSV exportieren</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSekundär} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <Text style={styles.sectionLabel}>Informationen</Text>
      <View style={styles.infoKarte}>
        <View style={styles.infoZeile}>
          <Text style={styles.infoLabel}>App-Version</Text>
          <Text style={styles.infoWert}>1.0.0</Text>
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.infoZeile}>
          <Text style={styles.infoLabel}>Reglement</Text>
          <Text style={styles.infoWert}>ADAC 2026</Text>
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.infoZeile}>
          <Text style={styles.infoLabel}>Datenspeicherung</Text>
          <Text style={styles.infoWert}>Lokal auf Gerät</Text>
        </View>
      </View>

      {/* Datenlöschung */}
      <Text style={styles.sectionLabel}>Gefahrenzone</Text>
      <TouchableOpacity style={styles.löschenButton} onPress={handleAllesLöschen}>
        <Ionicons name="trash-outline" size={20} color={Colors.textHell} />
        <Text style={styles.löschenText}>Alle App-Daten löschen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  inhalt: { padding: 20, gap: 14, paddingBottom: 48 },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSekundär,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  formKarte: { backgroundColor: Colors.hintergrundHell, borderRadius: 12, paddingHorizontal: 16 },
  feld: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 56,
  },
  feldLabel: { fontSize: 17, color: Colors.textPrimär, flex: 1 },
  input: { flex: 1, fontSize: 17, color: Colors.textPrimär, textAlign: 'right' },
  trennlinie: { height: 1, backgroundColor: Colors.trennlinie },
  speichernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.adacGelb,
    borderRadius: 12,
    height: 52,
  },
  speichernButtonErfolg: { backgroundColor: Colors.erfolg },
  speichernText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimär },
  aktionenKarte: { backgroundColor: Colors.hintergrundHell, borderRadius: 12, paddingHorizontal: 16 },
  aktionZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
    minHeight: 64,
  },
  aktionInfo: { flex: 1 },
  aktionTitel: { fontSize: 17, color: Colors.textPrimär, fontWeight: '600' },
  aktionUnter: { fontSize: 14, color: Colors.textSekundär, marginTop: 2 },
  infoKarte: { backgroundColor: Colors.hintergrundHell, borderRadius: 12, paddingHorizontal: 16 },
  infoZeile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 52,
  },
  infoLabel: { fontSize: 17, color: Colors.textPrimär },
  infoWert: { fontSize: 17, color: Colors.textSekundär },
  löschenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.fehler,
    borderRadius: 12,
    height: 52,
  },
  löschenText: { fontSize: 17, fontWeight: '700', color: Colors.textHell },
});
