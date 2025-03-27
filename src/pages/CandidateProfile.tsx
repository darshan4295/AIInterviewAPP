import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Github, Linkedin, FileText, Calendar, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ScheduleInterviewForm } from '../components/ScheduleInterviewForm';
import { InterviewList } from '../components/InterviewList';
import type { Database } from '../lib/database.types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];

export function CandidateProfile() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch candidate details
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', id)
          .single();

        if (candidateError) throw candidateError;
        setCandidate(candidateData);

        // Fetch interviews
        const { data: interviewsData, error: interviewsError } = await supabase
          .from('interviews')
          .select('*')
          .eq('candidate_id', id)
          .order('scheduled_at', { ascending: true });

        if (interviewsError) throw interviewsError;
        setInterviews(interviewsData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error || 'Candidate not found'}
      </div>
    );
  }

  const handleInterviewScheduled = async () => {
    if (!id) return;

    const { data, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', id)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setInterviews(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Candidate Profile</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Basic Information</h4>
              <div className="mt-2 space-y-4">
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
              <h4 className="text-sm font-medium text-gray-500">Professional Links</h4>
              <div className="mt-2 space-y-4">
                {candidate.github_url && (
                  <a
                    href={candidate.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Github size={16} />
                    <span>GitHub Profile</span>
                  </a>
                )}
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Linkedin size={16} />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
                {candidate.resume_url && (
                  <a
                    href={candidate.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <FileText size={16} />
                    <span>Resume</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500">Skills</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {candidate.skills?.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500">Interview Progress</h4>
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-gray-200"></div>
                </div>
                <div className="relative flex justify-between">
                  {['screening', 'video_interview', 'technical_assessment', 'managerial_round', 'completed'].map((stage) => (
                    <div
                      key={stage}
                      className={`flex flex-col items-center ${
                        candidate.status === stage ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        candidate.status === stage ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}>
                        <Calendar size={16} />
                      </div>
                      <div className="mt-2 text-xs capitalize">{stage.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Interviews</h3>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Schedule Interview</span>
          </button>
        </div>
        <div className="p-6">
          <InterviewList interviews={interviews} />
        </div>
      </div>

      {showScheduleForm && (
        <ScheduleInterviewForm
          candidateId={id!}
          onClose={() => setShowScheduleForm(false)}
          onSuccess={handleInterviewScheduled}
        />
      )}
    </div>
  );
}