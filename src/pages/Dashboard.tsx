import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateStore } from '../store/candidateStore';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { AddCandidateForm } from '../components/AddCandidateForm';

export function Dashboard() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    candidates,
    isLoading,
    error,
    fetchCandidates 
  } = useCandidateStore();

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          onClick={() => setShowAddForm(true)}
        >
          <UserPlus size={20} />
          <span>Add Candidate</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Recent Candidates</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" />
              <p className="mt-2">Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {searchQuery
                ? 'No candidates found matching your search.'
                : 'No candidates yet. Add your first candidate to get started.'}
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/candidates/${candidate.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{candidate.name}</h4>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      candidate.status === 'completed' ? 'bg-green-100 text-green-800' :
                      candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {candidate.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddForm && <AddCandidateForm onClose={() => setShowAddForm(false)} />}
    </div>
  );
}