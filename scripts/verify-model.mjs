import assert from 'node:assert/strict';
import { predictRaw, predictRisk, explainRisk, REFERENCE } from '../src/lib/risk-model.ts';
const records = [REFERENCE, { engagement: 30, quizScore: 48, attendance: 60, lateSubmissions: 4, missedAssessments: 2 }, { engagement: 0, quizScore: 0, attendance: 0, lateSubmissions: 20, missedAssessments: 20 }, { engagement: 100, quizScore: 100, attendance: 100, lateSubmissions: 0, missedAssessments: 0 }];
for (let i = 0; i < 150; i++) records.push({ engagement: i * 17 % 101, quizScore: i * 23 % 101, attendance: i * 31 % 101, lateSubmissions: i % 11, missedAssessments: i % 7 });
for (const record of records) {
  const explained = predictRaw(REFERENCE) + explainRisk(record).reduce((sum, f) => sum + f.value, 0);
  assert(Math.abs(explained - predictRaw(record)) < 1e-8, 'Shapley local accuracy must hold, even at output bounds');
  assert(predictRisk({ ...record, quizScore: Math.min(100, record.quizScore + 10) }) <= predictRisk(record), 'Improved quiz scores must not increase risk');
  assert(predictRisk({ ...record, engagement: Math.min(100, record.engagement + 10) }) <= predictRisk(record), 'Improved engagement must not increase risk');
}
assert.equal(predictRisk(records[1]), 86);
console.log(`PASS: Exact Shapley additivity, score bounds, and what-if monotonicity for ${records.length} records.`);
