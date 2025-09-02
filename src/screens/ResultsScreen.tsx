import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const { width } = Dimensions.get('window');

export default function ResultsScreen() {
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const route = useRoute<ResultsScreenRouteProp>();
  
  const [showPopup, setShowPopup] = useState(false);

  // Add default values and error handling for route parameters
  const prediction = route.params?.prediction ?? 0;
  const confidenceValue = route.params?.confidence ?? 0;
  const testData = route.params?.testData;

  const isLegitimate = prediction === 1;
  const confidencePercentage = Math.round(confidenceValue * 100);

  // Add validation to ensure we have valid data
  const hasValidData = route.params && typeof prediction === 'number' && typeof confidenceValue === 'number';

  // Calculate behavioral metrics from test data
  const getBehavioralMetrics = () => {
    if (!testData) return null;
    
    const keyEvents = testData.key_events || [];
    const mouseEvents = testData.mouse_events || [];
    
    return {
      totalKeystrokes: keyEvents.length,
      totalMouseEvents: mouseEvents.length,
      testDuration: keyEvents.length > 0 ? 
        Math.max(...keyEvents.map((e: any) => e.Time || 0)) - Math.min(...keyEvents.map((e: any) => e.Time || 0)) : 0,
      avgTypingSpeed: keyEvents.length > 1 ? 
        (keyEvents.length / ((Math.max(...keyEvents.map((e: any) => e.Time || 0)) - Math.min(...keyEvents.map((e: any) => e.Time || 0))) / 1000)) : 0
    };
  };

  const behavioralMetrics = getBehavioralMetrics();

  useEffect(() => {
    // Show popup notification immediately when results are available (matching Python reference)
    if (hasValidData) {
      setShowPopup(true);
    }
  }, [hasValidData]);

  const getResultIcon = () => {
    if (!hasValidData) return '❓';
    return isLegitimate ? '✅' : '❌';
  };

  const getResultTitle = () => {
    if (!hasValidData) return 'No Test Data';
    return isLegitimate ? 'Authentication Successful' : 'Authentication Failed';
  };

  const getResultSubtitle = () => {
    if (!hasValidData) return 'Please run a test first';
    return isLegitimate 
      ? 'Behavioral patterns match legitimate user profile' 
      : 'Behavioral patterns indicate potential fraud';
  };

  const getConfidenceColor = () => {
    if (!hasValidData) return '#999';
    if (confidencePercentage >= 80) return '#4CAF50';
    if (confidencePercentage >= 60) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceLabel = () => {
    if (!hasValidData) return 'Unknown';
    if (confidencePercentage >= 80) return 'High Confidence';
    if (confidencePercentage >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const handleNewTest = () => {
    navigation.navigate('Testing');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <>
      {/* Popup Modal (matching Python reference behavior) */}
      <Modal
        visible={showPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupContainer}>
            <Text style={styles.popupIcon}>{getResultIcon()}</Text>
            <Text style={styles.popupTitle}>{getResultTitle()}</Text>
            <Text style={styles.popupConfidence}>
              Confidence: {confidencePercentage}%
            </Text>
            <Text style={styles.popupMessage}>
              {isLegitimate 
                ? 'Behavioral patterns match the legitimate user profile.' 
                : 'Behavioral patterns indicate potential fraud.'}
            </Text>
            <TouchableOpacity 
              style={styles.popupButton} 
              onPress={() => setShowPopup(false)}
            >
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Authentication Results</Text>
          <Text style={styles.subtitle}>Behavioral biometric analysis complete</Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultIcon}>{getResultIcon()}</Text>
          <Text style={styles.resultTitle}>{getResultTitle()}</Text>
          <Text style={styles.resultSubtitle}>{getResultSubtitle()}</Text>
        </View>

        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceTitle}>Confidence Score</Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${confidencePercentage}%`,
                  backgroundColor: getConfidenceColor()
                }
              ]} 
            />
          </View>
          <Text style={styles.confidenceText}>
            {confidencePercentage}% - {getConfidenceLabel()}
          </Text>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Analysis Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prediction:</Text>
            <Text style={styles.detailValue}>
              {isLegitimate ? 'Legitimate User' : 'Fraudulent Activity'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Risk Level:</Text>
            <Text style={[styles.detailValue, { color: getConfidenceColor() }]}>
              {isLegitimate ? 'Low Risk' : 'High Risk'}
            </Text>
          </View>
          
          {/* Behavioral Metrics Section */}
          {behavioralMetrics && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Keystrokes Captured:</Text>
                <Text style={styles.detailValue}>{behavioralMetrics.totalKeystrokes}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mouse Events:</Text>
                <Text style={styles.detailValue}>{behavioralMetrics.totalMouseEvents}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Test Duration:</Text>
                <Text style={styles.detailValue}>{(behavioralMetrics.testDuration / 1000).toFixed(1)}s</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Avg Typing Speed:</Text>
                <Text style={styles.detailValue}>{behavioralMetrics.avgTypingSpeed.toFixed(1)} keys/sec</Text>
              </View>
            </>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model Confidence:</Text>
            <Text style={styles.detailValue}>{confidencePercentage}%</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNewTest}>
            <Text style={styles.primaryButtonText}>Run Another Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && { height: '100%' })
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    ...(Platform.OS === 'web' && { flexGrow: 1 })
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  resultIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  confidenceSection: {
    marginBottom: 24
  },
  confidenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4
  },
  confidenceText: {
    fontSize: 14,
    color: '#666'
  },
  detailsSection: {
    marginBottom: 24
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  actionSection: {
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500'
  },
  // Popup Modal Styles (matching Python reference)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  popupContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8
  },
  popupIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  popupConfidence: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center'
  },
  popupMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20
  },
  popupButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
