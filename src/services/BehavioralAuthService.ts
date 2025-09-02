import AsyncStorage from '@react-native-async-storage/async-storage';
import { fraudulentBehavioralData } from '../data/fraudulentData';

export interface KeyEvent {
  Key: string;
  Event: 'pressed' | 'released';
  'Input Box': string;
  'Text Changed': boolean;
  Timestamp: string;
  Epoch: string;
}

export interface MouseEvent {
  Event: string;
  Coordinates?: number[];
  Timestamp: string;
  Epoch: string;
  'Movement ID'?: number;
}

export interface FormData {
  cardType: string;
  name: string;
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface BehavioralData {
  key_events: KeyEvent[];
  mouse_events: MouseEvent[];
  formData?: FormData;
}

// Reference Feature Vector (matching Python implementation exactly)
export interface ReferenceFeatureVector {
  dwell_max: number;
  dwell_avg: number;
  dwell_min: number;
  flight_max: number;
  flight_avg: number;
  flight_min: number;
  PR_max: number;
  PR_avg: number;
  PR_min: number;
  PP_max: number;
  PP_avg: number;
  PP_min: number;
  RR_max: number;
  RR_avg: number;
  RR_min: number;
  UD_rate: number;
  UD_present: number;
  UU_rate: number;
  UU_present: number;
  caps_rate: number;
  caps_present: number;
  error_rate: number;
  error_present: number;
  in_bounds_rate: number;
  in_bounds_present: number;
  actual_traj_min: number;
  actual_traj_avg: number;
  actual_traj_max: number;
  ideal_traj_min: number;
  ideal_traj_avg: number;
  ideal_traj_max: number;
  traj_diff_min: number;
  traj_diff_avg: number;
  traj_diff_max: number;
}

export interface PredictionResult {
  prediction: number;
  confidence: number;
  features?: ReferenceFeatureVector;
}

export class BehavioralAuthService {
  private static instance: BehavioralAuthService;
  private trainingData: BehavioralData[] = [];
  private isModelTrained: boolean = false;
  private legitimateFeatures: ReferenceFeatureVector[] = [];

  private constructor() {
    this.loadTrainingData();
    this.loadModelState();
  }

  static getInstance(): BehavioralAuthService {
    if (!BehavioralAuthService.instance) {
      BehavioralAuthService.instance = new BehavioralAuthService();
    }
    return BehavioralAuthService.instance;
  }

  // Extract reference features (matching Python implementation exactly)
  private extractReferenceFeatures(data: BehavioralData): ReferenceFeatureVector {
    console.log('🔍 Extracting reference features from data:', {
      keyEvents: data.key_events?.length || 0,
      mouseEvents: data.mouse_events?.length || 0
    });

    const keyEvents = data.key_events || [];
    const mouseEvents = data.mouse_events || [];

    // Helper to normalize epoch strings/numbers to milliseconds (number)
    const toMs = (v?: string | number): number => {
      if (v === undefined || v === null) return 0;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (!Number.isFinite(n)) return 0;
      // If value looks like seconds (around 1e9), convert to ms
      if (n < 1e12) return n * 1000;
      return n;
    };

    // Filter out tab events like reference implementation
    const tablessKeyData = keyEvents.filter(event => event.Key !== 'tab');

    // Calculate dwell times, flight times, and behavioral features like reference
    const dwellTimes: number[] = [];
    const flightTimes: number[] = [];
    const prTimes: number[] = []; // Press-Release
    const ppTimes: number[] = []; // Press-Press  
    const rrTimes: number[] = []; // Release-Release
    
    let udCount = 0, uuCount = 0, capsCount = 0, errorCount = 0, inBoundsCount = 0;
    let prevKeyPress = 0, prevKeyRelease = 0;
    let firstLoop = true;

    // Process key events like reference implementation
    for (let i = 0; i < tablessKeyData.length; i++) {
      const event = tablessKeyData[i];
      if (!event || event.Event !== 'pressed') continue;
      
  const keyPressTime = toMs(event.Epoch);
      
      // Find corresponding release event
      let keyReleaseTime = keyPressTime;
      let ud = false, uu = false;
      
      for (let j = i + 1; j < tablessKeyData.length; j++) {
        const nextEvent = tablessKeyData[j];
        if (!nextEvent || !nextEvent.Key || !nextEvent.Event || !nextEvent.Epoch) continue;
        
          if (nextEvent.Key === event.Key && nextEvent.Event === 'released') {
          keyReleaseTime = toMs(nextEvent.Epoch);
          const dwellTime = keyReleaseTime - keyPressTime;
          dwellTimes.push(dwellTime);
          break;
        } else if (nextEvent.Key !== event.Key && nextEvent.Event === 'pressed') {
          ud = true;
        } else if (nextEvent.Key !== event.Key && nextEvent.Event === 'released') {
          uu = true;
          ud = true;
        }
      }

      // Count behavioral patterns
      if (ud) udCount++;
      if (uu) uuCount++;
      if (event.Key === 'backspace') errorCount++;
      if (event['Text Changed']) inBoundsCount++;
      if (event.Key === 'capslock') capsCount++;

      // Calculate timing relationships like reference
      if (!firstLoop) {
  prTimes.push(keyReleaseTime - prevKeyPress);
  ppTimes.push(keyPressTime - prevKeyPress);
  rrTimes.push(keyReleaseTime - prevKeyRelease);
      } else {
        firstLoop = false;
      }

  prevKeyPress = keyPressTime;
  prevKeyRelease = keyReleaseTime;
    }

    // Calculate flight times between key releases and next presses
    for (let i = 0; i < tablessKeyData.length; i++) {
      const event = tablessKeyData[i];
      if (!event || event.Event !== 'released') continue;
      
      for (let j = i + 1; j < tablessKeyData.length; j++) {
        const nextEvent = tablessKeyData[j];
        if (!nextEvent) continue;
        
      if (nextEvent.Event === 'pressed' && nextEvent.Key !== event.Key) {
        const flightTime = toMs(nextEvent.Epoch) - toMs(event.Epoch);
          flightTimes.push(flightTime);
          break;
        }
      }
    }

    // Process mouse events for trajectory calculations
    const trajectories: number[] = [];
    const idealTrajectories: number[] = [];
    const trajectoryDiffs: number[] = [];

    // Group mouse events by Movement ID like reference
    const movementGroups: { [key: number]: MouseEvent[] } = {};
    mouseEvents.forEach(event => {
      if (event && event['Movement ID'] && event.Coordinates) {
        const movementId = event['Movement ID'];
        if (!movementGroups[movementId]) movementGroups[movementId] = [];
        movementGroups[movementId].push(event);
      }
    });

    // Calculate trajectories for each movement group
    Object.values(movementGroups).forEach(group => {
      if (group.length > 1) {
        let totalTrajectory = 0;
        for (let i = 1; i < group.length; i++) {
          const prev = group[i-1]?.Coordinates;
          const curr = group[i]?.Coordinates;
          if (!prev || !curr || prev.length < 2 || curr.length < 2) continue;
          
          const distance = Math.sqrt(Math.pow(curr[0]! - prev[0]!, 2) + Math.pow(curr[1]! - prev[1]!, 2));
          totalTrajectory += distance;
        }
        
        const start = group[0]?.Coordinates;
        const end = group[group.length - 1]?.Coordinates;
        if (!start || !end || start.length < 2 || end.length < 2) return;
        
        const idealTrajectory = Math.sqrt(Math.pow(end[0]! - start[0]!, 2) + Math.pow(end[1]! - start[1]!, 2));
        
        trajectories.push(totalTrajectory);
        idealTrajectories.push(idealTrajectory);
        trajectoryDiffs.push(totalTrajectory - idealTrajectory);
      }
    });

    // Calculate rates and presence flags
    const totalEvents = tablessKeyData.length;
    const udRate = totalEvents > 0 ? udCount / totalEvents : 0;
    const uuRate = totalEvents > 0 ? uuCount / totalEvents : 0;
    const capsRate = totalEvents > 0 ? capsCount / totalEvents : 0;
    const errorRate = totalEvents > 0 ? errorCount / totalEvents : 0;
    const inBoundsRate = totalEvents > 0 ? inBoundsCount / totalEvents : 0;

    console.log('📊 Reference feature extraction complete:', {
      dwellTimes: dwellTimes.length,
      flightTimes: flightTimes.length,
      trajectories: trajectories.length,
      udRate, uuRate, errorRate
    });

    // Create 33-feature vector matching reference implementation
    const features: ReferenceFeatureVector = {
      dwell_max: dwellTimes.length > 0 ? Math.max(...dwellTimes) : 0,
      dwell_avg: dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0,
      dwell_min: dwellTimes.length > 0 ? Math.min(...dwellTimes) : 0,
      flight_max: flightTimes.length > 0 ? Math.max(...flightTimes) : 0,
      flight_avg: flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0,
      flight_min: flightTimes.length > 0 ? Math.min(...flightTimes) : 0,
      PR_max: prTimes.length > 0 ? Math.max(...prTimes) : 0,
      PR_avg: prTimes.length > 0 ? prTimes.reduce((a, b) => a + b, 0) / prTimes.length : 0,
      PR_min: prTimes.length > 0 ? Math.min(...prTimes) : 0,
      PP_max: ppTimes.length > 0 ? Math.max(...ppTimes) : 0,
      PP_avg: ppTimes.length > 0 ? ppTimes.reduce((a, b) => a + b, 0) / ppTimes.length : 0,
      PP_min: ppTimes.length > 0 ? Math.min(...ppTimes) : 0,
      RR_max: rrTimes.length > 0 ? Math.max(...rrTimes) : 0,
      RR_avg: rrTimes.length > 0 ? rrTimes.reduce((a, b) => a + b, 0) / rrTimes.length : 0,
      RR_min: rrTimes.length > 0 ? Math.min(...rrTimes) : 0,
      UD_rate: udRate,
      UD_present: udRate > 0 ? 1 : 0,
      UU_rate: uuRate,
      UU_present: uuRate > 0 ? 1 : 0,
      caps_rate: capsRate,
      caps_present: capsRate > 0 ? 1 : 0,
      error_rate: errorRate,
      error_present: errorRate > 0 ? 1 : 0,
      in_bounds_rate: inBoundsRate,
      in_bounds_present: inBoundsRate > 0 ? 1 : 0,
      actual_traj_min: trajectories.length > 0 ? Math.min(...trajectories) : 0,
      actual_traj_avg: trajectories.length > 0 ? trajectories.reduce((a, b) => a + b, 0) / trajectories.length : 0,
      actual_traj_max: trajectories.length > 0 ? Math.max(...trajectories) : 0,
      ideal_traj_min: idealTrajectories.length > 0 ? Math.min(...idealTrajectories) : 0,
      ideal_traj_avg: idealTrajectories.length > 0 ? idealTrajectories.reduce((a, b) => a + b, 0) / idealTrajectories.length : 0,
      ideal_traj_max: idealTrajectories.length > 0 ? Math.max(...idealTrajectories) : 0,
      traj_diff_min: trajectoryDiffs.length > 0 ? Math.min(...trajectoryDiffs) : 0,
      traj_diff_avg: trajectoryDiffs.length > 0 ? trajectoryDiffs.reduce((a, b) => a + b, 0) / trajectoryDiffs.length : 0,
      traj_diff_max: trajectoryDiffs.length > 0 ? Math.max(...trajectoryDiffs) : 0
    };

    return features;
  }

  // Method to train the model using collected training data (Naive Bayes)
  async trainModel(): Promise<boolean> {
    try {
      if (this.trainingData.length < 10) {
        throw new Error('Insufficient training data. Need exactly 10 legitimate training sessions.');
      }

      console.log('=== TRAINING MODEL DEBUG ===');
      console.log(`Training with ${this.trainingData.length} legitimate samples`);

      // Extract features from legitimate training data
      this.legitimateFeatures = [];
      for (let i = 0; i < this.trainingData.length; i++) {
        const trainingItem = this.trainingData[i];
        if (!trainingItem) continue;
        const features = this.extractReferenceFeatures(trainingItem);
        this.legitimateFeatures.push(features);
        console.log(`Legitimate sample ${i + 1} features:`, {
          dwell_avg: features.dwell_avg,
          flight_avg: features.flight_avg,
          error_rate: features.error_rate
        });
      }

      // Test with fraudulent samples from fraudulentData
      console.log('\n=== TESTING WITH FRAUDULENT DATA ===');
      const fraudulentTests = Object.values(fraudulentBehavioralData);
      
      for (let i = 0; i < Math.min(3, fraudulentTests.length); i++) {
        const fraudSample = fraudulentTests[i];
        if (!fraudSample || !fraudSample.key_events) continue;
        
        const testData: BehavioralData = {
          key_events: fraudSample.key_events as KeyEvent[],
          mouse_events: (fraudSample.mouse_events || []).filter((e: MouseEvent) => e.Event) as MouseEvent[]
        };
        
        const fraudFeatures = this.extractReferenceFeatures(testData);
        console.log(`Fraudulent sample ${i + 1} features:`, {
          dwell_avg: fraudFeatures.dwell_avg,
          flight_avg: fraudFeatures.flight_avg,
          error_rate: fraudFeatures.error_rate
        });
      }

      this.isModelTrained = true;
      await this.saveModelState();
      
      console.log('✅ Model training completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Model training failed:', error);
      return false;
    }
  }

  // Add training data
  async addTrainingData(data: BehavioralData): Promise<void> {
    this.trainingData.push(data);
    await this.saveTrainingData();
    
    // Auto-train when we have enough data
    if (this.trainingData.length >= 10 && !this.isModelTrained) {
      await this.trainModel();
    }
  }

  // Get real-time risk score
  getRealTimeRiskScore(data: BehavioralData): number {
    if (!this.isModelTrained || this.legitimateFeatures.length === 0) {
      return 0.5; // Neutral score when model not ready
    }

    const features = this.extractReferenceFeatures(data);
    
    // Simple anomaly detection based on feature deviation
    const avgLegitFeatures = this.calculateAverageFeatures(this.legitimateFeatures);
    const deviation = this.calculateFeatureDeviation(features, avgLegitFeatures);
    
    // Convert deviation to risk score (0 = legitimate, 1 = fraudulent)
    return Math.min(1, deviation / 2);
  }

  // Predict using Naive Bayes approach
  async predict(data: BehavioralData): Promise<PredictionResult> {
    console.log('🔍 Model state check:', {
      isModelTrained: this.isModelTrained,
      legitimateFeaturesCount: this.legitimateFeatures.length,
      trainingDataCount: this.trainingData.length,
      isModelTrainedType: typeof this.isModelTrained,
      legitimateFeaturesType: typeof this.legitimateFeatures
    });

    if (!this.isModelTrained || this.legitimateFeatures.length === 0) {
      throw new Error('Model not trained. Please train the model first.');
    }

    // Extract features from test data
    const testFeatures = this.extractReferenceFeatures(data);

    // Build class features for comparison
    let fraudulentFeatures = this.getFraudulentFeatures();

    // If fraudulent dataset is too small or missing, synthesize a small negative class
    // by perturbing the legitimate average features. This prevents degenerate cases
    // where fraudulentFeatures.length === 0 causes the softmax to always return ~1.0
    if (!fraudulentFeatures || fraudulentFeatures.length < 3) {
      console.warn('⚠️ Fraudulent features insufficient (found', fraudulentFeatures?.length || 0, '). Synthesizing negatives for comparison.');
      const avgLegit = (this.legitimateFeatures && this.legitimateFeatures.length > 0)
        ? this.calculateAverageFeatures(this.legitimateFeatures)
        : this.calculateAverageFeatures([]);
      const synth: ReferenceFeatureVector[] = [];
      const synthCount = 5;
      for (let i = 0; i < synthCount; i++) {
        const noisy = {} as ReferenceFeatureVector;
        (Object.keys(avgLegit) as (keyof ReferenceFeatureVector)[]).forEach(key => {
          const base = avgLegit[key] || 0;
          // relative noise up to ±30%
          const noise = (Math.random() * 0.6 - 0.3) * (Math.abs(base) + 1);
          noisy[key] = base + noise;
        });
        synth.push(noisy);
      }
      fraudulentFeatures = synth;
    }

    console.debug('🔎 Class counts:', { legitimate: this.legitimateFeatures.length, fraudulent: fraudulentFeatures.length });

    // Compute log-likelihoods using per-class Gaussian statistics and include class priors
    const legitLogLikelihood = this.calculateNaiveBayesLogLikelihood(testFeatures, this.legitimateFeatures);
    const fraudLogLikelihood = this.calculateNaiveBayesLogLikelihood(testFeatures, fraudulentFeatures);

    // Compute class priors based on available samples (avoid zero priors)
    const legitCount = Math.max(1, this.legitimateFeatures.length);
    const fraudCount = Math.max(1, fraudulentFeatures.length);
    const totalCount = legitCount + fraudCount;
    const logPriorLegit = Math.log(legitCount / totalCount);
    const logPriorFraud = Math.log(fraudCount / totalCount);

    const combinedLegit = legitLogLikelihood + logPriorLegit;
    const combinedFraud = fraudLogLikelihood + logPriorFraud;

    // Softmax in log-space for numerical stability
    const maxLog = Math.max(combinedLegit, combinedFraud);
    const legitExp = Math.exp(combinedLegit - maxLog);
    const fraudExp = Math.exp(combinedFraud - maxLog);
    const sumExp = legitExp + fraudExp;

    // Probabilities (calibrated). Clamp only to tiny epsilon to avoid exact 0/1.
    const eps = 1e-6;
    const legitimateProb = Math.min(1 - eps, Math.max(eps, legitExp / sumExp));
    const fraudulentProb = Math.min(1 - eps, Math.max(eps, fraudExp / sumExp));

    const prediction = legitimateProb > fraudulentProb ? 1 : 0;
    const confidence = Math.max(legitimateProb, fraudulentProb);

    const result = {
      prediction,
      confidence,
      legitimateProb,
      fraudulentProb,
      legitimateLogLikelihood: legitLogLikelihood,
      fraudulentLogLikelihood: fraudLogLikelihood,
      features: testFeatures
    };

    console.log('🎯 Prediction result:', result);
    return result;
  }

  // Calculate Naive Bayes log-likelihood (prevents numerical underflow)
  private calculateNaiveBayesLogLikelihood(testFeatures: ReferenceFeatureVector, classFeatures: ReferenceFeatureVector[]): number {
    // If no class examples available, return a large negative log-likelihood
    if (!classFeatures || classFeatures.length === 0) return -1e6;

    let logLikelihood = 0;
    const featureKeys = Object.keys(testFeatures) as (keyof ReferenceFeatureVector)[];

    for (const key of featureKeys) {
      const values = classFeatures.map(f => f[key]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      // unbiased variance with small smoothing (avoid zero variance)
      let variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const minVariance = 1e-4 + Math.abs(mean) * 1e-4; // tiny floor relative to mean
      variance = Math.max(variance, minVariance);

      const testValue = testFeatures[key];
      // Gaussian log-pdf: -0.5 * ln(2πσ^2) - (x-μ)^2 / (2σ^2)
      const logProb = -0.5 * Math.log(2 * Math.PI * variance) - Math.pow(testValue - mean, 2) / (2 * variance);
      // Guard against NaN
      if (Number.isFinite(logProb)) {
        logLikelihood += logProb;
      } else {
        // If something went wrong for this feature, apply a conservative penalty
        logLikelihood += -10;
      }
    }

    return logLikelihood;
  }

  // Get fraudulent features from fraudulent data (using false_data structure)
  private getFraudulentFeatures(): ReferenceFeatureVector[] {
    console.log('🔍 Getting fraudulent features...');
    const fraudulentFeatures: ReferenceFeatureVector[] = [];
    const fraudulentTests = Object.values(fraudulentBehavioralData.false_data);
    
    console.log(`📊 Total fraudulent test samples: ${fraudulentTests.length}`);
    
    for (let i = 0; i < fraudulentTests.length; i++) {
      const fraudSample = fraudulentTests[i];
      console.log(`🧪 Processing fraudulent sample ${i + 1}:`, {
        hasKeyEvents: !!fraudSample?.key_events,
        keyEventsCount: fraudSample?.key_events?.length || 0,
        hasMouseEvents: !!fraudSample?.mouse_events,
        mouseEventsCount: fraudSample?.mouse_events?.length || 0
      });
      
      if (!fraudSample || !fraudSample.key_events || fraudSample.key_events.length === 0) {
        console.log(`⚠️ Skipping fraudulent sample ${i + 1} - insufficient data`);
        continue;
      }
      
      const features = this.extractReferenceFeatures(fraudSample);
      console.log(`✅ Fraudulent sample ${i + 1} features:`, {
        dwell_avg: features.dwell_avg,
        flight_avg: features.flight_avg,
        error_rate: features.error_rate,
        keyEventsProcessed: fraudSample.key_events.length
      });
      fraudulentFeatures.push(features);
    }
    
    console.log(`🎯 Final fraudulent features count: ${fraudulentFeatures.length}`);
    return fraudulentFeatures;
  }

  // Calculate average features
  private calculateAverageFeatures(features: ReferenceFeatureVector[]): ReferenceFeatureVector {
    if (features.length === 0) {
      // Return zero features if no data
      const zeroFeatures = {} as ReferenceFeatureVector;
      const sampleKeys: (keyof ReferenceFeatureVector)[] = [
        'dwell_max', 'dwell_avg', 'dwell_min', 'flight_max', 'flight_avg', 'flight_min',
        'PR_max', 'PR_avg', 'PR_min', 'PP_max', 'PP_avg', 'PP_min',
        'RR_max', 'RR_avg', 'RR_min', 'UD_rate', 'UD_present', 'UU_rate', 'UU_present',
        'caps_rate', 'caps_present', 'error_rate', 'error_present', 'in_bounds_rate', 'in_bounds_present',
        'actual_traj_min', 'actual_traj_avg', 'actual_traj_max', 'ideal_traj_min', 'ideal_traj_avg', 'ideal_traj_max',
        'traj_diff_min', 'traj_diff_avg', 'traj_diff_max'
      ];
      sampleKeys.forEach(key => {
        zeroFeatures[key] = 0;
      });
      return zeroFeatures;
    }

    const avg = {} as ReferenceFeatureVector;
    const featureKeys = Object.keys(features[0]!) as (keyof ReferenceFeatureVector)[];
    
    for (const key of featureKeys) {
      const values = features.map(f => f[key]);
      avg[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    return avg;
  }

  // Static methods for UI components
  static async refreshModelStatus(): Promise<void> {
    const instance = BehavioralAuthService.getInstance();
    await instance.loadTrainingData();
    await instance.loadModelState();
  }

  static getTrainingProgress(): { legitimate: number; fraudulent: number; total: number } {
    const instance = BehavioralAuthService.getInstance();
    return {
      legitimate: instance.trainingData.length,
      fraudulent: 0, // We don't collect fraudulent data from users
      total: instance.trainingData.length
    };
  }

  static isModelReady(): boolean {
    const instance = BehavioralAuthService.getInstance();
    return instance.isModelTrained && instance.trainingData.length >= 10;
  }

  static getModelStatus(): { hasLegitimateProfile: boolean; isModelTrained: boolean } {
    const instance = BehavioralAuthService.getInstance();
    return {
      hasLegitimateProfile: instance.trainingData.length >= 10,
      isModelTrained: instance.isModelTrained
    };
  }

  static async triggerModelTraining(): Promise<boolean> {
    const instance = BehavioralAuthService.getInstance();
    try {
      if (instance.trainingData.length >= 10) {
        await instance.trainModel();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to train model:', error);
      return false;
    }
  }

  static async retrainModel(): Promise<boolean> {
    const instance = BehavioralAuthService.getInstance();
    try {
      instance.isModelTrained = false;
      instance.legitimateFeatures = [];
      await instance.trainModel();
      return true;
    } catch (error) {
      console.error('Failed to retrain model:', error);
      return false;
    }
  }

  // Calculate feature deviation
  private calculateFeatureDeviation(features1: ReferenceFeatureVector, features2: ReferenceFeatureVector): number {
    let totalDeviation = 0;
    let count = 0;
    
    const featureKeys = Object.keys(features1) as (keyof ReferenceFeatureVector)[];
    
    for (const key of featureKeys) {
      const diff = Math.abs(features1[key] - features2[key]);
      const avg = (features1[key] + features2[key]) / 2;
      const normalizedDiff = avg > 0 ? diff / avg : diff;
      totalDeviation += normalizedDiff;
      count++;
    }
    
    return count > 0 ? totalDeviation / count : 0;
  }

  // Save training data
  private async saveTrainingData(): Promise<void> {
    try {
      await AsyncStorage.setItem('behavioral_training_data', JSON.stringify(this.trainingData));
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }

  // Save model state
  private async saveModelState(): Promise<void> {
    try {
      const modelState = {
        isModelTrained: this.isModelTrained,
        legitimateFeatures: this.legitimateFeatures
      };
      await AsyncStorage.setItem('behavioral_model_state', JSON.stringify(modelState));
    } catch (error) {
      console.error('Failed to save model state:', error);
    }
  }

  // Load model state
  private async loadModelState(): Promise<void> {
    try {
      const modelStateStr = await AsyncStorage.getItem('behavioral_model_state');
      if (modelStateStr) {
        const modelState = JSON.parse(modelStateStr);
        this.isModelTrained = modelState.isModelTrained || false;
        this.legitimateFeatures = modelState.legitimateFeatures || [];
        console.log('📥 Model state loaded:', {
          isModelTrained: this.isModelTrained,
          legitimateFeaturesCount: this.legitimateFeatures.length
        });
      }
    } catch (error) {
      console.error('Failed to load model state:', error);
    }
  }

  // Load training data
  private async loadTrainingData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('behavioral_training_data');
      if (data) {
        this.trainingData = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
    }
  }


  async resetModel(): Promise<void> {
    this.trainingData = [];
    this.isModelTrained = false;
    this.legitimateFeatures = [];
    await AsyncStorage.removeItem('behavioral_training_data');
    await AsyncStorage.removeItem('behavioral_model_state');
  }
}
