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
}`,
  python: `def solution():
    # Your code here
    pass`,
  typescript: `function solution(): void {
  // Your code here
}`,
  java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
  cpp: `#include <iostream>

int main() {
    // Your code here
    return 0;
}`
};

export function CodeEditor({ initialCode, language, onLanguageChange }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    onLanguageChange(newLanguage);
    setCode(LANGUAGE_TEMPLATES[newLanguage as keyof typeof LANGUAGE_TEMPLATES] || '');
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Running...\n');

    try {
      // Here you would typically send the code to a backend service
      // For now, we'll simulate execution with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOutput(prev => prev + 'Program executed successfully!\n');
      
      // Simulate some output
      const sampleOutput = 'Output:\nHello, World!\nExecution time: 0.023s';
      setOutput(sampleOutput);
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(LANGUAGE_TEMPLATES[language as keyof typeof LANGUAGE_TEMPLATES] || '');
    setOutput('');
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
            }}
          />
        </div>
        <div className="border rounded-lg bg-gray-900 p-4 font-mono text-white overflow-auto">
          <pre className="whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
        </div>
      </div>
    </div>
  );
}