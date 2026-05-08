import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Strafzeit, StrafTyp } from '../types';
import { Colors } from '../constants/colors';
import { STRAF_KURZ, MAX_STRAF_PRO_AUFGABE_MS } from '../constants/reglement';
import { berechneStrafSummeMs, istPylonCapErreicht } from '../utils/strafzeitenLogik';

interface Props {
  strafzeiten: Strafzeit[];
  onChange: (strafzeiten: Strafzeit[]) => void;
  disabled?: boolean;
}

const BUTTON_FARBEN: Partial<Record<StrafTyp, string>> = {
  PYLONE_UMGEWORFEN: Colors.strafePylone,
  PYLONE_VERSCHOBEN: Colors.strafePylone,
  AUFGABE_AUSGELASSEN: Colors.strafeAufgabe,
  AUFGABE_FALSCH: Colors.strafeAufgabe,
  HALTELINIE: Colors.strafeHaltelinie,
};

export const StrafzeitenEingabe: React.FC<Props> = ({ strafzeiten, onChange, disabled = false }) => {
  const capErreicht = istPylonCapErreicht(strafzeiten);

  const erhöhe = (typ: StrafTyp) => {
    const neu = strafzeiten.map((s) =>
      s.typ === typ ? { ...s, anzahl: s.anzahl + 1 } : s
    );
    onChange(neu);
  };

  const zurücksetzen = (typ: StrafTyp) => {
    const neu = strafzeiten.map((s) =>
      s.typ === typ ? { ...s, anzahl: 0 } : s
    );
    onChange(neu);
  };

  const gesamtMs = berechneStrafSummeMs(strafzeiten);
  const gesamtSek = gesamtMs / 1000;

  return (
    <View style={styles.container}>
      <Text style={styles.titel}>Strafen</Text>

      <View style={styles.buttonGrid}>
        {strafzeiten.map((s) => {
          const isPylon = s.typ === 'PYLONE_UMGEWORFEN' || s.typ === 'PYLONE_VERSCHOBEN';
          const istGesperrt = disabled || (isPylon && capErreicht && s.anzahl === 0);

          return (
            <TouchableOpacity
              key={s.typ}
              style={[
                styles.strafButton,
                { backgroundColor: BUTTON_FARBEN[s.typ] ?? Colors.fehler },
                istGesperrt && styles.buttonGesperrt,
              ]}
              onPress={() => !istGesperrt && erhöhe(s.typ)}
              onLongPress={() => zurücksetzen(s.typ)}
              delayLongPress={600}
              activeOpacity={0.75}
            >
              <View style={styles.buttonInhalt}>
                <Text style={styles.buttonText}>{STRAF_KURZ[s.typ]}</Text>
                <View style={styles.counter}>
                  <Text style={styles.counterText}>{s.anzahl}</Text>
                </View>
              </View>
              <Text style={styles.hinweis}>Lang drücken = zurücksetzen</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {capErreicht && (
        <View style={styles.warnung}>
          <Text style={styles.warnungText}>
            ⚠ Max. 10s Pylonen-Strafe pro Aufgabe erreicht
          </Text>
        </View>
      )}

      <View style={styles.summe}>
        <Text style={styles.summeLabel}>Strafzeit gesamt:</Text>
        <Text style={styles.summeWert}>
          +{gesamtSek.toFixed(0)}s
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  titel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.rennmodusText,
    marginBottom: 4,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strafButton: {
    borderRadius: 10,
    padding: 10,
    minHeight: 64,
    minWidth: 140,
    flex: 1,
    justifyContent: 'space-between',
  },
  buttonGesperrt: {
    opacity: 0.4,
  },
  buttonInhalt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: Colors.textHell,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  counterText: {
    color: Colors.textHell,
    fontSize: 18,
    fontWeight: '800',
  },
  hinweis: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  warnung: {
    backgroundColor: Colors.warnung,
    borderRadius: 8,
    padding: 10,
  },
  warnungText: {
    color: Colors.textPrimär,
    fontSize: 15,
    fontWeight: '600',
  },
  summe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.rennmodusPanel,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  summeLabel: {
    color: Colors.rennmodusText,
    fontSize: 17,
  },
  summeWert: {
    color: Colors.fehler,
    fontSize: 22,
    fontWeight: '800',
  },
});
