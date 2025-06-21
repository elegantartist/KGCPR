import { db } from "../db";
import { patientScores } from "@shared/schema";
import { eq, desc, gte } from "drizzle-orm";

export interface TrendAnalysis {
  type: 'positive_streak' | 'negative_streak';
  category: 'diet' | 'exercise' | 'medication';
  streakLength: number;
  currentScore: number;
  averageScore: number;
  message?: string;
}

class TrendAnalysisService {
  /**
   * Analyze a patient's score trends over the last 14 days
   * @param patientId - The patient ID to analyze
   * @returns Promise<TrendAnalysis | null> - Detected trend or null if no significant pattern
   */
  public async analyzeScoreTrends(patientId: number): Promise<TrendAnalysis | null> {
    try {
      // Fetch last 14 days of scores
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentScores = await db
        .select()
        .from(patientScores)
        .where(
          eq(patientScores.patientId, patientId)
        )
        .orderBy(desc(patientScores.scoreDate))
        .limit(14);

      if (recentScores.length < 3) {
        return null; // Need at least 3 scores for trend analysis
      }

      // Sort scores chronologically for streak analysis
      const sortedScores = recentScores.sort((a, b) => 
        new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime()
      );

      // Analyze each category for streaks
      const dietTrend = this.analyzeScoreCategory(
        sortedScores.map(s => s.dietScore),
        'diet'
      );
      
      const exerciseTrend = this.analyzeScoreCategory(
        sortedScores.map(s => s.exerciseScore),
        'exercise'
      );
      
      const medicationTrend = this.analyzeScoreCategory(
        sortedScores.map(s => s.medicationScore),
        'medication'
      );

      // Return the most significant trend (prioritize negative streaks for intervention)
      const trends = [dietTrend, exerciseTrend, medicationTrend].filter(Boolean);
      
      if (trends.length === 0) {
        return null;
      }

      // Prioritize negative streaks, then positive streaks
      const negativeStreaks = trends.filter(t => t.type === 'negative_streak');
      const positiveStreaks = trends.filter(t => t.type === 'positive_streak');

      if (negativeStreaks.length > 0) {
        return negativeStreaks[0]; // Return first negative streak found
      }

      if (positiveStreaks.length > 0) {
        return positiveStreaks[0]; // Return first positive streak found
      }

      return null;

    } catch (error) {
      console.error('Error analyzing score trends:', error);
      return null;
    }
  }

  /**
   * Analyze a specific score category for trends
   * @param scores - Array of scores for the category
   * @param category - The category being analyzed
   * @returns TrendAnalysis | null
   */
  private analyzeScoreCategory(
    scores: number[], 
    category: 'diet' | 'exercise' | 'medication'
  ): TrendAnalysis | null {
    if (scores.length < 3) {
      return null;
    }

    // Check for negative streak (3+ consecutive days at or below 6)
    const negativeStreak = this.findConsecutivePattern(
      scores, 
      (score) => score <= 6, 
      3
    );

    if (negativeStreak >= 3) {
      const currentScore = scores[scores.length - 1];
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      return {
        type: 'negative_streak',
        category,
        streakLength: negativeStreak,
        currentScore,
        averageScore: Math.round(averageScore * 10) / 10
      };
    }

    // Check for positive streak (5+ consecutive days at or above 8)
    const positiveStreak = this.findConsecutivePattern(
      scores, 
      (score) => score >= 8, 
      5
    );

    if (positiveStreak >= 5) {
      const currentScore = scores[scores.length - 1];
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      return {
        type: 'positive_streak',
        category,
        streakLength: positiveStreak,
        currentScore,
        averageScore: Math.round(averageScore * 10) / 10
      };
    }

    return null;
  }

  /**
   * Find consecutive pattern in scores
   * @param scores - Array of scores
   * @param condition - Function to test each score
   * @param minLength - Minimum consecutive length to detect
   * @returns Length of the longest consecutive pattern from the end
   */
  private findConsecutivePattern(
    scores: number[], 
    condition: (score: number) => boolean, 
    minLength: number
  ): number {
    let consecutiveCount = 0;
    
    // Check from the most recent score backwards
    for (let i = scores.length - 1; i >= 0; i--) {
      if (condition(scores[i])) {
        consecutiveCount++;
      } else {
        break; // Pattern broken
      }
    }

    return consecutiveCount >= minLength ? consecutiveCount : 0;
  }

  /**
   * Get human-readable trend description
   * @param trend - The trend analysis result
   * @returns String description of the trend
   */
  public getTrendDescription(trend: TrendAnalysis): string {
    const { type, category, streakLength } = trend;
    
    if (type === 'negative_streak') {
      return `${streakLength}-day streak of low ${category} scores (≤6)`;
    } else {
      return `${streakLength}-day streak of high ${category} scores (≥8)`;
    }
  }
}

export const trendAnalysisService = new TrendAnalysisService();