import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface TranscriptAnalyzerProps {
  transcript: string;
  onAnalysisComplete: (score: number, analysis: any) => void;
}

export function TranscriptAnalyzer({ transcript, onAnalysisComplete }: TranscriptAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transcript && !analyzing && !analysis) {
      analyzeTranscript();
    }
  }, [transcript]);

  const analyzeTranscript = async () => {
    if (!transcript || transcript.trim().length === 0) {
      setError('Transcript is empty. Cannot analyze.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Simulate AI analysis with a simple algorithm
      // In a real application, this would call an AI service API
      await simulateAIAnalysis(transcript);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const simulateAIAnalysis = async (text: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple scoring algorithm based on transcript length and keyword presence
    const wordCount = text.split(/\s+/).length;
    const keywordScores = calculateKeywordScores(text);
    
    // Calculate overall score (0-100)
    let score = Math.min(100, Math.max(0, 
      // Base score from word count (longer answers tend to be more complete)
      Math.min(50, wordCount / 10) + 
      // Score from keyword analysis
      keywordScores.score
    ));
    
    // Round to nearest integer
    score = Math.round(score);
    
    const analysis = {
      score,
      wordCount,
      keywordMatches: keywordScores.matches,
      strengths: generateStrengths(text, score),
      weaknesses: generateWeaknesses(text, score),
      summary: generateSummary(score)
    };
    
    setAnalysis(analysis);
    onAnalysisComplete(score, analysis);
  };

  const calculateKeywordScores = (text: string) => {
    // Keywords that indicate good responses in an interview
    const positiveKeywords = [
      'experience', 'project', 'team', 'success', 'challenge', 'solution',
      'leadership', 'initiative', 'collaborate', 'improve', 'develop',
      'implement', 'strategy', 'result', 'achievement', 'skill'
    ];
    
    // Keywords that might indicate negative responses
    const negativeKeywords = [
      'don\'t know', 'never', 'can\'t', 'problem', 'difficult', 'fail',
      'issue', 'mistake', 'wrong', 'bad', 'hate', 'quit', 'fired'
    ];
    
    const lowerText = text.toLowerCase();
    const matches: Record<string, number> = {};
    let score = 0;
    
    // Count positive keywords (each worth 2 points, up to 30)
    positiveKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const count = (lowerText.match(regex) || []).length;
      if (count > 0) {
        matches[keyword] = count;
        score += Math.min(count * 2, 6); // Cap at 6 points per keyword
      }
    });
    
    // Count negative keywords (each worth -1 point, down to -15)
    negativeKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/'/g, "\\'")}\\b`, 'gi');
      const count = (lowerText.match(regex) || []).length;
      if (count > 0) {
        matches[keyword] = count;
        score -= Math.min(count, 3); // Cap at -3 points per keyword
      }
    });
    
    // Cap the total score between 0 and 50
    score = Math.min(50, Math.max(0, score));
    
    return { score, matches };
  };

  const generateStrengths = (text: string, score: number) => {
    const strengths = [];
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount > 100) {
      strengths.push('Provided detailed responses');
    }
    
    if (text.toLowerCase().includes('experience') || text.toLowerCase().includes('project')) {
      strengths.push('Referenced relevant experience');
    }
    
    if (text.toLowerCase().includes('team') || text.toLowerCase().includes('collaborate')) {
      strengths.push('Demonstrated teamwork abilities');
    }
    
    if (text.toLowerCase().includes('challenge') && text.toLowerCase().includes('solution')) {
      strengths.push('Showed problem-solving skills');
    }
    
    if (score > 70) {
      strengths.push('Communicated clearly and effectively');
    }
    
    return strengths.length > 0 ? strengths : ['No specific strengths identified'];
  };

  const generateWeaknesses = (text: string, score: number) => {
    const weaknesses = [];
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount < 50) {
      weaknesses.push('Responses were brief and could use more detail');
    }
    
    if (text.toLowerCase().includes('don\'t know') || text.toLowerCase().includes('can\'t')) {
      weaknesses.push('Showed uncertainty in some responses');
    }
    
    if (score < 40) {
      weaknesses.push('Could improve overall communication clarity');
    }
    
    if (!text.toLowerCase().includes('example')) {
      weaknesses.push('Could provide more concrete examples');
    }
    
    return weaknesses.length > 0 ? weaknesses : ['No specific weaknesses identified'];
  };

  const generateSummary = (score: number) => {
    if (score >= 85) {
      return 'Excellent candidate with strong communication skills and relevant experience.';
    } else if (score >= 70) {
      return 'Strong candidate who demonstrated good knowledge and communication.';
    } else if (score >= 50) {
      return 'Satisfactory performance with some areas for improvement.';
    } else {
      return 'Candidate may need additional preparation or may not be a good fit for this role.';
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md flex items-start">
        <AlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="bg-blue-50 p-4 rounded-md flex items-start">
        <Clock className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="text-sm font-medium text-blue-800">Analyzing Transcript</h3>
          <p className="text-sm text-blue-700 mt-1">
            Our AI is analyzing the interview transcript. This may take a moment...
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-md flex items-start">
        <CheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="text-sm font-medium text-green-800">Analysis Complete</h3>
          <p className="text-sm text-green-700 mt-1">
            The interview transcript has been analyzed successfully.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">AI Analysis Results</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Overall Score</span>
            <div className="flex items-center">
              <div className="w-32 h-3 bg-gray-200 rounded-full mr-3">
                <div 
                  className={`h-3 rounded-full ${
                    analysis.score >= 70 ? 'bg-green-500' : 
                    analysis.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.score}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">{analysis.score}/100</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {analysis.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-sm text-gray-900 flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={14} />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Areas for Improvement</h4>
              <ul className="space-y-1">
                {analysis.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="text-sm text-gray-900 flex items-start">
                    <AlertCircle className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" size={14} />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Summary</h4>
            <p className="text-sm text-gray-900">{analysis.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}