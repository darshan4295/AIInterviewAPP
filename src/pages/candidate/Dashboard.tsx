import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Code, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface InterviewWithCandidate extends Interview {
  candidates: Candidate;
}

export function CandidateDashboard() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewWithCandidate[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get candidate profile
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidates')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (candidateError) {
          throw candidateError;
        }

        if (!candidateData) {
          // Create a new candidate profile
          const { data: newCandidate, error: insertError } = await supabase
            .from('candidates')
            .insert({
              email: user.email,
              name: user.email.split('@')[0], // Use email username as temporary name
              experience: 0,
              skills: [],
              status: 'screening'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setCandidate(newCandidate);
        } else {
          setCandidate(candidateData);

          // Get interviews only if candidate exists
          const { data: interviewsData, error: interviewsError } = await supabase
            .from('interviews')
            .select(`
              *,
              candidates (*)
            `)
            .eq('candidate_id', candidateData.id)
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
  }, []);

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

  if (!candidate) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
        Candidate profile not found. Please contact support.
      </div>
    );
  }

  const getInterviewIcon = (type: Interview['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-6 w-6" />;
      case 'technical':
        return <Code className="h-6 w-6" />;
      case 'managerial':
        return <Briefcase className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Your Profile</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h4>
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
              <h4 className="text-sm font-medium text-gray-500 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Your Interviews</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {interviews.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No interviews scheduled yet.
            </div>
          ) : (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/interview/${interview.type}/${interview.id}`)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 text-gray-400">
                    {getInterviewIcon(interview.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview
                    </h4>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(interview.scheduled_at).toLocaleDateString()}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                        interview.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {interview.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {interview.score !== null && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">
                        {interview.score}/100
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}