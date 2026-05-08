import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Training, Fahrer, Lauf } from '../../types';
import { TrainingStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { findeTrainingNachId } from '../../storage/trainingStorage';
import { ladeFahrer } from '../../storage/fahrerStorage';
import { ladeLäufeVonTraining } from '../../storage/laufStorage';
import { KlassenBadge } from '../../components/KlassenBadge';
import { ZeitAnzeige } from '../../components/ZeitAnzeige';
import { formatDatum } from '../../utils/zeitFormatierung';

type Nav = StackNavigationProp<TrainingStackParamList, 'TrainingDetail'>;
type Route = RouteProp<TrainingStackParamList, 'TrainingDetail'>;

interface Props {
  navigation: Nav;
  route: Route;
}

export const TrainingDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trainingId } = route.params;
  const [training, setTraining] = useState<Training | null>(null);
  const [fahrer, setFahrer] = useState<Fahrer[]>([]);
  const [läufe, setLäufe] = useState<Lauf[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [trainingId])
  );

  const laden = async () => {
    setLoading(true);
    const [t, alleFahrer, alleLäufe] = await Promise.all([
      findeTrainingNachId(trainingId),
      ladeFahrer(),
      ladeLäufeVonTraining(trainingId),
    ]);
    setTraining(t);
    if (t) {
      setFahrer(alleFahrer.filter((f) => t.teilnehmerIds.includes(f.id)));
    }
    setLäufe(alleLäufe);
    setLoading(false);
  };

  const findeLauf = (fahrerId: string, laufNummer: number): Lauf | undefined =>
    läufe.find((l) => l.fahrerId === fahrerId && l.laufNummer === laufNummer);

  if (loading || !training) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={Colors.adacGelb} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header-Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.trainingsName}>{training.name}</Text>
          <Text style={styles.trainingsDetail}>
            {formatDatum(training.datum)}{training.ort ? ` · ${training.ort}` : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.rennButton}
            onPress={() => navigation.navigate('Rennmodus', { trainingId })}
          >
            <Ionicons name="play" size={18} color={Colors.textPrimär} />
            <Text style={styles.rennButtonText}>Rennmodus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ergebnisButton}
            onPress={() => navigation.navigate('Ergebnisliste', { trainingId })}
          >
            <Ionicons name="podium-outline" size={18} color={Colors.textHell} />
            <Text style={styles.ergebnisButtonText}>Ergebnisse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('TrainingErstellen', { trainingId })}
          >
            <Ionicons name="pencil" size={18} color={Colors.textPrimär} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lauf-Matrix */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInhalt}>
        <Text style={styles.sectionTitel}>Lauf-Übersicht</Text>

        {fahrer.length === 0 ? (
          <View style={styles.leer}>
            <Text style={styles.leerText}>Keine Teilnehmer für dieses Training</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Tabellen-Header */}
              <View style={styles.tabelleHeader}>
                <View style={styles.fahrerSpalte}>
                  <Text style={styles.headerZelle}>Fahrer</Text>
                </View>
                {training.laufTypen.map((typ, idx) => (
                  <View key={idx} style={styles.zeitSpalte}>
                    <Text style={styles.headerZelle}>
                      L{idx + 1}
                    </Text>
                    <Text style={styles.laufTypLabel}>{typ === 'training' ? 'Tr' : 'W'}</Text>
                  </View>
                ))}
                <View style={styles.gesamtSpalte}>
                  <Text style={styles.headerZelle}>Gesamt</Text>
                </View>
              </View>

              {/* Fahrer-Zeilen */}
              {fahrer.map((f, fIdx) => {
                const wertungsLäufe = läufe.filter(
                  (l) => l.fahrerId === f.id && l.laufTyp === 'wertung' && l.status === 'gefahren'
                );
                const gesamtWertung = wertungsLäufe.reduce(
                  (sum, l) => sum + (l.gesamtzeit ?? 0), 0
                );
                const hatWertung = wertungsLäufe.length > 0;

                return (
                  <View
                    key={f.id}
                    style={[styles.tabelleZeile, fIdx % 2 === 0 && styles.tabelleZeileGerade]}
                  >
                    <View style={styles.fahrerSpalte}>
                      <Text style={styles.fahrerName} numberOfLines={1}>
                        {f.vorname} {f.nachname}
                      </Text>
                      <KlassenBadge klasse={f.klasse} />
                    </View>
                    {training.laufTypen.map((_, laufIdx) => {
                      const lauf = findeLauf(f.id, laufIdx + 1);
                      return (
                        <View key={laufIdx} style={styles.zeitSpalte}>
                          {!lauf || lauf.status === 'offen' ? (
                            <Text style={styles.keineLaufText}>–</Text>
                          ) : lauf.status === 'dns' || lauf.status === 'dsq' ? (
                            <Text style={[styles.statusText, { color: Colors.fehler }]}>
                              {lauf.status.toUpperCase()}
                            </Text>
                          ) : (
                            <View>
                              <ZeitAnzeige ms={lauf.rohzeit} style={styles.rohzeit} />
                              {berechneStrafAnzeige(lauf) > 0 && (
                                <Text style={styles.strafAnzeige}>
                                  +{berechneStrafAnzeige(lauf) / 1000}s
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <View style={styles.gesamtSpalte}>
                      {hatWertung ? (
                        <ZeitAnzeige ms={gesamtWertung} style={styles.gesamtZeit} />
                      ) : (
                        <Text style={styles.keineLaufText}>–</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {läufe.length === 0 && fahrer.length > 0 && (
          <View style={styles.hinweisBox}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.info} />
            <Text style={styles.hinweisText}>
              Noch keine Läufe erfasst. Starte den Rennmodus um Zeiten zu erfassen.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const berechneStrafAnzeige = (lauf: Lauf): number => {
  return lauf.strafzeiten.reduce((sum, s) => sum + s.sekunden * s.anzahl * 1000, 0);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.hintergrundHell,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
    gap: 12,
  },
  trainingsName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimär },
  trainingsDetail: { fontSize: 15, color: Colors.textSekundär, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rennButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.adacGelb,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  rennButtonText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimär },
  ergebnisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.hintergrundDunkel,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  ergebnisButtonText: { fontSize: 15, fontWeight: '700', color: Colors.textHell },
  editButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.hintergrundGrau,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollInhalt: { padding: 16, gap: 12 },
  sectionTitel: { fontSize: 18, fontWeight: '700', color: Colors.textPrimär },
  tabelleHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.hintergrundDunkel,
    borderRadius: 8,
    paddingVertical: 8,
  },
  tabelleZeile: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
    backgroundColor: Colors.hintergrundHell,
  },
  tabelleZeileGerade: { backgroundColor: '#FAFAFA' },
  fahrerSpalte: {
    width: 160,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zeitSpalte: { width: 90, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  gesamtSpalte: { width: 110, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  headerZelle: { color: Colors.textHell, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  laufTypLabel: { color: Colors.adacGelb, fontSize: 11, textAlign: 'center', marginTop: 1 },
  fahrerName: { fontSize: 14, color: Colors.textPrimär, fontWeight: '600', flex: 1 },
  rohzeit: { fontSize: 14, color: Colors.textPrimär, textAlign: 'center' },
  strafAnzeige: { fontSize: 11, color: Colors.fehler, textAlign: 'center' },
  gesamtZeit: { fontSize: 15, fontWeight: '700', color: Colors.textPrimär },
  keineLaufText: { fontSize: 16, color: Colors.textDeaktiviert, textAlign: 'center' },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  leer: { alignItems: 'center', padding: 24 },
  leerText: { fontSize: 16, color: Colors.textDeaktiviert },
  hinweisBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.info,
  },
  hinweisText: { flex: 1, fontSize: 15, color: Colors.textPrimär },
});
