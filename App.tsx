import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import TestingScreen from './src/screens/TestingScreen';
import ResultsScreen from './src/screens/ResultsScreen';

export type RootStackParamList = {
  Home: undefined;
  Training: undefined;
  Testing: undefined;
  Results: { prediction: number; confidence: number; testData?: any };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';
      } catch (e) {
        // ignore
      }
    }
  }, []);

  return (
  <SafeAreaProvider style={{ flex: 1 }}>
    <View style={Platform.OS === 'web' ? ({ flex: 1, overflowY: 'auto' } as any) : { flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2E86AB',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Behavioral Authentication' }}
          />
          <Stack.Screen 
            name="Training" 
            component={TrainingScreen} 
            options={{ title: 'Train Model' }}
          />
          <Stack.Screen 
            name="Testing" 
            component={TestingScreen} 
            options={{ title: 'Test Model' }}
          />
          <Stack.Screen 
            name="Results" 
            component={ResultsScreen} 
            options={{ title: 'Authentication Result' }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </View>
    </SafeAreaProvider>
  );
} 