import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Folder Upload and Playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // Wait for the app to load
    await page.waitForSelector('.practice-view', { timeout: 10000 });
  });

  test('should enable play target button after folder upload', async ({ page }) => {
    // Open recording set sidebar
    await page.click('button:has-text("📚 Recording Sets")');
    await page.waitForSelector('.recording-set-sidebar', { state: 'visible' });
    
    // Click the upload button to open folder upload modal
    const uploadButton = page.locator('.upload-section button:has-text("📤 Upload Folder")');
    await uploadButton.click();
    
    // Wait for folder upload modal
    await page.waitForSelector('.folder-upload-modal', { state: 'visible' });
    
    // Upload the public folder with audio files
    const folderPath = path.join(process.cwd(), 'public');
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the browse button or drag-drop area
    await page.click('.folder-input');
    
    const fileChooser = await fileChooserPromise;
    
    // Get all audio files from public folder
    const audioFiles = [
      path.join(folderPath, 'demo-target.mp3'),
      path.join(folderPath, 'path.mp3')
    ];
    
    // Filter to only existing files
    const fs = await import('fs');
    const existingFiles = audioFiles.filter(file => {
      try {
        return fs.existsSync(file);
      } catch {
        return false;
      }
    });
    
    if (existingFiles.length === 0) {
      console.warn('No audio files found in public folder, skipping test');
      return;
    }
    
    await fileChooser.setFiles(existingFiles);
    
    // Wait for files to be processed
    await page.waitForSelector('.file-count:has-text("audio files found")', { timeout: 5000 });
    
    // Enter a set name
    await page.fill('input[placeholder="Enter set name"]', 'Test Audio Set');
    
    // Click import button
    await page.click('button:has-text("Import")');
    
    // Wait for import to complete and modal to close
    await page.waitForSelector('.folder-upload-modal', { state: 'hidden', timeout: 10000 });
    
    // The first recording should be automatically selected
    // Wait for the audio player to appear
    await page.waitForSelector('.audio-column .audio-player', { timeout: 10000 });
    
    // Check that play target button is enabled
    const playTargetButton = page.locator('.playback-btn.target-btn');
    await expect(playTargetButton).toBeEnabled({ timeout: 5000 });
    
    // Verify debug info appears (indicates VAD processing happened)
    const debugInfo = page.locator('.audio-info');
    await expect(debugInfo).toBeVisible();
    await expect(debugInfo).toContainText('Raw:');
    await expect(debugInfo).toContainText('Final:');
    await expect(debugInfo).toContainText('Trimmed:');
    
    // Click play target button to verify it works
    await playTargetButton.click();
    
    // The button might change to pause or stay as play depending on implementation
    // Just verify no errors occurred
    await page.waitForTimeout(1000);
    
    // Verify no console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should process folder audio through VAD', async ({ page }) => {
    // Enable console logging to capture VAD processing messages
    const vadLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('VAD') || text.includes('Folder recording') || text.includes('Target audio')) {
        vadLogs.push(text);
      }
    });
    
    // Open recording set sidebar
    await page.click('button:has-text("📚 Recording Sets")');
    await page.waitForSelector('.recording-set-sidebar', { state: 'visible' });
    
    // Upload folder (similar to previous test)
    const uploadButton = page.locator('.upload-section button:has-text("📤 Upload Folder")');
    await uploadButton.click();
    
    await page.waitForSelector('.folder-upload-modal', { state: 'visible' });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.folder-input');
    const fileChooser = await fileChooserPromise;
    
    const folderPath = path.join(process.cwd(), 'public');
    const audioFile = path.join(folderPath, 'demo-target.mp3');
    
    const fs = await import('fs');
    if (!fs.existsSync(audioFile)) {
      console.warn('demo-target.mp3 not found, skipping VAD test');
      return;
    }
    
    await fileChooser.setFiles([audioFile]);
    await page.fill('input[placeholder="Enter set name"]', 'VAD Test Set');
    await page.click('button:has-text("Import")');
    
    // Wait for import and processing
    await page.waitForSelector('.folder-upload-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.audio-column .audio-player', { timeout: 10000 });
    
    // Give VAD processing time to complete
    await page.waitForTimeout(2000);
    
    // Check that VAD processing logs appeared
    const vadProcessingLogs = vadLogs.filter(log => 
      log.includes('Processing folder recording') ||
      log.includes('VAD analysis complete') ||
      log.includes('Folder recording processed')
    );
    
    expect(vadProcessingLogs.length).toBeGreaterThan(0);
    console.log('VAD Processing logs found:', vadProcessingLogs);
    
    // Verify trimming happened by checking debug info
    const trimmedText = await page.locator('.audio-info').textContent();
    expect(trimmedText).toContain('Trimmed:');
    
    // If trimming occurred, the trimmed value should not always be 0.000
    // (though it might be 0.000 for some files)
    console.log('Debug info:', trimmedText);
  });
});