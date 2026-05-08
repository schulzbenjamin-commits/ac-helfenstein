import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fahrer } from '../types';
import { Colors } from '../constants/colors';
import { KlassenBadge } from './KlassenBadge';
import { formatDatum } from '../utils/zeitFormatierung';

interface Props {
  fahrer: Fahrer;
  onPress: () => void;
  ausgewählt?: boolean;
  kompakt?: boolean;
}

export const FahrerKarte: React.FC<Props> = ({ fahrer, onPress, ausgewählt = false, kompakt = false }) => {
  return (
    <TouchableOpacity
      style={[styles.karte, ausgewählt && styles.karteAusgewählt, kompakt && styles.karteKompakt]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Text style={[styles.name, kompakt && styles.nameKompakt]} numberOfLines={1}>
          {fahrer.vorname} {fahrer.nachname}
        </Text>
        {!kompakt && (
          <Text style={styles.geburtstag}>{formatDatum(fahrer.geburtsdatum)}</Text>
        )}
      </View>
      <View style={styles.rechts}>
        <KlassenBadge klasse={fahrer.klasse} />
        {!kompakt && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textSekundär}
            style={styles.pfeil}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  karte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.hintergrundKarte,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    minHeight: 64,
    shadowColor: Colors.schatten,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  karteAusgewählt: {
    borderWidth: 2,
    borderColor: Colors.adacGelb,
    backgroundColor: '#FFFDE7',
  },
  karteKompakt: {
    padding: 12,
    marginBottom: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimär,
  },
  nameKompakt: {
    fontSize: 16,
  },
  geburtstag: {
    fontSize: 14,
    color: Colors.textSekundär,
    marginTop: 2,
  },
  rechts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pfeil: {
    marginLeft: 4,
  },
});
