import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Define the badge criteria
const badgeTiers = {
  "Healthy Meal Plan Hero": { column: "dietScore", tiers: { Bronze: 14, Silver: 28, Gold: 112, Platinum: 168 } },
  "E&W Consistency Champion": { column: "exerciseScore", tiers: { Bronze: 14, Silver: 28, Gold: 112, Platinum: 168 } },
  "Medication Maverick": { column: "medicationScore", tiers: { Bronze: 14, Silver: 28, Gold: 112, Platinum: 168 } }
};

const tierScoreRequirements = { Bronze: 5, Silver: 7, Gold: 8, Platinum: 9 };

class BadgeService {
  async checkAndAwardBadges(patientId: number): Promise<any[]> {
    const newBadges = [];
    const patientScores = await db.select().from(schema.patientScores)
      .where(eq(schema.patientScores.patientId, patientId))
      .orderBy(desc(schema.patientScores.scoreDate));

    for (const [badgeName, criteria] of Object.entries(badgeTiers)) {
      for (const [tier, daysRequired] of Object.entries(criteria.tiers)) {
        const scoreRequired = tierScoreRequirements[tier as keyof typeof tierScoreRequirements];
        
        // Check if this specific badge has already been awarded
        const existingBadge = await db.select().from(schema.patientBadges).where(
          and(
            eq(schema.patientBadges.patientId, patientId),
            eq(schema.patientBadges.badgeName, badgeName),
            eq(schema.patientBadges.badgeTier, tier)
          )
        ).limit(1);

        if (existingBadge.length > 0) continue; // Already have this badge, skip to next tier

        // Check for consistent high scores for the required number of days
        if (patientScores.length >= daysRequired) {
          const recentScores = patientScores.slice(0, daysRequired);
          const allScoresMeetCriteria = recentScores.every(
            (score) => {
              const scoreValue = score[criteria.column as keyof typeof score] as number;
              return scoreValue >= scoreRequired;
            }
          );

          if (allScoresMeetCriteria) {
            const [awardedBadge] = await db.insert(schema.patientBadges).values({
              patientId,
              badgeName,
              badgeTier: tier,
              earnedDate: new Date()
            }).returning();
            newBadges.push(awardedBadge);
            
            // TODO: In a future phase, we'll create a patient event for the Supervisor Agent
            // await db.insert(schema.patientEvents).values({ eventType: 'badge_earned', ... });
          }
        }
      }
    }
    return newBadges;
  }

  async getPatientBadges(patientId: number) {
    return await db.select().from(schema.patientBadges)
      .where(eq(schema.patientBadges.patientId, patientId))
      .orderBy(desc(schema.patientBadges.earnedDate));
  }
}

export const badgeService = new BadgeService();