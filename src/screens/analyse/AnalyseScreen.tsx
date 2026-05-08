import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fahrer, Lauf, Training } from '../../types';
import { Colors } from '../../constants/colors';
import { ladeFahrer } from '../../storage/fahrerStorage';
import { ladeTrainings } from '../../storage/trainingStorage';
import { ladeLäufe } from '../../storage/laufStorage';
import { ZeitlinienDiagramm, DiagrammDatenreihe, farbeNachIndex } from '../../components/ZeitlinienDiagramm';
import { ZeitAnzeige } from '../../components/ZeitAnzeige';
import { formatDatum } from '../../utils/zeitFormatierung';

type KlassenFilter = 'alle' | 1 | 2 | 3 | 4 | 5;

interface FahrerStatistik {
  fahrer: Fahrer;
  durchschnitt: number | null;
  beste: number | null;
  schlechteste: number | null;
  trend: '↗' | '↘' | '→' | null;
  deltaBeste: number | null;
}

export const AnalyseScreen: React.FC = () => {
  const [fahrer, setFahrer] = useState<Fahrer[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [läufe, setLäufe] = useState<Lauf[]>([]);
  const [loading, setLoading] = useState(true);

  const [klassenFilter, setKlassenFilter] = useState<KlassenFilter>('alle');
  const [ausgewählteFahrerIds, setAusgewählteFahrerIds] = useState<Set<string>>(new Set());
  const [maxFahrer] = useState(8);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [])
  );

  const laden = async () => {
    setLoading(true);
    const [alleFahrer, alleTrainings, alleLäufe] = await Promise.all([
      ladeFahrer(),
      ladeTrainings(),
      ladeLäufe(),
    ]);
    setFahrer(alleFahrer);
    setTrainings(alleTrainings.reverse()); // chronologisch aufsteigend
    setLäufe(alleLäufe);
    setLoading(false);
  };

  const toggleFahrer = (id: string) => {
    setAusgewählteFahrerIds((prev) => {
      const neu = new Set(prev);
      if (neu.has(id)) {
        neu.delete(id);
      } else if (neu.size < maxFahrer) {
        neu.add(id);
      }
      return neu;
    });
  };

  const gefilterteFahrer = fahrer.filter((f) =>
    klassenFilter === 'alle' ? true : f.klasse === klassenFilter
  );

  const diagrammLabels = trainings.map((t) => formatDatum(t.datum));

  const diagrammReihen: DiagrammDatenreihe[] = Array.from(ausgewählteFahrerIds)
    .map((fid, idx) => {
      const f = fahrer.find((x) => x.id === fid);
      if (!f) return null;

      const punkte = trainings.map((t) => {
        const wertungsLäufe = läufe.filter(
          (l) =>
            l.fahrerId === fid &&
            l.trainingId === t.id &&
            l.laufTyp === 'wertung' &&
            l.status === 'gefahren' &&
            l.gesamtzeit !== null
        );
        if (wertungsLäufe.length === 0) return null;
        const summe = wertungsLäufe.reduce((s, l) => s + (l.gesamtzeit ?? 0), 0);
        return { datum: t.datum, ms: summe };
      }).filter((p): p is { datum: string; ms: number } => p !== null);

      return {
        fahrerId: fid,
        name: `${f.vorname} ${f.nachname}`,
        farbe: farbeNachIndex(idx),
        punkte,
      };
    })
    .filter((r): r is DiagrammDatenreihe => r !== null && r.punkte.length > 0);

  const berechneStatistik = (fid: string): FahrerStatistik => {
    const f = fahrer.find((x) => x.id === fid)!;
    const fahrerLäufe = läufe.filter(
      (l) =>
        l.fahrerId === fid &&
        l.laufTyp === 'wertung' &&
        l.status === 'gefahren' &&
        l.gesamtzeit !== null
    );

    if (fahrerLäufe.length === 0) {
      return { fahrer: f, durchschnitt: null, beste: null, schlechteste: null, trend: null, deltaBeste: null };
    }

    const zeiten = fahrerLäufe.map((l) => l.gesamtzeit!).sort((a, b) => a - b);
    const durchschnitt = Math.round(zeiten.reduce((s, z) => s + z, 0) / zeiten.length);
    const beste = zeiten[0];
    const schlechteste = zeiten[zeiten.length - 1];

    // Trend: letzte 3 Wertungen vergleichen
    let trend: '↗' | '↘' | '→' | null = null;
    if (fahrerLäufe.length >= 3) {
      const sortiert = fahrerLäufe.sort((a, b) => a.erfasstAm.localeCompare(b.erfasstAm));
      const letzten3 = sortiert.slice(-3).map((l) => l.gesamtzeit!);
      const diff = letzten3[2] - letzten3[0];
      if (diff < -2000) trend = '↗';
      else if (diff > 2000) trend = '↘';
      else trend = '→';
    }

    return { fahrer: f, durchschnitt, beste, schlechteste, trend, deltaBeste: null };
  };

  // Delta zum Klassenbesten
  const statistiken = gefilterteFahrer
    .filter((f) => ausgewählteFahrerIds.size === 0 || ausgewählteFahrerIds.has(f.id))
    .map((f) => berechneStatistik(f.id))
    .filter((s) => s.beste !== null)
    .sort((a, b) => (a.beste ?? 0) - (b.beste ?? 0));

  const klassenbeste = statistiken[0]?.beste ?? null;
  for (const s of statistiken) {
    s.deltaBeste = klassenbeste !== null && s.beste !== null ? s.beste - klassenbeste : null;
  }

  if (loading) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={Colors.adacGelb} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt}>
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

      {/* Fahrer-Auswahl */}
      <Text style={styles.sectionTitel}>
        Fahrer wählen (max. {maxFahrer}, {ausgewählteFahrerIds.size} ausgewählt)
      </Text>
      <View style={styles.fahrerGrid}>
        {gefilterteFahrer.map((f, idx) => {
          const sel = ausgewählteFahrerIds.has(f.id);
          const gesperrt = !sel && ausgewählteFahrerIds.size >= maxFahrer;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.fahrerChip,
                sel && { borderColor: farbeNachIndex(Array.from(ausgewählteFahrerIds).indexOf(f.id)), borderWidth: 2 },
                gesperrt && styles.fahrerChipGesperrt,
              ]}
              onPress={() => !gesperrt && toggleFahrer(f.id)}
            >
              {sel && (
                <View style={[styles.farbPunkt, { backgroundColor: farbeNachIndex(Array.from(ausgewählteFahrerIds).indexOf(f.id)) }]} />
              )}
              <Text style={[styles.fahrerChipText, gesperrt && { color: Colors.textDeaktiviert }]} numberOfLines={1}>
                {f.vorname} {f.nachname}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Diagramm */}
      <Text style={styles.sectionTitel}>Zeitverlauf (Wertungsläufe)</Text>
      {trainings.length === 0 ? (
        <View style={styles.leer}>
          <Text style={styles.leerText}>Noch keine Trainingsdaten vorhanden</Text>
        </View>
      ) : (
        <ZeitlinienDiagramm reihen={diagrammReihen} labels={diagrammLabels} />
      )}

      {/* Vergleichstabelle */}
      {statistiken.length > 0 && (
        <>
          <Text style={styles.sectionTitel}>Vergleich</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.tabelleHeader}>
                <View style={styles.nameSpalte}><Text style={styles.headerText}>Fahrer</Text></View>
                <View style={styles.dataSpalte}><Text style={styles.headerText}>Ø Zeit</Text></View>
                <View style={styles.dataSpalte}><Text style={styles.headerText}>Beste</Text></View>
                <View style={styles.dataSpalte}><Text style={styles.headerText}>Schlechteste</Text></View>
                <View style={styles.kleinSpalte}><Text style={styles.headerText}>Trend</Text></View>
                <View style={styles.dataSpalte}><Text style={styles.headerText}>Δ Beste</Text></View>
              </View>
              {statistiken.map((s, idx) => (
                <View key={s.fahrer.id} style={[styles.vergleichsZeile, idx % 2 === 0 && styles.vergleichsZeileGerade]}>
                  <View style={styles.nameSpalte}>
                    <Text style={styles.vergleichsName} numberOfLines={1}>
                      {s.fahrer.vorname} {s.fahrer.nachname}
                    </Text>
                  </View>
                  <View style={styles.dataSpalte}>
                    <ZeitAnzeige ms={s.durchschnitt} style={styles.vergleichsZeit} />
                  </View>
                  <View style={styles.dataSpalte}>
                    <ZeitAnzeige ms={s.beste} style={StyleSheet.flatten([styles.vergleichsZeit, { color: Colors.erfolg }])} />
                  </View>
                  <View style={styles.dataSpalte}>
                    <ZeitAnzeige ms={s.schlechteste} style={StyleSheet.flatten([styles.vergleichsZeit, { color: Colors.fehler }])} />
                  </View>
                  <View style={styles.kleinSpalte}>
                    <Text style={[
                      styles.trendText,
                      s.trend === '↗' && { color: Colors.erfolg },
                      s.trend === '↘' && { color: Colors.fehler },
                    ]}>
                      {s.trend ?? '–'}
                    </Text>
                  </View>
                  <View style={styles.dataSpalte}>
                    <Text style={styles.deltaText}>
                      {s.deltaBeste === null || s.deltaBeste === 0
                        ? '–'
                        : `+${(s.deltaBeste / 1000).toFixed(1)}s`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {statistiken.length === 0 && fahrer.length > 0 && (
        <View style={styles.hinweisBox}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.info} />
          <Text style={styles.hinweisText}>
            Noch keine Wertungsläufe erfasst. Fahre zuerst einige Trainings im Rennmodus.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  inhalt: { paddingBottom: 32 },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterLeiste: {
    backgroundColor: Colors.hintergrundHell,
    paddingVertical: 10,
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
  sectionTitel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimär,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  fahrerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  fahrerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  fahrerChipGesperrt: { opacity: 0.4 },
  farbPunkt: { width: 10, height: 10, borderRadius: 5 },
  fahrerChipText: { fontSize: 15, color: Colors.textPrimär },
  leer: {
    marginHorizontal: 16,
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  leerText: { fontSize: 16, color: Colors.textDeaktiviert },
  tabelleHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.hintergrundDunkel,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  vergleichsZeile: {
    flexDirection: 'row',
    paddingVertical: 10,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
    backgroundColor: Colors.hintergrundHell,
    alignItems: 'center',
  },
  vergleichsZeileGerade: { backgroundColor: '#FAFAFA' },
  nameSpalte: { width: 160, paddingHorizontal: 10 },
  dataSpalte: { width: 110, paddingHorizontal: 8, alignItems: 'center' },
  kleinSpalte: { width: 60, paddingHorizontal: 8, alignItems: 'center' },
  headerText: { color: Colors.textHell, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  vergleichsName: { fontSize: 14, color: Colors.textPrimär, fontWeight: '600' },
  vergleichsZeit: { fontSize: 14, color: Colors.textPrimär },
  trendText: { fontSize: 18, color: Colors.textSekundär, fontWeight: '700' },
  deltaText: { fontSize: 14, color: Colors.fehler, fontWeight: '600' },
  hinweisBox: {
    flexDirection: 'row',
    margin: 16,
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
