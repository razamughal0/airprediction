export type RiskFeatures = { engagement: number; quizScore: number; attendance: number; lateSubmissions: number; missedAssessments: number };
export const REFERENCE: RiskFeatures = { engagement: 85, quizScore: 78, attendance: 90, lateSubmissions: 0, missedAssessments: 0 };
export const FEATURE_LABELS: Record<keyof RiskFeatures, string> = { engagement: "Online engagement", quizScore: "Quiz performance", attendance: "Class attendance", lateSubmissions: "Late submissions", missedAssessments: "Missed assessments" };
export function predictRaw(f: RiskFeatures): number {
  return Math.max(2, Math.min(98, 8 + (100 - f.engagement) * 0.39 + (100 - f.quizScore) * 0.27 + (100 - f.attendance) * 0.17 + f.lateSubmissions * 5 + f.missedAssessments * 5));
}
export function predictRisk(f: RiskFeatures) { return Math.round(predictRaw(f)); }
// Exact reference-based Shapley attribution, including the model's bounded output.
// Every subset of the five input features is evaluated. This is not a trained XGBoost model.
export function explainRisk(features: RiskFeatures) {
  const keys = Object.keys(REFERENCE) as (keyof RiskFeatures)[];
  const factorial = [1, 1, 2, 6, 24, 120];
  const coalition = (mask: number) => {
    const f = { ...REFERENCE };
    keys.forEach((key, i) => { if (mask & (1 << i)) f[key] = features[key]; });
    return predictRaw(f);
  };
  return keys.map((key, i) => {
    let value = 0;
    for (let mask = 0; mask < (1 << keys.length); mask++) {
      if (mask & (1 << i)) continue;
      const n = mask.toString(2).replace(/0/g, "").length;
      value += factorial[n] * factorial[keys.length - n - 1] / factorial[keys.length] * (coalition(mask | (1 << i)) - coalition(mask));
    }
    return { key, label: FEATURE_LABELS[key], value, actual: features[key] };
  }).sort((a, b) => b.value - a.value);
}
export function primaryFactor(features: RiskFeatures) {
  const f = explainRisk(features)[0];
  if (f.key === "lateSubmissions") return `${features.lateSubmissions} late submissions`;
  if (f.key === "missedAssessments") return `${features.missedAssessments} missed assessments`;
  if (f.key === "engagement") return "Declining engagement";
  if (f.key === "quizScore") return "Falling quiz scores";
  return "Low attendance";
}
