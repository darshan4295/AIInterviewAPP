import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Mic, MicOff, Video, VideoOff, Play, Square } from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete: (recordingUrl: string, transcript: string) => void;
}

export function VideoRecorder({ onRecordingComplete }: VideoRecorderProps) {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState<boolean>(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = transcript;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText + ' ';
          } else {
            interimTranscript += transcriptText;
          }
        }
        
        setTranscript(finalTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };
    } else {
      console.error('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [transcript]);

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    setRecordedChunks([]);
    setTranscript('');
    
    // Start speech recognition
    if (recognitionRef.current) {
      setTranscribing(true);
      recognitionRef.current.start();
    }
    
    // Start video recording
    if (webcamRef.current && webcamRef.current.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: 'video/webm',
      });
      
      mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorderRef.current.start();
    }
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = useCallback(
    ({ data }: BlobEvent) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => [...prev, data]);
      }
    },
    [setRecordedChunks]
  );

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setTranscribing(false);
    }
    
    setCapturing(false);
  }, [mediaRecorderRef, webcamRef, setCapturing]);

  const handleDownload = useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      const url = URL.createObjectURL(blob);
      onRecordingComplete(url, transcript);
    }
  }, [recordedChunks, transcript, onRecordingComplete]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(!audioEnabled);
    
    if (webcamRef.current && webcamRef.current.stream) {
      webcamRef.current.stream.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
  }, [audioEnabled, webcamRef]);

  const toggleVideo = useCallback(() => {
    setVideoEnabled(!videoEnabled);
    
    if (webcamRef.current && webcamRef.current.stream) {
      webcamRef.current.stream.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
  }, [videoEnabled, webcamRef]);

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Webcam
          audio={true}
          ref={webcamRef}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: 'user',
          }}
          className="w-full h-auto"
          style={{ display: videoEnabled ? 'block' : 'none' }}
        />
        {!videoEnabled && (
          <div className="w-full h-96 bg-gray-800 flex items-center justify-center">
            <VideoOff size={64} className="text-gray-400" />
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between">
          <div className="flex space-x-2">
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-full ${audioEnabled ? 'bg-blue-600' : 'bg-red-600'}`}
            >
              {audioEnabled ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-full ${videoEnabled ? 'bg-blue-600' : 'bg-red-600'}`}
            >
              {videoEnabled ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
            </button>
          </div>
          
          {!capturing ? (
            <button
              onClick={handleStartCaptureClick}
              className="p-2 rounded-full bg-red-600"
            >
              <Play size={20} className="text-white" />
            </button>
          ) : (
            <button
              onClick={handleStopCaptureClick}
              className="p-2 rounded-full bg-red-600"
            >
              <Square size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Live Transcript</h3>
        <div className="h-32 overflow-y-auto p-3 bg-gray-50 rounded border border-gray-200">
          {transcript || (transcribing ? 'Listening...' : 'Transcript will appear here when you start recording')}
        </div>
      </div>
      
      {recordedChunks.length > 0 && !capturing && (
        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Complete Recording
          </button>
        </div>
      )}
    </div>
  );
}

// Add type definition for SpeechRecognition if not available
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}