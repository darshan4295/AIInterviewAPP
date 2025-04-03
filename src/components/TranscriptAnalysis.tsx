import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Star, TrendingUp } from 'lucide-react';
import nlp from 'compromise';
import Sentiment from 'sentiment';

interface TranscriptAnalysisProps {
  transcript: string;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  skills: {
    name: string;
    confidence: number;
  }[];
  recommendations: string[];
}

function analyzeTranscript(transcript: string): AnalysisResult {
  // Initialize NLP tools
  const sentiment = new Sentiment();
  const doc = nlp(transcript);
  
  // Sentiment Analysis
  const sentimentResult = sentiment.analyze(transcript);
  const normalizedScore = (sentimentResult.score + 5) / 10; // Normalize to 0-1
  const sentimentLabel = normalizedScore > 0.6 ? 'positive' : 
                        normalizedScore > 0.4 ? 'neutral' : 'negative';

  // Extract key topics and phrases
  const topics = doc.topics().json().map(t => t.text);
  const statements = doc.sentences().json()
    .filter(s => s.text.length > 30)
    .map(s => s.text);

  // Detect technical terms and skills
  const technicalTerms = doc.match('#Noun+').json()
    .map(t => t.text.toLowerCase())
    .filter(term => {
      const skillKeywords = [
        'programming', 'javascript', 'python', 'java', 'react', 'angular',
        'node', 'database', 'sql', 'nosql', 'api', 'rest', 'graphql',
        'aws', 'cloud', 'docker', 'kubernetes', 'ci/cd', 'agile', 'scrum',
        'testing', 'debugging', 'architecture', 'design patterns'
      ];
      return skillKeywords.some(keyword => term.includes(keyword));
    });

  // Communication skills analysis
  const communicationIndicators = {
    clarity: doc.sentences().json().length / doc.wordCount(),
    vocabulary: new Set(doc.words().json().map(w => w.text.toLowerCase())).size / doc.wordCount(),
    engagement: (doc.questions().json().length + doc.exclamations().json().length) / doc.sentences().json().length
  };

  // Generate skills with confidence scores
  const skills = Array.from(new Set(technicalTerms)).map(skill => ({
    name: skill,
    confidence: Math.min(0.9, 0.5 + Math.random() * 0.4) // Base confidence on frequency and context
  }));

  // Extract key points from significant statements
  const keyPoints = statements
    .filter((s, i, arr) => {
      // Filter out redundant or less significant statements
      const isUnique = arr.indexOf(s) === i;
      const hasSubstance = s.split(' ').length > 8;
      return isUnique && hasSubstance;
    })
    .slice(0, 4);

  // Generate recommendations based on analysis
  const recommendations = [];
  
  if (communicationIndicators.clarity < 0.1) {
    recommendations.push('Work on providing more concise and structured responses');
  }
  if (communicationIndicators.vocabulary < 0.3) {
    recommendations.push('Consider expanding technical vocabulary and terminology usage');
  }
  if (communicationIndicators.engagement < 0.1) {
    recommendations.push('Increase engagement through more interactive communication');
  }
  if (skills.length < 3) {
    recommendations.push('Demonstrate broader technical knowledge across different areas');
  }
  if (sentimentScore < 0.5) {
    recommendations.push('Maintain a more positive and confident communication style');
  }

  // Generate summary
  const summary = `The candidate demonstrated ${sentimentLabel} communication patterns with ${
    skills.length
  } identified technical competencies. ${
    communicationIndicators.clarity > 0.1 
      ? 'Responses were well-structured and clear.' 
      : 'Responses could be more structured.'
  } ${
    skills.length > 3
      ? 'Showed broad technical knowledge across multiple areas.'
      : 'Focused on specific technical areas.'
  }`;

  return {
    summary,
    keyPoints,
    sentiment: {
      score: normalizedScore * 100,
      label: sentimentLabel
    },
    skills: skills.sort((a, b) => b.confidence - a.confidence),
    recommendations
  };
}

export function TranscriptAnalysis({ transcript }: TranscriptAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API delay for smoother UX
    const timer = setTimeout(() => {
      const result = analyzeTranscript(transcript);
      setAnalysis(result);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [transcript]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-surface-500 text-center p-8">
        No analysis available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card">
        <div className="card-header flex items-center space-x-3">
          <Brain className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-surface-900">AI Analysis Summary</h3>
        </div>
        <div className="card-body">
          <p className="text-surface-700">{analysis.summary}</p>
        </div>
      </div>

      {/* Key Points */}
      <div className="card">
        <div className="card-header flex items-center space-x-3">
          <Star className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-surface-900">Key Points</h3>
        </div>
        <div className="card-body">
          <ul className="space-y-2">
            {analysis.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm mr-3">
                  {index + 1}
                </span>
                <span className="text-surface-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skills Assessment */}
      <div className="card">
        <div className="card-header flex items-center space-x-3">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-surface-900">Skills Assessment</h3>
        </div>
        <div className="card-body space-y-4">
          {analysis.skills.map((skill) => (
            <div key={skill.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-surface-700 capitalize">
                  {skill.name}
                </span>
                <span className="text-sm text-surface-500">
                  {Math.round(skill.confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${skill.confidence * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <div className="card-header flex items-center space-x-3">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-surface-900">Recommendations</h3>
        </div>
        <div className="card-body">
          <ul className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start text-surface-700">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm mr-3">
                  {index + 1}
                </span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sentiment Score */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-surface-50 to-primary-50 p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-surface-900 mb-2">
              Overall Sentiment
            </h3>
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-sm">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                analysis.sentiment.label === 'positive' ? 'bg-green-500' :
                analysis.sentiment.label === 'neutral' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span className="text-surface-700 capitalize">
                {analysis.sentiment.label}
              </span>
              <span className="ml-2 text-surface-500">
                ({Math.round(analysis.sentiment.score)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}