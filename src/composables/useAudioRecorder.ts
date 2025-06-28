
import { ref, shallowRef } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

const isRecording = ref(false);
const recordingTime = ref(0);
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];
const wavesurferMic = shallowRef<WaveSurfer | null>(null);
let recordPluginInstance: any = null; // To store the record plugin instance

async function startRecording(waveformContainer?: HTMLElement | null, existingStream: MediaStream | null = null): Promise<void> {
  try {
    const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      // Clean up stream tracks
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      if (wavesurferMic.value) {
        wavesurferMic.value.destroy();
        wavesurferMic.value = null;
      }
    };

    // Only create wavesurfer instance if container is available
    if (waveformContainer) {
      try {
        // Initialize wavesurfer instance
        wavesurferMic.value = WaveSurfer.create({
          container: waveformContainer,
          waveColor: '#A8DBA8',
          progressColor: '#3B82F6',
          cursorColor: '#3B82F6',
          barWidth: 3,
          barRadius: 3,
          height: 80,
          normalize: true,
        });

        // Register the Record plugin explicitly
        recordPluginInstance = wavesurferMic.value.registerPlugin(RecordPlugin.create({
          mimeType: 'audio/webm;codecs=opus',
          scrollingWaveform: true,
        }));

        recordPluginInstance.on('record-start', () => {
          console.log('Recording started!');
        });

        recordPluginInstance.on('record-end', (blob: Blob) => {
          console.log('Recording ended!', blob);
        });

        recordPluginInstance.startRecording();
      } catch (waveformError) {
        console.warn('Could not create recording waveform visualization:', waveformError);
        // Continue without waveform visualization
      }
    }

    mediaRecorder.start();
    isRecording.value = true;
    recordingTime.value = 0;
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Could not start recording. Please ensure you have a microphone and have granted permission.');
  }
}

function stopRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        isRecording.value = false;
        if (recordPluginInstance) {
          recordPluginInstance.stopRecording();
        }
        resolve(audioBlob);
      };
      mediaRecorder.stop();
    } else {
      resolve(null);
    }
  });
}

export function useAudioRecorder() {
  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  };
}
