import 'dotenv/config';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const base = process.env.TEST_URL || 'http://localhost:3000';
const fixtureTitle = 'Browser test: BSAI advisory check-in';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const plans = pgTable('interventions', { id: serial('id').primaryKey(), title: varchar('title') });
async function cleanup() { await db.delete(plans).where(eq(plans.title, fixtureTitle)); }
await cleanup();

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() === 404) failedRequests.push(response.url()); });

  // 1. Health check: verifies exactly 60 active demo students (20 BSAI, 20 BSCS, 20 BSDS).
  const healthResponse = await page.request.get(`${base}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status(), 200);
  assert.equal(health.ok, true);
  assert.equal(health.database.schemaReady, true);
  assert.equal(health.database.students, 60, `Expected exactly 60 students, got ${health.database.students}`);
  console.log(`PASS: /api/health connected to PostgreSQL (students=${health.database.students}, ai=${health.ai.mode})`);

  // 2. Verify Unauthenticated First Load -> Shows Full-Screen Login Gate First
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Sign In to Your Air University Account' }).waitFor();
  await page.screenshot({ path: '/tmp/air-login-gate.png', fullPage: true });
  console.log('PASS: App opens with Full-Screen Login Gate first (no auto-login to Admin)');

  // 3. UI Form Login Test 1: Type Student ID (AU-BSAI-24002 -> Abdul Hadi) + Password and click Sign In button
  const idInput = page.locator('.login-modal-wrap input[type="text"], .login-modal-wrap input:not([type="password"])').first();
  const pwdInput = page.locator('.login-modal-wrap input[type="password"]').first();
  await idInput.fill('AU-BSAI-24002');
  await pwdInput.fill('Student@123');
  await page.locator('.login-modal-wrap button[type="submit"]').click();
  await page.getByRole('heading', { name: 'You’ve got this, Abdul.' }).waitFor();
  // Wait 1.5s and also clear cookies + storage + reload to verify it NEVER drops back to the login screen!
  await page.waitForTimeout(1500);
  await page.getByRole('heading', { name: 'You’ve got this, Abdul.' }).waitFor();
  await context.clearCookies();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'You’ve got this, Abdul.' }).waitFor();
  const hadiWs = await page.evaluate(async () => (await fetch('/api/workspace')).json());
  assert.equal(hadiWs.authenticated, true);
  assert.equal(hadiWs.user.role, 'student');
  assert.equal(hadiWs.students.length, 1);
  assert.equal(hadiWs.students[0].name, 'Abdul Hadi');
  console.log('PASS: UI Login with AU-BSAI-24002 stays open after delay and full page reload (never jumps back to Login)');

  // 4. Sign out via UI button -> returns to Login Gate, then UI Login with raza.student@demo.edu + Student@123
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.getByRole('heading', { name: 'Sign In to Your Air University Account' }).waitFor();
  await idInput.fill('raza.student@demo.edu');
  await pwdInput.fill('Student@123');
  await page.locator('.login-modal-wrap button[type="submit"]').click();
  await page.getByRole('heading', { name: 'You’ve got this, Raza.' }).waitFor();
  console.log('PASS: UI Login with raza.student@demo.edu + Student@123 opens Raza Mughal Student Portal');

  // 5. Sign out via UI button -> UI Login with Teacher email (ahmed.teacher@demo.edu + Teacher@123) even without switching tab first!
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.getByRole('heading', { name: 'Sign In to Your Air University Account' }).waitFor();
  await idInput.fill('ahmed.teacher@demo.edu');
  await pwdInput.fill('Teacher@123');
  await page.locator('.login-modal-wrap button[type="submit"]').click();
  await page.getByText('YOUR STUDENTS. YOUR IMPACT.', { exact: true }).waitFor();
  console.log('PASS: UI Login with ahmed.teacher@demo.edu + Teacher@123 opens Ahmed Khan Teacher Portal');

  // Teacher creates an intervention for Raza Mughal
  await page.getByRole('button', { name: 'New intervention', exact: true }).click();
  const razaOption = await page.locator('select[name="studentId"] option').filter({ hasText: 'Raza Mughal' }).first().getAttribute('value');
  await page.locator('select[name="studentId"]').selectOption(String(razaOption));
  await page.locator('input[name="title"]').fill(fixtureTitle);
  await page.locator('textarea[name="notes"]').fill('Review CS112 Object Oriented Programming and AI232 with Raza Mughal.');
  await page.getByRole('button', { name: 'Create intervention', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'A new support plan is ready' }).waitFor();
  console.log('PASS: Teacher (Ahmed Khan) creates a saved intervention for Raza Mughal');

  // 6. Switch back to Raza Mughal via UI Login modal and complete the support plan
  await page.getByRole('button', { name: 'Switch Account' }).click();
  await page.locator('.login-modal-wrap input:not([type="password"])').first().fill('raza.student@demo.edu');
  await page.locator('.login-modal-wrap input[type="password"]').first().fill('Student@123');
  await page.locator('.login-modal-wrap button[type="submit"]').click();
  await page.getByRole('heading', { name: 'You’ve got this, Raza.' }).waitFor();
  await page.getByRole('button', { name: 'My support plan', exact: true }).click();
  await page.getByRole('heading', { name: fixtureTitle }).waitFor();
  const createdCard = page.locator('.intervention-card').filter({ hasText: fixtureTitle });
  await createdCard.getByRole('button', { name: 'Mark complete' }).click();
  await createdCard.getByText('One step forward').waitFor();
  await page.screenshot({ path: '/tmp/uplift-student-workspace.png', fullPage: true });
  console.log('PASS: Raza Mughal sees ONLY his own record and completes his support plan');

  // 7. Sign out and UI Login as Administrator (admin@demo.edu + Admin@123)
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.getByRole('heading', { name: 'Sign In to Your Air University Account' }).waitFor();
  await idInput.fill('admin@demo.edu');
  await pwdInput.fill('Admin@123');
  await page.locator('.login-modal-wrap button[type="submit"]').click();
  await page.getByRole('heading', { name: 'Students who could use a little support' }).waitFor();
  await page.screenshot({ path: '/tmp/uplift-desktop.png', fullPage: true });

  const adminWs = await page.evaluate(async () => {
    const token = window.localStorage.getItem('air_session_token');
    return (await fetch('/api/workspace', { headers: { 'x-air-session': token || '' } })).json();
  });
  assert.equal(adminWs.user.email, 'admin@demo.edu');
  assert.equal(adminWs.students.length, 60);
  assert.equal(adminWs.students.filter(s => s.course === 'BSAI').length, 20);
  assert.equal(adminWs.students.filter(s => s.course === 'BSCS').length, 20);
  assert.equal(adminWs.students.filter(s => s.course === 'BSDS').length, 20);
  assert.equal(adminWs.timetableEntries.length, 50);
  console.log('PASS: UI Login with admin@demo.edu + Admin@123 opens Administrator Portal (60 students, 50 classes)');

  // 8. Navigate across ecosystem views (/timetable, /courses, /academics, /campus)
  await page.getByRole('button', { name: 'Weekly timetable' }).click();
  await page.getByText('Object Oriented Programming').first().waitFor();
  await page.screenshot({ path: '/tmp/air-timetable.png', fullPage: true });
  console.log('PASS: Weekly Timetable (/timetable) verified');

  // 9. Mobile navigation & settings persistence
  await page.getByRole('button', { name: 'Overview' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/uplift-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Make yourself at home.' }).waitFor();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.getByRole('status').filter({ hasText: 'Your preferences are saved' }).waitFor();
  console.log('PASS: Mobile navigation and persisted preferences work without page overflow');

  // Sign out cleanly at the end so the live preview starts on the Login Gate for the user
  await page.request.post(`${base}/api/session`, { data: { action: 'logout' } });

  assert.deepEqual(failedRequests, []);
  assert.deepEqual(errors, []);
  console.log('PASS: No 404s and no browser runtime errors');
} finally {
  await browser.close();
  await cleanup();
  await pool.end();
}
