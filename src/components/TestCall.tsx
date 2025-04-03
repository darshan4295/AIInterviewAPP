import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, X } from 'lucide-react';

interface TestCallProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function TestCall({ onClose, onSuccess }: TestCallProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    startTest();
    return () => {
      cleanup();
    };
  }, []);

  const startTest = async () => {
    try {
      // Check if the required APIs are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media devices. Please use a modern browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check if AudioContext is available
      if (typeof AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
        console.warn('AudioContext not supported - audio level meter will not work');
        return;
      }

      // Set up audio analysis
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to access camera and microphone. Please ensure you have granted the necessary permissions.'
      );
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSuccess = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Test Your Camera and Microphone</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
              {error}
            </div>
          ) : (
            <>
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Camera className="text-gray-500" size={20} />
                      <span className="text-sm font-medium text-gray-700">Camera</span>
                    </div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Mic className="text-gray-500" size={20} />
                      <span className="text-sm font-medium text-gray-700">Microphone</span>
                    </div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-100"
                      style={{ width: `${(audioLevel / 255) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Speak to test your microphone
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSuccess}
              disabled={!!error}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Start Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}