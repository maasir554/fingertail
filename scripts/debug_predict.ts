import { BehavioralAuthService } from '../src/services/BehavioralAuthService';
import { fraudulentBehavioralData } from '../src/data/fraudulentData';

async function run() {
  const svc = BehavioralAuthService.getInstance();
  console.log('Initial model status:', BehavioralAuthService.getModelStatus());

  // Build a simple synthetic legitimate sample from fraudulent data shape (for quick test)
  const sampleLegit = {
    key_events: [
      { Key: 'm', Event: 'pressed', 'Input Box': 'Name', 'Text Changed': true, Timestamp: new Date().toISOString(), Epoch: Date.now().toString() },
      { Key: 'm', Event: 'released', 'Input Box': 'Name', 'Text Changed': true, Timestamp: new Date().toISOString(), Epoch: Date.now().toString() }
    ],
    mouse_events: []
  };

  // Add 10 training sessions
  console.log('Seeding training data...');
  for (let i = 0; i < 10; i++) {
    await svc.addTrainingData(sampleLegit as any);
  }

  console.log('Model status after seeding:', BehavioralAuthService.getModelStatus());

  // Predict on a legitimate-like sample
  const legitResult = await svc.predict(sampleLegit as any);
  console.log('Legit prediction:', legitResult.prediction, 'confidence:', legitResult.confidence, 'probs:', legitResult.legitimateProb, legitResult.fraudulentProb);

  // Predict on a provided fraudulent sample (if available)
  const fraudSample = Object.values(fraudulentBehavioralData.false_data)[0];
  if (fraudSample) {
    const fraudResult = await svc.predict({ key_events: fraudSample.key_events, mouse_events: fraudSample.mouse_events || [] } as any);
    console.log('Fraud prediction:', fraudResult.prediction, 'confidence:', fraudResult.confidence, 'probs:', fraudResult.legitimateProb, fraudResult.fraudulentProb);
  } else {
    console.log('No fraudulent sample available in fraudulentBehavioralData.false_data');
  }
}

run().catch(e => console.error(e));
