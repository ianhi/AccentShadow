/**
 * Unit tests for FolderUpload component
 * Tests folder upload, CSV parsing, and URL import functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FolderUpload from '../../src/components/FolderUpload.vue';

// Mock the useRecordingSets composable
const mockCreateRecordingSet = vi.fn();
const mockProcessUploadedFiles = vi.fn();

vi.mock('../../src/composables/useRecordingSets', () => ({
  useRecordingSets: () => ({
    createRecordingSet: mockCreateRecordingSet,
    processUploadedFiles: mockProcessUploadedFiles
  })
}));

describe('FolderUpload Component', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock File API
    global.File = class MockFile {
      constructor(content, filename, options = {}) {
        this.content = content;
        this.name = filename;
        this.size = content.length;
        this.type = options.type || '';
        this.webkitRelativePath = options.webkitRelativePath || '';
      }
      
      text() {
        return Promise.resolve(this.content);
      }
    };

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    wrapper = mount(FolderUpload, {
      props: {}
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  // Helper function to set component data
  const setComponentData = async (data) => {
    if (data.uploadedFiles) {
      wrapper.vm.uploadedFiles.value = data.uploadedFiles;
    }
    if (data.setName !== undefined) {
      wrapper.vm.setName.value = data.setName;
    }
    if (data.includeSubfolders !== undefined) {
      wrapper.vm.includeSubfolders.value = data.includeSubfolders;
    }
    if (data.importUrl !== undefined) {
      wrapper.vm.importUrl.value = data.importUrl;
    }
    await wrapper.vm.$nextTick();
  };

  describe('Initial State', () => {
    it('should render upload area when no files are uploaded', () => {
      expect(wrapper.find('.upload-area').exists()).toBe(true);
      expect(wrapper.find('.upload-preview').exists()).toBe(false);
    });

    it('should show both folder upload and URL import options', () => {
      expect(wrapper.find('.drop-zone').exists()).toBe(true);
      expect(wrapper.find('.url-import').exists()).toBe(true);
      expect(wrapper.text()).toContain('Drop a folder here');
      expect(wrapper.text()).toContain('Import from URL');
    });

    it('should have disabled import button initially', () => {
      const urlImportBtn = wrapper.find('.url-import-btn');
      expect(urlImportBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('File Upload Handling', () => {
    it('should filter and display audio files correctly', async () => {
      const audioFile = new File(['audio content'], 'test.mp3', { 
        type: 'audio/mpeg',
        webkitRelativePath: 'testfolder/test.mp3'
      });
      const textFile = new File(['text content'], 'readme.txt', { type: 'text/plain' });

      await setComponentData({ uploadedFiles: [audioFile, textFile] });

      expect(wrapper.vm.audioFiles).toHaveLength(1);
      expect(wrapper.vm.audioFiles[0].name).toBe('test.mp3');
    });

    it('should auto-detect categories from folder structure', async () => {
      const files = [
        new File(['audio1'], 'hello.mp3', { 
          type: 'audio/mpeg',
          webkitRelativePath: 'japanese/greetings/hello.mp3'
        }),
        new File(['audio2'], 'goodbye.mp3', { 
          type: 'audio/mpeg',
          webkitRelativePath: 'japanese/greetings/goodbye.mp3'
        }),
        new File(['audio3'], 'one.mp3', { 
          type: 'audio/mpeg',
          webkitRelativePath: 'japanese/numbers/one.mp3'
        })
      ];

      await setComponentData({ uploadedFiles: files });

      const categorized = wrapper.vm.categorizedFiles;
      expect(categorized).toHaveProperty('greetings');
      expect(categorized).toHaveProperty('numbers');
      expect(categorized.greetings).toHaveLength(2);
      expect(categorized.numbers).toHaveLength(1);
    });

    it('should respect subfolder inclusion setting', async () => {
      const files = [
        new File(['audio1'], 'root.mp3', { 
          type: 'audio/mpeg',
          webkitRelativePath: 'folder/root.mp3'
        }),
        new File(['audio2'], 'nested.mp3', { 
          type: 'audio/mpeg',
          webkitRelativePath: 'folder/subfolder/nested.mp3'
        })
      ];

      await setComponentData({ 
        uploadedFiles: files,
        includeSubfolders: false 
      });

      expect(wrapper.vm.audioFiles).toHaveLength(1);
      expect(wrapper.vm.audioFiles[0].name).toBe('root.mp3');
    });
  });

  describe('CSV Support', () => {
    it('should detect and parse CSV files', async () => {
      const csvContent = `filename,transcription,translation,speaker
hello.mp3,"Konnichiwa","Hello","Female Native"
goodbye.mp3,"Sayonara","Goodbye","Male Native"`;

      const csvFile = new File([csvContent], 'metadata.csv', { 
        type: 'text/csv',
        webkitRelativePath: 'japanese/metadata.csv'
      });

      await setComponentData({ uploadedFiles: [csvFile] });

      // Wait for CSV parsing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(wrapper.vm.hasCSVFile).toBe(true);
      expect(wrapper.vm.csvData).toBeTruthy();
      expect(wrapper.vm.csvData.rows).toHaveLength(2);
      expect(wrapper.vm.csvData.rows[0].transcription).toBe('Konnichiwa');
      expect(wrapper.vm.csvData.rows[0].translation).toBe('Hello');
    });

    it('should display CSV detection in UI', async () => {
      const csvFile = new File(['filename,text\ntest.mp3,Hello'], 'data.csv', { 
        type: 'text/csv' 
      });

      await setComponentData({ uploadedFiles: [csvFile] });
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(wrapper.find('.csv-info').exists()).toBe(true);
      expect(wrapper.text()).toContain('CSV file detected');
    });

    it('should handle malformed CSV gracefully', async () => {
      const malformedCSV = new File(['not,a,proper\ncsv'], 'bad.csv', { 
        type: 'text/csv' 
      });

      await setComponentData({ uploadedFiles: [malformedCSV] });
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(wrapper.vm.csvData).toBeTruthy();
      // Should still attempt to parse but may have limited data
    });
  });

  describe('CSV-Audio Matching', () => {
    it('should match CSV entries to audio files during import', async () => {
      const csvContent = `filename,transcription,translation,difficulty
hello.mp3,"Konnichiwa","Hello","beginner"`;

      const csvFile = new File([csvContent], 'metadata.csv', { type: 'text/csv' });
      const audioFile = new File(['audio'], 'hello.mp3', { 
        type: 'audio/mpeg',
        webkitRelativePath: 'japanese/hello.mp3'
      });

      await setComponentData({ 
        uploadedFiles: [csvFile, audioFile],
        setName: 'Test Set'
      });

      // Wait for CSV parsing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Mock the import process
      mockCreateRecordingSet.mockResolvedValue({ id: 'test-set' });

      // Trigger import
      await wrapper.find('.import-btn').trigger('click');
      await wrapper.vm.$nextTick();

      // Verify createRecordingSet was called with enhanced metadata
      expect(mockCreateRecordingSet).toHaveBeenCalled();
      const callArgs = mockCreateRecordingSet.mock.calls[0][0];
      
      expect(callArgs.recordings).toHaveLength(1);
      const recording = callArgs.recordings[0];
      expect(recording.name).toBe('Konnichiwa'); // From CSV transcription
      expect(recording.translation).toBe('Hello'); // From CSV
      expect(recording.metadata.difficulty).toBe('beginner'); // From CSV
    });

    it('should fallback to filename when no CSV match found', async () => {
      const csvContent = `filename,transcription
other.mp3,"Some Other Audio"`;

      const csvFile = new File([csvContent], 'metadata.csv', { type: 'text/csv' });
      const audioFile = new File(['audio'], 'nomatch.mp3', { 
        type: 'audio/mpeg' 
      });

      await setComponentData({ 
        uploadedFiles: [csvFile, audioFile],
        setName: 'Test Set'
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      mockCreateRecordingSet.mockResolvedValue({ id: 'test-set' });
      await wrapper.find('.import-btn').trigger('click');

      const callArgs = mockCreateRecordingSet.mock.calls[0][0];
      const recording = callArgs.recordings[0];
      expect(recording.name).toBe('nomatch'); // Fallback to cleaned filename
      expect(recording.translation).toBe(''); // No CSV match
    });
  });

  describe('URL Import', () => {
    it('should enable import button when URL is entered', async () => {
      const urlInput = wrapper.find('.url-input');
      const importBtn = wrapper.find('.url-import-btn');

      expect(importBtn.attributes('disabled')).toBeDefined();

      await urlInput.setValue('https://example.com/audio-folder');
      expect(importBtn.attributes('disabled')).toBeUndefined();
    });

    it('should show Google Drive message for drive URLs', async () => {
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      await setComponentData({ 
        importUrl: 'https://drive.google.com/drive/folders/1234567890' 
      });

      await wrapper.find('.url-import-btn').trigger('click');

      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Google Drive integration requires')
      );

      mockAlert.mockRestore();
    });

    it('should handle generic URL import notification', async () => {
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      await setComponentData({ 
        importUrl: 'https://example.com/some-folder' 
      });

      await wrapper.find('.url-import-btn').trigger('click');

      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('URL import is not yet implemented')
      );

      mockAlert.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should disable import when set name is empty', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      await setComponentData({ 
        uploadedFiles: [audioFile],
        setName: ''
      });

      const importBtn = wrapper.find('.import-btn');
      expect(importBtn.attributes('disabled')).toBeDefined();
    });

    it('should enable import when set name is provided', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      await setComponentData({ 
        uploadedFiles: [audioFile],
        setName: 'My Set'
      });

      const importBtn = wrapper.find('.import-btn');
      expect(importBtn.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Preview Display', () => {
    it('should show preview when files are uploaded', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { 
        type: 'audio/mpeg',
        webkitRelativePath: 'testfolder/test.mp3'
      });

      await setComponentData({ uploadedFiles: [audioFile] });

      expect(wrapper.find('.upload-area').exists()).toBe(false);
      expect(wrapper.find('.upload-preview').exists()).toBe(true);
      expect(wrapper.text()).toContain('testfolder');
      expect(wrapper.text()).toContain('1 audio files found');
    });

    it('should allow resetting upload', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      await setComponentData({ 
        uploadedFiles: [audioFile],
        setName: 'Test'
      });

      expect(wrapper.find('.upload-preview').exists()).toBe(true);

      await wrapper.find('.reset-btn').trigger('click');

      expect(wrapper.vm.uploadedFiles.value).toHaveLength(0);
      expect(wrapper.vm.setName.value).toBe('');
      expect(wrapper.find('.upload-area').exists()).toBe(true);
    });
  });

  describe('Import Process', () => {
    it('should show importing overlay during import', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      await setComponentData({ 
        uploadedFiles: [audioFile],
        setName: 'Test Set'
      });

      mockCreateRecordingSet.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 'test' }), 100))
      );

      const importPromise = wrapper.find('.import-btn').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.importing-overlay').exists()).toBe(true);
      expect(wrapper.text()).toContain('Importing recordings');

      await importPromise;
    });

    it('should emit close event on successful import', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      await setComponentData({ 
        uploadedFiles: [audioFile],
        setName: 'Test Set'
      });

      mockCreateRecordingSet.mockResolvedValue({ id: 'test-set' });

      await wrapper.find('.import-btn').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('imported')).toBeTruthy();
    });
  });

  describe('Event Handling', () => {
    it('should emit close event when close button is clicked', async () => {
      await wrapper.find('.close-btn').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when cancel button is clicked', async () => {
      const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      await setComponentData({ uploadedFiles: [audioFile] });

      await wrapper.find('.cancel-btn').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});