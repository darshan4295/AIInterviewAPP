import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface InterviewWithCandidate extends Interview {
  candidates: Candidate;
}

interface AIInsights {
  summary: string;
  recommendation: string;
  salaryHike: {
    percentage: number;
    reason: string;
  };
}

// Mock AI analysis function - In production, this would call a real AI service
function generateAIInsights(interview: InterviewWithCandidate): AIInsights {
  const score = interview.score || 0;
  const experience = interview.candidates.experience;
  
  // Generate insights based on score and experience
  const insights: AIInsights = {
    summary: `The candidate demonstrated ${score >= 80 ? 'exceptional' : score >= 70 ? 'strong' : score >= 60 ? 'adequate' : 'limited'} performance during the interview. `,
    recommendation: score >= 70 ? 'Recommended for hire' : 'Not recommended at this time',
    salaryHike: {
      percentage: Math.min(30, Math.max(10, score / 10 + experience * 2)),
      reason: `Based on ${experience} years of experience and interview performance score of ${score}/100`
    }
  };

  // Add specific details based on interview type
  switch (interview.type) {
    case 'video':
      insights.summary += 'Communication skills and cultural fit were the primary focus areas.';
      break;
    case 'technical':
      insights.summary += 'Technical knowledge and problem-solving abilities were thoroughly assessed.';
      break;
    case 'managerial':
      insights.summary += 'Leadership potential and decision-making capabilities were evaluated.';
      break;
  }

  return insights;
}

// Mock transcript generation - In production, this would use actual recording data
function generateTranscript(interview: InterviewWithCandidate): string {
  const date = new Date(interview.scheduled_at).toLocaleDateString();
  const candidateName = interview.candidates.name;
  
  return `Interview Transcript - ${date}
Candidate: ${candidateName}
Type: ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview

[Start of Interview]

Interviewer: Hello ${candidateName}, thank you for joining us today. How are you?

Candidate: Hello! I'm doing well, thank you for having me.

Interviewer: Great! Let's start by discussing your background and experience.

[... Transcript would continue with actual conversation ...]

[End of Interview]

Duration: 45 minutes
Status: ${interview.status}
Final Score: ${interview.score}/100
`;
}

export function Analytics() {
  const [interviews, setInterviews] = useState<InterviewWithCandidate[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<InterviewWithCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInterviews() {
      try {
        const { data, error: fetchError } = await supabase
          .from('interviews')
          .select(`
            *,
            candidates (*)
          `)
          .eq('status', 'completed')
          .order('scheduled_at', { ascending: false });

        if (fetchError) throw fetchError;
        setInterviews(data as InterviewWithCandidate[]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInterviews();
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Interview Success Rate</h3>
            <BarChart3 className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {Math.round((interviews.filter(i => i.score && i.score >= 70).length / interviews.length) * 100)}%
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Candidates scoring above 70%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Average Score</h3>
            <TrendingUp className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(interviews.reduce((sum, i) => sum + (i.score || 0), 0) / interviews.length)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Points out of 100
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Avg. Salary Hike</h3>
            <DollarSign className="text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(interviews.reduce((sum, i) => {
              const insights = generateAIInsights(i);
              return sum + insights.salaryHike.percentage;
            }, 0) / interviews.length)}%
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Recommended increase
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Recent Interviews</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className={`px-6 py-4 cursor-pointer hover:bg-gray-50 ${
                  selectedInterview?.id === interview.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedInterview(interview)}
              >
                <h4 className="text-sm font-medium text-gray-900">
                  {interview.candidates.name}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(interview.scheduled_at).toLocaleDateString()} - {interview.type}
                </p>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${interview.score || 0}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {interview.score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          {selectedInterview ? (
            <>
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800">AI Analysis</h3>
                </div>
                <div className="p-6">
                  {(() => {
                    const insights = generateAIInsights(selectedInterview);
                    return (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Interview Summary</h4>
                          <p className="text-sm text-gray-600">{insights.summary}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Hiring Recommendation</h4>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            insights.recommendation.includes('Recommended')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {insights.recommendation}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Salary Recommendation</h4>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="text-2xl font-bold text-yellow-700 mb-2">
                              {insights.salaryHike.percentage}% Increase
                            </div>
                            <p className="text-sm text-yellow-600">
                              {insights.salaryHike.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {selectedInterview.type === 'video' && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-800">Interview Transcript</h3>
                    <FileText className="text-gray-400" />
                  </div>
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono bg-gray-50 p-4 rounded-lg">
                      {generateTranscript(selectedInterview)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-12 text-center text-gray-500">
                Select an interview to view AI analysis and transcript
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}