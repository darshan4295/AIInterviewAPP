import React, { useState } from 'react';
import Editor from "@monaco-editor/react";
import { Play, RefreshCw, Send } from 'lucide-react';

interface CodeEditorProps {
  initialCode: string;
  language: string;
  onLanguageChange: (language: string) => void;
  onSubmit?: (code: string) => void;
  readOnly?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' }
];

const LANGUAGE_TEMPLATES = {
  javascript: `function solution() {
  // Your code here
  return 42;
}

// Test your solution
console.log(solution());`,
  python: `def solution():
    # Your code here
    return 42

# Test your solution
print(solution())`,
  typescript: `function solution(): number {
  // Your code here
  return 42;
}

// Test your solution
console.log(solution());`,
  java: `public class Solution {
    public static void main(String[] args) {
        System.out.println(solution());
    }
    
    public static int solution() {
        // Your code here
        return 42;
    }
}`,
  cpp: `#include <iostream>

int solution() {
    // Your code here
    return 42;
}

int main() {
    std::cout << solution() << std::endl;
    return 0;
}`
};

interface AIFeedback {
  score: number;
  feedback: string;
  suggestions: string[];
  complexity: {
    time: string;
    space: string;
  };
}

// Mock AI analysis function - In production, this would call a real AI service
function analyzeCode(code: string, language: string): AIFeedback {
  // Basic code analysis
  const linesOfCode = code.split('\n').length;
  const hasComments = code.includes('//') || code.includes('/*') || code.includes('#');
  const hasTestCases = code.toLowerCase().includes('test');
  const hasErrorHandling = code.includes('try') || code.includes('catch') || code.includes('throw');
  
  // Generate mock feedback
  const score = Math.min(100, 60 + (hasComments ? 10 : 0) + (hasTestCases ? 15 : 0) + (hasErrorHandling ? 15 : 0));
  
  const feedback = [
    `Your solution is ${score >= 80 ? 'well-structured' : 'adequate'} and ${hasComments ? 'includes documentation' : 'could use more comments'}.`,
    `The code is ${linesOfCode > 20 ? 'quite lengthy' : 'concise'} at ${linesOfCode} lines.`,
    hasTestCases ? 'Good inclusion of test cases.' : 'Consider adding test cases.',
    hasErrorHandling ? 'Proper error handling is implemented.' : 'Error handling could be improved.'
  ].join(' ');

  return {
    score,
    feedback,
    suggestions: [
      hasComments ? 'Consider adding more detailed comments for complex logic' : 'Add comments to explain your approach',
      hasTestCases ? 'Add edge case tests' : 'Include test cases for validation',
      hasErrorHandling ? 'Consider adding more specific error messages' : 'Implement error handling',
      'Consider optimizing the space complexity',
      'Look for opportunities to improve readability'
    ],
    complexity: {
      time: 'O(n)',
      space: 'O(1)'
    }
  };
}

export function CodeEditor({ initialCode, language, onLanguageChange, onSubmit, readOnly = false }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    onLanguageChange(newLanguage);
    setCode(LANGUAGE_TEMPLATES[newLanguage as keyof typeof LANGUAGE_TEMPLATES] || '');
    setOutput('');
    setError(null);
    setAiFeedback(null);
  };

  const executeJavaScript = async (code: string): Promise<string> => {
    try {
      const result: any[] = [];
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      // Override console methods to capture output
      console.log = (...args) => {
        result.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      console.error = (...args) => {
        result.push(`Error: ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')}`);
      };

      // Create a safe execution context
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction(code);
      await fn();

      // Restore console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;

      return result.join('\n');
    } catch (err) {
      throw new Error(`Runtime Error: ${(err as Error).message}`);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setOutput('Running...');

    try {
      let result = '';

      switch (language) {
        case 'javascript':
        case 'typescript':
          result = await executeJavaScript(code);
          break;
        
        case 'python':
          result = 'Python execution is not available in the browser environment.\nPlease use the provided test cases to verify your solution.';
          break;
        
        case 'java':
          result = 'Java execution is not available in the browser environment.\nPlease use the provided test cases to verify your solution.';
          break;
        
        case 'cpp':
          result = 'C++ execution is not available in the browser environment.\nPlease use the provided test cases to verify your solution.';
          break;
        
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      setOutput(result || 'No output');
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setOutput(`Error: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Run the code first
      await handleRun();
      
      // Analyze the code
      const feedback = analyzeCode(code, language);
      setAiFeedback(feedback);
      
      // Submit the code
      onSubmit(code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCode(LANGUAGE_TEMPLATES[language as keyof typeof LANGUAGE_TEMPLATES] || '');
    setOutput('');
    setError(null);
    setAiFeedback(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={readOnly}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900"
            title="Reset code to template"
            disabled={readOnly}
          >
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRun}
            disabled={isRunning || readOnly}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            title="Run code (JavaScript/TypeScript only)"
          >
            <Play size={16} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>
          {onSubmit && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || readOnly}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              title="Submit code for review"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[500px]">
        <div className="border rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            value={code}
            onChange={value => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
              wrappingIndent: 'same',
              formatOnPaste: true,
              formatOnType: true,
              readOnly
            }}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex-1 border rounded-lg bg-gray-900 p-4 font-mono text-white overflow-auto">
            <div className="mb-2 text-sm text-gray-400">
              {language !== 'javascript' && language !== 'typescript' && (
                <div className="bg-yellow-900/50 text-yellow-200 p-2 rounded mb-2">
                  Note: Only JavaScript/TypeScript execution is supported in the browser environment.
                </div>
              )}
            </div>
            {error ? (
              <div className="text-red-400">
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
            )}
          </div>

          {aiFeedback && (
            <div className="mt-4 border rounded-lg bg-white p-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">AI Analysis</h3>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Score:</span>
                  <span className={`text-lg font-bold ${
                    aiFeedback.score >= 80 ? 'text-green-600' :
                    aiFeedback.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {aiFeedback.score}/100
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
                  <p className="text-gray-600">{aiFeedback.feedback}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {aiFeedback.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-gray-600">{suggestion}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Complexity Analysis</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-500">Time Complexity:</span>
                      <div className="text-gray-900 font-mono">{aiFeedback.complexity.time}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-500">Space Complexity:</span>
                      <div className="text-gray-900 font-mono">{aiFeedback.complexity.space}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}