import React, { useState } from 'react';
import Editor from "@monaco-editor/react";
import { Play, RefreshCw } from 'lucide-react';

interface CodeEditorProps {
  initialCode: string;
  language: string;
  onLanguageChange: (language: string) => void;
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

export function CodeEditor({ initialCode, language, onLanguageChange }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    onLanguageChange(newLanguage);
    setCode(LANGUAGE_TEMPLATES[newLanguage as keyof typeof LANGUAGE_TEMPLATES] || '');
    setOutput('');
    setError(null);
  };

  const executeJavaScript = async (code: string): Promise<string> => {
    try {
      // Create a new function from the code and execute it
      const result: any[] = [];
      const originalConsoleLog = console.log;
      
      // Override console.log to capture output
      console.log = (...args) => {
        result.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      // Execute the code
      const fn = new Function(code);
      await fn();

      // Restore console.log
      console.log = originalConsoleLog;

      return result.join('\n');
    } catch (err) {
      throw new Error(`Runtime Error: ${(err as Error).message}`);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setOutput('Running...\n');

    try {
      let result = '';

      switch (language) {
        case 'javascript':
        case 'typescript':
          result = await executeJavaScript(code);
          break;
        
        case 'python':
          // For Python, we'll use a web worker or backend service in production
          result = 'Python execution requires a backend service.\nThis is a demo environment.';
          break;
        
        case 'java':
          result = 'Java execution requires a backend service.\nThis is a demo environment.';
          break;
        
        case 'cpp':
          result = 'C++ execution requires a backend service.\nThis is a demo environment.';
          break;
        
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      setOutput(result || 'No output');
    } catch (err) {
      setError((err as Error).message);
      setOutput(`Error: ${(err as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(LANGUAGE_TEMPLATES[language as keyof typeof LANGUAGE_TEMPLATES] || '');
    setOutput('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          >
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <Play size={16} />
          <span>{isRunning ? 'Running...' : 'Run Code'}</span>
        </button>
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
            }}
          />
        </div>
        <div className="border rounded-lg bg-gray-900 p-4 font-mono text-white overflow-auto">
          {error ? (
            <div className="text-red-400">
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          )}
        </div>
      </div>
    </div>
  );
}