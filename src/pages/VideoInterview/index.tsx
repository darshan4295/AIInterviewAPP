import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, User, Phone, PhoneOff, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WebRTCService } from '../../lib/webrtc';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface InterviewWithCandidate extends Interview {
  candidates: Candidate;
}

export function VideoInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewWithCandidate[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video call states
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        if (id) {
          const { data: interviewData, error: interviewError } = await supabase
            .from('interviews')
            .select('*, candidates(*)')
            .eq('id', id)
            .single();

          if (interviewError) throw interviewError;
          
          setInterview(interviewData);
          setCandidate(interviewData.candidates as Candidate);
          
          if (interviewData.feedback) {
            setFeedback(interviewData.feedback);
          }
          if (interviewData.score !== null) {
            setScore(interviewData.score);
          }
        } else {
          const { data: interviewsData, error: interviewsError } = await supabase
            .from('interviews')
            .select('*, candidates(*)')
            .eq('type', 'video')
            .order('scheduled_at', { ascending: true });

          if (interviewsError) throw interviewsError;
          setInterviews(interviewsData as InterviewWithCandidate[]);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
    };
  }, [id]);

  const startVideoCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      // Initialize WebRTC
      if (id) {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error('User not authenticated');

        webrtcRef.current = new WebRTCService(
          id,
          userId,
          (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          }
        );

        await webrtcRef.current.startCall(mediaStream);
      }

      setIsInCall(true);
    } catch (err) {
      setError('Failed to access camera and microphone');
    }
  };

  const endVideoCall = () => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsInCall(false);
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleSave = async () => {
    if (!interview) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('interviews')
        .update({
          feedback,
          score,
          status: 'completed'
        })
        .eq('id', interview.id);

      if (updateError) throw updateError;

      if (interview.type === 'video' && candidate) {
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({
            status: score && score >= 70 ? 'technical_assessment' : 'rejected'
          })
          .eq('id', candidate.id);

        if (candidateError) throw candidateError;
      }

      navigate(`/candidates/${candidate?.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  if (!id) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Video Interviews</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {interviews.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No video interviews scheduled.
              </div>
            ) : (
              interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/interview/video/${interview.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Video className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {interview.candidates.name}
                        </p>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(interview.scheduled_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(interview.scheduled_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                      interview.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {interview.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!interview || !candidate) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        Interview not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isInCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              className="absolute bottom-4 right-4 w-64 h-48 object-cover rounded-lg shadow-lg"
              autoPlay
              playsInline
              muted
            />
          </div>
          <div className="bg-gray-900 p-4 flex items-center justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full ${isCameraOff ? 'bg-red-600' : 'bg-gray-600'} hover:opacity-80`}
            >
              {isCameraOff ? <CameraOff className="text-white" /> : <Camera className="text-white" />}
            </button>
            <button
              onClick={endVideoCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Video Interview</h3>
            {!isInCall && interview.status === 'scheduled' && (
              <button
                onClick={startVideoCall}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Phone size={20} />
                <span>Start Video Call</span>
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              interview.status === 'completed' ? 'bg-green-100 text-green-800' :
              interview.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {interview.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Candidate Information</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Name:</span> {candidate.name}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Email:</span> {candidate.email}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Experience:</span> {candidate.experience} years
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Interview Details</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Scheduled for:</span>{' '}
                  {new Date(interview.scheduled_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Type:</span> Video Interview
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score || ''}
                  onChange={(e) => setScore(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={interview.status === 'completed'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={interview.status === 'completed'}
                  placeholder="Enter your feedback about the candidate's performance..."
                />
              </div>

              {interview.status !== 'completed' && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !feedback || score === null}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Complete Interview'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}