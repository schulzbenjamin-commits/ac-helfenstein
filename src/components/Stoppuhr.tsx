import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { formatZeit, parseZeit } from '../utils/zeitFormatierung';

interface Props {
  onZeitGespeichert: (ms: number, perStoppuhr: boolean) => void;
  disabled?: boolean;
}

export const Stoppuhr: React.FC<Props> = ({ onZeitGespeichert, disabled = false }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [manuellModal, setManuellModal] = useState(false);
  const [manuellEingabe, setManuellEingabe] = useState('');
  const [manuellFehler, setManuellFehler] = useState('');

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current!);
      }, 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = useCallback(async () => {
    if (disabled) return;
    startTimeRef.current = Date.now() - elapsed;
    setIsRunning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [disabled, elapsed]);

  const handleStopp = useCallback(async () => {
    const jetzt = Date.now();
    const gemessen = jetzt - startTimeRef.current!;
    setElapsed(gemessen);
    setIsRunning(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onZeitGespeichert(gemessen, true);
  }, [onZeitGespeichert]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
    startTimeRef.current = null;
  }, []);

  const handleManuellÜbernehmen = () => {
    const ms = parseZeit(manuellEingabe.trim());
    if (!ms) {
      setManuellFehler('Format: M:SS,hh – z.B. 1:23,45');
      return;
    }
    setElapsed(ms);
    setManuellModal(false);
    setManuellEingabe('');
    setManuellFehler('');
    onZeitGespeichert(ms, false);
  };

  return (
    <View style={styles.container}>
      {/* Zeitanzeige */}
      <Text style={styles.zeitAnzeige}>{formatZeit(elapsed)}</Text>

      {/* Start / Stopp Button */}
      {!isRunning ? (
        <TouchableOpacity
          style={[styles.startButton, disabled && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>▶  START</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.stoppButton}
          onPress={handleStopp}
          activeOpacity={0.8}
        >
          <Text style={styles.stoppButtonText}>■  STOPP</Text>
        </TouchableOpacity>
      )}

      {/* Reset + Manuell */}
      <View style={styles.zeile}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={isRunning}>
          <Text style={styles.resetText}>Zurücksetzen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manuellButton}
          onPress={() => { setManuellModal(true); setManuellEingabe(''); setManuellFehler(''); }}
          disabled={isRunning}
        >
          <Text style={styles.manuellText}>Zeit manuell eingeben</Text>
        </TouchableOpacity>
      </View>

      {/* Manuell-Eingabe Modal */}
      <Modal visible={manuellModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitel}>Zeit manuell eingeben</Text>
            <Text style={styles.modalHinweis}>Format: M:SS,hh (z.B. 1:23,45)</Text>
            <TextInput
              style={styles.modalInput}
              value={manuellEingabe}
              onChangeText={setManuellEingabe}
              placeholder="1:23,45"
              keyboardType="numbers-and-punctuation"
              autoFocus
              onSubmitEditing={handleManuellÜbernehmen}
            />
            {!!manuellFehler && <Text style={styles.fehlerText}>{manuellFehler}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnAbbrechen]}
                onPress={() => setManuellModal(false)}
              >
                <Text style={styles.modalBtnAbbrechenText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnÜbernehmen]} onPress={handleManuellÜbernehmen}>
                <Text style={styles.modalBtnÜbernehmenText}>Übernehmen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  zeitAnzeige: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.rennmodusZeit,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  startButton: {
    backgroundColor: Colors.stoppuhrStart,
    paddingHorizontal: 40,
    height: 80,
    minWidth: 220,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: Colors.textHell,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  stoppButton: {
    backgroundColor: Colors.stoppuhrStopp,
    paddingHorizontal: 40,
    height: 80,
    minWidth: 220,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoppButtonText: {
    color: Colors.textHell,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  zeile: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    backgroundColor: Colors.stoppuhrReset,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  resetText: {
    color: Colors.textPrimär,
    fontSize: 16,
  },
  manuellButton: {
    backgroundColor: Colors.adacGelb,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  manuellText: {
    color: Colors.textPrimär,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 16,
    padding: 28,
    width: 400,
    gap: 12,
  },
  modalTitel: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimär,
  },
  modalHinweis: {
    fontSize: 15,
    color: Colors.textSekundär,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: Colors.adacGelb,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  fehlerText: {
    color: Colors.fehler,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnAbbrechen: {
    backgroundColor: Colors.hintergrundGrau,
  },
  modalBtnAbbrechenText: {
    fontSize: 17,
    color: Colors.textPrimär,
  },
  modalBtnÜbernehmen: {
    backgroundColor: Colors.adacGelb,
  },
  modalBtnÜbernehmenText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimär,
  },
});
