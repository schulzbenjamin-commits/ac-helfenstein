import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Training, Fahrer, Lauf, Strafzeit } from '../../types';
import { TrainingStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { findeTrainingNachId } from '../../storage/trainingStorage';
import { ladeFahrer } from '../../storage/fahrerStorage';
import { ladeLäufeVonTraining, laufAktualisieren } from '../../storage/laufStorage';
import { Stoppuhr } from '../../components/Stoppuhr';
import { StrafzeitenEingabe } from '../../components/StrafzeitenEingabe';
import { KlassenBadge } from '../../components/KlassenBadge';
import { ZeitAnzeige } from '../../components/ZeitAnzeige';
import { initialStrafzeiten, berechneGesamtzeit } from '../../utils/strafzeitenLogik';

type Nav = StackNavigationProp<TrainingStackParamList, 'Rennmodus'>;
type Route = RouteProp<TrainingStackParamList, 'Rennmodus'>;

interface Props {
  navigation: Nav;
  route: Route;
}

export const RennmodusScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trainingId } = route.params;

  const [training, setTraining] = useState<Training | null>(null);
  const [fahrer, setFahrer] = useState<Fahrer[]>([]);
  const [vorhandeneLäufe, setVorhandeneLäufe] = useState<Lauf[]>([]);
  const [loading, setLoading] = useState(true);

  const [aktiverFahrer, setAktiverFahrer] = useState<Fahrer | null>(null);
  const [aktiverLaufNummer, setAktiverLaufNummer] = useState(1);
  const [rohzeit, setRohzeit] = useState<number | null>(null);
  const [perStoppuhr, setPerStoppuhr] = useState(true);
  const [strafzeiten, setStrafzeiten] = useState<Strafzeit[]>(initialStrafzeiten());
  const [gespeichertLäuft, setGespeichertLäuft] = useState(false);

  useEffect(() => {
    laden();
  }, [trainingId]);

  const laden = async () => {
    setLoading(true);
    const [t, alleFahrer, läufe] = await Promise.all([
      findeTrainingNachId(trainingId),
      ladeFahrer(),
      ladeLäufeVonTraining(trainingId),
    ]);
    setTraining(t);
    if (t) {
      const teilnehmer = alleFahrer.filter((f) => t.teilnehmerIds.includes(f.id));
      setFahrer(teilnehmer);
      if (teilnehmer.length > 0 && !aktiverFahrer) {
        setAktiverFahrer(teilnehmer[0]);
      }
    }
    setVorhandeneLäufe(läufe);
    setLoading(false);
  };

  const reset = useCallback(() => {
    setRohzeit(null);
    setStrafzeiten(initialStrafzeiten());
  }, []);

  const wähleNächstenFahrer = useCallback(() => {
    if (!aktiverFahrer || fahrer.length === 0) return;
    const idx = fahrer.findIndex((f) => f.id === aktiverFahrer.id);
    const nächsterIdx = (idx + 1) % fahrer.length;
    setAktiverFahrer(fahrer[nächsterIdx]);
    reset();
  }, [aktiverFahrer, fahrer, reset]);

  const handleZeitGespeichert = useCallback((ms: number, viaStoppuhr: boolean) => {
    setRohzeit(ms);
    setPerStoppuhr(viaStoppuhr);
  }, []);

  const handleSpeichern = async () => {
    if (!aktiverFahrer || !training) return;
    if (rohzeit === null) {
      Alert.alert('Keine Zeit', 'Bitte zuerst eine Zeit messen oder eingeben.');
      return;
    }

    setGespeichertLäuft(true);
    try {
      const laufTyp = training.laufTypen[aktiverLaufNummer - 1] ?? 'wertung';
      const gesamtzeit = berechneGesamtzeit(rohzeit, strafzeiten);

      const lauf: Lauf = {
        id: uuidv4(),
        fahrerId: aktiverFahrer.id,
        trainingId,
        laufNummer: aktiverLaufNummer,
        laufTyp,
        rohzeit,
        strafzeiten: strafzeiten.filter((s) => s.anzahl > 0),
        gesamtzeit,
        status: 'gefahren',
        erfasstAm: new Date().toISOString(),
        erfasstPer: perStoppuhr ? 'stoppuhr' : 'manuell',
      };

      await laufAktualisieren(lauf);
      setVorhandeneLäufe((prev) => [...prev.filter((l) => l.id !== lauf.id), lauf]);

      Alert.alert(
        'Gespeichert!',
        `${aktiverFahrer.vorname} ${aktiverFahrer.nachname} – Lauf ${aktiverLaufNummer}`,
        [
          { text: 'Nächster Fahrer', onPress: wähleNächstenFahrer },
          { text: 'Bleiben', style: 'cancel', onPress: reset },
        ]
      );
    } finally {
      setGespeichertLäuft(false);
    }
  };

  const handleDNS = async () => {
    if (!aktiverFahrer || !training) return;
    const laufTyp = training.laufTypen[aktiverLaufNummer - 1] ?? 'wertung';
    const lauf: Lauf = {
      id: uuidv4(),
      fahrerId: aktiverFahrer.id,
      trainingId,
      laufNummer: aktiverLaufNummer,
      laufTyp,
      rohzeit: null,
      strafzeiten: [],
      gesamtzeit: null,
      status: 'dns',
      erfasstAm: new Date().toISOString(),
      erfasstPer: 'manuell',
    };
    await laufAktualisieren(lauf);
    setVorhandeneLäufe((prev) => [...prev.filter((l) => l.id !== lauf.id), lauf]);
    wähleNächstenFahrer();
  };

  const gesamtzeit = berechneGesamtzeit(rohzeit, strafzeiten);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.adacGelb} />
        </TouchableOpacity>
        <Text style={styles.headerTitel} numberOfLines={1}>{training.name}</Text>
        <Text style={styles.headerUnter}>Rennmodus</Text>

        {/* Lauf-Auswahl */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.laufScroll}>
          {training.laufTypen.map((typ, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.laufChip,
                aktiverLaufNummer === idx + 1 && styles.laufChipAktiv,
              ]}
              onPress={() => { setAktiverLaufNummer(idx + 1); reset(); }}
            >
              <Text style={[
                styles.laufChipText,
                aktiverLaufNummer === idx + 1 && styles.laufChipTextAktiv,
              ]}>
                L{idx + 1} {typ === 'training' ? 'Tr' : 'W'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Split Layout */}
      <View style={styles.splitLayout}>
        {/* Linke Seite: Fahrerliste */}
        <View style={styles.linkeSeite}>
          <Text style={styles.panelTitel}>Fahrer</Text>
          <ScrollView>
            {fahrer.map((f) => {
              const hatLauf = vorhandeneLäufe.some(
                (l) => l.fahrerId === f.id && l.laufNummer === aktiverLaufNummer
              );
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.fahrerZeile,
                    aktiverFahrer?.id === f.id && styles.fahrerZeileAktiv,
                  ]}
                  onPress={() => { setAktiverFahrer(f); reset(); }}
                >
                  <View style={styles.fahrerInfo}>
                    <Text style={[
                      styles.fahrerName,
                      aktiverFahrer?.id === f.id && styles.fahrerNameAktiv,
                    ]} numberOfLines={1}>
                      {f.vorname} {f.nachname}
                    </Text>
                    <KlassenBadge klasse={f.klasse} />
                  </View>
                  {hatLauf && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.erfolg} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Rechte Seite: Stoppuhr + Strafen */}
        <ScrollView style={styles.rechteSeite} contentContainerStyle={styles.rechteSeitInhalt}>
          {aktiverFahrer ? (
            <>
              <Text style={styles.aktiverFahrerName}>
                {aktiverFahrer.vorname} {aktiverFahrer.nachname}
              </Text>

              <Stoppuhr
                onZeitGespeichert={handleZeitGespeichert}
                disabled={false}
              />

              <View style={styles.trennlinie} />

              <StrafzeitenEingabe
                strafzeiten={strafzeiten}
                onChange={setStrafzeiten}
              />

              {/* Gesamtzeit-Anzeige */}
              <View style={styles.gesamtzeitBox}>
                <Text style={styles.gesamtzeitLabel}>Gesamtzeit:</Text>
                {rohzeit !== null ? (
                  <ZeitAnzeige ms={gesamtzeit} style={styles.gesamtzeitWert} />
                ) : (
                  <Text style={styles.gesamtzeitPlatzhalter}>–:––,––</Text>
                )}
              </View>

              {/* Aktions-Buttons */}
              <View style={styles.aktionenRow}>
                <TouchableOpacity style={styles.dnsBtn} onPress={handleDNS}>
                  <Text style={styles.dnsBtnText}>DNS / DSQ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.speichernBtn, (rohzeit === null || gespeichertLäuft) && styles.btnDisabled]}
                  onPress={handleSpeichern}
                  disabled={rohzeit === null || gespeichertLäuft}
                >
                  {gespeichertLäuft
                    ? <ActivityIndicator color={Colors.textPrimär} />
                    : <>
                        <Ionicons name="save" size={22} color={Colors.textPrimär} />
                        <Text style={styles.speichernBtnText}>Speichern & Nächster</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.keinFahrer}>
              <Text style={styles.keinFahrerText}>Fahrer auswählen →</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundDunkel },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.hintergrundDunkel },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  backBtn: { padding: 4 },
  headerTitel: { fontSize: 18, fontWeight: '700', color: Colors.textHell, flex: 1 },
  headerUnter: { fontSize: 13, color: Colors.adacGelb },
  laufScroll: { flexShrink: 0, maxWidth: 320 },
  laufChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.rennmodusPanel,
    marginRight: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  laufChipAktiv: { backgroundColor: Colors.adacGelb },
  laufChipText: { fontSize: 14, color: Colors.textSekundär, fontWeight: '600' },
  laufChipTextAktiv: { color: Colors.textPrimär },
  splitLayout: { flex: 1, flexDirection: 'row' },
  linkeSeite: {
    width: '32%',
    backgroundColor: '#222222',
    borderRightWidth: 1,
    borderRightColor: '#333333',
    padding: 12,
  },
  panelTitel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSekundär,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  fahrerZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.rennmodusPanel,
    minHeight: 56,
  },
  fahrerZeileAktiv: { backgroundColor: Colors.adacGelb },
  fahrerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  fahrerName: { fontSize: 15, color: Colors.textHell, fontWeight: '600', flexShrink: 1 },
  fahrerNameAktiv: { color: Colors.textPrimär },
  rechteSeite: { flex: 1 },
  rechteSeitInhalt: { padding: 20, gap: 16 },
  aktiverFahrerName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.adacGelb,
    textAlign: 'center',
  },
  trennlinie: { height: 1, backgroundColor: '#333333' },
  gesamtzeitBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.rennmodusPanel,
    borderRadius: 10,
    padding: 16,
  },
  gesamtzeitLabel: { fontSize: 18, color: Colors.rennmodusText },
  gesamtzeitWert: { fontSize: 26, fontWeight: '800', color: Colors.adacGelb },
  gesamtzeitPlatzhalter: { fontSize: 26, fontWeight: '800', color: Colors.textDeaktiviert },
  aktionenRow: { flexDirection: 'row', gap: 12 },
  dnsBtn: {
    flex: 1,
    height: 64,
    backgroundColor: '#333333',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dnsBtnText: { fontSize: 16, color: Colors.fehler, fontWeight: '700' },
  speichernBtn: {
    flex: 2,
    height: 64,
    backgroundColor: Colors.adacGelb,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  speichernBtnText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimär },
  btnDisabled: { opacity: 0.4 },
  keinFahrer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keinFahrerText: { fontSize: 20, color: Colors.textSekundär },
});
