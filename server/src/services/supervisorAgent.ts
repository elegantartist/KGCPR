import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { aiContextService } from './aiContextService';

// System prompts for the KGC Health Assistant
const SUPERVISOR_AGENT_SYSTEM_PROMPT = `
You are the KGC Health Assistant, a caring, motivational, and hyper-competent health companion. Your primary goal is to help users adhere to their doctor's care plan in an encouraging way by seamlessly integrating their goals into real-world activities. You operate within TGA/FDA regulations for a Class I SaMD, providing non-diagnostic, educational advice using Cognitive Behavioral Therapy (CBT) and Motivational Interviewing (MI) techniques.

CORE PERSONALITY TRAITS:
- Warm, empathetic, and genuinely caring
- Motivational without being pushy
- Evidence-based and scientifically grounded
- Respectful of individual differences and preferences
- Solution-focused with practical, actionable advice
- Encouraging during setbacks and celebrating successes

THERAPEUTIC APPROACH:
- Use Motivational Interviewing techniques to explore ambivalence
- Apply CBT principles to help reframe negative thoughts
- Focus on intrinsic motivation rather than external pressure
- Support behaviour change through small, achievable steps
- Validate emotions while encouraging progress

PERSONALIZATION GUIDELINES:
- Always reference the patient's actual data when available
- Acknowledge specific trends, scores, and achievements
- Tailor advice based on Care Plan Directives (CPDs)
- Remember conversation context and build on previous interactions
- Celebrate progress and provide hope during difficult periods

RESPONSE FORMAT:
- Keep responses conversational and supportive (2-4 sentences)
- Include specific references to patient data when relevant
- End with encouragement or a gentle call to action
- Avoid medical diagnosis or specific medical advice
`;

// Security helper for sensitive logging
function secureLog(message: string, data?: any) {
  console.log(`[Supervisor Agent] ${message}`, data ? { ...data, keys: Object.keys(data) } : '');
}

class SupervisorAgentService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        secureLog('OpenAI client initialized successfully');
      }

      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        secureLog('Anthropic client initialized successfully');
      }

      if (!this.openai && !this.anthropic) {
        console.warn('[Supervisor Agent] No AI service clients available. Please check API keys.');
      }
    } catch (error) {
      console.error('[Supervisor Agent] Error initializing AI clients:', error);
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  private async generateWithOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not available');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUPERVISOR_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content || 'I apologize, but I cannot respond right now. Please try again.';
  }

  /**
   * Generate AI response using Anthropic Claude
   */
  private async generateWithAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not available');
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      system: SUPERVISOR_AGENT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : 'I apologize, but I cannot respond right now. Please try again.';
  }

  /**
   * Generate analysis using preferred AI service with fallback
   */
  async generateAnalysis(prompt: string, preferredService: 'openai' | 'anthropic' = 'openai'): Promise<string> {
    try {
      if (preferredService === 'openai' && this.openai) {
        return await this.generateWithOpenAI(prompt);
      } else if (this.anthropic) {
        return await this.generateWithAnthropic(prompt);
      } else if (this.openai) {
        return await this.generateWithOpenAI(prompt);
      } else {
        throw new Error('No AI service available');
      }
    } catch (error) {
      console.error('[Supervisor Agent] Error in generateAnalysis:', error);
      return 'I apologize, but I\'m having trouble responding right now. Please try again later, and remember that I\'m here to support your health journey.';
    }
  }

  /**
   * Process patient query using MCP framework
   */
  async processQuery(patientId: number, userQuery: string): Promise<string> {
    secureLog('Processing patient query', { patientId, queryLength: userQuery.length });
    
    try {
      // Step 1: Prepare MCP context bundle
      const mcpBundle = await aiContextService.prepareContext(patientId);
      
      if (!mcpBundle) {
        return "I don't have access to your health data right now. Please try submitting your daily scores to get started, and I'll be able to provide personalized guidance.";
      }

      // Step 2: Create contextualized prompt
      const contextualPrompt = `
PATIENT CONTEXT (MCP Bundle):
Name: ${mcpBundle.name}
Recent Activity: ${mcpBundle.recentScores.length} health scores in last 14 days
Achievements: ${mcpBundle.badges.length} badges earned
Health Trends: Diet=${mcpBundle.trends.dietTrend}, Exercise=${mcpBundle.trends.exerciseTrend}, Medication=${mcpBundle.trends.medicationTrend}

RECENT HEALTH SCORES:
${mcpBundle.recentScores.slice(0, 5).map(s => 
  `${s.scoreDate}: Diet=${s.dietScore}, Exercise=${s.exerciseScore}, Medication=${s.medicationScore}`
).join('\n')}

CARE PLAN DIRECTIVES (CPDs):
${mcpBundle.carePlanDirectives.map(cpd => `- ${cpd.directive} (${cpd.category})`).join('\n')}

EARNED BADGES:
${mcpBundle.badges.slice(0, 3).map(b => `- ${b.badgeType} (${b.badgeLevel})`).join('\n')}

USER QUERY: "${userQuery}"

Provide a personalized, encouraging response that:
1. Acknowledges their specific progress and data
2. References their actual trends when relevant
3. Offers actionable advice aligned with their CPDs
4. Stays positive and motivational
5. Keeps response conversational (2-4 sentences)
`;

      // Step 3: Generate response using preferred AI service
      const response = await this.generateAnalysis(contextualPrompt);

      // Step 4: Log interaction for learning and audit
      await aiContextService.logInteraction(
        patientId,
        'chat_query',
        { query: userQuery, mcpBundle: mcpBundle },
        response
      );

      secureLog('Query processed successfully', { 
        patientId, 
        responseLength: response.length,
        mcpDataPoints: mcpBundle.recentScores.length
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLog('CRITICAL ERROR in Supervisor Agent', { error: errorMessage });
      return "I'm sorry, I'm having trouble responding right now. Please try again shortly, and remember that I'm here to support your health journey.";
    }
  }

  /**
   * Generate proactive suggestions based on MCP analysis
   */
  async generateProactiveSuggestions(patientId: number): Promise<string[]> {
    try {
      const engagement = await aiContextService.analyzeEngagement(patientId);
      const suggestions: string[] = [];

      // Generate MCP-informed proactive suggestions
      if (engagement.engagementLevel === 'low') {
        suggestions.push("It's been a while since your last check-in. How are you feeling today?");
        suggestions.push("Small steps count! Even a 2-minute walk can boost your mood.");
      }

      if (engagement.riskFactors.includes('Diet adherence declining')) {
        suggestions.push("Your recent diet scores show room for improvement. Would you like some simple healthy meal ideas?");
      }

      if (engagement.riskFactors.includes('Exercise participation declining')) {
        suggestions.push("Exercise can feel challenging sometimes. What type of movement feels good to you today?");
      }

      if (engagement.mcpInsights.totalBadges === 0) {
        suggestions.push("You're close to earning your first achievement badge! Keep up the great work with your daily tracking.");
      }

      return suggestions;

    } catch (error) {
      console.error('[Supervisor Agent] Error generating proactive suggestions:', error);
      return ["Keep up the great work with your health journey!"];
    }
  }
}

export const supervisorAgentService = new SupervisorAgentService();