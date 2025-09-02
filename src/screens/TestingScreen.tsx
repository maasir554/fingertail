import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useBehavioralData } from '../hooks/useBehavioralData';
import { BehavioralAuthService } from '../services/BehavioralAuthService';

type TestingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Testing'>;

interface FormData {
  cardType: string;
  name: string;
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

interface FieldValidation {
  cardType: boolean;
  name: boolean;
  cardNumber: boolean;
  cvc: boolean;
  expiryMonth: boolean;
  expiryYear: boolean;
}

// Reference card details (exact same as training)
const VALID_CARD_DETAILS = {
  cardType: 'Discover',
  name: 'Mrs Ellie Miller',
  cardNumber: '4422891459068728',
  cvc: '646',
  expiryMonth: '09',
  expiryYear: '23'
};

const CARD_TYPES = ['Visa', 'MasterCard', 'Amex', 'Discover', 'Other'];

export default function TestingScreen() {
  const navigation = useNavigation<TestingScreenNavigationProp>();
  const [formData, setFormData] = useState<FormData>({
    cardType: '',
    name: '',
    cardNumber: '',
    cvc: '',
    expiryMonth: '',
    expiryYear: ''
  });
  const [fieldValidation, setFieldValidation] = useState<FieldValidation>({
    cardType: false,
    name: false,
    cardNumber: false,
    cvc: false,
    expiryMonth: false,
    expiryYear: false
  });
  const [isRecording, setIsRecording] = useState(false);
  
  const {
    startRecording,
    stopRecording,
    recordKeyEvent,
    recordMouseEvent,
    setInputBox,
    updateTextChanged,
    resetData,
    getCurrentData
  } = useBehavioralData();

  // Validation function
  const validateField = (field: keyof FormData, value: string): boolean => {
    switch (field) {
      case 'cardType':
        return value === VALID_CARD_DETAILS.cardType;
      case 'name':
        return value === VALID_CARD_DETAILS.name;
      case 'cardNumber':
        return value === VALID_CARD_DETAILS.cardNumber;
      case 'cvc':
        return value === VALID_CARD_DETAILS.cvc;
      case 'expiryMonth':
        return value === VALID_CARD_DETAILS.expiryMonth;
      case 'expiryYear':
        return value === VALID_CARD_DETAILS.expiryYear;
      default:
        return false;
    }
  };

  // Check if all fields are valid for auto-submit
  const isFormComplete = (): boolean => {
    return Object.values(fieldValidation).every(valid => valid);
  };

  // Auto-submit effect
  useEffect(() => {
    if (isRecording && isFormComplete()) {
      console.log('Form complete, auto-submitting in 1 second...');
      setTimeout(() => {
        console.log('Auto-submit triggered');
        handleSubmit();
      }, 1000); // Increased delay to ensure all data is captured
    }
  }, [fieldValidation, isRecording]);

  const startTest = () => {
    const behavioralService = BehavioralAuthService.getInstance();
    if (!BehavioralAuthService.isModelReady()) {
      Alert.alert('Model Not Ready', 'Please train the model first with 10 sessions.');
      return;
    }

    setFormData({
      cardType: '',
      name: '',
      cardNumber: '',
      cvc: '',
      expiryMonth: '',
      expiryYear: ''
    });

    setFieldValidation({
      cardType: false,
      name: false,
      cardNumber: false,
      cvc: false,
      expiryMonth: false,
      expiryYear: false
    });

    resetData();
    startRecording();
    setIsRecording(true);
    
    Alert.alert('Test Started', 'Please enter the reference card details exactly as shown in the reference box above.');
  };

  const handleSubmit = async () => {
    if (!isRecording) {
      Alert.alert('Error', 'Please start a test first.');
      return;
    }

    stopRecording();
    setIsRecording(false);

    const currentData = getCurrentData();
    const keyEventCount = currentData.key_events?.length || 0;

    if (keyEventCount < 5) {
      Alert.alert('Insufficient Data', 'Please provide more keystrokes for accurate testing.');
      return;
    }

    try {
      console.log('Starting prediction with data:', currentData);
      const behavioralService = BehavioralAuthService.getInstance();
      console.log('Got behavioral service instance');
      
      const result = await behavioralService.predict(currentData);
      console.log('Prediction result:', result);
      
      // Use the numeric prediction directly (1 = legitimate, 0 = fraudulent)
      const predictionNumber = result.prediction;
      const isLegitimate = predictionNumber === 1;
      
      console.log('About to navigate to Results screen');
      
      // For web platform, skip Alert.alert and navigate directly
      if (Platform.OS === 'web') {
        console.log('Web platform detected - navigating directly to Results');
        navigation.navigate('Results', {
          prediction: predictionNumber,
          confidence: result.confidence,
          testData: currentData
        });
      } else {
        // Show completion popup for mobile platforms
        Alert.alert(
          '🎯 Test Completed!',
          `Authentication test finished successfully.\n\nResult: ${isLegitimate ? '✅ Legitimate User' : '❌ Fraudulent Behavior'}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\n\nTap OK to view detailed analysis.`,
          [
            {
              text: 'View Analysis',
              onPress: () => {
                console.log('Navigating to Results screen');
                navigation.navigate('Results', {
                  prediction: predictionNumber,
                  confidence: result.confidence,
                  testData: currentData
                });
              }
            }
          ]
        );
      }
      console.log('Navigation/Alert completed successfully');
      
    } catch (error) {
      console.error('Error in testing:', error);
      Alert.alert('Error', 'Failed to test the model. Please try again.');
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation during recording
    if (isRecording) {
      const isValid = validateField(field, value);
      setFieldValidation(prev => ({ ...prev, [field]: isValid }));
    }
    
    updateTextChanged(true);
  };

  // Keyboard event handling
  const handleKeyPress = (e: any, field: string) => {
    if (e && e.nativeEvent && e.nativeEvent.key) {
      recordKeyEvent(e.nativeEvent.key, 'pressed');
    }
  };

  const handleKeyRelease = (e: any, field: string) => {
    if (e && e.nativeEvent && e.nativeEvent.key) {
      recordKeyEvent(e.nativeEvent.key, 'released');
    }
  };

  // Touch event handling for mobile
  const handleTouchStart = (event: any, field: string) => {
    recordMouseEvent('touch', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const handleTouchEnd = (event: any, field: string) => {
    recordMouseEvent('release', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const handleTouchMove = (event: any, field: string) => {
    recordMouseEvent('move', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  // Mouse event handling for web
  const handleMouseDown = (event: React.MouseEvent<HTMLInputElement>, field: string) => {
    if (Platform.OS === 'web') {
      recordMouseEvent('touch', { x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLInputElement>, field: string) => {
    if (Platform.OS === 'web') {
      recordMouseEvent('release', { x: event.clientX, y: event.clientY });
    }
  };

  // Helper function to get input props based on platform
  const getInputProps = (field: keyof FormData) => {
    const baseProps = {
      onChangeText: (value: string) => handleInputChange(field, value),
      onFocus: () => setInputBox(field),
      onKeyPress: (e: any) => handleKeyPress(e, field),
      onTouchStart: (e: any) => handleTouchStart(e, field),
      onTouchEnd: (e: any) => handleTouchEnd(e, field),
      onTouchMove: (e: any) => handleTouchMove(e, field),
    };

    // Add mouse events only for web platform
    if (Platform.OS === 'web') {
      return {
        ...baseProps,
        onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => handleMouseDown(e, field),
        onMouseUp: (e: React.MouseEvent<HTMLInputElement>) => handleMouseUp(e, field),
      };
    }

    return baseProps;
  };

  const resetModel = async () => {
    Alert.alert(
      'Reset Model',
      'Are you sure you want to delete the trained model? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const behavioralService = BehavioralAuthService.getInstance();
            await behavioralService.resetModel();
            Alert.alert('Model Reset', 'The behavioral authentication model has been reset.');
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={Platform.OS === 'web' ? ([styles.scrollView, { overflow: 'auto' }] as any) : styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Behavioral Authentication Test</Text>
          <Text style={styles.subtitle}>Test your behavioral patterns against the trained model</Text>
        </View>

        {/* Reference Card Display */}
        <View style={styles.referenceSection}>
          <Text style={styles.referenceTitle}>📋 Reference Card Details</Text>
          <Text style={styles.referenceSubtitle}>Enter these exact details during the test:</Text>
          
          <View style={styles.referenceCard}>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Card Type:</Text>
              <Text style={styles.referenceValue}>{VALID_CARD_DETAILS.cardType}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Name:</Text>
              <Text style={styles.referenceValue}>{VALID_CARD_DETAILS.name}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Card Number:</Text>
              <Text style={styles.referenceValue}>{VALID_CARD_DETAILS.cardNumber}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>CVC:</Text>
              <Text style={styles.referenceValue}>{VALID_CARD_DETAILS.cvc}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Expiry:</Text>
              <Text style={styles.referenceValue}>{VALID_CARD_DETAILS.expiryMonth}/{VALID_CARD_DETAILS.expiryYear}</Text>
            </View>
          </View>
        </View>

        {/* Start Session Button */}
        <View style={styles.startSection}>
          <TouchableOpacity
            style={[
              styles.bigStartButton,
              !BehavioralAuthService.isModelReady() && styles.disabledButton,
              isRecording && styles.recordingButton
            ]}
            onPress={startTest}
            disabled={!BehavioralAuthService.isModelReady() || isRecording}
          >
            <Text style={styles.bigStartButtonText}>
              {isRecording ? '🔴 Recording Authentication Test...' : '▶️ Start Authentication Test'}
            </Text>
          </TouchableOpacity>
          
          {!BehavioralAuthService.isModelReady() && (
            <Text style={styles.modelNotReadyText}>
              ⚠️ Please complete training (10 sessions) before testing
            </Text>
          )}
          
          {isRecording && (
            <Text style={styles.recordingText}>
              📝 Enter the reference card details exactly as shown above
            </Text>
          )}
        </View>

        {/* Test Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Authentication Form</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>Card Type</Text>
            <View style={styles.radioRow}>
              {CARD_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioButton, 
                    formData.cardType === type && styles.radioSelected,
                    fieldValidation.cardType && formData.cardType === type && styles.validRadio,
                    !isRecording && styles.disabledButton
                  ]}
                  onPress={() => handleInputChange('cardType', type)}
                  disabled={!isRecording}
                >
                  <Text style={[
                    styles.radioText,
                    !isRecording && styles.disabledText
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[
                styles.input,
                !isRecording && styles.disabledInput,
                isRecording && (fieldValidation.name ? styles.validInput : styles.invalidInput)
              ]}
              value={formData.name}
              {...getInputProps('name')}
              placeholder="Enter name"
              editable={isRecording}
              placeholderTextColor={!isRecording ? '#ccc' : '#999'}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={[
                styles.input,
                !isRecording && styles.disabledInput,
                isRecording && (fieldValidation.cardNumber ? styles.validInput : styles.invalidInput)
              ]}
              value={formData.cardNumber}
              {...getInputProps('cardNumber')}
              placeholder="Enter card number"
              keyboardType="numeric"
              maxLength={16}
              editable={isRecording}
              placeholderTextColor={!isRecording ? '#ccc' : '#999'}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>CVC</Text>
            <TextInput
              style={[
                styles.input,
                !isRecording && styles.disabledInput,
                isRecording && (fieldValidation.cvc ? styles.validInput : styles.invalidInput)
              ]}
              value={formData.cvc}
              {...getInputProps('cvc')}
              placeholder="Enter CVC"
              keyboardType="numeric"
              maxLength={3}
              editable={isRecording}
              placeholderTextColor={!isRecording ? '#ccc' : '#999'}
            />
          </View>

          <View style={styles.rowSplit}>
            <View style={[styles.formRow, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Expiry Month</Text>
              <TextInput
                style={[
                  styles.input,
                  !isRecording && styles.disabledInput,
                  isRecording && (fieldValidation.expiryMonth ? styles.validInput : styles.invalidInput)
                ]}
                value={formData.expiryMonth}
                {...getInputProps('expiryMonth')}
                placeholder="MM"
                keyboardType="numeric"
                maxLength={2}
                editable={isRecording}
                placeholderTextColor={!isRecording ? '#ccc' : '#999'}
              />
            </View>
            <View style={[styles.formRow, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Expiry Year</Text>
              <TextInput
                style={[
                  styles.input,
                  !isRecording && styles.disabledInput,
                  isRecording && (fieldValidation.expiryYear ? styles.validInput : styles.invalidInput)
                ]}
                value={formData.expiryYear}
                {...getInputProps('expiryYear')}
                placeholder="YY"
                keyboardType="numeric"
                maxLength={2}
                editable={isRecording}
                placeholderTextColor={!isRecording ? '#ccc' : '#999'}
              />
            </View>
          </View>

          {/* Auto-submit indicator */}
          {isRecording && isFormComplete() && (
            <View style={styles.autoSubmitIndicator}>
              <Text style={styles.autoSubmitText}>✅ Form complete - Auto-submitting...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    ...(Platform.OS === 'web' && { 
      height: 'auto',
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  formSection: {
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
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.3,
  },
  actionSection: {
    margin: 20,
    marginBottom: 40,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  resetButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Reference card styles
  referenceSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  referenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  referenceSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  referenceCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  referenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  referenceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  referenceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  // Start section styles
  startSection: {
    margin: 16,
    marginBottom: 8,
  },
  recordingButton: {
    backgroundColor: '#FF5722',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modelNotReadyText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  // Form styles matching TrainingScreen
  formRow: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    color: '#999',
    opacity: 0.6,
  },
  validInput: { borderColor: '#4CAF50', borderWidth: 2 },
  invalidInput: { borderColor: '#F44336', borderWidth: 2 },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  radioSelected: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  validRadio: { borderColor: '#4CAF50', backgroundColor: '#e8f5e8' },
  radioText: { fontSize: 14, color: '#333' },
  disabledText: { color: '#999' },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  // Big start button styles
  bigStartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bigStartButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  // Auto-submit indicator styles
  autoSubmitIndicator: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  autoSubmitText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});