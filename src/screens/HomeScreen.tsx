import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import {BehavioralAuthService }from '../services/BehavioralAuthService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [trainingProgress, setTrainingProgress] = useState(BehavioralAuthService.getTrainingProgress());
  const [isModelReady, setIsModelReady] = useState(BehavioralAuthService.isModelReady());

  // Refresh model status when component mounts
  useEffect(() => {
    const refreshStatus = async () => {
      await BehavioralAuthService.refreshModelStatus();
      setTrainingProgress(BehavioralAuthService.getTrainingProgress());
      setIsModelReady(BehavioralAuthService.isModelReady());
    };
    
    refreshStatus();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={Platform.OS === 'web' ? ([styles.scrollView, { overflow: 'auto' }] as any) : styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Behavioral Authentication</Text>
          <Text style={styles.subtitle}>Secure authentication using behavioral biometrics</Text>
        </View>

        {/* Status Overview */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Text style={styles.statusNumber}>{trainingProgress.legitimate}</Text>
              <Text style={styles.statusLabel}>Training Sessions</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusNumber}>{10 - trainingProgress.legitimate}</Text>
              <Text style={styles.statusLabel}>Sessions Remaining</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusNumber}>{trainingProgress.total}</Text>
              <Text style={styles.statusLabel}>Total Sessions</Text>
            </View>
          </View>
        </View>

        {/* Model Status */}
        <View style={styles.modelSection}>
          <Text style={styles.sectionTitle}>Model Status</Text>
          <View style={styles.modelStatus}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isModelReady ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {isModelReady ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isModelReady ? 'Model Ready' : 'Model Not Ready'}
              </Text>
              <Text style={styles.statusDescription}>
                {isModelReady 
                  ? 'The behavioral authentication model is trained and ready for use.'
                  : 'Complete 10 training sessions to train the model.'
                }
              </Text>
            </View>
          </View>
          
          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton]}
            onPress={async () => {
              await BehavioralAuthService.refreshModelStatus();
              setTrainingProgress(BehavioralAuthService.getTrainingProgress());
              setIsModelReady(BehavioralAuthService.isModelReady());
            }}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
          </TouchableOpacity>

          {/* Manual Training Button - Show when user has 10 sessions but model isn't ready */}
          {trainingProgress.legitimate >= 10 && !isModelReady && (
            <TouchableOpacity
              style={[styles.trainModelButton]}
              onPress={async () => {
                const success = await BehavioralAuthService.triggerModelTraining();
                if (success) {
                  setTrainingProgress(BehavioralAuthService.getTrainingProgress());
                  setIsModelReady(BehavioralAuthService.isModelReady());
                }
              }}
            >
              <Text style={styles.trainModelButtonText}>🚀 Train Model Now</Text>
            </TouchableOpacity>
          )}

          {/* Retrain Button - Show when model is ready but user wants to improve it */}
          {isModelReady && trainingProgress.legitimate >= 10 && (
            <TouchableOpacity
              style={[styles.retrainModelButton]}
              onPress={async () => {
                const success = await BehavioralAuthService.retrainModel();
                if (success) {
                  setTrainingProgress(BehavioralAuthService.getTrainingProgress());
                  setIsModelReady(BehavioralAuthService.isModelReady());
                }
              }}
            >
              <Text style={styles.retrainModelButtonText}>🔄 Retrain Model</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.trainingButton]}
            onPress={() => navigation.navigate('Training')}
          >
            <Text style={styles.actionButtonText}>Training Mode</Text>
            <Text style={styles.actionButtonSubtext}>
              Complete training sessions to build your behavioral profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.testingButton,
              !isModelReady && styles.disabledButton
            ]}
            onPress={() => navigation.navigate('Testing')}
            disabled={!isModelReady}
          >
            <Text style={styles.actionButtonText}>Testing Mode</Text>
            <Text style={styles.actionButtonSubtext}>
              Test the trained model with new behavioral data
            </Text>
          </TouchableOpacity>

          {isModelReady && (
            <TouchableOpacity
              style={[styles.actionButton, styles.resultsButton]}
              onPress={() => navigation.navigate('Results' as any)}
            >
              <Text style={styles.actionButtonText}>View Results</Text>
              <Text style={styles.actionButtonSubtext}>
                See detailed analysis and performance metrics
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Debug Information - Remove this in production */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Info (Development Only)</Text>
            <Text style={styles.debugText}>
              Training Data: {trainingProgress.legitimate}/10{'\n'}
              Legitimate Profile: {BehavioralAuthService.getModelStatus().hasLegitimateProfile ? '✓' : '✗'}{'\n'}
              Model Trained Flag: {BehavioralAuthService.getModelStatus().isModelTrained ? '✓' : '✗'}{'\n'}
              Is Model Ready: {isModelReady ? '✓' : '✗'}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.instructionSteps}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepTitle}>Training Phase: </Text>
                Complete 10 training sessions by filling out the form with the exact card details shown. Each session captures your unique typing patterns and touch behaviors. Only legitimate user behavior is collected during training.
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepTitle}>Model Training: </Text>
                After 10 sessions, the system automatically trains a behavioral authentication model using machine learning algorithms.
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepTitle}>Testing Phase: </Text>
                Once trained, test the model by filling out forms with any card details. The system will classify whether the behavior matches your trained profile.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Behavioral biometrics provide secure, continuous authentication based on your unique interaction patterns.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' && { 
      height: '100%',
    }),
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && { 
      height: 'auto'
    }),
  },
  scrollContent: {
    paddingBottom: 40,
    ...(Platform.OS === 'web' && { 
      flexGrow: 1
    }),
  },
  header: {
    backgroundColor: '#2E86AB',
    padding: 30,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 50 : 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statusCard: {
    alignItems: 'center',
    padding: 15,
    minWidth: 80,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modelSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trainingButton: {
    backgroundColor: '#4CAF50',
  },
  testingButton: {
    backgroundColor: '#2196F3',
  },
  resultsButton: {
    backgroundColor: '#FF9800',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionButtonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  instructionsSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionSteps: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2E86AB',
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 30,
    marginRight: 15,
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  stepTitle: {
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // NEW: Refresh button styles
  refreshButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // NEW: Debug section styles
  debugSection: {
    backgroundColor: '#fff3cd',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
  // NEW: Train model button styles
  trainModelButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trainModelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // NEW: Retrain button styles
  retrainModelButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retrainModelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});