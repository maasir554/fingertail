import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useBehavioralData } from '../hooks/useBehavioralData';
import { BehavioralAuthService } from '../services/BehavioralAuthService';

type TrainingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Training'>;

interface FormData {
  cardType: string;
  name: string;
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

const CARD_TYPES = ['Visa', 'MasterCard', 'Amex', 'Discover', 'Other'];

// Reference card details users MUST enter during training (matching Python reference)
const VALID_CARD_DETAILS: FormData = {
  cardType: 'Discover',
  name: 'Mrs Ellie Miller',
  cardNumber: '4422891459068728',
  cvc: '646',
  expiryMonth: '09',
  expiryYear: '23'
};

export default function TrainingScreen() {
  const navigation = useNavigation<TrainingScreenNavigationProp>();

  const [formData, setFormData] = useState<FormData>({
    cardType: '',
    name: '',
    cardNumber: '',
    cvc: '',
    expiryMonth: '',
    expiryYear: ''
  });

  // Real-time validation states (matching Python reference)
  const [fieldValidation, setFieldValidation] = useState<{[key: string]: boolean}>({
    cardType: false,
    name: false,
    cardNumber: false,
    cvc: false,
    expiryMonth: false,
    expiryYear: false
  });

  const [isRecordingLocal, setIsRecordingLocal] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    startRecording,
    stopRecording,
    recordKeyEvent,
    recordMouseEvent,
    setInputBox,
    updateTextChanged,
    resetData,
    getCurrentData,
    getRealTimeRiskScore,
    isRecording
  } = useBehavioralData();

  const startTraining = () => {
    // Reset form to empty and behavioral data and begin recording
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
    setIsRecordingLocal(true);

    Alert.alert('Training Started', 'Please enter the reference card details exactly as shown in the reference box above.');
  };

  const handleSubmit = async () => {
    if (!isRecording && !isRecordingLocal) {
      Alert.alert('Error', 'Please start a training session first.');
      return;
    }

    // Stop recording before collecting the data
    stopRecording();
    setIsRecordingLocal(false);

    const currentData = getCurrentData();

    if (currentData.key_events.length < 5) {
      Alert.alert('Insufficient Data', 'Please provide more keystrokes for accurate training.');
      return;
    }

    // Strict validation: ALL fields must match reference exactly (like Python version)
    if (
      formData.cardType !== VALID_CARD_DETAILS.cardType ||
      formData.name.trim().toLowerCase() !== VALID_CARD_DETAILS.name.toLowerCase() ||
      formData.cardNumber.trim() !== VALID_CARD_DETAILS.cardNumber ||
      formData.cvc.trim() !== VALID_CARD_DETAILS.cvc ||
      formData.expiryMonth.trim() !== VALID_CARD_DETAILS.expiryMonth ||
      formData.expiryYear.trim() !== VALID_CARD_DETAILS.expiryYear
    ) {
      recordKeyEvent('false', 'pressed'); // Track incorrect entries like the reference
      Alert.alert('Details not recognised', 'Please enter the reference card details exactly as shown.');
      return;
    }

    try {
      // Attach form data to the behavioral data and save
      const payload = {
        ...currentData,
        formData: { ...formData }
      } as any;

      const behavioralService = BehavioralAuthService.getInstance();
      await behavioralService.addTrainingData(payload);

      const newCount = sessionCount + 1;
      setSessionCount(newCount);

      // Reset input and behavioral buffers for next session
      resetData();
      setFormData({ cardType: '', name: '', cardNumber: '', cvc: '', expiryMonth: '', expiryYear: '' });
      setFieldValidation({
        cardType: false,
        name: false,
        cardNumber: false,
        cvc: false,
        expiryMonth: false,
        expiryYear: false
      });

      // Show success popup
      setSuccessMessage(`Training session ${newCount} completed successfully!`);
      setShowSuccessModal(true);

      // If we've reached 10 sessions, trigger model training and navigate
      if (newCount >= 10) {
        setTimeout(() => {
          setShowSuccessModal(false);
          Alert.alert('Training Complete', 'Collected 10 sessions. Training model now.');
          const behavioralService = BehavioralAuthService.getInstance();
          const modelStatus = BehavioralAuthService.getModelStatus();
          BehavioralAuthService.triggerModelTraining().then((trained: boolean) => {
            if (trained) {
              Alert.alert('Model Trained', 'Model trained successfully. Navigating to Testing screen.');
              navigation.navigate('Testing');
            } else {
              Alert.alert('Training Error', 'Model training failed. You can retry from the Home screen.');
            }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving training data:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving training data.');
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (!isRecordingLocal) return; // Prevent changes when not recording
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setInputBox(field);
    
    // Real-time validation (matching Python reference behavior)
    const isValid = validateField(field, value);
    setFieldValidation(prev => ({ ...prev, [field]: isValid }));
  };

  // Check if all fields are filled and valid
  const isFormComplete = () => {
    return Object.values(formData).every(value => value.trim() !== '') &&
           Object.values(fieldValidation).every(valid => valid === true);
  };

  // Auto-submit when form is complete
  useEffect(() => {
    if (isRecordingLocal && isFormComplete()) {
      // Small delay to ensure all data is captured
      setTimeout(() => {
        handleSubmit();
      }, 500);
    }
  }, [formData, fieldValidation, isRecordingLocal]);

  const validateField = (field: keyof FormData, value: string): boolean => {
    switch (field) {
      case 'cardType':
        return value === VALID_CARD_DETAILS.cardType;
      case 'name':
        return value.toLowerCase().trim() === VALID_CARD_DETAILS.name.toLowerCase();
      case 'cardNumber':
        return value.trim() === VALID_CARD_DETAILS.cardNumber;
      case 'cvc':
        return value.trim() === VALID_CARD_DETAILS.cvc;
      case 'expiryMonth':
        return value.trim() === VALID_CARD_DETAILS.expiryMonth;
      case 'expiryYear':
        return value.trim() === VALID_CARD_DETAILS.expiryYear;
      default:
        return false;
    }
  };

  const handleKeyPress = (e: any, field: keyof FormData) => {
    if (e && e.nativeEvent && e.nativeEvent.key) {
      recordKeyEvent(e.nativeEvent.key, 'pressed');
    }
  };

  const handleKeyRelease = (e: any, field: keyof FormData) => {
    if (e && e.nativeEvent && e.nativeEvent.key) {
      recordKeyEvent(e.nativeEvent.key, 'released');
    }
  };

  const handleTouchStart = (event: any, field: string) => {
    recordMouseEvent('touch', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const handleTouchEnd = (event: any, field: string) => {
    recordMouseEvent('release', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const handleTouchMove = (event: any, field: string) => {
    recordMouseEvent('move', { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const getInputProps = (field: keyof FormData) => {
    const baseProps: any = {
      onChangeText: (value: string) => handleInputChange(field, value),
      onFocus: () => setInputBox(field as string),
      onKeyPress: (e: any) => handleKeyPress(e, field),
      onTouchStart: (e: any) => handleTouchStart(e, field as string),
      onTouchEnd: (e: any) => handleTouchEnd(e, field as string),
      onTouchMove: (e: any) => handleTouchMove(e, field as string),
    };

    if (Platform.OS === 'web') {
      return {
        ...baseProps,
        onMouseDown: (e: any) => recordMouseEvent('touch', { x: e.clientX, y: e.clientY }),
        onMouseUp: (e: any) => recordMouseEvent('release', { x: e.clientX, y: e.clientY })
      };
    }

    return baseProps;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
  <ScrollView style={Platform.OS === 'web' ? ([styles.scrollView, { overflow: 'auto' }] as any) : styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Training</Text>
          <Text style={styles.subtitle}>Enter the reference card details and save 10 sessions</Text>
          
          {/* Start Session Button at Top */}
          <TouchableOpacity 
            style={[
              styles.startSessionButton, 
              isRecordingLocal && styles.startSessionButtonActive
            ]} 
            onPress={startTraining}
            disabled={isRecordingLocal}
          >
            <Text style={styles.playIcon}>{isRecordingLocal ? '🔴' : '▶️'}</Text>
            <Text style={styles.startSessionText}>
              {isRecordingLocal ? 'Recording Session...' : 'Start Training Session'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.referenceBox}>
          <Text style={styles.refTitle}>Reference Card</Text>
          <Text>Type: {VALID_CARD_DETAILS.cardType}</Text>
          <Text>Name: {VALID_CARD_DETAILS.name}</Text>
          <Text>Number: {VALID_CARD_DETAILS.cardNumber}</Text>
          <Text>CVC: {VALID_CARD_DETAILS.cvc}</Text>
          <Text>Expiry: {VALID_CARD_DETAILS.expiryMonth}/{VALID_CARD_DETAILS.expiryYear}</Text>
        </View>

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
                  !isRecordingLocal && styles.disabledButton
                ]}
                onPress={() => handleInputChange('cardType', type)}
                disabled={!isRecordingLocal}
              >
                <Text style={[
                  styles.radioText,
                  !isRecordingLocal && styles.disabledText
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
              !isRecordingLocal && styles.disabledInput,
              isRecordingLocal && (fieldValidation.name ? styles.validInput : styles.invalidInput)
            ]}
            value={formData.name}
            {...getInputProps('name')}
            placeholder="Enter name"
            editable={isRecordingLocal}
            placeholderTextColor={!isRecordingLocal ? '#ccc' : '#999'}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Card Number</Text>
          <TextInput
            style={[
              styles.input,
              !isRecordingLocal && styles.disabledInput,
              isRecordingLocal && (fieldValidation.cardNumber ? styles.validInput : styles.invalidInput)
            ]}
            value={formData.cardNumber}
            {...getInputProps('cardNumber')}
            placeholder="Enter card number"
            keyboardType="numeric"
            maxLength={16}
            editable={isRecordingLocal}
            placeholderTextColor={!isRecordingLocal ? '#ccc' : '#999'}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>CVC</Text>
          <TextInput
            style={[
              styles.input,
              !isRecordingLocal && styles.disabledInput,
              isRecordingLocal && (fieldValidation.cvc ? styles.validInput : styles.invalidInput)
            ]}
            value={formData.cvc}
            {...getInputProps('cvc')}
            placeholder="Enter CVC"
            keyboardType="numeric"
            maxLength={3}
            editable={isRecordingLocal}
            placeholderTextColor={!isRecordingLocal ? '#ccc' : '#999'}
          />
        </View>

        <View style={styles.rowSplit}>
          <View style={[styles.formRow, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Expiry Month</Text>
            <TextInput
              style={[
                styles.input,
                !isRecordingLocal && styles.disabledInput,
                isRecordingLocal && (fieldValidation.expiryMonth ? styles.validInput : styles.invalidInput)
              ]}
              value={formData.expiryMonth}
              {...getInputProps('expiryMonth')}
              placeholder="MM"
              keyboardType="numeric"
              maxLength={2}
              editable={isRecordingLocal}
              placeholderTextColor={!isRecordingLocal ? '#ccc' : '#999'}
            />
          </View>
          <View style={[styles.formRow, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Expiry Year</Text>
            <TextInput
              style={[
                styles.input,
                !isRecordingLocal && styles.disabledInput,
                isRecordingLocal && (fieldValidation.expiryYear ? styles.validInput : styles.invalidInput)
              ]}
              value={formData.expiryYear}
              {...getInputProps('expiryYear')}
              placeholder="YY"
              keyboardType="numeric"
              maxLength={2}
              editable={isRecordingLocal}
              placeholderTextColor={!isRecordingLocal ? '#ccc' : '#999'}
            />
          </View>
        </View>

        {/* Progress and Status */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Sessions: {sessionCount}/10</Text>
            <Text style={styles.riskText}>Risk: {getRealTimeRiskScore().toFixed(2)}</Text>
          </View>
          
          {isFormComplete() && isRecordingLocal && (
            <View style={styles.autoSubmitIndicator}>
              <Text style={styles.autoSubmitText}>✅ Form complete - Auto-submitting...</Text>
            </View>
          )}
        </View>

        {isRecordingLocal && (
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingText}>🔴 Recording behavioral data...</Text>
            <Text style={styles.instructionText}>Enter the reference card details exactly as shown above</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', ...(Platform.OS === 'web' && { height: '100%' }) },
  scrollView: { padding: 16 },
  scrollContent: { paddingBottom: 40, ...(Platform.OS === 'web' && { flexGrow: 1 }) },
  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#666', marginTop: 4 },
  referenceBox: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, marginVertical: 8 },
  refTitle: { fontWeight: '600', marginBottom: 6 },
  formRow: { marginVertical: 8 },
  label: { marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap' },
  radioButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', marginRight: 8, marginBottom: 8 },
  radioSelected: { backgroundColor: '#e6f7ff', borderColor: '#40a9ff' },
  radioText: { fontSize: 14 },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  primaryButton: { flex: 1, backgroundColor: '#1976D2', padding: 12, borderRadius: 6, marginRight: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  validInput: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#E8F5E8',
  },
  invalidInput: {
    borderColor: '#f44336',
    borderWidth: 2,
    backgroundColor: '#FFEBEE',
  },
  validRadio: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  recordingIndicator: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#BF360C',
  },
  startSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startSessionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  playIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  startSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  disabledText: {
    color: '#999',
  },
  progressSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  riskText: {
    fontSize: 14,
    color: '#666',
  },
  autoSubmitIndicator: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  autoSubmitText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    color: '#999',
    opacity: 0.6,
  },
});
