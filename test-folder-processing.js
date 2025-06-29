/**
 * Test script to inject into browser console to test folder processing
 */

// Simulate what happens when a folder recording becomes current
async function testFolderRecordingProcessing() {
  console.log('🧪 Testing folder recording processing...');
  
  // Create a mock recording like what folder upload creates
  const mockAudioBlob = await fetch('/patth.wav').then(r => r.blob());
  
  const mockFolderRecording = {
    id: 'test-rec-1',
    name: 'Test patth.wav',
    audioUrl: URL.createObjectURL(mockAudioBlob),
    audioBlob: mockAudioBlob,
    metadata: {
      category: 'test',
      fileName: 'patth.wav',
      fileSize: mockAudioBlob.size,
      filePath: 'test/patth.wav'
    }
  };
  
  console.log('📁 Created mock folder recording:', mockFolderRecording);
  
  // Test 1: Check if we can access the Vue app instance
  const app = document.querySelector('#app').__vueParentComponent?.ctx;
  if (!app) {
    console.error('❌ Cannot access Vue app instance');
    return;
  }
  
  console.log('✅ Vue app instance found');
  
  // Test 2: Simulate setting currentRecording (this should trigger the watch)
  console.log('🎯 Simulating currentRecording change...');
  
  // Find the currentRecording reactive ref
  const practiceView = app.$refs || app.refs;
  console.log('🔍 PracticeView refs:', practiceView);
  
  // Manual test: Call setTargetAudio directly to verify it works with folder audio
  console.log('🔬 Testing setTargetAudio directly with folder audio...');
  
  // This should trigger the same VAD processing as single file upload
  if (window.setTargetAudio) {
    await window.setTargetAudio(mockAudioBlob, {
      name: mockFolderRecording.name,
      fileName: mockFolderRecording.metadata.fileName,
      source: 'folder'
    });
    console.log('✅ setTargetAudio completed');
  } else {
    console.error('❌ setTargetAudio not found on window');
  }
  
  return mockFolderRecording;
}

// Expose function globally for testing
window.testFolderRecordingProcessing = testFolderRecordingProcessing;

console.log('🧪 Test script loaded. Run: testFolderRecordingProcessing()');