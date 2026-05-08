import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { formatZeit } from '../utils/zeitFormatierung';

interface Props {
  ms: number | null;
  style?: TextStyle;
  platzhalter?: string;
}

export const ZeitAnzeige: React.FC<Props> = ({ ms, style, platzhalter = '–:––,––' }) => {
  const anzeige = ms !== null ? formatZeit(ms) : platzhalter;
  return <Text style={[styles.zeit, style]}>{anzeige}</Text>;
};

const styles = StyleSheet.create({
  zeit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimär,
    fontVariant: ['tabular-nums'],
  },
});
