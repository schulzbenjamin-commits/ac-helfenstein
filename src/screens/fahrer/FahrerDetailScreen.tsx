import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fahrer, Lauf, Training } from '../../types';
import { FahrerStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { findefahrerNachId, fahrerLöschen } from '../../storage/fahrerStorage';
import { ladeLäufeVonFahrer } from '../../storage/laufStorage';
import { findeTrainingNachId } from '../../storage/trainingStorage';
import { KlassenBadge } from '../../components/KlassenBadge';
import { ZeitAnzeige } from '../../components/ZeitAnzeige';
import { klassenLabel } from '../../utils/klassenBerechnung';
import { formatDatum } from '../../utils/zeitFormatierung';

type Nav = StackNavigationProp<FahrerStackParamList, 'FahrerDetail'>;
type Route = RouteProp<FahrerStackParamList, 'FahrerDetail'>;

interface Props {
  navigation: Nav;
  route: Route;
}

interface LaufMitTraining {
  lauf: Lauf;
  training: Training | null;
}

export const FahrerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { fahrerId } = route.params;
  const [fahrer, setFahrer] = useState<Fahrer | null>(null);
  const [läufe, setLäufe] = useState<LaufMitTraining[]>([]);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [fahrerId])
  );

  const laden = async () => {
    const f = await findefahrerNachId(fahrerId);
    if (!f) return;
    setFahrer(f);

    const rohe = await ladeLäufeVonFahrer(fahrerId);
    const mitTraining: LaufMitTraining[] = await Promise.all(
      rohe.map(async (l) => ({
        lauf: l,
        training: await findeTrainingNachId(l.trainingId),
      }))
    );
    setLäufe(mitTraining.reverse());
  };

  const handleLöschen = () => {
    Alert.alert(
      'Fahrer löschen',
      `${fahrer?.vorname} ${fahrer?.nachname} wirklich löschen? Alle zugehörigen Läufe bleiben erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await fahrerLöschen(fahrerId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!fahrer) return null;

  const besteLaufzeit = läufe
    .map((l) => l.lauf.gesamtzeit)
    .filter((z): z is number => z !== null)
    .sort((a, b) => a - b)[0] ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{fahrer.vorname} {fahrer.nachname}</Text>
          <Text style={styles.geburtstag}>
            Geb.: {formatDatum(fahrer.geburtsdatum)} (Jg. {fahrer.geburtsjahr})
          </Text>
          <Text style={styles.klassenLabel}>{klassenLabel(fahrer.klasse)}</Text>
        </View>
        <KlassenBadge klasse={fahrer.klasse} groß />
      </View>

      {/* Statistik-Karten */}
      <View style={styles.statistiken}>
        <View style={styles.statKarte}>
          <Text style={styles.statZahl}>{läufe.filter((l) => l.lauf.status === 'gefahren').length}</Text>
          <Text style={styles.statLabel}>Läufe gefahren</Text>
        </View>
        <View style={styles.statKarte}>
          <ZeitAnzeige ms={besteLaufzeit} style={styles.statZahl} />
          <Text style={styles.statLabel}>Beste Gesamtzeit</Text>
        </View>
        <View style={styles.statKarte}>
          <Text style={[styles.statZahl, !fahrer.aktiv && { color: Colors.fehler }]}>
            {fahrer.aktiv ? 'Aktiv' : 'Inaktiv'}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {fahrer.notizen && (
        <View style={styles.notizen}>
          <Text style={styles.notizenLabel}>Notizen</Text>
          <Text style={styles.notizenText}>{fahrer.notizen}</Text>
        </View>
      )}

      {/* Zeitverlauf */}
      <Text style={styles.sectionTitel}>Läufe ({läufe.length})</Text>
      {läufe.length === 0 ? (
        <View style={styles.leer}>
          <Text style={styles.leerText}>Noch keine Läufe erfasst</Text>
        </View>
      ) : (
        läufe.map(({ lauf, training }) => (
          <View key={lauf.id} style={styles.laufZeile}>
            <View style={styles.laufInfo}>
              <Text style={styles.laufTraining} numberOfLines={1}>
                {training?.name ?? 'Unbekanntes Training'}
              </Text>
              <Text style={styles.laufDatum}>
                {training ? formatDatum(training.datum) : '–'} · Lauf {lauf.laufNummer} ({lauf.laufTyp})
              </Text>
            </View>
            <View style={styles.laufZeit}>
              {lauf.status === 'gefahren' ? (
                <ZeitAnzeige ms={lauf.gesamtzeit} style={styles.zeitText} />
              ) : (
                <Text style={styles.statusText}>{lauf.status.toUpperCase()}</Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Aktions-Buttons */}
      <View style={styles.aktionen}>
        <TouchableOpacity
          style={styles.bearbeitenButton}
          onPress={() => navigation.navigate('FahrerBearbeiten', { fahrerId })}
        >
          <Ionicons name="pencil" size={20} color={Colors.textPrimär} />
          <Text style={styles.bearbeitenText}>Bearbeiten</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.löschenButton} onPress={handleLöschen}>
          <Ionicons name="trash-outline" size={20} color={Colors.textHell} />
          <Text style={styles.löschenText}>Löschen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  inhalt: { padding: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  headerInfo: { flex: 1 },
  name: { fontSize: 26, fontWeight: '800', color: Colors.textPrimär },
  geburtstag: { fontSize: 16, color: Colors.textSekundär, marginTop: 4 },
  klassenLabel: { fontSize: 15, color: Colors.textSekundär, marginTop: 4 },
  statistiken: { flexDirection: 'row', gap: 12 },
  statKarte: {
    flex: 1,
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statZahl: { fontSize: 22, fontWeight: '800', color: Colors.textPrimär },
  statLabel: { fontSize: 13, color: Colors.textSekundär, textAlign: 'center' },
  notizen: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 16,
  },
  notizenLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSekundär, marginBottom: 4 },
  notizenText: { fontSize: 16, color: Colors.textPrimär },
  sectionTitel: { fontSize: 20, fontWeight: '700', color: Colors.textPrimär, marginTop: 8 },
  leer: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  leerText: { fontSize: 16, color: Colors.textDeaktiviert },
  laufZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  laufInfo: { flex: 1 },
  laufTraining: { fontSize: 16, fontWeight: '600', color: Colors.textPrimär },
  laufDatum: { fontSize: 14, color: Colors.textSekundär, marginTop: 2 },
  laufZeit: { alignItems: 'flex-end' },
  zeitText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimär },
  statusText: { fontSize: 16, fontWeight: '700', color: Colors.fehler },
  aktionen: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 32 },
  bearbeitenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.adacGelb,
    borderRadius: 10,
    height: 52,
  },
  bearbeitenText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimär },
  löschenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.fehler,
    borderRadius: 10,
    paddingHorizontal: 20,
    height: 52,
  },
  löschenText: { fontSize: 17, fontWeight: '700', color: Colors.textHell },
});
