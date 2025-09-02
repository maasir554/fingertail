// Direct test of ML confidence issue
const fs = require('fs');

// Simple Naive Bayes implementation for testing
class TestNaiveBayes {
  constructor() {
    this.legitimateMeans = {};
    this.legitimateStds = {};
    this.fraudulentMeans = {};
    this.fraudulentStds = {};
  }

  train(legitimateData, fraudulentData) {
    console.log('Training with:', legitimateData.length, 'legitimate,', fraudulentData.length, 'fraudulent');
    
    // Get all feature keys
    const allKeys = new Set([
      ...Object.keys(legitimateData[0] || {}),
      ...Object.keys(fraudulentData[0] || {})
    ]);
    
    for (const key of allKeys) {
      // Legitimate stats
      const legValues = legitimateData.map(d => d[key]).filter(v => typeof v === 'number' && !isNaN(v));
      const legMean = legValues.length > 0 ? legValues.reduce((a, b) => a + b, 0) / legValues.length : 0;
      this.legitimateMeans[key] = legMean;
      const legVariance = legValues.length > 0 ? legValues.reduce((sum, val) => sum + Math.pow(val - legMean, 2), 0) / legValues.length : 0;
      this.legitimateStds[key] = Math.sqrt(legVariance) || 0.001;
      
      // Fraudulent stats
      const fraudValues = fraudulentData.map(d => d[key]).filter(v => typeof v === 'number' && !isNaN(v));
      const fraudMean = fraudValues.length > 0 ? fraudValues.reduce((a, b) => a + b, 0) / fraudValues.length : 0;
      this.fraudulentMeans[key] = fraudMean;
      const fraudVariance = fraudValues.length > 0 ? fraudValues.reduce((sum, val) => sum + Math.pow(val - fraudMean, 2), 0) / fraudValues.length : 0;
      this.fraudulentStds[key] = Math.sqrt(fraudVariance) || 0.001;
      
      // Show key differences
      if (['dwell_avg', 'flight_avg', 'error_rate'].includes(key)) {
        console.log(`${key}: Leg=${legMean.toFixed(3)}, Fraud=${fraudMean.toFixed(3)}, Diff=${Math.abs(legMean - fraudMean).toFixed(3)}`);
      }
    }
  }

  predict(features) {
    let logProbLeg = Math.log(0.5);
    let logProbFraud = Math.log(0.5);
    
    let validFeatures = 0;
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value !== 'number' || isNaN(value)) continue;
      
      const legMean = this.legitimateMeans[key] || 0;
      const legStd = this.legitimateStds[key] || 1;
      const fraudMean = this.fraudulentMeans[key] || 0;
      const fraudStd = this.fraudulentStds[key] || 1;
      
      const gaussianPdf = (x, mean, std) => {
        if (std === 0) std = 0.001;
        const exponent = -0.5 * Math.pow((x - mean) / std, 2);
        return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      };
      
      const legProb = gaussianPdf(value, legMean, legStd);
      const fraudProb = gaussianPdf(value, fraudMean, fraudStd);
      
      logProbLeg += Math.log(legProb || 1e-10);
      logProbFraud += Math.log(fraudProb || 1e-10);
      validFeatures++;
    }
    
    const probLeg = Math.exp(logProbLeg);
    const probFraud = Math.exp(logProbFraud);
    const total = probLeg + probFraud;
    
    const legConfidence = probLeg / total;
    const prediction = legConfidence > 0.5 ? 'legitimate' : 'fraudulent';
    const confidence = Math.max(legConfidence, 1 - legConfidence);
    
    console.log(`Prediction: ${prediction}, Confidence: ${confidence.toFixed(3)}, Valid features: ${validFeatures}`);
    return { prediction, confidence };
  }
}

// Test with simple mock data
const mockLegitimate = [
  { dwell_avg: 100, flight_avg: 150, error_rate: 0.1 },
  { dwell_avg: 105, flight_avg: 145, error_rate: 0.05 },
  { dwell_avg: 95, flight_avg: 155, error_rate: 0.15 }
];

const mockFraudulent = [
  { dwell_avg: 200, flight_avg: 300, error_rate: 0.5 },
  { dwell_avg: 180, flight_avg: 280, error_rate: 0.4 },
  { dwell_avg: 220, flight_avg: 320, error_rate: 0.6 }
];

console.log('=== TESTING ML CONFIDENCE ISSUE ===');
const classifier = new TestNaiveBayes();
classifier.train(mockLegitimate, mockFraudulent);

console.log('\nTesting legitimate-like sample:');
classifier.predict({ dwell_avg: 102, flight_avg: 148, error_rate: 0.08 });

console.log('\nTesting fraudulent-like sample:');
classifier.predict({ dwell_avg: 190, flight_avg: 290, error_rate: 0.45 });

console.log('\nTesting edge case (similar to both):');
classifier.predict({ dwell_avg: 150, flight_avg: 225, error_rate: 0.25 });

console.log('\n=== TESTING WITH IDENTICAL DATA (50% confidence case) ===');
const identicalClassifier = new TestNaiveBayes();
const identicalData = [
  { dwell_avg: 100, flight_avg: 150, error_rate: 0.1 },
  { dwell_avg: 100, flight_avg: 150, error_rate: 0.1 }
];
identicalClassifier.train(identicalData, identicalData);
console.log('Testing with identical training data:');
identicalClassifier.predict({ dwell_avg: 100, flight_avg: 150, error_rate: 0.1 });
