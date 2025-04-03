import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Camera, CameraOff, PhoneOff } from 'lucide-react';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

export function VideoCall({
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onTranscriptUpdate
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptBufferRef = useRef<string[]>([]);
  const transcriptUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecognitionActiveRef = useRef(false);

  // Initialize Web Speech API
  useEffect(() => {
    if (!localStream || !onTranscriptUpdate) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Handle results
    recognition.onresult = (event) => {
      if (!isRecognitionActiveRef.current) return;

      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      if (isFinal) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedTranscript = `[${timestamp}] ${transcript}`;
        transcriptBufferRef.current.push(formattedTranscript);

        // Clear existing timeout
        if (transcriptUpdateTimeoutRef.current) {
          clearTimeout(transcriptUpdateTimeoutRef.current);
        }

        // Batch update
        transcriptUpdateTimeoutRef.current = setTimeout(() => {
          if (transcriptBufferRef.current.length > 0) {
            setTranscriptText(prev => {
              const newTranscript = transcriptBufferRef.current.join('\n');
              const updatedTranscript = prev ? `${prev}\n${newTranscript}` : newTranscript;
              onTranscriptUpdate?.(updatedTranscript);
              return updatedTranscript;
            });
            transcriptBufferRef.current = [];
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' && isRecognitionActiveRef.current) {
        // Only log if it wasn't intentionally stopped
        console.warn('Speech recognition aborted, attempting to restart');
        restartRecognition();
      } else if (event.error === 'not-allowed') {
        console.error('Microphone permission denied');
      } else {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Only restart if we're still supposed to be running
      if (isRecognitionActiveRef.current && localStream.active && !isMuted) {
        console.log('Recognition ended, restarting...');
        restartRecognition();
      }
    };

    const restartRecognition = () => {
      if (!isRecognitionActiveRef.current) return;
      
      try {
        setTimeout(() => {
          if (isRecognitionActiveRef.current && recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 1000); // Add delay before restart to prevent rapid restarts
      } catch (error) {
        console.error('Error restarting speech recognition:', error);
      }
    };

    // Start recognition
    try {
      isRecognitionActiveRef.current = true;
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }

    return () => {
      isRecognitionActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors when stopping
        }
      }
      if (transcriptUpdateTimeoutRef.current) {
        clearTimeout(transcriptUpdateTimeoutRef.current);
      }
    };
  }, [localStream, onTranscriptUpdate, isMuted]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      
      const handleLoadedMetadata = () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch(err => {
            console.error('Error playing remote video:', err);
          });
        }
      };

      remoteVideoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      setHasRemoteVideo(true);

      return () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    } else {
      setHasRemoteVideo(false);
    }
  }, [remoteStream]);

  // Handle mute/unmute for speech recognition
  useEffect(() => {
    if (isMuted) {
      isRecognitionActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors when stopping
        }
      }
    } else {
      isRecognitionActiveRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          // Ignore errors when recognition is already started
        }
      }
    }
  }, [isMuted]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        {/* Remote Video (Large) */}
        <div className={`absolute inset-0 ${hasRemoteVideo ? 'visible' : 'invisible'}`}>
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        </div>

        {/* Local Video */}
        <div className={hasRemoteVideo ? 'absolute bottom-4 right-4 w-64 h-48' : 'w-full h-full'}>
          <video
            ref={localVideoRef}
            className={`w-full h-full object-cover ${hasRemoteVideo ? 'rounded-lg shadow-lg' : ''}`}
            autoPlay
            playsInline
            muted
          />
        </div>

        {/* Connection Status */}
        {!hasRemoteVideo && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
            Waiting for other participant to join...
          </div>
        )}

        {/* Live Transcript */}
        {transcriptText && (
          <div className="absolute left-4 right-[calc(25%+1rem)] bottom-20 bg-black bg-opacity-50 backdrop-blur-sm text-white p-4 rounded-lg max-h-48 overflow-y-auto transition-all duration-300 ease-in-out">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {transcriptText}
            </pre>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex items-center justify-center space-x-4">
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:opacity-80 transition-colors`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
        </button>
        <button
          onClick={onToggleCamera}
          className={`p-4 rounded-full ${isCameraOff ? 'bg-red-600' : 'bg-gray-600'} hover:opacity-80 transition-colors`}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isCameraOff ? <CameraOff className="text-white" /> : <Camera className="text-white" />}
        </button>
        <button
          onClick={onEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          title="End Call"
        >
          <PhoneOff className="text-white" />
        </button>
      </div>
    </div>
  );
}