import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WebRTCService } from '../../lib/webrtc';
import { TestCall } from '../../components/TestCall';
import { VideoCall } from '../../components/VideoCall';
import { TranscriptAnalysis } from '../../components/TranscriptAnalysis';
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
  const [userRole, setUserRole] = useState<'interviewer' | 'candidate'>('interviewer');

  // Video call states
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showTestCall, setShowTestCall] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const webrtcRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user's role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as 'interviewer' | 'candidate');
        }

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
    setShowTestCall(true);
  };

  const handleTestCallSuccess = async () => {
    setShowTestCall(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);

      // Initialize WebRTC
      if (id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        webrtcRef.current = new WebRTCService(
          id,
          user.id,
          userRole,
          (localStream) => {
            setStream(localStream);
          },
          (remoteStream) => {
            setRemoteStream(remoteStream);
          }
        );

        await webrtcRef.current.startCall(mediaStream);
      }

      setIsInCall(true);
    } catch (err) {
      setError('Failed to access camera and microphone');
      console.error('Error starting video call:', err);
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
    setRemoteStream(null);
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

  const handleTranscriptUpdate = (newTranscript: string) => {
    setTranscript(newTranscript);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-surface-900">Video Interviews</h3>
          </div>
          <div className="divide-y divide-surface-200">
            {interviews.length === 0 ? (
              <div className="px-6 py-8 text-center text-surface-500">
                No video interviews scheduled.
              </div>
            ) : (
              interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="px-6 py-4 hover:bg-surface-50 cursor-pointer"
                  onClick={() => navigate(`/interview/video/${interview.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Video className="h-6 w-6 text-surface-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">
                          {interview.candidates.name}
                        </p>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-surface-500">
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
                      'bg-primary-100 text-primary-800'
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

  return (
    <div className="space-y-6">
      {showTestCall && (
        <TestCall
          onClose={() => setShowTestCall(false)}
          onSuccess={handleTestCallSuccess}
        />
      )}

      {isInCall && (
        <VideoCall
          localStream={stream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={endVideoCall}
          onTranscriptUpdate={handleTranscriptUpdate}
        />
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-surface-900">Video Interview</h3>
            {!isInCall && interview?.status === 'scheduled' && (
              <button
                onClick={startVideoCall}
                className="btn-primary flex items-center space-x-2"
              >
                <Phone size={20} />
                <span>Start Video Call</span>
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              interview?.status === 'completed' ? 'bg-green-100 text-green-800' :
              interview?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-primary-100 text-primary-800'
            }`}>
              {interview?.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-surface-500 mb-2">Candidate Information</h4>
              <div className="space-y-2">
                <p className="text-sm text-surface-900">
                  <span className="font-medium">Name:</span> {candidate?.name}
                </p>
                <p className="text-sm text-surface-900">
                  <span className="font-medium">Email:</span> {candidate?.email}
                </p>
                <p className="text-sm text-surface-900">
                  <span className="font-medium">Experience:</span> {candidate?.experience} years
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-surface-500 mb-2">Interview Details</h4>
              <div className="space-y-2">
                <p className="text-sm text-surface-900">
                  <span className="font-medium">Scheduled for:</span>{' '}
                  {interview && new Date(interview.scheduled_at).toLocaleString()}
                </p>
                <p className="text-sm text-surface-900">
                  <span className="font-medium">Type:</span> Video Interview
                </p>
              </div>
            </div>
          </div>

          {transcript && (
            <div className="border-t border-surface-200 pt-6">
              <h4 className="text-lg font-medium text-surface-900 mb-4">Interview Analysis</h4>
              <TranscriptAnalysis transcript={transcript} />
            </div>
          )}

          {userRole === 'interviewer' && (
            <div className="border-t border-surface-200 pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Interview Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score || ''}
                    onChange={(e) => setScore(e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                    disabled={interview?.status === 'completed'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="input"
                    disabled={interview?.status === 'completed'}
                    placeholder="Enter your feedback about the candidate's performance..."
                  />
                </div>

                {interview?.status !== 'completed' && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => navigate(`/candidates/${candidate?.id}`)}
                      className="btn-surface"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !feedback || score === null}
                      className="btn-primary"
                    >
                      {isSaving ? 'Saving...' : 'Complete Interview'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}