import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];

interface InterviewListProps {
  interviews: Interview[];
}

export function InterviewList({ interviews }: InterviewListProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: Interview['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-4">
      {interviews.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No interviews scheduled yet.</p>
      ) : (
        interviews.map((interview) => (
          <div
            key={interview.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(interview.status)}`}>
                  {interview.status}
                </span>
                <h4 className="mt-2 text-lg font-medium text-gray-900 capitalize">
                  {interview.type} Interview
                </h4>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-gray-500">
                    <Calendar size={16} className="mr-2" />
                    <span>{formatDate(interview.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Clock size={16} className="mr-2" />
                    <span>{formatTime(interview.scheduled_at)}</span>
                  </div>
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
            {interview.feedback && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-700">Feedback</h5>
                <p className="mt-1 text-gray-600">{interview.feedback}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}