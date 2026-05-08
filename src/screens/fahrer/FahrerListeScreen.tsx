import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Fahrer } from '../../types';
import { FahrerStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { ladeFahrer, fahrerHinzufügen, fahrerAktualisieren, findeKonflikt } from '../../storage/fahrerStorage';
import { FahrerKarte } from '../../components/FahrerKarte';
import { KlassenBadge } from '../../components/KlassenBadge';
import { öffneExcelDatei, parseExcelDatei, importZeileZuFahrer, ImportZeile } from '../../utils/excelImport';
import { formatDatum } from '../../utils/zeitFormatierung';
import { klassenKurzLabel } from '../../utils/klassenBerechnung';

type Nav = StackNavigationProp<FahrerStackParamList, 'FahrerListe'>;

interface Props {
  navigation: Nav;
}

type KlassenFilter = 'alle' | 1 | 2 | 3 | 4 | 5;

export const FahrerListeScreen: React.FC<Props> = ({ navigation }) => {
  const [fahrer, setFahrer] = useState<Fahrer[]>([]);
  const [filter, setFilter] = useState<KlassenFilter>('alle');
  const [loading, setLoading] = useState(true);

  // Import-States
  const [importModal, setImportModal] = useState(false);
  const [importZeilen, setImportZeilen] = useState<ImportZeile[]>([]);
  const [importLäuft, setImportLäuft] = useState(false);
  const [konflikteModal, setKonflikteModal] = useState(false);
  const [aktuelleKonflikte, setAktuelleKonflikte] = useState<{ zeile: ImportZeile; vorhandener: Fahrer }[]>([]);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [])
  );

  const laden = async () => {
    setLoading(true);
    const alle = await ladeFahrer();
    setFahrer(alle);
    setLoading(false);
  };

  const gefilterteFahrer = fahrer.filter((f) => {
    if (filter === 'alle') return true;
    return f.klasse === filter;
  });

  const handleImport = async () => {
    try {
      setImportLäuft(true);
      const wb = await öffneExcelDatei();
      if (!wb) return;
      const { zeilen } = parseExcelDatei(wb);
      setImportZeilen(zeilen);
      setImportModal(true);
    } catch (e) {
      Alert.alert('Fehler', 'Datei konnte nicht geladen werden.');
    } finally {
      setImportLäuft(false);
    }
  };

  const handleImportBestätigen = async () => {
    const alleFahrer = await ladeFahrer();
    const gültig = importZeilen.filter((z) => z.gültig);
    const konflikte: { zeile: ImportZeile; vorhandener: Fahrer }[] = [];

    for (const zeile of gültig) {
      const konflikt = findeKonflikt(alleFahrer, zeile.vorname, zeile.nachname, zeile.geburtsdatum);
      if (konflikt) konflikte.push({ zeile, vorhandener: konflikt });
    }

    if (konflikte.length > 0) {
      setAktuelleKonflikte(konflikte);
      setImportModal(false);
      setKonflikteModal(true);
    } else {
      await importDurchführen(gültig, 'überspringen');
    }
  };

  const importDurchführen = async (
    zeilen: ImportZeile[],
    konfliktStrategie: 'überschreiben' | 'überspringen'
  ) => {
    const alleFahrer = await ladeFahrer();
    let hinzugefügt = 0;
    let aktualisiert = 0;

    for (const zeile of zeilen) {
      if (!zeile.gültig) continue;
      const konflikt = findeKonflikt(alleFahrer, zeile.vorname, zeile.nachname, zeile.geburtsdatum);

      if (konflikt) {
        if (konfliktStrategie === 'überschreiben') {
          const aktuell = importZeileZuFahrer(zeile);
          aktuell.id = konflikt.id;
          await fahrerAktualisieren(aktuell);
          aktualisiert++;
        }
      } else {
        const neuer = importZeileZuFahrer(zeile);
        await fahrerHinzufügen(neuer);
        hinzugefügt++;
      }
    }

    setImportModal(false);
    setKonflikteModal(false);
    Alert.alert(
      'Import abgeschlossen',
      `${hinzugefügt} neu hinzugefügt, ${aktualisiert} aktualisiert.`
    );
    laden();
  };

  if (loading) {
    return (
      <View style={styles.ladeContainer}>
        <ActivityIndicator size="large" color={Colors.adacGelb} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter-Leiste */}
      <View style={styles.filterLeiste}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterInhalt}>
          {(['alle', 1, 2, 3, 4, 5] as KlassenFilter[]).map((k) => (
            <TouchableOpacity
              key={String(k)}
              style={[styles.filterChip, filter === k && styles.filterChipAktiv]}
              onPress={() => setFilter(k)}
            >
              <Text style={[styles.filterText, filter === k && styles.filterTextAktiv]}>
                {k === 'alle' ? 'Alle Klassen' : `Klasse ${k}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImport}
          disabled={importLäuft}
        >
          {importLäuft
            ? <ActivityIndicator size="small" color={Colors.textPrimär} />
            : <Ionicons name="document-text-outline" size={22} color={Colors.textPrimär} />
          }
          <Text style={styles.importText}>Excel-Import</Text>
        </TouchableOpacity>
      </View>

      {/* Fahrerliste */}
      {gefilterteFahrer.length === 0 ? (
        <View style={styles.leer}>
          <Ionicons name="people-outline" size={64} color={Colors.textDeaktiviert} />
          <Text style={styles.leerText}>
            {fahrer.length === 0 ? 'Noch keine Fahrer angelegt' : 'Keine Fahrer in dieser Klasse'}
          </Text>
          <Text style={styles.leerHinweis}>Tippe auf + um einen Fahrer hinzuzufügen</Text>
        </View>
      ) : (
        <FlatList
          data={gefilterteFahrer}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <FahrerKarte
              fahrer={item}
              onPress={() => navigation.navigate('FahrerDetail', { fahrerId: item.id })}
            />
          )}
          contentContainerStyle={styles.liste}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('FahrerBearbeiten', {})}
      >
        <Ionicons name="add" size={32} color={Colors.textPrimär} />
      </TouchableOpacity>

      {/* Import Vorschau Modal */}
      <Modal visible={importModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitel}>Import-Vorschau</Text>
            <TouchableOpacity onPress={() => setImportModal(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimär} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalUnter}>
            {importZeilen.filter((z) => z.gültig).length} gültige /{' '}
            {importZeilen.filter((z) => !z.gültig).length} fehlerhafte Zeilen
          </Text>

          <ScrollView style={styles.modalScroll}>
            {importZeilen.map((z, idx) => (
              <View
                key={idx}
                style={[styles.importZeile, !z.gültig && styles.importZeileFehler]}
              >
                <View style={styles.importZeileInfo}>
                  <Text style={styles.importName}>
                    {z.vorname} {z.nachname}
                  </Text>
                  <Text style={styles.importGeburt}>{formatDatum(z.geburtsdatum)}</Text>
                </View>
                <View style={styles.importRechts}>
                  {z.klasse && <KlassenBadge klasse={z.klasse} />}
                  {z.fehler.length > 0 && (
                    <View style={styles.fehlerBadge}>
                      <Ionicons name="warning" size={16} color={Colors.textHell} />
                    </View>
                  )}
                </View>
                {z.fehler.length > 0 && (
                  <Text style={styles.fehlerText}>{z.fehler.join(' • ')}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnAbbrechen} onPress={() => setImportModal(false)}>
              <Text style={styles.btnAbbrechenText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnImportieren,
                importZeilen.filter((z) => z.gültig).length === 0 && styles.btnDisabled,
              ]}
              onPress={handleImportBestätigen}
              disabled={importZeilen.filter((z) => z.gültig).length === 0}
            >
              <Text style={styles.btnImportierenText}>
                {importZeilen.filter((z) => z.gültig).length} Fahrer importieren
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Konflikt-Modal */}
      <Modal visible={konflikteModal} animationType="fade" transparent>
        <View style={styles.overlayModal}>
          <View style={styles.konflikteBox}>
            <Text style={styles.konflikteTitle}>
              {aktuelleKonflikte.length} Konflikte gefunden
            </Text>
            <Text style={styles.konflikteText}>
              Folgende Fahrer existieren bereits. Was soll passieren?
            </Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
              {aktuelleKonflikte.map(({ zeile }, i) => (
                <Text key={i} style={styles.konfliktName}>
                  • {zeile.vorname} {zeile.nachname} ({formatDatum(zeile.geburtsdatum)})
                </Text>
              ))}
            </ScrollView>
            <View style={styles.konflikteButtons}>
              <TouchableOpacity
                style={styles.konflikte_Abbrechen}
                onPress={() => setKonflikteModal(false)}
              >
                <Text style={styles.konflikteAbbreText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.konflikte_Überspringen}
                onPress={() => importDurchführen(importZeilen, 'überspringen')}
              >
                <Text style={styles.konflikteÜberspText}>Überspringen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.konflikte_Überschreiben}
                onPress={() => importDurchführen(importZeilen, 'überschreiben')}
              >
                <Text style={styles.konflikteÜberschText}>Überschreiben</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterLeiste: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.hintergrundHell,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
  },
  filterInhalt: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.hintergrundGrau,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterChipAktiv: { backgroundColor: Colors.adacGelb },
  filterText: { fontSize: 15, color: Colors.textSekundär },
  filterTextAktiv: { color: Colors.textPrimär, fontWeight: '700' },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.adacGelb,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginLeft: 12,
    minHeight: 44,
  },
  importText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimär },
  liste: { padding: 16 },
  leer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  leerText: { fontSize: 20, fontWeight: '600', color: Colors.textSekundär, textAlign: 'center' },
  leerHinweis: { fontSize: 16, color: Colors.textDeaktiviert, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.adacGelb,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: Colors.hintergrundHell },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trennlinie,
  },
  modalTitel: { fontSize: 22, fontWeight: '700', color: Colors.textPrimär },
  modalUnter: { fontSize: 16, color: Colors.textSekundär, paddingHorizontal: 20, paddingVertical: 8 },
  modalScroll: { flex: 1, paddingHorizontal: 16 },
  importZeile: {
    backgroundColor: Colors.hintergrundKarte,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  importZeileFehler: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: Colors.fehler },
  importZeileInfo: { flex: 1 },
  importName: { fontSize: 17, fontWeight: '600', color: Colors.textPrimär },
  importGeburt: { fontSize: 14, color: Colors.textSekundär },
  importRechts: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  fehlerBadge: {
    backgroundColor: Colors.fehler,
    borderRadius: 12,
    padding: 4,
  },
  fehlerText: { width: '100%', color: Colors.fehler, fontSize: 13, marginTop: 4 },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.trennlinie,
  },
  btnAbbrechen: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.hintergrundGrau,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAbbrechenText: { fontSize: 17, color: Colors.textPrimär },
  btnImportieren: {
    flex: 2,
    height: 52,
    backgroundColor: Colors.adacGelb,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnImportierenText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimär },
  btnDisabled: { opacity: 0.4 },
  overlayModal: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  konflikteBox: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 16,
    padding: 24,
    width: 480,
  },
  konflikteTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimär, marginBottom: 8 },
  konflikteText: { fontSize: 16, color: Colors.textSekundär, marginBottom: 12 },
  konfliktName: { fontSize: 15, color: Colors.textPrimär, marginBottom: 4 },
  konflikteButtons: { flexDirection: 'row', gap: 10 },
  konflikte_Abbrechen: {
    flex: 1, height: 48, backgroundColor: Colors.hintergrundGrau,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  konflikteAbbreText: { fontSize: 15, color: Colors.textPrimär },
  konflikte_Überspringen: {
    flex: 1, height: 48, backgroundColor: Colors.warnung,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  konflikteÜberspText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimär },
  konflikte_Überschreiben: {
    flex: 1, height: 48, backgroundColor: Colors.adacGelb,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  konflikteÜberschText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimär },
});
