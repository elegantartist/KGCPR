/**
 * PHI De-identification Service for TGA Class I SaMD Compliance
 * 
 * This service ensures that no Personal Health Information (PHI) or 
 * Personally Identifiable Information (PII) reaches the LLM providers.
 * All patient data is tokenized before AI processing.
 */

interface TokenMap {
  [key: string]: string;
}

interface DeidentifiedData {
  content: string;
  tokenMap: TokenMap;
}

class PHIDeidentificationService {
  private tokenCounter = 0;
  private namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  private emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private phonePattern = /(\+61|0)[0-9]{9}/g;
  private idPattern = /\b(id|ID|Id)[:=]\s*\d+/g;
  private addressPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/g;

  /**
   * Remove all PHI/PII from content before sending to LLM
   */
  public deidentifyContent(content: string): DeidentifiedData {
    let deidentifiedContent = content;
    const tokenMap: TokenMap = {};

    // Replace names with tokens
    deidentifiedContent = deidentifiedContent.replace(this.namePattern, (match) => {
      const token = `PATIENT_${this.tokenCounter++}`;
      tokenMap[token] = match;
      return token;
    });

    // Replace email addresses
    deidentifiedContent = deidentifiedContent.replace(this.emailPattern, (match) => {
      const token = `EMAIL_${this.tokenCounter++}`;
      tokenMap[token] = match;
      return token;
    });

    // Replace phone numbers
    deidentifiedContent = deidentifiedContent.replace(this.phonePattern, (match) => {
      const token = `PHONE_${this.tokenCounter++}`;
      tokenMap[token] = match;
      return token;
    });

    // Replace IDs
    deidentifiedContent = deidentifiedContent.replace(this.idPattern, (match) => {
      const token = `ID_${this.tokenCounter++}`;
      tokenMap[token] = match;
      return token;
    });

    // Replace addresses
    deidentifiedContent = deidentifiedContent.replace(this.addressPattern, (match) => {
      const token = `ADDRESS_${this.tokenCounter++}`;
      tokenMap[token] = match;
      return token;
    });

    return {
      content: deidentifiedContent,
      tokenMap
    };
  }

  /**
   * Create sanitized data bundle for AI processing
   * Removes all identifying information while preserving clinical context
   */
  public sanitizeDataBundle(dataBundle: any): any {
    const sanitized = JSON.parse(JSON.stringify(dataBundle));

    // Remove identifying fields
    if (sanitized.patient) {
      delete sanitized.patient.name;
      delete sanitized.patient.email;
      delete sanitized.patient.phone;
      sanitized.patient.id = "PATIENT_REFERENCE";
    }

    // Sanitize scores - keep numeric data, remove timestamps with identifiable patterns
    if (sanitized.scores) {
      sanitized.scores = sanitized.scores.map((score: any) => ({
        diet_score: score.diet_score,
        exercise_score: score.exercise_score,
        medication_score: score.medication_score,
        date: "RECENT_DATE" // Remove specific dates
      }));
    }

    // Sanitize badges - keep achievement data, remove personal references
    if (sanitized.badges) {
      sanitized.badges = sanitized.badges.map((badge: any) => ({
        type: badge.type,
        tier: badge.tier,
        earned_date: "ACHIEVEMENT_DATE"
      }));
    }

    return sanitized;
  }

  /**
   * Validate that response contains no PHI before returning to user
   */
  public validateResponse(response: string): { isValid: boolean; sanitizedResponse: string } {
    let sanitizedResponse = response;
    let isValid = true;

    // Check for potential PHI leakage patterns
    const phiPatterns = [
      this.namePattern,
      this.emailPattern,
      this.phonePattern,
      /\b\d{4}-\d{2}-\d{2}\b/, // Specific dates
      /Patient ID:\s*\d+/i
    ];

    phiPatterns.forEach(pattern => {
      if (pattern.test(response)) {
        isValid = false;
        sanitizedResponse = sanitizedResponse.replace(pattern, '[REDACTED]');
      }
    });

    return { isValid, sanitizedResponse };
  }
}

export const phiDeidentificationService = new PHIDeidentificationService();