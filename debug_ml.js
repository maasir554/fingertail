// Quick test to diagnose the 50% confidence issue
const { fraudulentBehavioralData } = require('./src/data/fraudulentData');

console.log('=== FRAUDULENT DATA ANALYSIS ===');
Object.entries(fraudulentBehavioralData).forEach(([key, data], index) => {
  console.log(`Sample ${index + 1} (${key}):`);
  console.log(`  Key events: ${data.key_events?.length || 0}`);
  console.log(`  Touch events: ${data.touch_events?.length || 0}`);
  console.log(`  False enters: ${data.falseEnters || 0}`);
  
  // Calculate basic timing features
  const keyEvents = data.key_events || [];
  const dwellTimes = [];
  
  for (let i = 0; i < keyEvents.length; i++) {
    const event = keyEvents[i];
    if (event.event === 'pressed') {
      const releaseEvent = keyEvents.find((e, idx) => idx > i && e.key === event.key && e.event === 'released');
      if (releaseEvent) {
        const dwellTime = releaseEvent.epoch - event.epoch;
        dwellTimes.push(dwellTime);
      }
    }
  }
  
  const avgDwell = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;
  console.log(`  Average dwell time: ${avgDwell}ms`);
  console.log(`  Dwell times: [${dwellTimes.join(', ')}]`);
  console.log('---');
});
