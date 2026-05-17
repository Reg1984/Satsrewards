import React, { useState } from 'react';
import { Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import { explainConcept } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface AIConceptExplainerProps {
  className?: string;
}

export function AIConceptExplainer({ className }: AIConceptExplainerProps) {
  const [conceptInput, setConceptInput] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const handleExplainConcept = async () => {
    if (!conceptInput.trim()) {
      toast.error('Please enter a concept to explain');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await explainConcept(conceptInput, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to generate explanation');
      } else {
        setExplanation(response.content);
        toast.success('Explanation generated!');
      }
    } catch (err) {
      console.error('Error explaining concept:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to generate explanation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Concept Explainer</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <p className="text-gray-600">
          Need help understanding a Bitcoin or financial concept? Ask our AI assistant for a simple explanation.
        </p>
        
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              placeholder="Enter a concept (e.g., 'Bitcoin mining', 'private keys')"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <button
            onClick={handleExplainConcept}
            disabled={isLoading || !conceptInput.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Explaining...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Explain
              </>
            )}
          </button>
        </div>
        
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
        
        {explanation && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <h4 className="font-medium text-orange-800 mb-2">Explanation:</h4>
            <div className="text-gray-700 whitespace-pre-line">
              {explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}