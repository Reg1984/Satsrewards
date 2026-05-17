import React, { useState } from 'react';
import { MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { provideFeedback } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface AIFeedbackProviderProps {
  className?: string;
  studentWork?: string;
  assignmentContext?: string;
}

export function AIFeedbackProvider({ 
  className, 
  studentWork = '', 
  assignmentContext = ''
}: AIFeedbackProviderProps) {
  const [workInput, setWorkInput] = useState(studentWork);
  const [contextInput, setContextInput] = useState(assignmentContext);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const handleGenerateFeedback = async () => {
    if (!workInput.trim()) {
      toast.error('Please enter student work to provide feedback on');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await provideFeedback(workInput, contextInput, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to generate feedback');
      } else {
        setFeedback(response.content);
        toast.success('Feedback generated!');
      }
    } catch (err) {
      console.error('Error generating feedback:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to generate feedback');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">AI Feedback Generator</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <p className="text-gray-600">
          Generate personalized feedback on student work with context-aware AI assistance.
        </p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Work
          </label>
          <textarea
            value={workInput}
            onChange={(e) => setWorkInput(e.target.value)}
            placeholder="Paste student work here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={5}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assignment Context (Optional)
          </label>
          <textarea
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            placeholder="Provide context about the assignment, learning objectives, or specific feedback areas..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
        
        <button
          onClick={handleGenerateFeedback}
          disabled={isLoading || !workInput.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Feedback...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Generate Feedback
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {feedback && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-2">Feedback:</h4>
            <div className="text-gray-700 whitespace-pre-line">
              {feedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}