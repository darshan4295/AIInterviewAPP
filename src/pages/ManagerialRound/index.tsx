import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface InterviewWithCandidate extends Interview {
  candidates: Candidate;
}

interface EvaluationCriteria {
  id: number;
  name: string;
  description: string;
  maxScore: number;
}

const EVALUATION_CRITERIA: EvaluationCriteria[] = [
  {
    id: 1,
    name: 'Leadership Potential',
    description: 'Ability to guide and influence others, take initiative, and drive results',
    maxScore: 25
  },
  {
    id: 2,
    name: 'Communication Skills',
    description: 'Clarity of expression, active listening, and ability to articulate complex ideas',
    maxScore: 25
  },
  {
    id: 3,
    name: 'Problem Solving',
    description: 'Approach to challenges, analytical thinking, and decision-making ability',
    maxScore: 25
  },
  {
    id: 4,
    name: 'Cultural Fit',
    description: 'Alignment with company values, teamwork, and adaptability',
    maxScore: 25
  }
];

const DISCUSSION_TOPICS = [
  {
    title: 'Leadership Experience',
    questions: [
      'Can you describe a situation where you had to lead a team through a challenging project?',
      'How do you motivate team members who are struggling with their tasks?',
      'What\'s your approach to delegating responsibilities?'
    ]
  },
  {
    title: 'Decision Making',
    questions: [
      'Tell me about a difficult decision you had to make in your previous role.',
      'How do you handle conflicting priorities?',
      'What\'s your process for making important decisions?'
    ]
  },
  {
    title: 'Conflict Resolution',
    questions: [
      'How do you handle disagreements with team members?',
      'Describe a situation where you had to resolve a conflict between team members.',
      'What\'s your approach to giving constructive feedback?'
    ]
  },
  {
    title: 'Strategic Thinking',
    questions: [
      'How do you approach long-term planning?',
      'Can you describe a time when you had to pivot your strategy?',
      'How do you balance short-term goals with long-term objectives?'
    ]
  }
];

export function ManagerialRound() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewWithCandidate[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [criteriaScores, setCriteriaScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'interviewer' | 'candidate'>('interviewer');

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
            
            // Calculate individual criteria scores based on total score
            const scorePerCriteria = Math.floor(interviewData.score / EVALUATION_CRITERIA.length);
            const initialScores: Record<number, number> = {};
            EVALUATION_CRITERIA.forEach(criteria => {
              initialScores[criteria.id] = scorePerCriteria;
            });
            setCriteriaScores(initialScores);
          }
        } else {
          const { data: interviewsData, error: interviewsError } = await supabase
            .from('interviews')
            .select('*, candidates(*)')
            .eq('type', 'managerial')
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
  }, [id]);

  const handleCriteriaScoreChange = (criteriaId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setCriteriaScores(prev => {
      const newScores = { ...prev, [criteriaId]: numValue };
      const totalScore = Object.values(newScores).reduce((sum, score) => sum + score, 0);
      setScore(totalScore);
      return newScores;
    });
  };

  const handleSave = async () => {
    if (!interview || !candidate) return;

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

      // Update candidate status if needed
      if (interview.type === 'managerial' && candidate) {
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({
            status: score && score >= 70 ? 'completed' : 'rejected'
          })
          .eq('id', candidate.id);

        if (candidateError) throw candidateError;
      }

      navigate(`/candidates/${candidate.id}`);
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
            <h3 className="text-lg font-medium text-gray-800">Managerial Rounds</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {interviews.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No managerial rounds scheduled.
              </div>
            ) : (
              interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/interview/managerial/${interview.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Briefcase className="h-6 w-6 text-gray-400" />
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

  // Candidate view
  if (userRole === 'candidate') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Managerial Round</h3>
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
                <h4 className="text-sm font-medium text-gray-500 mb-2">Interview Details</h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Scheduled for:</span>{' '}
                    {new Date(interview.scheduled_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Type:</span> Managerial Round
                  </p>
                  {interview.status === 'completed' && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Score:</span> {interview.score}/100
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Discussion Topics</h4>
              <div className="space-y-6">
                {DISCUSSION_TOPICS.map((topic, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="text-md font-medium text-gray-900 mb-4">{topic.title}</h5>
                    <ul className="space-y-3">
                      {topic.questions.map((question, qIndex) => (
                        <li key={qIndex} className="text-gray-600">
                          • {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Evaluation Criteria</h4>
                <div className="space-y-4">
                  {EVALUATION_CRITERIA.map((criteria) => (
                    <div key={criteria.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="text-md font-medium text-gray-900 mb-2">{criteria.name}</h5>
                      <p className="text-gray-600">{criteria.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interviewer view
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Managerial Round</h3>
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
                  <span className="font-medium">Type:</span> Managerial Round
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-medium text-gray-800 mb-4">Discussion Topics</h4>
            <div className="space-y-6 mb-8">
              {DISCUSSION_TOPICS.map((topic, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <h5 className="text-md font-medium text-gray-900 mb-4">{topic.title}</h5>
                  <ul className="space-y-3">
                    {topic.questions.map((question, qIndex) => (
                      <li key={qIndex} className="text-gray-600">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-medium text-gray-700 mb-4">Evaluation Criteria</h4>
            <div className="space-y-6">
              {EVALUATION_CRITERIA.map((criteria) => (
                <div key={criteria.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{criteria.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{criteria.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={criteria.maxScore}
                        value={criteriaScores[criteria.id] || ''}
                        onChange={(e) => handleCriteriaScoreChange(criteria.id, e.target.value)}
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        disabled={interview.status === 'completed'}
                      />
                      <span className="text-sm text-gray-500">/ {criteria.maxScore}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${((criteriaScores[criteria.id] || 0) / criteria.maxScore) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Feedback
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={interview.status === 'completed'}
                  placeholder="Enter your feedback about the candidate's managerial potential..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Score: {score || 0}/100
                </label>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${score || 0}%` }}
                  ></div>
                </div>
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