// This file contains the logic to analyse scores and generate markdown text.

function getLowestScoringArea(d: number, e: number, m: number): 'diet' | 'exercise' | 'medication' {
    const scores = { diet: d, exercise: e, medication: m };
    return Object.keys(scores).reduce((a, b) => scores[a as keyof typeof scores] < scores[b as keyof typeof scores] ? a : b) as 'diet' | 'exercise' | 'medication';
}

function generateDetailedAnalysis(d: number, e: number, m: number): string {
    let analysis = '';
    
    // Diet analysis
    if (d <= 3) {
        analysis += `Your healthy meal plan score of ${d}/10 indicates you may be facing some challenges with your nutrition goals. `;
    } else if (d >= 8) {
        analysis += `An excellent diet score of ${d}/10 shows fantastic commitment to your nutrition goals! `;
    } else {
        analysis += `Your healthy meal plan score of ${d}/10 shows moderate success. `;
    }
    
    // Exercise analysis
    if (e <= 3) {
        analysis += `Your exercise and wellness score of ${e}/10 suggests there's room for improvement in your physical activity routine. `;
    } else if (e >= 8) {
        analysis += `Outstanding exercise score of ${e}/10 demonstrates excellent dedication to staying active! `;
    } else {
        analysis += `Your exercise and wellness score of ${e}/10 indicates you're making steady progress with your fitness routine. `;
    }
    
    // Medication analysis
    if (m <= 3) {
        analysis += `Your prescription medication score of ${m}/10 shows significant challenges with following your prescribed treatment plan. `;
    } else if (m >= 8) {
        analysis += `Excellent medication adherence score of ${m}/10 shows you're consistently following your treatment plan! `;
    } else {
        analysis += `Your prescription medication score of ${m}/10 indicates generally good compliance with some room for improvement. `;
    }
    
    return analysis;
}

export function generateRecommendations(d: number, e: number, m: number): string {
    const lowestArea = getLowestScoringArea(d, e, m);
    switch (lowestArea) {
        case 'diet':
            return `**To help with your diet, you could try these KGC features:**\n- Use the 'Food Database' to check nutritional info.\n- Visit 'Inspiration Machine D' for meal ideas that match your doctor's plan.`;
        case 'exercise':
            return `**To support your exercise routine, you could explore:**\n- 'Inspiration Machine E&W' for new workout videos.\n- Use 'E&W Support' to find local gyms or trainers near you.`;
        case 'medication':
            return `**For medication adherence, these tools can help:**\n- Use your 'Journaling' feature to track how you feel after taking your medication.\n- Review your consistency in 'Health Snapshots'.`;
        default:
            return "Keep focusing on all areas of your health journey!";
    }
}

export function generateHealthScoreAnalysis(d: number, e: number, m: number): string {
    const analysis = `
# Health Score Analysis

## Score Summary
- **Healthy Meal Plan:** ${d}/10
- **Exercise and Wellness:** ${e}/10
- **Prescription Medication:** ${m}/10

## Detailed Analysis
${generateDetailedAnalysis(d, e, m)}

## Recommendations
${generateRecommendations(d, e, m)}

## Next Steps
Continue tracking your daily scores to establish consistent patterns for your next progress report.
`;
    return analysis;
}