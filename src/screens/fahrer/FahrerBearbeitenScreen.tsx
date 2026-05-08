import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { Fahrer } from '../../types';
import { FahrerStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { ladeFahrer, fahrerHinzufügen, fahrerAktualisieren } from '../../storage/fahrerStorage';
import { berechneKlasse, klassenLabel, geburtsdatumZuJahr } from '../../utils/klassenBerechnung';
import { parseDatum, formatDatum } from '../../utils/zeitFormatierung';
import { KlassenBadge } from '../../components/KlassenBadge';

type Nav = StackNavigationProp<FahrerStackParamList, 'FahrerBearbeiten'>;
type Route = RouteProp<FahrerStackParamList, 'FahrerBearbeiten'>;

interface Props {
  navigation: Nav;
  route: Route;
}

export const FahrerBearbeitenScreen: React.FC<Props> = ({ navigation, route }) => {
  const { fahrerId } = route.params ?? {};
  const istNeu = !fahrerId;

  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [geburtsdatumAnzeige, setGeburtsdatumAnzeige] = useState('');
  const [aktiv, setAktiv] = useState(true);
  const [notizen, setNotizen] = useState('');
  const [speichernLäuft, setSpeichernLäuft] = useState(false);

  const geburtsdatumIso = parseDatum(geburtsdatumAnzeige);
  const geburtsjahr = geburtsdatumIso ? geburtsdatumZuJahr(geburtsdatumIso) : null;
  const klasse = geburtsjahr ? berechneKlasse(geburtsjahr) : null;

  useEffect(() => {
    if (fahrerId) ladeFahrerDaten();
  }, [fahrerId]);

  const ladeFahrerDaten = async () => {
    const alle = await ladeFahrer();
    const f = alle.find((x) => x.id === fahrerId);
    if (!f) return;
    setVorname(f.vorname);
    setNachname(f.nachname);
    setGeburtsdatumAnzeige(formatDatum(f.geburtsdatum));
    setAktiv(f.aktiv);
    setNotizen(f.notizen ?? '');
  };

  const validiere = (): string | null => {
    if (!vorname.trim()) return 'Vorname fehlt';
    if (!nachname.trim()) return 'Nachname fehlt';
    if (!geburtsdatumAnzeige.trim()) return 'Geburtsdatum fehlt';
    if (!geburtsdatumIso) return 'Geburtsdatum ungültig – Format: TT.MM.JJJJ';
    return null;
  };

  const handleSpeichern = async () => {
    const fehler = validiere();
    if (fehler) { Alert.alert('Eingabe prüfen', fehler); return; }

    setSpeichernLäuft(true);
    try {
      const gj = geburtsdatumZuJahr(geburtsdatumIso!);
      const fahrer: Fahrer = {
        id: fahrerId ?? uuidv4(),
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        geburtsdatum: geburtsdatumIso!,
        geburtsjahr: gj,
        klasse: berechneKlasse(gj),
        aktiv,
        notizen: notizen.trim() || undefined,
        erstelltAm: new Date().toISOString(),
      };

      if (istNeu) {
        await fahrerHinzufügen(fahrer);
      } else {
        await fahrerAktualisieren(fahrer);
      }
      navigation.goBack();
    } finally {
      setSpeichernLäuft(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inhalt} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Fahrerdaten</Text>

      <View style={styles.formKarte}>
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Vorname *</Text>
          <TextInput
            style={styles.input}
            value={vorname}
            onChangeText={setVorname}
            placeholder="Max"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.trennlinie} />

        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Nachname *</Text>
          <TextInput
            style={styles.input}
            value={nachname}
            onChangeText={setNachname}
            placeholder="Mustermann"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.trennlinie} />

        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Geburtsdatum * (TT.MM.JJJJ)</Text>
          <TextInput
            style={styles.input}
            value={geburtsdatumAnzeige}
            onChangeText={setGeburtsdatumAnzeige}
            placeholder="15.03.2016"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      {/* Auto-berechnete Klasse */}
      {geburtsdatumIso && (
        <View style={styles.klassenHinweis}>
          <View style={styles.klassenHinweisInfo}>
            <Text style={styles.klassenHinweisLabel}>Automatisch berechnete Klasse:</Text>
            <Text style={[
              styles.klassenHinweisText,
              !klasse && { color: Colors.fehler }
            ]}>
              {klassenLabel(klasse)}
            </Text>
          </View>
          {klasse && <KlassenBadge klasse={klasse} groß />}
        </View>
      )}

      {!klasse && geburtsdatumIso && (
        <View style={styles.warnungBox}>
          <Text style={styles.warnungText}>
            ⚠ Dieser Fahrer ist nicht startberechtigt (Alter außerhalb 7–18 Jahre).
          </Text>
        </View>
      )}

      <View style={styles.formKarte}>
        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Aktiv</Text>
          <Switch
            value={aktiv}
            onValueChange={setAktiv}
            trackColor={{ true: Colors.adacGelb, false: Colors.trennlinie }}
            thumbColor={Colors.hintergrundHell}
          />
        </View>

        <View style={styles.trennlinie} />

        <View style={styles.feld}>
          <Text style={styles.feldLabel}>Notizen (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={notizen}
            onChangeText={setNotizen}
            placeholder="Besonderheiten, Hinweise…"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.speichernButton, speichernLäuft && styles.buttonDisabled]}
        onPress={handleSpeichern}
        disabled={speichernLäuft}
      >
        <Text style={styles.speichernText}>
          {istNeu ? 'Fahrer anlegen' : 'Änderungen speichern'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  inhalt: { padding: 20, gap: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSekundär, textTransform: 'uppercase', letterSpacing: 0.5 },
  formKarte: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  feld: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 56,
  },
  feldLabel: { fontSize: 17, color: Colors.textPrimär, flex: 1 },
  input: {
    flex: 1,
    fontSize: 17,
    color: Colors.textPrimär,
    textAlign: 'right',
  },
  inputMultiline: {
    textAlign: 'left',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  trennlinie: { height: 1, backgroundColor: Colors.trennlinie, marginLeft: 0 },
  klassenHinweis: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  klassenHinweisInfo: { flex: 1 },
  klassenHinweisLabel: { fontSize: 14, color: Colors.textSekundär },
  klassenHinweisText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimär, marginTop: 2 },
  warnungBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: Colors.fehler,
    borderRadius: 10,
    padding: 14,
  },
  warnungText: { fontSize: 15, color: Colors.fehler, fontWeight: '600' },
  speichernButton: {
    backgroundColor: Colors.adacGelb,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  speichernText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimär },
  buttonDisabled: { opacity: 0.5 },
});
