import { supabase } from '../supabase';
import { logError } from '../errorLogging';

export type AIRequestType = 'chat' | 'explainConcept' | 'recommendContent' | 'analyzePerformance' | 'generateQuiz' | 'provideFeedback';

export interface AIRequestOptions {
  prompt: string;
  type: AIRequestType;
  context?: string;
  maxTokens?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AIResponse<T = any> {
  content: T;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LearningRecommendation {
  title: string;
  description: string;
  type: 'topic' | 'quiz' | 'activity';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
}

export interface PerformanceInsights {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendedActions: string[];
  encouragement: string;
}

const MODEL = 'claude-opus-4-7';

async function callAIFunction(body: Record<string, any>): Promise<{ data: any; error: any }> {
  return supabase.functions.invoke('ai', { body });
}

export async function makeAIRequest<T = string>(options: AIRequestOptions): Promise<AIResponse<T>> {
  const { prompt, type, context = '', maxTokens = 2000, userId, metadata = {} } = options;

  try {
    const { data, error } = await callAIFunction({
      prompt,
      context,
      type,
      max_tokens: maxTokens,
      metadata: { ...metadata, userId, requestType: type },
    });

    if (error) {
      logError(error, { component: 'AIService', action: 'makeAIRequest', requestType: type, userId });
      return { content: null as unknown as T, model: MODEL, error: error.message };
    }

    return {
      content: data.content as T,
      model: data.model || MODEL,
      usage: data.usage,
    };
  } catch (err) {
    logError(err as Error, { component: 'AIService', action: 'makeAIRequest', requestType: type, userId });
    return {
      content: null as unknown as T,
      model: MODEL,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function chatWithAI(message: string, chatHistory = '', userId?: string): Promise<AIResponse<string>> {
  return makeAIRequest({ prompt: message, type: 'chat', context: chatHistory, userId });
}

export async function explainConcept(
  concept: string,
  studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  userId?: string
): Promise<AIResponse<string>> {
  const prompt = `Explain the following concept clearly and engagingly for a ${studentLevel} level student on the SatsRewards Bitcoin education platform:

Concept: ${concept}

Requirements:
- Use simple, relatable analogies and real-world examples
- Connect it to Bitcoin or financial literacy where relevant
- Keep it concise but thorough (200-400 words)
- End with a "Key Takeaway" one-liner
- Be encouraging and make it interesting`;

  return makeAIRequest({ prompt, type: 'explainConcept', userId, metadata: { concept, studentLevel } });
}

export async function recommendContent(
  studentData: {
    completedTopics: string[];
    quizScores: Record<string, number>;
    interests?: string[];
    weakAreas?: string[];
  },
  userId?: string
): Promise<AIResponse<LearningRecommendation[]>> {
  const prompt = `Based on this student's learning profile, recommend 5 personalised next learning steps.

Student profile:
- Completed topics: ${studentData.completedTopics.join(', ') || 'None yet'}
- Quiz scores: ${JSON.stringify(studentData.quizScores) || 'No quizzes taken'}
- Interests: ${studentData.interests?.join(', ') || 'General'}
- Areas needing work: ${studentData.weakAreas?.join(', ') || 'None identified'}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "title": "Topic name",
    "description": "1-2 sentence description of what they'll learn",
    "type": "topic" | "quiz" | "activity",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "estimatedMinutes": 10
  }
]`;

  const response = await makeAIRequest<string>({ prompt, type: 'recommendContent', userId, maxTokens: 1500 });

  if (response.error || !response.content) {
    return { content: [], model: response.model, error: response.error };
  }

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    const parsed: LearningRecommendation[] = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
    return { content: parsed, model: response.model, usage: response.usage };
  } catch {
    return { content: [], model: response.model, error: 'Failed to parse recommendations' };
  }
}

export async function analyzePerformance(
  studentData: {
    name?: string;
    completionRate: number;
    behaviourScore: number;
    attendanceRate: number;
    quizPassRate: number;
    totalSatsEarned: number;
    recentActivity: string[];
  },
  userId?: string
): Promise<AIResponse<PerformanceInsights>> {
  const prompt = `Analyse this student's performance on the SatsRewards Bitcoin education platform and provide personalised insights.

Performance data:
- Completion rate: ${studentData.completionRate}%
- Behaviour score: ${studentData.behaviourScore}/100
- Attendance: ${studentData.attendanceRate}%
- Quiz pass rate: ${studentData.quizPassRate}%
- Total sats earned: ${studentData.totalSatsEarned}
- Recent activity: ${studentData.recentActivity.join(', ') || 'None recorded'}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "recommendedActions": ["specific action 1", "specific action 2", "specific action 3"],
  "encouragement": "A personalised motivational message referencing their Bitcoin earnings"
}`;

  const response = await makeAIRequest<string>({ prompt, type: 'analyzePerformance', userId, maxTokens: 1500 });

  if (response.error || !response.content) {
    return { content: null as any, model: response.model, error: response.error };
  }

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    const parsed: PerformanceInsights = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
    return { content: parsed, model: response.model, usage: response.usage };
  } catch {
    return { content: null as any, model: response.model, error: 'Failed to parse performance insights' };
  }
}

export async function generateQuiz(
  topic: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  questionCount = 5,
  userId?: string
): Promise<AIResponse<QuizQuestion[]>> {
  const prompt = `Generate ${questionCount} multiple-choice quiz questions about "${topic}" for high school students learning Bitcoin and financial literacy.

Difficulty: ${difficulty}

Requirements:
- Each question should test genuine understanding, not just memorisation
- Options should be plausible (avoid obviously wrong answers)
- Explanations should teach, not just state the answer
- Connect questions to real-world Bitcoin/financial scenarios where possible

Return ONLY valid JSON array (no markdown, no preamble):
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct and what it means in practice"
  }
]

correctAnswer is the 0-based index of the correct option.`;

  const response = await makeAIRequest<string>({
    prompt,
    type: 'generateQuiz',
    userId,
    maxTokens: 3000,
    metadata: { topic, difficulty, questionCount },
  });

  if (response.error || !response.content) {
    return { content: [], model: response.model, error: response.error };
  }

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    const parsed: QuizQuestion[] = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
    return { content: parsed, model: response.model, usage: response.usage };
  } catch {
    return { content: [], model: response.model, error: 'Failed to parse quiz questions' };
  }
}

export async function provideFeedback(
  studentWork: string,
  assignmentContext: string,
  studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  userId?: string
): Promise<AIResponse<string>> {
  const prompt = `You are an encouraging teacher on the SatsRewards Bitcoin education platform. Provide constructive feedback on this student's work.

Assignment context: ${assignmentContext}
Student level: ${studentLevel}

Student's work:
"${studentWork}"

Write feedback that:
1. Starts with genuine praise for what they did well (be specific)
2. Identifies 1-2 key areas to improve (be kind and constructive)
3. Gives a concrete suggestion for how to improve
4. Ends with encouragement connecting their learning to real Bitcoin/financial literacy value
5. Keep it under 200 words — students don't read walls of text
6. Use a warm, mentor-like tone`;

  return makeAIRequest({
    prompt,
    type: 'provideFeedback',
    userId,
    maxTokens: 600,
    metadata: { assignmentContext, studentLevel },
  });
}
