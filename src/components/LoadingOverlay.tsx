import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
          <LoadingSpinner size="lg" />
        </div>
      )}
      <div className={isLoading ? 'opacity-50' : ''}>
        {children}
      </div>
    </div>
  );
}