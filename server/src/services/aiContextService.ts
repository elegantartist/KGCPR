import { db } from '../db';
import { users, patientScores, patientBadges, carePlanDirectives, supervisorAgentLogs } from '../../../shared/schema';
import { eq, gte, desc, and } from 'drizzle-orm';

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
   * Prepare comprehensive MCP bundle for AI processing
   */
  async prepareContext(patientId: number): Promise<PatientContext | null> {
    try {
      console.log(`[MCP] Preparing context bundle for patient ${patientId}`);

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
        console.log(`[MCP] Patient ${patientId} not found`);
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

      // Get all earned badges
      const badges = await db
        .select()
        .from(patientBadges)
        .where(eq(patientBadges.patientId, patientId))
        .orderBy(desc(patientBadges.earnedDate));

      // Get active care plan directives
      const cpds = await db
        .select()
        .from(carePlanDirectives)
        .where(
          and(
            eq(carePlanDirectives.patientId, patientId),
            eq(carePlanDirectives.isActive, true)
          )
        );

      // Calculate health trends
      const trends = this.calculateTrends(recentScores);

      // Determine last activity
      const lastActivity = recentScores.length > 0 
        ? new Date(recentScores[0].scoreDate) 
        : null;

      const context: PatientContext = {
        id: patient.id,
        name: patient.name || "Patient",
        email: patient.email || "",
        recentScores,
        badges,
        carePlanDirectives: cpds,
        lastActivity,
        trends
      };

      console.log(`[MCP] Context prepared: ${recentScores.length} scores, ${badges.length} badges, ${cpds.length} CPDs`);
      return context;

    } catch (error) {
      console.error(`[MCP] Error preparing context for patient ${patientId}:`, error);
      return null;
    }
  }

  /**
   * Calculate health trends from recent scores using MCP framework
   */
  private calculateTrends(scores: any[]): PatientContext['trends'] {
    if (scores.length < 3) {
      return {
        dietTrend: 'stable',
        exerciseTrend: 'stable',
        medicationTrend: 'stable'
      };
    }

    // Compare recent 3 scores vs older 3 scores
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
   * Log AI interaction for audit and learning
   */
  async logInteraction(
    patientId: number,
    action: string,
    context: any,
    aiResponse: string
  ): Promise<void> {
    try {
      await db
        .insert(supervisorAgentLogs)
        .values({
          patientId,
          doctorId: null,
          action,
          context: JSON.stringify(context),
          aiResponse
        });
    } catch (error) {
      console.error('[MCP] Error logging AI interaction:', error);
    }
  }

  /**
   * Analyze patient engagement patterns
   */
  async analyzeEngagement(patientId: number): Promise<{
    engagementLevel: 'high' | 'medium' | 'low';
    riskFactors: string[];
    suggestions: string[];
    mcpInsights: any;
  }> {
    try {
      const context = await this.prepareContext(patientId);
      
      if (!context) {
        return {
          engagementLevel: 'low',
          riskFactors: ['No patient data available'],
          suggestions: ['Begin daily health score tracking'],
          mcpInsights: { dataAvailable: false }
        };
      }

      const daysSinceLastActivity = context.lastActivity 
        ? Math.floor((Date.now() - context.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // MCP-based engagement scoring
      const engagementLevel = 
        daysSinceLastActivity <= 1 ? 'high' :
        daysSinceLastActivity <= 7 ? 'medium' : 'low';

      const riskFactors: string[] = [];
      const suggestions: string[] = [];

      // Analyze trends using MCP context
      if (daysSinceLastActivity > 3) {
        riskFactors.push(`${daysSinceLastActivity} days since last activity`);
        suggestions.push('Re-engage with daily score submission');
      }

      if (context.trends.dietTrend === 'declining') {
        riskFactors.push('Diet adherence declining');
        suggestions.push('Review nutrition goals with care team');
      }

      if (context.trends.exerciseTrend === 'declining') {
        riskFactors.push('Exercise participation declining');
        suggestions.push('Adjust physical activity plan');
      }

      if (context.trends.medicationTrend === 'declining') {
        riskFactors.push('Medication adherence concerns');
        suggestions.push('Consult with healthcare provider');
      }

      if (context.badges.length === 0) {
        suggestions.push('Work toward first achievement badge');
      }

      return {
        engagementLevel,
        riskFactors,
        suggestions,
        mcpInsights: {
          totalScores: context.recentScores.length,
          totalBadges: context.badges.length,
          activeCPDs: context.carePlanDirectives.length,
          trends: context.trends
        }
      };

    } catch (error) {
      console.error('[MCP] Error analyzing engagement:', error);
      return {
        engagementLevel: 'low',
        riskFactors: ['Analysis temporarily unavailable'],
        suggestions: ['Continue regular health tracking'],
        mcpInsights: { error: true }
      };
    }
  }
}

export const aiContextService = new AIContextService();