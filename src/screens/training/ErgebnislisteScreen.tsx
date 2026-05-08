import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
import { berechneStrafSummeMs } from '../../utils/strafzeitenLogik';

type Nav = StackNavigationProp<TrainingStackParamList, 'Ergebnisliste'>;
type Route = RouteProp<TrainingStackParamList, 'Ergebnisliste'>;

interface Props {
  navigation: Nav;
  route: Route;
}

interface ErgebnisZeile {
  fahrer: Fahrer;
  läufe: (Lauf | null)[];
  wertungsGesamtzeit: number | null;
  rang: number | null;
}

type KlassenFilter = 'alle' | 1 | 2 | 3 | 4 | 5;

export const ErgebnislisteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trainingId } = route.params;
  const [training, setTraining] = useState<Training | null>(null);
  const [ergebnisse, setErgebnisse] = useState<ErgebnisZeile[]>([]);
  const [klassenFilter, setKlassenFilter] = useState<KlassenFilter>('alle');
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
    if (!t) { setLoading(false); return; }
    setTraining(t);

    const teilnehmer = alleFahrer.filter((f) => t.teilnehmerIds.includes(f.id));

    const zeilen: ErgebnisZeile[] = teilnehmer.map((fahrer) => {
      const fahrerLäufe = t.laufTypen.map((_, idx) => {
        return alleLäufe.find(
          (l) => l.fahrerId === fahrer.id && l.laufNummer === idx + 1
        ) ?? null;
      });

      const wertungsLäufe = fahrerLäufe.filter(
        (l, idx) => l && t.laufTypen[idx] === 'wertung' && l.status === 'gefahren'
      );
      const wertungsGesamtzeit =
        wertungsLäufe.length > 0
          ? wertungsLäufe.reduce((sum, l) => sum + (l?.gesamtzeit ?? 0), 0)
          : null;

      return { fahrer, läufe: fahrerLäufe, wertungsGesamtzeit, rang: null };
    });

    // Rangierung: nur Fahrer mit Wertungsgesamtzeit
    const mitZeit = zeilen
      .filter((z) => z.wertungsGesamtzeit !== null)
      .sort((a, b) => a.wertungsGesamtzeit! - b.wertungsGesamtzeit!);
    const ohneZeit = zeilen.filter((z) => z.wertungsGesamtzeit === null);

    let rang = 1;
    for (const z of mitZeit) {
      z.rang = rang++;
    }

    setErgebnisse([...mitZeit, ...ohneZeit]);
    setLoading(false);
  };

  const gefilterteErgebnisse = ergebnisse.filter((e) =>
    klassenFilter === 'alle' ? true : e.fahrer.klasse === klassenFilter
  );

  if (loading || !training) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={Colors.adacGelb} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.trainingsName}>{training.name}</Text>
          <Text style={styles.trainingsDatum}>{formatDatum(training.datum)}</Text>
        </View>
        <View style={styles.headerRechts}>
          <TouchableOpacity style={styles.aktualisierenBtn} onPress={laden}>
            <Ionicons name="refresh" size={20} color={Colors.adacGelb} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterLeiste}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['alle', 1, 2, 3, 4, 5] as KlassenFilter[]).map((k) => (
            <TouchableOpacity
              key={String(k)}
              style={[styles.filterChip, klassenFilter === k && styles.filterChipAktiv]}
              onPress={() => setKlassenFilter(k)}
            >
              <Text style={[styles.filterText, klassenFilter === k && styles.filterTextAktiv]}>
                {k === 'alle' ? 'Alle Klassen' : `Klasse ${k}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Ergebnistabelle */}
      <ScrollView style={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Tabellen-Header */}
            <View style={styles.tabelleHeader}>
              <View style={styles.rangSpalte}>
                <Text style={styles.headerText}>#</Text>
              </View>
              <View style={styles.fahrerSpalte}>
                <Text style={styles.headerText}>Fahrer</Text>
              </View>
              {training.laufTypen.map((typ, idx) => (
                <View key={idx} style={styles.laufSpalte}>
                  <Text style={styles.headerText}>L{idx + 1}</Text>
                  <Text style={styles.laufTypLabel}>{typ === 'training' ? 'Tr' : 'W'}</Text>
                </View>
              ))}
              <View style={styles.gesamtSpalte}>
                <Text style={styles.headerText}>Gesamt</Text>
              </View>
            </View>

            {/* Ergebnis-Zeilen */}
            {gefilterteErgebnisse.length === 0 ? (
              <View style={styles.leer}>
                <Text style={styles.leerText}>Keine Ergebnisse in dieser Klasse</Text>
              </View>
            ) : (
              gefilterteErgebnisse.map((e, idx) => (
                <View
                  key={e.fahrer.id}
                  style={[
                    styles.ergebnisZeile,
                    idx % 2 === 0 && styles.ergebnisZeileGerade,
                    e.rang === 1 && styles.ergebnisZeileErster,
                  ]}
                >
                  <View style={styles.rangSpalte}>
                    <Text style={[styles.rangText, e.rang === 1 && styles.rangTextErster]}>
                      {e.rang ?? '–'}
                    </Text>
                  </View>
                  <View style={styles.fahrerSpalte}>
                    <Text style={styles.fahrerName} numberOfLines={1}>
                      {e.fahrer.vorname} {e.fahrer.nachname}
                    </Text>
                    <KlassenBadge klasse={e.fahrer.klasse} />
                  </View>
                  {e.läufe.map((lauf, laufIdx) => (
                    <View key={laufIdx} style={styles.laufSpalte}>
                      {!lauf || lauf.status === 'offen' ? (
                        <Text style={styles.keineLaufText}>–</Text>
                      ) : lauf.status === 'dns' || lauf.status === 'dsq' ? (
                        <Text style={styles.statusText}>{lauf.status.toUpperCase()}</Text>
                      ) : (
                        <View style={styles.zeitZelle}>
                          <ZeitAnzeige ms={lauf.rohzeit} style={styles.rohzeitText} />
                          {berechneStrafSummeMs(lauf.strafzeiten) > 0 && (
                            <Text style={styles.strafText}>
                              +{berechneStrafSummeMs(lauf.strafzeiten) / 1000}s
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                  <View style={styles.gesamtSpalte}>
                    {e.wertungsGesamtzeit !== null ? (
                      <View style={styles.gesamtZeile}>
                        <ZeitAnzeige
                          ms={e.wertungsGesamtzeit}
                          style={e.rang === 1 ? styles.gesamtTextErster : styles.gesamtText}
                        />
                        {e.rang === 1 && (
                          <Ionicons name="trophy" size={16} color={Colors.adacGelb} />
                        )}
                      </View>
                    ) : (
                      <Text style={styles.keineLaufText}>–</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
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
  },
  trainingsName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimär },
  trainingsDatum: { fontSize: 15, color: Colors.textSekundär },
  headerRechts: { flexDirection: 'row', gap: 8 },
  aktualisierenBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.hintergrundDunkel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLeiste: {
    backgroundColor: Colors.hintergrundHell,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.hintergrundGrau,
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipAktiv: { backgroundColor: Colors.adacGelb },
  filterText: { fontSize: 14, color: Colors.textSekundär },
  filterTextAktiv: { color: Colors.textPrimär, fontWeight: '700' },
  scroll: { flex: 1 },
  tabelleHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.hintergrundDunkel,
    paddingVertical: 10,
  },
  ergebnisZeile: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
    backgroundColor: Colors.hintergrundHell,
    alignItems: 'center',
  },
  ergebnisZeileGerade: { backgroundColor: '#FAFAFA' },
  ergebnisZeileErster: { backgroundColor: '#FFFDE7' },
  rangSpalte: { width: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  fahrerSpalte: {
    width: 170,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  laufSpalte: { width: 100, paddingHorizontal: 6, alignItems: 'center' },
  gesamtSpalte: { width: 130, paddingHorizontal: 10, alignItems: 'center' },
  headerText: { color: Colors.textHell, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  laufTypLabel: { color: Colors.adacGelb, fontSize: 10, textAlign: 'center' },
  rangText: { fontSize: 18, fontWeight: '700', color: Colors.textSekundär },
  rangTextErster: { color: Colors.adacGelb, fontSize: 22 },
  fahrerName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimär, flexShrink: 1 },
  zeitZelle: { alignItems: 'center', gap: 2 },
  rohzeitText: { fontSize: 14, color: Colors.textPrimär },
  strafText: { fontSize: 11, color: Colors.fehler, fontWeight: '600' },
  keineLaufText: { fontSize: 14, color: Colors.textDeaktiviert },
  statusText: { fontSize: 13, color: Colors.fehler, fontWeight: '700' },
  gesamtZeile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gesamtText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimär },
  gesamtTextErster: { color: Colors.adacGelb, fontSize: 17 },
  leer: { padding: 32, alignItems: 'center' },
  leerText: { fontSize: 16, color: Colors.textDeaktiviert },
});
