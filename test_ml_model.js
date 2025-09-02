const { BehavioralAuthService } = require('./src/services/BehavioralAuthService.ts');

// Test the ML model implementation
async function testMLModel() {
  console.log('=== Testing ML Model Implementation ===');
  
  try {
    const service = BehavioralAuthService.getInstance();
    
    // Test 1: Check initial state
    console.log('\n1. Initial Model Status:');
    const initialStatus = service.getModelStatus();
    console.log('Trained:', initialStatus.trained);
    console.log('Training Count:', initialStatus.trainingCount);
    console.log('Model Ready:', service.isModelReady);
    
    // Test 2: Create sample legitimate data
    console.log('\n2. Creating sample legitimate training data...');
    const legitimateData = {
      key_events: [
        { Key: 'v', Event: 'pressed', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.000Z', Epoch: '1704110400000' },
        { Key: 'v', Event: 'released', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.100Z', Epoch: '1704110400100' },
        { Key: 'i', Event: 'pressed', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.200Z', Epoch: '1704110400200' },
        { Key: 'i', Event: 'released', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.300Z', Epoch: '1704110400300' },
        { Key: 's', Event: 'pressed', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.400Z', Epoch: '1704110400400' },
        { Key: 's', Event: 'released', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.500Z', Epoch: '1704110400500' },
        { Key: 'a', Event: 'pressed', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.600Z', Epoch: '1704110400600' },
        { Key: 'a', Event: 'released', 'Input Box': 'cardType', 'Text Changed': true, Timestamp: '2024-01-01T10:00:00.700Z', Epoch: '1704110400700' },
      ],
      mouse_events: [
        { Event: 'move', Coordinates: [100, 200], Timestamp: '2024-01-01T10:00:00.050Z', Epoch: '1704110400050', 'Movement ID': 1 },
        { Event: 'move', Coordinates: [105, 205], Timestamp: '2024-01-01T10:00:00.150Z', Epoch: '1704110400150', 'Movement ID': 1 },
        { Event: 'release', Coordinates: [110, 210], Timestamp: '2024-01-01T10:00:00.800Z', Epoch: '1704110400800', 'Movement ID': 1 }
      ]
    };
    
    // Add multiple training sessions
    for (let i = 0; i < 10; i++) {
      console.log(`Adding training session ${i + 1}...`);
      await service.addTrainingData(legitimateData);
    }
    
    // Test 3: Check model status after training
    console.log('\n3. Model Status After Training:');
    const trainedStatus = service.getModelStatus();
    console.log('Trained:', trainedStatus.trained);
    console.log('Training Count:', trainedStatus.trainingCount);
    console.log('Model Ready:', service.isModelReady);
    
    // Test 4: Test prediction with legitimate data
    console.log('\n4. Testing prediction with legitimate data...');
    const legitimateResult = await service.predict(legitimateData);
    console.log('Legitimate Prediction:', legitimateResult.prediction);
    console.log('Legitimate Confidence:', legitimateResult.confidence);
    
    // Test 5: Test prediction with fraudulent data from fraudulentData.ts
    console.log('\n5. Testing prediction with fraudulent data...');
    const { fraudulentBehavioralData } = require('./src/data/fraudulentData.ts');
    const fraudulentSample = Object.values(fraudulentBehavioralData)[0];
    
    if (fraudulentSample) {
      const fraudulentTestData = {
        key_events: fraudulentSample.key_events,
        mouse_events: fraudulentSample.mouse_events || []
      };
      
      const fraudulentResult = await service.predict(fraudulentTestData);
      console.log('Fraudulent Prediction:', fraudulentResult.prediction);
      console.log('Fraudulent Confidence:', fraudulentResult.confidence);
      
      // Test 6: Compare feature differences
      console.log('\n6. Feature Analysis:');
      console.log('Legitimate Features Sample:', {
        dwell_avg: legitimateResult.features?.dwell_avg,
        flight_avg: legitimateResult.features?.flight_avg,
        error_rate: legitimateResult.features?.error_rate
      });
      console.log('Fraudulent Features Sample:', {
        dwell_avg: fraudulentResult.features?.dwell_avg,
        flight_avg: fraudulentResult.features?.flight_avg,
        error_rate: fraudulentResult.features?.error_rate
      });
    }
    
    console.log('\n=== ML Model Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMLModel();
