import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, klasseZuFarbe } from '../constants/colors';
import { klassenKurzLabel } from '../utils/klassenBerechnung';

interface Props {
  klasse: 1 | 2 | 3 | 4 | 5 | null;
  groß?: boolean;
}

export const KlassenBadge: React.FC<Props> = ({ klasse, groß = false }) => {
  const farbe = klasseZuFarbe(klasse);
  const label = klassenKurzLabel(klasse);

  return (
    <View style={[styles.badge, groß && styles.badgeGroß, { backgroundColor: farbe }]}>
      <Text style={[styles.text, groß && styles.textGroß]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  badgeGroß: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
  },
  text: {
    color: Colors.textHell,
    fontSize: 14,
    fontWeight: '700',
  },
  textGroß: {
    fontSize: 20,
  },
});
