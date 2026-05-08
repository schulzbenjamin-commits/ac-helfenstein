import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, FlatList
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Training, Fahrer } from '../../types';
import { TrainingStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { trainingHinzufügen, trainingAktualisieren, findeTrainingNachId } from '../../storage/trainingStorage';
import { ladeFahrer } from '../../storage/fahrerStorage';
import { DEFAULT_LAUF_TYPEN } from '../../constants/reglement';
import { parseDatum, formatDatum } from '../../utils/zeitFormatierung';
import { KlassenBadge } from '../../components/KlassenBadge';

type Nav = StackNavigationProp<TrainingStackParamList, 'TrainingErstellen'>;
type Route = RouteProp<TrainingStackParamList, 'TrainingErstellen'>;

interface Props {
  navigation: Nav;
  route: Route;
}

export const TrainingErstellenScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trainingId } = route.params ?? {};
  const istNeu = !trainingId;

  const [name, setName] = useState('');
  const [datumAnzeige, setDatumAnzeige] = useState('');
  const [ort, setOrt] = useState('');
  const [notizen, setNotizen] = useState('');
  const [laufTypen, setLaufTypen] = useState<Array<'training' | 'wertung'>>(DEFAULT_LAUF_TYPEN);
  const [alleFahrer, setAlleFahrer] = useState<Fahrer[]>([]);
  const [ausgewählteFahrerIds, setAusgewählteFahrerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    ladeDaten();
  }, [trainingId]);

  const ladeDaten = async () => {
    const fahrer = await ladeFahrer();
    setAlleFahrer(fahrer.filter((f) => f.aktiv));

    if (trainingId) {
      const t = await findeTrainingNachId(trainingId);
      if (!t) return;
      setName(t.name);
      setDatumAnzeige(formatDatum(t.datum));
      setOrt(t.ort ?? '');
      setNotizen(t.notizen ?? '');
      setLaufTypen(t.laufTypen);
      setAusgewählteFahrerIds(new Set(t.teilnehmerIds));
    } else {
      const heute = new Date();
      setDatumAnzeige(
        `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`
      );
    }
  };

  const toggleFahrer = (id: string) => {
    setAusgewählteFahrerIds((prev) => {
      const neu = new Set(prev);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  };

  const laufHinzufügen = () => {
    setLaufTypen((prev) => [...prev, 'wertung']);
  };

  const laufEntfernen = (idx: number) => {
    if (laufTypen.length <= 1) return;
    setLaufTypen((prev) => prev.filter((_, i) => i !== idx));
  };

  const laufTypToggle = (idx: number) => {
    setLaufTypen((prev) =>
      prev.map((t, i) => (i === idx ? (t === 'training' ? 'wertung' : 'training') : t))
    );
  };

  const handleSpeichern = async () => {
    if (!name.trim()) { Alert.alert('Fehler', 'Trainingsname fehlt'); return; }
    const datumIso = parseDatum(datumAnzeige);
    if (!datumIso) { Alert.alert('Fehler', 'Datum ungültig – Format: TT.MM.JJJJ'); return; }
    if (ausgewählteFahrerIds.size === 0) { Alert.alert('Hinweis', 'Bitte mindestens einen Fahrer auswählen'); return; }

    const training: Training = {
      id: trainingId ?? uuidv4(),
      name: name.trim(),
      datum: datumIso,
      ort: ort.trim() || undefined,
      anzahlLauefe: laufTypen.length,
      laufTypen,
      teilnehmerIds: Array.from(ausgewählteFahrerIds),
      notizen: notizen.trim() || undefined,
      erstelltAm: new Date().toISOString(),
    };

    if (istNeu) await trainingHinzufügen(training);
    else await trainingAktualisieren(training);

    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt} keyboardShouldPersistTaps="handled">
      {/* Grunddaten */}
      <Text style={styles.sectionLabel}>Trainingsdetails</Text>
      <View style={styles.formKarte}>
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="z.B. Frühjahrstraining 1"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Datum * (TT.MM.JJJJ)</Text>
          <TextInput
            style={styles.input}
            value={datumAnzeige}
            onChangeText={setDatumAnzeige}
            placeholder="08.05.2026"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Ort (optional)</Text>
          <TextInput
            style={styles.input}
            value={ort}
            onChangeText={setOrt}
            placeholder="Geislingen"
          />
        </View>
        <View style={styles.trennlinie} />
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Notizen</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={notizen}
            onChangeText={setNotizen}
            placeholder="Hinweise zum Training…"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Lauf-Konfiguration */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Läufe ({laufTypen.length})</Text>
        <TouchableOpacity style={styles.hinzufügenBtn} onPress={laufHinzufügen}>
          <Ionicons name="add" size={20} color={Colors.textPrimär} />
          <Text style={styles.hinzufügenText}>Lauf hinzufügen</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.formKarte}>
        {laufTypen.map((typ, idx) => (
          <View key={idx}>
            {idx > 0 && <View style={styles.trennlinie} />}
            <View style={styles.feld}>
              <Text style={styles.feldLabel}>Lauf {idx + 1}</Text>
              <View style={styles.laufTypRow}>
                <TouchableOpacity
                  style={[
                    styles.laufTypBtn,
                    typ === 'training' && styles.laufTypBtnAktiv,
                  ]}
                  onPress={() => laufTypToggle(idx)}
                >
                  <Text style={[styles.laufTypText, typ === 'training' && styles.laufTypTextAktiv]}>
                    Training
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.laufTypBtn,
                    typ === 'wertung' && styles.laufTypBtnAktivGelb,
                  ]}
                  onPress={() => laufTypToggle(idx)}
                >
                  <Text style={[styles.laufTypText, typ === 'wertung' && styles.laufTypTextAktivGelb]}>
                    Wertung
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.löschenBtn}
                  onPress={() => laufEntfernen(idx)}
                  disabled={laufTypen.length <= 1}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={laufTypen.length <= 1 ? Colors.textDeaktiviert : Colors.fehler}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Fahrer-Auswahl */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>
          Teilnehmer ({ausgewählteFahrerIds.size} ausgewählt)
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (ausgewählteFahrerIds.size === alleFahrer.length) {
              setAusgewählteFahrerIds(new Set());
            } else {
              setAusgewählteFahrerIds(new Set(alleFahrer.map((f) => f.id)));
            }
          }}
        >
          <Text style={styles.alleWählenText}>
            {ausgewählteFahrerIds.size === alleFahrer.length ? 'Alle abwählen' : 'Alle wählen'}
          </Text>
        </TouchableOpacity>
      </View>

      {alleFahrer.length === 0 ? (
        <View style={styles.warnungBox}>
          <Text style={styles.warnungText}>
            Keine aktiven Fahrer vorhanden. Bitte zuerst Fahrer anlegen.
          </Text>
        </View>
      ) : (
        <View style={styles.fahrerGrid}>
          {alleFahrer.map((f) => {
            const sel = ausgewählteFahrerIds.has(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.fahrerChip, sel && styles.fahrerChipAusgewählt]}
                onPress={() => toggleFahrer(f.id)}
              >
                <KlassenBadge klasse={f.klasse} />
                <Text style={[styles.fahrerChipText, sel && styles.fahrerChipTextSel]} numberOfLines={1}>
                  {f.vorname} {f.nachname}
                </Text>
                {sel && <Ionicons name="checkmark-circle" size={20} color={Colors.adacGelb} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.speichernButton} onPress={handleSpeichern}>
        <Text style={styles.speichernText}>
          {istNeu ? 'Training anlegen' : 'Änderungen speichern'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  inhalt: { padding: 20, gap: 14, paddingBottom: 48 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSekundär, textTransform: 'uppercase', letterSpacing: 0.5 },
  formKarte: { backgroundColor: Colors.hintergrundHell, borderRadius: 12, paddingHorizontal: 16 },
  feld: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 56,
    gap: 12,
  },
  feldLabel: { fontSize: 17, color: Colors.textPrimär, flexShrink: 0 },
  input: { flex: 1, fontSize: 17, color: Colors.textPrimär, textAlign: 'right' },
  inputMultiline: { textAlign: 'left', textAlignVertical: 'top', minHeight: 60 },
  trennlinie: { height: 1, backgroundColor: Colors.trennlinie },
  laufTypRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  laufTypBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.hintergrundGrau,
    minHeight: 40,
    justifyContent: 'center',
  },
  laufTypBtnAktiv: { backgroundColor: Colors.textSekundär },
  laufTypBtnAktivGelb: { backgroundColor: Colors.adacGelb },
  laufTypText: { fontSize: 15, color: Colors.textSekundär, fontWeight: '600' },
  laufTypTextAktiv: { color: Colors.textHell },
  laufTypTextAktivGelb: { color: Colors.textPrimär },
  löschenBtn: { padding: 8 },
  hinzufügenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.adacGelb,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hinzufügenText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimär },
  alleWählenText: { fontSize: 15, color: Colors.info, fontWeight: '600' },
  fahrerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fahrerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 12,
    minHeight: 52,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fahrerChipAusgewählt: { borderColor: Colors.adacGelb, backgroundColor: '#FFFDE7' },
  fahrerChipText: { fontSize: 16, color: Colors.textPrimär, flexShrink: 1 },
  fahrerChipTextSel: { fontWeight: '700' },
  warnungBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: Colors.fehler,
    borderRadius: 10,
    padding: 16,
  },
  warnungText: { fontSize: 15, color: Colors.fehler },
  speichernButton: {
    backgroundColor: Colors.adacGelb,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  speichernText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimär },
});
