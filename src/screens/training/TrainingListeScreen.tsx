import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Training } from '../../types';
import { TrainingStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { ladeTrainings, trainingLöschen } from '../../storage/trainingStorage';
import { löscheLäufeVonTraining } from '../../storage/laufStorage';
import { formatDatum } from '../../utils/zeitFormatierung';

type Nav = StackNavigationProp<TrainingStackParamList, 'TrainingListe'>;

interface Props {
  navigation: Nav;
}

export const TrainingListeScreen: React.FC<Props> = ({ navigation }) => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      laden();
    }, [])
  );

  const laden = async () => {
    setLoading(true);
    const alle = await ladeTrainings();
    setTrainings(alle);
    setLoading(false);
  };

  const handleLöschen = (training: Training) => {
    Alert.alert(
      'Training löschen',
      `"${training.name}" und alle zugehörigen Läufe löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await löscheLäufeVonTraining(training.id);
            await trainingLöschen(training.id);
            laden();
          },
        },
      ]
    );
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
      {trainings.length === 0 ? (
        <View style={styles.leer}>
          <Ionicons name="flag-outline" size={64} color={Colors.textDeaktiviert} />
          <Text style={styles.leerText}>Noch keine Trainings angelegt</Text>
          <Text style={styles.leerHinweis}>Tippe auf + um ein Training zu erstellen</Text>
        </View>
      ) : (
        <FlatList
          data={trainings}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.karte}
              onPress={() => navigation.navigate('TrainingDetail', { trainingId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.karteLinks}>
                <Text style={styles.trainingsName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.trainingsDatum}>{formatDatum(item.datum)}</Text>
                {item.ort && <Text style={styles.trainingsOrt}>📍 {item.ort}</Text>}
                <View style={styles.karteDetails}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.teilnehmerIds.length} Fahrer</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.anzahlLauefe} Läufe</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: Colors.adacGelb }]}>
                    <Text style={[styles.badgeText, { color: Colors.textPrimär }]}>
                      {item.laufTypen.filter((t) => t === 'wertung').length}× Wertung
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.karteRechts}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => navigation.navigate('Rennmodus', { trainingId: item.id })}
                >
                  <Ionicons name="play-circle" size={28} color={Colors.adacGelb} />
                  <Text style={styles.startText}>Rennmodus</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleLöschen(item)} style={styles.löschenBtn}>
                  <Ionicons name="trash-outline" size={22} color={Colors.fehler} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.liste}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TrainingErstellen', {})}
      >
        <Ionicons name="add" size={32} color={Colors.textPrimär} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.hintergrundGrau },
  ladeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  liste: { padding: 16 },
  leer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  leerText: { fontSize: 20, fontWeight: '600', color: Colors.textSekundär, textAlign: 'center' },
  leerHinweis: { fontSize: 16, color: Colors.textDeaktiviert, textAlign: 'center' },
  karte: {
    flexDirection: 'row',
    backgroundColor: Colors.hintergrundKarte,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.schatten,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  karteLinks: { flex: 1, gap: 4 },
  trainingsName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimär },
  trainingsDatum: { fontSize: 16, color: Colors.textSekundär },
  trainingsOrt: { fontSize: 15, color: Colors.textSekundär },
  karteDetails: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  badge: {
    backgroundColor: Colors.hintergrundGrau,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 13, color: Colors.textSekundär, fontWeight: '600' },
  karteRechts: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  startButton: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.hintergrundDunkel,
    borderRadius: 10,
    padding: 10,
    minWidth: 88,
  },
  startText: { fontSize: 13, color: Colors.adacGelb, fontWeight: '600' },
  löschenBtn: { padding: 8 },
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
});
