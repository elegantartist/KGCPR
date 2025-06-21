import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// TODO (ADR-010): Import QueryParser
import { aiContextService } from './aiContextService';
import { SUPERVISOR_AGENT_SYSTEM_PROMPT, CHATBOT_ENGINEERING_GUIDELINES, PPR_ANALYSIS_PROMPT, PROACTIVE_SUGGESTION_PROMPT } from './prompt_templates';
import type { TrendAnalysis } from './trendAnalysisService';
// import { secureLog, sanitizeFinalResponse } from './privacyMiddleware'; // Assuming this exists from our plans

// Initialize LLM Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// const grok = new Grok({ apiKey: process.env.GROK_API_KEY });

// Temporary logging function until privacyMiddleware is implemented
function secureLog(message: string, data?: any) {
  console.log(`[SupervisorAgent] ${message}`, data || '');
}

class SupervisorAgentService {
  public async processQuery(userId: number, userQuery: string): Promise<string> {
    secureLog('Supervisor processing started', { userId });
    try {
      // TODO (ADR-010): const parsedQuery = await parseUserQuery(userQuery);
      const mcpBundle = await aiContextService.prepareContext(userId);

      const systemPrompt = `${SUPERVISOR_AGENT_SYSTEM_PROMPT}\n\n${CHATBOT_ENGINEERING_GUIDELINES}`;

      // This is a placeholder for the full logic. In the next steps, we will add
      // tool-use logic based on the parsedQuery.intent.
      const primaryResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the patient's current context:\n${JSON.stringify(mcpBundle, null, 2)}\n\nBased on that context, respond to the following query: ${userQuery}` }
        ]
      });
      let responseText = primaryResponse.choices[0].message.content || "I am having trouble responding right now.";

      // TODO (ADR-012): Implement multi-model validation using Anthropic.
      // TODO (ADR-013): Implement response sanitization.

      return responseText;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('CRITICAL ERROR in Supervisor Agent', { error: errorMessage });
      return "I'm sorry, an internal error occurred. Please try again shortly.";
    }
  }

  /**
   * Analyze patient data bundle and generate a comprehensive Patient Progress Report
   * @param dataBundle - Comprehensive patient data including scores, badges, and usage metrics
   * @returns Promise<string> - Generated PPR in structured format
   */
  public async analyzeAndGeneratePpr(dataBundle: any): Promise<string> {
    secureLog('PPR analysis started', { patientId: dataBundle.patient.id });
    
    try {
      // Prepare the data for analysis
      const analysisContext = this.formatDataBundleForAnalysis(dataBundle);
      
      // Use GPT-4o for comprehensive analysis and report generation
      const analysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: PPR_ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: `Please analyze the following patient data and generate a comprehensive Patient Progress Report:

${analysisContext}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.3 // Lower temperature for more consistent, factual analysis
      });

      const generatedReport = analysisResponse.choices[0]?.message?.content || 'Unable to generate report';
      
      secureLog('PPR analysis completed', { 
        patientId: dataBundle.patient.id,
        reportLength: generatedReport.length 
      });
      
      return generatedReport;

    } catch (error) {
      secureLog('PPR analysis failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Fallback to Anthropic if OpenAI fails
      try {
        const analysisContext = this.formatDataBundleForAnalysis(dataBundle);
        
        const fallbackResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: `${PPR_ANALYSIS_PROMPT}

Please analyze the following patient data and generate a comprehensive Patient Progress Report:

${analysisContext}`
            }
          ]
        });

        const fallbackReport = fallbackResponse.content[0]?.type === 'text' 
          ? fallbackResponse.content[0].text 
          : 'Unable to generate report with fallback service';
        
        secureLog('PPR analysis completed with fallback', { 
          patientId: dataBundle.patient.id,
          reportLength: fallbackReport.length 
        });
        
        return fallbackReport;

      } catch (fallbackError) {
        secureLog('PPR analysis completely failed', { 
          originalError: error instanceof Error ? error.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
        
        throw new Error('Failed to generate Patient Progress Report using both primary and fallback AI services');
      }
    }
  }

  /**
   * Format the data bundle into a structured analysis context for the AI
   */
  private formatDataBundleForAnalysis(dataBundle: any): string {
    const { patient, scores, badges, featureUsage, analysisTimeframe } = dataBundle;
    
    // Calculate score statistics
    const scoreStats = this.calculateScoreStatistics(scores);
    
    return `
PATIENT INFORMATION:
- Name: ${patient.name}
- Patient ID: ${patient.id}
- Analysis Period: ${analysisTimeframe.startDate.toDateString()} to ${analysisTimeframe.endDate.toDateString()} (${analysisTimeframe.totalDays} days)

DAILY SELF-SCORES DATA (${scores.length} submissions):
${scores.map(score => 
  `${score.scoreDate.toDateString()}: Diet=${score.dietScore}, Exercise=${score.exerciseScore}, Medication=${score.medicationScore}`
).join('\n')}

SCORE STATISTICS:
- Diet: Average=${scoreStats.diet.average.toFixed(1)}, Min=${scoreStats.diet.min}, Max=${scoreStats.diet.max}, Trend=${scoreStats.diet.trend}
- Exercise: Average=${scoreStats.exercise.average.toFixed(1)}, Min=${scoreStats.exercise.min}, Max=${scoreStats.exercise.max}, Trend=${scoreStats.exercise.trend}
- Medication: Average=${scoreStats.medication.average.toFixed(1)}, Min=${scoreStats.medication.min}, Max=${scoreStats.medication.max}, Trend=${scoreStats.medication.trend}

PROGRESS MILESTONES & BADGES (${badges.length} earned):
${badges.map(badge => 
  `${badge.earnedDate.toDateString()}: ${badge.badgeName} - ${badge.badgeTier} tier`
).join('\n') || 'No badges earned in this period'}

ENGAGEMENT METRICS:
- Daily Score Submissions: ${featureUsage.dailyScoresSubmissions}
- Total Days Active: ${featureUsage.totalDaysActive}
- Estimated Motivation Uploads: ${featureUsage.motivationUploads}
- Estimated Chatbot Interactions: ${featureUsage.chatbotInteractions}

Please provide a comprehensive analysis based on this data.`;
  }

  /**
   * Calculate statistical insights for patient scores
   */
  private calculateScoreStatistics(scores: any[]) {
    if (scores.length === 0) {
      return {
        diet: { average: 0, min: 0, max: 0, trend: 'No data' },
        exercise: { average: 0, min: 0, max: 0, trend: 'No data' },
        medication: { average: 0, min: 0, max: 0, trend: 'No data' }
      };
    }

    const calculateStats = (values: number[]) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Simple trend calculation: compare first half vs second half
      if (values.length >= 4) {
        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg + 0.5) {
          return { average, min, max, trend: 'Improving' };
        } else if (secondAvg < firstAvg - 0.5) {
          return { average, min, max, trend: 'Declining' };
        } else {
          return { average, min, max, trend: 'Stable' };
        }
      }
      
      return { average, min, max, trend: 'Insufficient data for trend' };
    };

    return {
      diet: calculateStats(scores.map(s => s.dietScore)),
      exercise: calculateStats(scores.map(s => s.exerciseScore)),
      medication: calculateStats(scores.map(s => s.medicationScore))
    };
  }

  /**
   * Generate proactive suggestion based on trend analysis
   * @param trend - The detected trend
   * @param cpdData - Patient's Care Plan Directives
   * @returns Promise<string> - Generated proactive suggestion
   */
  public async generateProactiveSuggestion(
    trend: TrendAnalysis, 
    cpdData?: { dietCpd?: string; exerciseCpd?: string; medicationCpd?: string }
  ): Promise<string> {
    try {
      secureLog('Generating proactive suggestion', { 
        trendType: trend.type, 
        category: trend.category 
      });

      const trendContext = `
**Detected Trend:**
Type: ${trend.type}
Category: ${trend.category}
Streak Length: ${trend.streakLength} days
Current Score: ${trend.currentScore}/10
Average Score: ${trend.averageScore}/10

**Patient's Care Plan Directives:**
Diet Goal: ${cpdData?.dietCpd || 'No specific goal set'}
Exercise Goal: ${cpdData?.exerciseCpd || 'No specific goal set'}
Medication Goal: ${cpdData?.medicationCpd || 'No specific goal set'}

**Available KGC Features:**
- Daily Self-Scores: Track diet, exercise, and medication adherence
- Motivation Feature: Upload photos for MIP enhancement
- Progress Milestones: Achievement badges and goal setting
- Inspiration Machine D: Motivational content and recipes
- AI Chat Assistant: Personalized health guidance
- PPR Reports: Comprehensive progress analysis
`;

      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        temperature: 0.7,
        system: PROACTIVE_SUGGESTION_PROMPT,
        messages: [
          {
            role: "user",
            content: trendContext
          }
        ]
      });

      const suggestion = completion.content[0].type === 'text' 
        ? completion.content[0].text.trim() 
        : 'Keep up the great work! Would you like to explore more features to support your health journey?';

      secureLog('Proactive suggestion generated successfully', { 
        suggestionLength: suggestion.length 
      });

      return suggestion;

    } catch (error) {
      console.error('Error generating proactive suggestion:', error);
      
      // Fallback suggestion based on trend type
      if (trend.type === 'negative_streak') {
        return `I notice you've been working hard on your health journey. Would you like to try the 'Inspiration Machine D' for some fresh motivation?`;
      } else {
        return `Congratulations on your progress! Would you like to celebrate by setting a new goal in your 'Progress Milestones'?`;
      }
    }
  }

  /**
   * Generate comprehensive Patient Progress Report using AI analysis
   */
  async analyzeAndGeneratePpr(dataBundle: any): Promise<string> {
    try {
      const promptText = `
You are a healthcare AI generating a comprehensive Patient Progress Report (PPR). Analyze the following patient data and create a detailed, professional medical report.

PATIENT DATA:
- Name: ${dataBundle.patient.name}
- Patient ID: ${dataBundle.patient.id}
- Analysis Period: ${dataBundle.analysisTimeframe.startDate.toDateString()} to ${dataBundle.analysisTimeframe.endDate.toDateString()}

HEALTH SCORES (${dataBundle.scores.length} submissions):
${dataBundle.scores.map((score: any) => `${score.scoreDate.toDateString()}: Diet=${score.dietScore}, Exercise=${score.exerciseScore}, Medication=${score.medicationScore}`).join('\n')}

ACHIEVEMENTS (${dataBundle.badges.length} badges earned):
${dataBundle.badges.map((badge: any) => `${badge.earnedDate.toDateString()}: ${badge.badgeTier} ${badge.badgeName}`).join('\n')}

ACTIVITY SUMMARY:
- Daily Score Submissions: ${dataBundle.featureUsage.dailyScoresSubmissions}
- Active Days: ${dataBundle.featureUsage.totalDaysActive}
- Estimated Interactions: ${dataBundle.featureUsage.chatbotInteractions}

Generate a comprehensive PPR including:
1. Executive Summary
2. Health Trends Analysis
3. Behavioral Patterns
4. Achievement Recognition
5. Recommendations for Care Plan
6. Risk Assessment
7. Next Steps

Format as a professional medical report suitable for healthcare providers.
`;

      const analysis = await this.generateAnalysis(promptText);
      
      return `
# Patient Progress Report (PPR)
**Generated:** ${new Date().toISOString()}
**Patient:** ${dataBundle.patient.name} (ID: ${dataBundle.patient.id})
**Period:** ${dataBundle.analysisTimeframe.totalDays} days

${analysis}

---
*This report was generated by KGCPR AI Health Assistant*
`;

    } catch (error) {
      console.error('Error generating PPR:', error);
      return `PPR Generation Error: Unable to complete analysis for Patient ID ${dataBundle.patient.id}. Please contact support.`;
    }
  }
}

export const supervisorAgentService = new SupervisorAgentService();