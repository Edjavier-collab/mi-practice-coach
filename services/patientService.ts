import { PatientProfile, StageOfChange, PatientProfileFilters, DifficultyLevel } from '../types';
import { PATIENT_DATA, PATIENT_PROFILE_TEMPLATES } from '../constants';

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generatePatientProfile = (filters?: PatientProfileFilters): PatientProfile => {
  let availableTemplates = PATIENT_PROFILE_TEMPLATES;

  // 1. Filter by topic if provided
  if (filters?.topic) {
    availableTemplates = PATIENT_PROFILE_TEMPLATES.filter(t => t.topic === filters.topic);
    // Fallback if no templates match (should not happen with good UI)
    if (availableTemplates.length === 0) {
      availableTemplates = PATIENT_PROFILE_TEMPLATES;
    }
  }

  const template = getRandomElement(availableTemplates) as (typeof PATIENT_PROFILE_TEMPLATES)[number] & { conflictingChiefComplaint?: string };


  // Generate an age within the template's specified range for coherence.
  const [minAge, maxAge] = template.ageRange;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;

  // Replace the age placeholder in the background text.
  const background = template.background.replace('{age}', age.toString());
  
  // Decide whether to use a conflicting chief complaint to create more nuance.
  // This introduces a chance for the patient's stated complaint to misalign with the presenting problem.
  let chiefComplaint = template.chiefComplaint;
  if (template.conflictingChiefComplaint && Math.random() < 0.5) { // 50% chance
    chiefComplaint = template.conflictingChiefComplaint;
  }
  
  // 2. Determine stage of change based on filters
  let stageOfChange: StageOfChange;

  if (filters?.stageOfChange) {
      // A specific stage selection takes highest priority
      stageOfChange = filters.stageOfChange;
  } else if (filters?.difficulty) {
      // If no stage is chosen, use difficulty to determine the pool of stages
      let possibleStages: StageOfChange[];
      switch (filters.difficulty) {
          case DifficultyLevel.Beginner:
              possibleStages = [StageOfChange.Preparation, StageOfChange.Action, StageOfChange.Maintenance];
              break;
          case DifficultyLevel.Intermediate:
              possibleStages = [StageOfChange.Contemplation];
              break;
          case DifficultyLevel.Advanced:
              possibleStages = [StageOfChange.Precontemplation];
              break;
          default:
              possibleStages = PATIENT_DATA.stagesOfChange as StageOfChange[];
      }
      stageOfChange = getRandomElement(possibleStages);
  } else {
      // If no filters are provided, select a random stage
      stageOfChange = getRandomElement(PATIENT_DATA.stagesOfChange) as StageOfChange;
  }

  return {
    // Core details from the coherent template
    topic: template.topic,
    presentingProblem: template.presentingProblem,
    history: template.history,
    chiefComplaint: chiefComplaint,
    background: background,

    // Randomized demographic details
    name: getRandomElement(PATIENT_DATA.names),
    age: age,
    sex: getRandomElement(PATIENT_DATA.sexes),
    stageOfChange: stageOfChange,
  };
};