import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from './src/constants/colors';
import { FahrerStackParamList, TrainingStackParamList, AnalyseStackParamList, EinstellungenStackParamList } from './src/types';

// Fahrer-Screens
import { FahrerListeScreen } from './src/screens/fahrer/FahrerListeScreen';
import { FahrerDetailScreen } from './src/screens/fahrer/FahrerDetailScreen';
import { FahrerBearbeitenScreen } from './src/screens/fahrer/FahrerBearbeitenScreen';

// Training-Screens
import { TrainingListeScreen } from './src/screens/training/TrainingListeScreen';
import { TrainingDetailScreen } from './src/screens/training/TrainingDetailScreen';
import { TrainingErstellenScreen } from './src/screens/training/TrainingErstellenScreen';
import { RennmodusScreen } from './src/screens/training/RennmodusScreen';
import { ErgebnislisteScreen } from './src/screens/training/ErgebnislisteScreen';

// Analyse & Einstellungen
import { AnalyseScreen } from './src/screens/analyse/AnalyseScreen';
import { EinstellungenScreen } from './src/screens/EinstellungenScreen';

const Tab = createBottomTabNavigator();
const FahrerStack = createStackNavigator<FahrerStackParamList>();
const TrainingStack = createStackNavigator<TrainingStackParamList>();
const AnalyseStack = createStackNavigator<AnalyseStackParamList>();
const EinstellungenStack = createStackNavigator<EinstellungenStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.hintergrundHell },
  headerTintColor: Colors.textPrimär,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
  cardStyle: { backgroundColor: Colors.hintergrundGrau },
};

function FahrerNavigator() {
  return (
    <FahrerStack.Navigator screenOptions={screenOptions}>
      <FahrerStack.Screen
        name="FahrerListe"
        component={FahrerListeScreen}
        options={{ title: 'Fahrer' }}
      />
      <FahrerStack.Screen
        name="FahrerDetail"
        component={FahrerDetailScreen}
        options={{ title: 'Fahrer-Details' }}
      />
      <FahrerStack.Screen
        name="FahrerBearbeiten"
        component={FahrerBearbeitenScreen}
        options={({ route }) => ({
          title: route.params?.fahrerId ? 'Fahrer bearbeiten' : 'Neuer Fahrer',
        })}
      />
    </FahrerStack.Navigator>
  );
}

function TrainingNavigator() {
  return (
    <TrainingStack.Navigator screenOptions={screenOptions}>
      <TrainingStack.Screen
        name="TrainingListe"
        component={TrainingListeScreen}
        options={{ title: 'Trainings' }}
      />
      <TrainingStack.Screen
        name="TrainingDetail"
        component={TrainingDetailScreen}
        options={{ title: 'Training-Details' }}
      />
      <TrainingStack.Screen
        name="TrainingErstellen"
        component={TrainingErstellenScreen}
        options={({ route }) => ({
          title: route.params?.trainingId ? 'Training bearbeiten' : 'Neues Training',
        })}
      />
      <TrainingStack.Screen
        name="Rennmodus"
        component={RennmodusScreen}
        options={{ headerShown: false }}
      />
      <TrainingStack.Screen
        name="Ergebnisliste"
        component={ErgebnislisteScreen}
        options={{ title: 'Ergebnisse' }}
      />
    </TrainingStack.Navigator>
  );
}

function AnalyseNavigator() {
  return (
    <AnalyseStack.Navigator screenOptions={screenOptions}>
      <AnalyseStack.Screen
        name="Analyse"
        component={AnalyseScreen}
        options={{ title: 'Analyse' }}
      />
    </AnalyseStack.Navigator>
  );
}

function EinstellungenNavigator() {
  return (
    <EinstellungenStack.Navigator screenOptions={screenOptions}>
      <EinstellungenStack.Screen
        name="Einstellungen"
        component={EinstellungenScreen}
        options={{ title: 'Einstellungen' }}
      />
    </EinstellungenStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: Colors.adacGelb,
            tabBarInactiveTintColor: Colors.tabInaktiv,
            tabBarStyle: {
              backgroundColor: Colors.tabHintergrund,
              borderTopColor: Colors.trennlinie,
              height: 60,
              paddingBottom: 8,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'help';
              if (route.name === 'FahrerTab') {
                iconName = focused ? 'people' : 'people-outline';
              } else if (route.name === 'TrainingTab') {
                iconName = focused ? 'flag' : 'flag-outline';
              } else if (route.name === 'AnalyseTab') {
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              } else if (route.name === 'EinstellungenTab') {
                iconName = focused ? 'settings' : 'settings-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="FahrerTab"
            component={FahrerNavigator}
            options={{ tabBarLabel: 'Fahrer' }}
          />
          <Tab.Screen
            name="TrainingTab"
            component={TrainingNavigator}
            options={{ tabBarLabel: 'Training' }}
          />
          <Tab.Screen
            name="AnalyseTab"
            component={AnalyseNavigator}
            options={{ tabBarLabel: 'Analyse' }}
          />
          <Tab.Screen
            name="EinstellungenTab"
            component={EinstellungenNavigator}
            options={{ tabBarLabel: 'Einstellungen' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
