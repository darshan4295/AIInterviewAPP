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
}

export function VideoCall({
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  useEffect(() => {
    // Handle local video stream
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Handle remote video stream
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Listen for loadedmetadata event to ensure video is ready
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