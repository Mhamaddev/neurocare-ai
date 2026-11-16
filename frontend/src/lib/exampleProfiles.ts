/** Fictional starting points for the form. Values are source survey codes, as strings. */
export interface ExampleProfile { id: string; label: string; description: string; values: Record<string, string> }

function profile(id: string, label: string, description: string, values: Record<string, number>): ExampleProfile {
  return { id, label, description, values: Object.fromEntries(Object.entries(values).map(([name, value]) => [name, String(value)])) }
}

export const exampleProfiles: ExampleProfile[] = [
  profile('active-thirties', 'Active, early thirties', 'No listed conditions, excellent general health.', {
    HighBP: 0, HighChol: 0, CholCheck: 1, BMI: 23, Smoker: 0, Stroke: 0, HeartDiseaseorAttack: 0,
    PhysActivity: 1, Fruits: 1, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0,
    GenHlth: 1, MentHlth: 2, PhysHlth: 0, DiffWalk: 0, Sex: 0, Age: 3, Education: 6, Income: 7,
  }),
  profile('mixed-fifties', 'Mid-fifties, mixed picture', 'High blood pressure, good general health.', {
    HighBP: 1, HighChol: 0, CholCheck: 1, BMI: 29, Smoker: 1, Stroke: 0, HeartDiseaseorAttack: 0,
    PhysActivity: 1, Fruits: 0, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0,
    GenHlth: 3, MentHlth: 4, PhysHlth: 3, DiffWalk: 0, Sex: 1, Age: 8, Education: 5, Income: 6,
  }),
  profile('several-conditions-seventies', 'Early seventies, several conditions', 'Heart disease, high BMI, fair general health.', {
    HighBP: 1, HighChol: 1, CholCheck: 1, BMI: 36, Smoker: 1, Stroke: 0, HeartDiseaseorAttack: 1,
    PhysActivity: 0, Fruits: 0, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0,
    GenHlth: 4, MentHlth: 3, PhysHlth: 12, DiffWalk: 1, Sex: 1, Age: 11, Education: 4, Income: 4,
  }),
]
