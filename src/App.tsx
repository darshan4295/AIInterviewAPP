import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CandidateDashboard } from './pages/candidate/Dashboard';
import { CandidateProfile } from './pages/CandidateProfile';
import { VideoInterview } from './pages/VideoInterview';
import { TechnicalAssessment } from './pages/TechnicalAssessment';
import { ManagerialRound } from './pages/ManagerialRound';
import { Analytics } from './pages/Analytics';
import { AuthForm } from './components/AuthForm';
import { getCurrentUser } from './lib/auth';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from './lib/auth';

interface AuthenticatedUser extends User {
  role: UserRole;
}

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(user => {
      setUser(user as AuthenticatedUser);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => window.location.reload()} />;
  }

  return (
    <Router>
      <Layout userRole={user.role}>
        <Routes>
          {user.role === 'interviewer' ? (
            // Interviewer Routes
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/candidates/:id" element={<CandidateProfile />} />
              <Route path="/interview/video" element={<VideoInterview />} />
              <Route path="/interview/video/:id" element={<VideoInterview />} />
              <Route path="/interview/technical" element={<TechnicalAssessment />} />
              <Route path="/interview/technical/:id" element={<TechnicalAssessment />} />
              <Route path="/interview/managerial" element={<ManagerialRound />} />
              <Route path="/interview/managerial/:id" element={<ManagerialRound />} />
              <Route path="/analytics" element={<Analytics />} />
            </>
          ) : (
            // Candidate Routes
            <>
              <Route path="/" element={<CandidateDashboard />} />
              <Route path="/interview/video/:id" element={<VideoInterview />} />
              <Route path="/interview/technical/:id" element={<TechnicalAssessment />} />
              <Route path="/interview/managerial/:id" element={<ManagerialRound />} />
            </>
          )}
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;