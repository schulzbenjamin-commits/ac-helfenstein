import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../constants/colors';
import { formatZeit } from '../utils/zeitFormatierung';

export interface DiagrammDatenreihe {
  fahrerId: string;
  name: string;
  farbe: string;
  punkte: { datum: string; ms: number }[];
}

interface Props {
  reihen: DiagrammDatenreihe[];
  labels: string[];
}

const DIAGRAMM_FARBEN = [
  '#E53E3E', '#ED8936', '#48BB78', '#4299E1',
  '#9F7AEA', '#F687B3', '#38B2AC', '#FFD700',
];

export const farbeNachIndex = (index: number): string =>
  DIAGRAMM_FARBEN[index % DIAGRAMM_FARBEN.length];

export const ZeitlinienDiagramm: React.FC<Props> = ({ reihen, labels }) => {
  if (reihen.length === 0 || labels.length === 0) {
    return (
      <View style={styles.leer}>
        <Text style={styles.leerText}>Keine Daten für Diagramm verfügbar</Text>
      </View>
    );
  }

  const breite = Math.max(Dimensions.get('window').width - 40, labels.length * 80);

  const datasets = reihen.map((r, idx) => ({
    data: r.punkte.map((p) => p.ms / 1000),
    color: () => r.farbe || farbeNachIndex(idx),
    strokeWidth: 2,
  }));

  const chartConfig = {
    backgroundColor: Colors.hintergrundHell,
    backgroundGradientFrom: Colors.hintergrundHell,
    backgroundGradientTo: Colors.hintergrundHell,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '5', strokeWidth: '2' },
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{ labels, datasets }}
          width={breite}
          height={280}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix="s"
          fromZero={false}
        />
      </ScrollView>

      {/* Legende */}
      <View style={styles.legende}>
        {reihen.map((r, idx) => (
          <View key={r.fahrerId} style={styles.legendeEintrag}>
            <View style={[styles.legendeFarbe, { backgroundColor: r.farbe || farbeNachIndex(idx) }]} />
            <Text style={styles.legendeName}>{r.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.hintergrundHell,
    borderRadius: 12,
    padding: 12,
  },
  chart: {
    borderRadius: 12,
  },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  legendeEintrag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendeFarbe: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendeName: {
    fontSize: 14,
    color: Colors.textPrimär,
  },
  leer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.hintergrundGrau,
    borderRadius: 12,
  },
  leerText: {
    color: Colors.textSekundär,
    fontSize: 16,
  },
});
