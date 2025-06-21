import { db } from "../db";
import { users, patientScores, patientBadges, carePlanDirectives } from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { supervisorAgentService } from "./supervisorAgentServiceFixed";

interface PatientContext {
  id: number;
  name: string;
  email: string;
  recentScores: any[];
  badges: any[];
  carePlanDirectives: any[];
  lastActivity: Date | null;
  trends: {
    dietTrend: 'improving' | 'stable' | 'declining';
    exerciseTrend: 'improving' | 'stable' | 'declining';
    medicationTrend: 'improving' | 'stable' | 'declining';
  };
}

class AIContextService {
  /**
   * Get comprehensive patient context for AI processing
   */
  async getPatientContext(patientId: number): Promise<PatientContext | null> {
    try {
      console.log(`Fetching AI context for patient ${patientId}`);

      // Get patient basic info
      const [patient] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, patientId));

      if (!patient) {
        console.log(`Patient ${patientId} not found`);
        return null;
      }

      // Get recent scores (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentScores = await db
        .select()
        .from(patientScores)
        .where(
          and(
            eq(patientScores.patientId, patientId),
            gte(patientScores.scoreDate, fourteenDaysAgo)
          )
        )
        .orderBy(desc(patientScores.scoreDate));

      // Get all badges
      const badges = await db
        .select()
        .from(patientBadges)
        .where(eq(patientBadges.patientId, patientId))
        .orderBy(desc(patientBadges.earnedDate));

      // Get care plan directives
      const cpds = await db
        .select()
        .from(carePlanDirectives)
        .where(eq(carePlanDirectives.patientId, patientId));

      // Calculate trends
      const trends = this.calculateTrends(recentScores);

      // Determine last activity
      const lastActivity = recentScores.length > 0 
        ? recentScores[0].scoreDate 
        : null;

      const context: PatientContext = {
        id: patient.id,
        name: patient.name || "Unknown Patient",
        email: patient.email || "",
        recentScores,
        badges,
        carePlanDirectives: cpds,
        lastActivity,
        trends
      };

      console.log(`AI context prepared for ${patient.name}: ${recentScores.length} scores, ${badges.length} badges`);
      return context;

    } catch (error) {
      console.error(`Error fetching patient context for ${patientId}:`, error);
      return null;
    }
  }

  /**
   * Calculate health trends from recent scores
   */
  private calculateTrends(scores: any[]): PatientContext['trends'] {
    if (scores.length < 3) {
      return {
        dietTrend: 'stable',
        exerciseTrend: 'stable',
        medicationTrend: 'stable'
      };
    }

    const recent = scores.slice(0, 3);
    const older = scores.slice(3, 6);

    if (recent.length < 2 || older.length < 2) {
      return {
        dietTrend: 'stable',
        exerciseTrend: 'stable',
        medicationTrend: 'stable'
      };
    }

    const recentAvg = {
      diet: recent.reduce((sum, s) => sum + s.dietScore, 0) / recent.length,
      exercise: recent.reduce((sum, s) => sum + s.exerciseScore, 0) / recent.length,
      medication: recent.reduce((sum, s) => sum + s.medicationScore, 0) / recent.length
    };

    const olderAvg = {
      diet: older.reduce((sum, s) => sum + s.dietScore, 0) / older.length,
      exercise: older.reduce((sum, s) => sum + s.exerciseScore, 0) / older.length,
      medication: older.reduce((sum, s) => sum + s.medicationScore, 0) / older.length
    };

    const getTrend = (recent: number, older: number) => {
      const diff = recent - older;
      if (diff > 0.5) return 'improving';
      if (diff < -0.5) return 'declining';
      return 'stable';
    };

    return {
      dietTrend: getTrend(recentAvg.diet, olderAvg.diet),
      exerciseTrend: getTrend(recentAvg.exercise, olderAvg.exercise),
      medicationTrend: getTrend(recentAvg.medication, olderAvg.medication)
    };
  }

  /**
   * Generate contextual AI response based on patient data
   */
  async generateContextualResponse(patientId: number, userQuery: string): Promise<string> {
    try {
      const context = await this.getPatientContext(patientId);
      
      if (!context) {
        return "I don't have access to your health data right now. Please try again later.";
      }

      const contextPrompt = `
You are a health assistant with access to this patient's data:

PATIENT: ${context.name}
RECENT ACTIVITY: ${context.recentScores.length} scores in last 14 days
ACHIEVEMENTS: ${context.badges.length} badges earned
TRENDS: Diet=${context.trends.dietTrend}, Exercise=${context.trends.exerciseTrend}, Medication=${context.trends.medicationTrend}

RECENT SCORES:
${context.recentScores.slice(0, 5).map(s => 
  `${s.scoreDate.toDateString()}: Diet=${s.dietScore}, Exercise=${s.exerciseScore}, Medication=${s.medicationScore}`
).join('\n')}

CARE PLAN DIRECTIVES:
${context.carePlanDirectives.map(cpd => cpd.directive).join('\n')}

User Query: "${userQuery}"

Provide a personalized, encouraging response that:
1. Acknowledges their specific progress
2. References their actual data when relevant
3. Offers actionable advice based on their trends
4. Stays positive and supportive

Keep response to 2-3 sentences.
`;

      const response = await supervisorAgentService.generateAnalysis(contextPrompt);
      
      console.log(`Generated contextual response for ${context.name}`);
      return response;

    } catch (error) {
      console.error('Error generating contextual response:', error);
      return "Thanks for your question! I'm here to help with your health journey. Keep up the great work with your daily tracking.";
    }
  }

  /**
   * Analyze patient engagement and suggest interventions
   */
  async analyzeEngagement(patientId: number): Promise<{
    engagementLevel: 'high' | 'medium' | 'low';
    riskFactors: string[];
    suggestions: string[];
  }> {
    try {
      const context = await this.getPatientContext(patientId);
      
      if (!context) {
        return {
          engagementLevel: 'low',
          riskFactors: ['No data available'],
          suggestions: ['Please submit daily health scores to get started']
        };
      }

      const daysSinceLastActivity = context.lastActivity 
        ? Math.floor((Date.now() - context.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const engagementLevel = 
        daysSinceLastActivity <= 1 ? 'high' :
        daysSinceLastActivity <= 7 ? 'medium' : 'low';

      const riskFactors: string[] = [];
      const suggestions: string[] = [];

      if (daysSinceLastActivity > 3) {
        riskFactors.push(`${daysSinceLastActivity} days since last activity`);
        suggestions.push('Submit daily scores to maintain momentum');
      }

      if (context.trends.dietTrend === 'declining') {
        riskFactors.push('Diet scores trending downward');
        suggestions.push('Review nutrition goals with care team');
      }

      if (context.trends.exerciseTrend === 'declining') {
        riskFactors.push('Exercise adherence declining');
        suggestions.push('Consider adjusting activity plan');
      }

      if (context.trends.medicationTrend === 'declining') {
        riskFactors.push('Medication adherence concerns');
        suggestions.push('Discuss medication schedule with provider');
      }

      if (context.badges.length === 0) {
        suggestions.push('Work toward earning your first achievement badge');
      }

      return {
        engagementLevel,
        riskFactors,
        suggestions
      };

    } catch (error) {
      console.error('Error analyzing engagement:', error);
      return {
        engagementLevel: 'low',
        riskFactors: ['Analysis unavailable'],
        suggestions: ['Continue with regular health tracking']
      };
    }
  }
}

export const aiContextService = new AIContextService();