import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface CodingQuestion {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  testCases?: string[];
  sampleCode?: string;
}

const CODING_QUESTIONS: CodingQuestion[] = [
  {
    id: 1,
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    difficulty: 'easy',
    points: 20,
    testCases: [
      'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]',
      'Input: nums = [3,2,4], target = 6\nOutput: [1,2]',
      'Input: nums = [3,3], target = 6\nOutput: [0,1]'
    ],
    sampleCode: 'function twoSum(nums: number[], target: number): number[] {\n  // Your code here\n}'
  },
  {
    id: 2,
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid. An input string is valid if: 1) Open brackets must be closed by the same type of brackets. 2) Open brackets must be closed in the correct order.',
    difficulty: 'medium',
    points: 30,
    testCases: [
      'Input: s = "()"\nOutput: true',
      'Input: s = "()[]{}"\nOutput: true',
      'Input: s = "(]"\nOutput: false'
    ],
    sampleCode: 'function isValid(s: string): boolean {\n  // Your code here\n}'
  },
  {
    id: 3,
    title: 'LRU Cache',
    description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class: LRUCache(int capacity) Initialize the LRU cache with positive size capacity. get(int key) Return the value of the key if the key exists, otherwise return -1. put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.',
    difficulty: 'hard',
    points: 50,
    testCases: [
      'Input: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]\nOutput: [null, null, null, 1, null, -1, null, -1, 3, 4]'
    ],
    sampleCode: 'class LRUCache {\n  constructor(capacity: number) {\n    // Your code here\n  }\n\n  get(key: number): number {\n    // Your code here\n  }\n\n  put(key: number, value: number): void {\n    // Your code here\n  }\n}'
  }
];

export function TechnicalAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
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
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleQuestionSelect = (question: CodingQuestion) => {
    setSelectedQuestion(question);
    setCode(question.sampleCode || '');
  };

  const handleQuestionScoreChange = (questionId: number, points: number) => {
    setQuestionScores(prev => {
      const newScores = { ...prev, [questionId]: points };
      const totalScore = Object.values(newScores).reduce((sum, score) => sum + score, 0);
      setScore(totalScore);
      return newScores;
    });
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

      if (interview.type === 'technical' && candidate) {
        const { error: candidateError } = await supabase
          .from('candidates')
          .update({
            status: score && score >= 70 ? 'managerial_round' : 'rejected'
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

  if (error || !interview || !candidate) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error || 'Interview not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Technical Assessment</h3>
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
              <h4 className="text-sm font-medium text-gray-500 mb-2">Assessment Details</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Scheduled for:</span>{' '}
                  {new Date(interview.scheduled_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Type:</span> Technical Assessment
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1 space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Coding Questions</h4>
                {CODING_QUESTIONS.map((question) => (
                  <div
                    key={question.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedQuestion?.id === question.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleQuestionSelect(question)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{question.title}</h5>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{question.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-500">{question.points} points</span>
                      <div className="flex items-center space-x-2">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={question.points}
                            checked={questionScores[question.id] === question.points}
                            onChange={() => handleQuestionScoreChange(question.id, question.points)}
                            className="text-blue-600 focus:ring-blue-500"
                            disabled={interview.status === 'completed'}
                          />
                          <CheckCircle className="ml-1 w-4 h-4 text-green-600" />
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={0}
                            checked={questionScores[question.id] === 0}
                            onChange={() => handleQuestionScoreChange(question.id, 0)}
                            className="text-blue-600 focus:ring-blue-500"
                            disabled={interview.status === 'completed'}
                          />
                          <XCircle className="ml-1 w-4 h-4 text-red-600" />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-span-2">
                {selectedQuestion ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{selectedQuestion.title}</h4>
                      <p className="text-sm text-gray-600">{selectedQuestion.description}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Test Cases</h5>
                      <div className="space-y-2">
                        {selectedQuestion.testCases?.map((testCase, index) => (
                          <pre key={index} className="p-3 bg-gray-50 rounded-lg text-sm font-mono whitespace-pre-wrap">
                            {testCase}
                          </pre>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Solution</h5>
                      <div className="relative">
                        <pre className="p-4 bg-gray-900 rounded-lg text-white font-mono text-sm overflow-auto">
                          <code>{code}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Select a question to view details
                  </div>
                )}
              </div>
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
                  placeholder="Enter your feedback about the candidate's technical skills..."
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
                    {isSaving ? 'Saving...' : 'Complete Assessment'}
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