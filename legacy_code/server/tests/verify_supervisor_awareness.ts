import { supervisorAgentService } from '../services/supervisorAgentService';

async function runTest() {
  const testPatientId = 1; // The patient we gave scores and a badge to
  const testQuery = "How am I doing with my diet lately, and what should I focus on next?";

  console.log("--- Running Supervisor Agent Awareness Test ---");
  console.log(`Asking for patient ${testPatientId}: "${testQuery}"`);

  // Call the agent service directly, simulating an API request
  const response = await supervisorAgentService.processQuery(testPatientId, testQuery);

  console.log("\n--- SUPERVISOR AGENT'S RESPONSE ---");
  console.log(response);
  console.log("------------------------------------");

  // Verification Checks
  let pass = true;
  
  // Check if agent acknowledges good performance or progress
  if (!response.toLowerCase().includes('excellent') && 
      !response.toLowerCase().includes('great job') && 
      !response.toLowerCase().includes('doing well') &&
      !response.toLowerCase().includes('good progress') &&
      !response.toLowerCase().includes('consistent') &&
      !response.toLowerCase().includes('strong performance') &&
      !response.toLowerCase().includes('congratulations') &&
      !response.toLowerCase().includes('impressive')) {
    console.error("❌ VERIFICATION FAILED: The agent did not acknowledge positive diet performance.");
    pass = false;
  }

  // Check if agent mentions badges or achievements
  if (!response.toLowerCase().includes('badge') && 
      !response.toLowerCase().includes('achievement') &&
      !response.toLowerCase().includes('milestone') &&
      !response.toLowerCase().includes('reward')) {
    console.error("❌ VERIFICATION FAILED: The agent did not mention achievements or badges.");
    pass = false;
  }

  // Check if agent provides actionable next steps
  if (!response.toLowerCase().includes('continue') && 
      !response.toLowerCase().includes('maintain') &&
      !response.toLowerCase().includes('focus') &&
      !response.toLowerCase().includes('next') &&
      !response.toLowerCase().includes('suggestion')) {
    console.error("❌ VERIFICATION FAILED: The agent did not provide actionable next steps.");
    pass = false;
  }

  if (pass) {
    console.log("\n✅ VERIFICATION PASSED: The Supervisor Agent demonstrated full awareness of the patient's scores and achievements.");
  } else {
    console.log("\n❌ VERIFICATION FAILED: The agent needs improvement in contextual awareness.");
  }

  return pass;
}

// Run the test
runTest().catch(console.error);

export { runTest };