// tests/e2e/verify-task004-real-stack.mjs
// Real-stack automated verification for TASK-004 under approved CR-010.
// Executes directly against NestJS API (http://localhost:3000/api) and PostgreSQL container (equiflow-postgres).

import { execFileSync } from 'child_process';
import assert from 'node:assert';

const BASE_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const HT_EMAIL = process.env.HT_EMAIL || 'trainer@gmail.com';
const HT_PASSWORD = process.env.HT_PASSWORD || 'EquiFlow@2026';
const CM_EMAIL = process.env.CM_EMAIL || 'manager@gmail.com';
const CM_PASSWORD = process.env.CM_PASSWORD || 'EquiFlow@2026';
const DB_CONTAINER = process.env.DB_CONTAINER || 'equiflow-postgres';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'equiflow';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidUuid(val, label = 'UUID') {
  assert(
    val && typeof val === 'string' && UUID_REGEX.test(val),
    `Expected valid UUID for ${label}, got: "${val}"`,
  );
}

function runSql(query) {
  try {
    const stdout = execFileSync(
      'docker',
      ['exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', query],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return stdout.trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    throw new Error(`SQL execution failed for query "${query}": ${stderr || err.message}`);
  }
}

async function request(method, path, token, body = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  console.log('=== TASK-004 Real-Stack Verification ===');
  console.log(`Target API: ${BASE_URL}`);

  // 1. Authenticate as Head Trainer
  console.log('\n[1] Authenticating as Head Trainer...');
  const loginRes = await request('POST', '/auth/login', null, {
    email: HT_EMAIL,
    password: HT_PASSWORD,
    remember: true,
  });
  assert.strictEqual(loginRes.status, 200, 'Head Trainer login must return HTTP 200');
  const token = loginRes.data.accessToken || loginRes.data.data?.accessToken;
  assert(typeof token === 'string' && token.length > 20, 'Token must be a valid JWT string');
  const user = loginRes.data.user || loginRes.data.data?.user;
  assert.strictEqual(user.role, 'HEAD_TRAINER', 'User role must be HEAD_TRAINER');
  assertValidUuid(user.id || user.userId, 'Head Trainer User ID');
  console.log(`-> Logged in as: ${user.fullName} (${user.email}), Role: ${user.role}, ID: ${user.id || user.userId}`);

  // 2. Discover Grooms dynamically via API
  console.log('\n[2] Discovering active Grooms dynamically via GET /training/grooms...');
  const groomsRes = await request('GET', '/training/grooms', token);
  assert.strictEqual(groomsRes.status, 200, 'GET /training/grooms must return HTTP 200');
  const grooms = groomsRes.data.data || groomsRes.data;
  assert(Array.isArray(grooms) && grooms.length > 0, 'At least one groom must be returned');
  const targetGroom = grooms[0];
  assertValidUuid(targetGroom.id, 'Target Groom ID');
  const groomId = targetGroom.id;
  console.log(`-> Selected Groom: ${targetGroom.fullName} (${groomId})`);

  // 3. Dynamic Relative Dates (R-c/R-d)
  const clubNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const clubYear = clubNow.getUTCFullYear();
  const clubMonth = clubNow.getUTCMonth();
  const clubDate = clubNow.getUTCDate();
  const todayIso = `${clubYear}-${String(clubMonth + 1).padStart(2, '0')}-${String(clubDate).padStart(2, '0')}`;
  const future30Days = new Date(Date.UTC(clubYear, clubMonth, clubDate + 30)).toISOString().slice(0, 10);
  // Scheduled workout time: 10:00 AM VN time (03:00 UTC) of club day, satisfying 04:00-20:00 club operating hours
  const scheduledTime = new Date(Date.UTC(clubYear, clubMonth, clubDate, 3, 0, 0)).toISOString();

  // 4. Select candidate horse with available workout slots (< 3 workouts today)
  console.log('\n[3] Discovering active horse with available daily workout slots...');
  const horseRow = runSql(
    `SELECT h.id, h.name FROM "Horse" h LEFT JOIN "WorkoutSession" w ON w."horseId" = h.id AND w."scheduledDate"::date = '${todayIso}' WHERE h."deletedAt" IS NULL AND h.status IN ('ACTIVE', 'RESTING') AND h."isMedicalLocked" = false GROUP BY h.id, h.name HAVING count(w.id) < 3 LIMIT 1`,
  );
  assert(horseRow, 'At least one active/resting horse with < 3 workouts today must exist');
  const [horseId, horseName] = horseRow.split('|');
  assertValidUuid(horseId, 'Selected Horse ID');
  console.log(`-> Selected horse for training plan: ${horseName} (${horseId})`);

  // -------------------------------------------------------------
  // R-3.1 Create Training Plan
  console.log('\n[R-3.1] Creating Training Plan as Head Trainer...');
  const planPayload = {
    horseId,
    phaseName: 'Derby 2026 Stamina Peak Plan',
    objective: 'Target peak stamina and 55kmh sprint readiness for winter events.',
    notes: 'Real-stack positive verification plan for TASK-004',
    targetSpeed: 55,
    targetDistance: 2000,
    trackSurface: 'TURF',
    startDate: todayIso,
    endDate: future30Days,
    phases: [
      {
        id: 'phase-peak-01',
        name: 'Phase 1 - Aerobic Base',
        type: 'BASE',
        startDate: todayIso,
        endDate: future30Days,
        sessionsPerWeek: 4,
        maxWeeklyDistance: 8000,
        surface: 'TURF',
        targetSpeedKmh: 38,
      },
    ],
  };

  const createPlanRes = await request('POST', '/training/plans', token, planPayload);
  assert.strictEqual(createPlanRes.status, 201, 'POST /training/plans must return HTTP 201');
  const createdPlan = createPlanRes.data.data || createPlanRes.data;
  assertValidUuid(createdPlan.id, 'Created Plan ID');
  assert.strictEqual(createdPlan.status, 'DRAFT', 'Created plan status must be DRAFT');
  assert.strictEqual(createdPlan.horseId, horseId, 'Created plan must reference selected horse');
  console.log(`POST /training/plans -> Status: ${createPlanRes.status}`);
  console.log(`-> Created Plan ID: ${createdPlan.id}, Code: ${createdPlan.planCode}, Status: ${createdPlan.status}`);

  // DB verification for Training Plan (Before Edit)
  const planDb = runSql(`SELECT id, "planCode", status, "horseId" FROM "TrainingPlan" WHERE id = '${createdPlan.id}'`);
  assert(planDb.includes(createdPlan.id), 'Plan must exist in database');
  assert(planDb.includes('DRAFT'), 'Plan in DB must have status DRAFT');
  console.log(`-> DB Verification: ${planDb}`);

  // Edit the training plan
  console.log('\n[R-3.1b] Editing Training Plan as Head Trainer...');
  const editPlanPayload = {
    phaseName: 'Derby 2026 Stamina Peak Plan (Updated)',
    objective: 'Updated objective: target 58kmh sprint readiness and endurance.',
    targetSpeed: 58,
    targetDistance: 2200,
    startDate: todayIso,
    endDate: future30Days,
    phases: planPayload.phases,
  };
  const editPlanRes = await request('PUT', `/training/plans/${createdPlan.id}`, token, editPlanPayload);
  assert.strictEqual(editPlanRes.status, 200, 'PUT /training/plans/:id must return HTTP 200');
  const editedPlan = editPlanRes.data.data || editPlanRes.data;
  assert.strictEqual(editedPlan.targetSpeed, 58, 'Edited plan targetSpeed in response must be 58');
  console.log(`PUT /training/plans/${createdPlan.id} -> Status: ${editPlanRes.status}`);

  // DB verification after edit
  const planDbAfterEdit = runSql(`SELECT id, "phaseName", "targetSpeed" FROM "TrainingPlan" WHERE id = '${createdPlan.id}'`);
  assert(planDbAfterEdit.includes('58'), 'Plan in DB after edit must have targetSpeed 58');
  assert(planDbAfterEdit.includes('Updated'), 'Plan in DB after edit must contain updated phaseName');
  console.log(`-> DB Verification After Edit: ${planDbAfterEdit}`);

  // -------------------------------------------------------------
  // R-3.2 Schedule a Workout Session
  console.log('\n[R-3.2] Scheduling Workout Session as Head Trainer...');
  const workoutPayload = {
    scheduledDate: scheduledTime,
    phaseId: 'phase-peak-01',
    workoutType: 'CANTER',
    intensity: 'MEDIUM',
    distanceMeters: 1200,
    repetitions: 1,
    targetSpeedKmh: 40,
    trackSurface: 'TURF',
    assignedStaffUserId: groomId,
    trainerNotes: 'Real-stack workout scheduling test for TASK-004',
    acknowledgeWarnings: true,
  };

  const createWorkoutRes = await request('POST', `/training/plans/${createdPlan.id}/workouts`, token, workoutPayload);
  assert.strictEqual(createWorkoutRes.status, 201, 'POST /training/plans/:id/workouts must return HTTP 201');
  const createdWorkout = createWorkoutRes.data.data || createWorkoutRes.data;
  assertValidUuid(createdWorkout.id, 'Created Workout ID');
  assert.strictEqual(createdWorkout.status, 'SCHEDULED', 'Created workout status must be SCHEDULED');
  console.log(`POST /training/plans/${createdPlan.id}/workouts -> Status: ${createWorkoutRes.status}`);
  console.log(`-> Created Workout ID: ${createdWorkout.id}, Status: ${createdWorkout.status}, Scheduled: ${createdWorkout.scheduledDate}`);

  // DB verification for Workout
  const workoutDb = runSql(`SELECT id, "workoutType", status, "trainingPlanId" FROM "WorkoutSession" WHERE id = '${createdWorkout.id}'`);
  assert(workoutDb.includes(createdWorkout.id), 'Workout must exist in DB');
  assert(workoutDb.includes('SCHEDULED'), 'Workout in DB must have status SCHEDULED');
  console.log(`-> DB Verification: ${workoutDb}`);

  // -------------------------------------------------------------
  // R-3.3 Start Valid/Due Workout Simulation Session
  console.log('\n[R-3.3] Starting Simulator Session with Real Workout ID...');
  let simWorkoutId = createdWorkout.id;
  if (new Date(createdWorkout.scheduledDate) > new Date()) {
    console.log(`-> Newly scheduled workout is scheduled for future club hours (${createdWorkout.scheduledDate} > ${new Date().toISOString()}). Discovering due SCHEDULED workout...`);
    const dueWorkoutRow = runSql(
      `SELECT w.id FROM "WorkoutSession" w JOIN "TrainingPlan" p ON w."trainingPlanId" = p.id WHERE w.status = 'SCHEDULED' AND w."scheduledDate" <= NOW() AND p."trainerUserId" = '${user.id || user.userId}' ORDER BY w."scheduledDate" DESC LIMIT 1`,
    );
    if (dueWorkoutRow) {
      simWorkoutId = dueWorkoutRow.trim();
      assertValidUuid(simWorkoutId, 'Due Workout ID');
      console.log(`-> Selected due SCHEDULED workout for simulation: ${simWorkoutId}`);
    }
  }

  const simRes = await request('POST', `/simulator/workouts/${simWorkoutId}/start`, token, {});
  assert.strictEqual(simRes.status, 201, 'POST /simulator/workouts/:id/start must return HTTP 201');
  const simSession = simRes.data.data || simRes.data;
  const simSessionId = simSession.sessionId || simSession.id;
  assertValidUuid(simSessionId, 'Simulator Session ID');
  assert.strictEqual(simSession.status, 'PENDING', 'Simulation session status must be PENDING');
  console.log(`POST /simulator/workouts/${simWorkoutId}/start -> Status: ${simRes.status}`);
  console.log(`-> Created SimulatorSession ID: ${simSessionId}, Status: ${simSession.status}, Launch: ${simSession.launchUrl}`);

  // DB verification for SimulatorSession
  const simDb = runSql(`SELECT id, type, status, "workoutSessionId" FROM "SimulatorSession" WHERE "workoutSessionId" = '${simWorkoutId}'`);
  assert(simDb.includes(simSessionId), 'Simulator session must exist in DB');
  assert(simDb.includes('PENDING'), 'Simulator session in DB must be PENDING');
  console.log(`-> DB Verification: ${simDb}`);

  // -------------------------------------------------------------
  // R-3.4 Discover OPEN Tournament and Check Eligibility
  console.log('\n[R-3.4] Discovering OPEN tournament and fetching eligibility...');
  const tournsRes = await request('GET', '/tournaments', token);
  assert.strictEqual(tournsRes.status, 200, 'GET /tournaments must return HTTP 200');
  const tournsList = tournsRes.data.data?.items || tournsRes.data.items || tournsRes.data;
  assert(Array.isArray(tournsList), 'Tournaments list must be an array');

  const openTournaments = tournsList.filter((t) => t.status === 'OPEN_REGISTRATION');
  assert(openTournaments.length > 0, 'At least one OPEN_REGISTRATION tournament must exist');

  let openTournamentId = '';
  let candidateHorse = null;

  for (const t of openTournaments) {
    const eligRes = await request('GET', `/tournaments/${t.id}/eligibility`, token);
    if (eligRes.status === 200) {
      const eligData = eligRes.data.data || eligRes.data;
      const unreg = (eligData.eligible || []).filter((h) => !h.isRegistered);
      if (unreg.length > 0) {
        openTournamentId = t.id;
        candidateHorse = unreg[0];
        console.log(`-> Found OPEN tournament "${t.name}" (${openTournamentId}) with ${unreg.length} unregistered eligible horses`);
        console.log(`-> Selected candidate horse: "${candidateHorse.name}" (${candidateHorse.id})`);
        break;
      }
    }
  }

  // C-2: Fail explicitly if no unregistered eligible horse is available
  if (!openTournamentId || !candidateHorse) {
    console.error('\nERROR: No unregistered eligible horse available in any OPEN_REGISTRATION tournament.');
    console.error('Please reseed the database or use a clean disposable test environment to rerun verification.');
    process.exit(1);
  }

  assert(
    openTournamentId && typeof openTournamentId === 'string' && openTournamentId.length > 0,
    'Target Tournament ID must be a non-empty string',
  );
  assertValidUuid(candidateHorse.id, 'Candidate Horse ID');

  // Explicitly assert eligibility structure on selected tournament
  const targetEligRes = await request('GET', `/tournaments/${openTournamentId}/eligibility`, token);
  assert.strictEqual(targetEligRes.status, 200, 'GET /tournaments/:id/eligibility must return HTTP 200');
  const targetEligData = targetEligRes.data.data || targetEligRes.data;
  assert(Array.isArray(targetEligData.eligible), 'Eligibility response must include eligible array');
  assert(typeof targetEligData.totalEligible === 'number' && targetEligData.totalEligible > 0, 'Eligibility totalEligible must be a positive number');
  const verifiedCandidate = targetEligData.eligible.find((h) => h.id === candidateHorse.id);
  assert(verifiedCandidate, 'Selected candidate horse must appear in eligible list');
  assert.strictEqual(verifiedCandidate.isRegistered, false, 'Candidate horse must not be registered yet');
  console.log(`GET /tournaments/${openTournamentId}/eligibility -> Status: 200, Total Eligible: ${targetEligData.totalEligible}`);

  // -------------------------------------------------------------
  // R-3.5 Register Eligible Horse while Tournament is OPEN
  console.log('\n[R-3.5] Registering Horse for OPEN Tournament as Head Trainer...');
  const regPayload = {
    horseId: candidateHorse.id,
    notes: 'Real-stack registration evidence for TASK-004',
  };
  const regRes = await request('POST', `/tournaments/${openTournamentId}/registrations`, token, regPayload);
  assert.strictEqual(regRes.status, 201, 'POST /tournaments/:id/registrations must return HTTP 201');
  const regData = regRes.data.data || regRes.data;
  const createdRegId = regData.id;
  assertValidUuid(createdRegId, 'Created Registration ID');
  assert.strictEqual(regData.status, 'REGISTERED', 'Registration status must be REGISTERED');
  console.log(`POST /tournaments/${openTournamentId}/registrations -> Status: ${regRes.status}`);
  console.log(`-> Registration Created ID: ${createdRegId}, Status: ${regData.status}`);

  // DB Before Scratch
  const regDbBeforeScratch = runSql(`SELECT id, status, "tournamentId", "horseId" FROM "TournamentRegistration" WHERE id = '${createdRegId}'`);
  assert(regDbBeforeScratch.includes(createdRegId), 'Registration must exist in DB');
  assert(regDbBeforeScratch.includes('REGISTERED'), 'Registration in DB must have status REGISTERED');
  console.log(`-> DB Before Scratch: ${regDbBeforeScratch}`);

  // -------------------------------------------------------------
  // R-3.6 Scratch ONLY the registration created in this run (C-2)
  console.log('\n[R-3.6] Scratching Active Registration with Required Reason as Head Trainer...');
  const scratchReason = 'Precautionary veterinary rest advised by trainer';
  const scratchRes = await request(
    'DELETE',
    `/tournaments/${openTournamentId}/registrations/${createdRegId}?reason=${encodeURIComponent(scratchReason)}`,
    token,
  );
  assert.strictEqual(scratchRes.status, 200, 'DELETE /tournaments/:id/registrations/:id must return HTTP 200');
  const scratchData = scratchRes.data.data || scratchRes.data;
  assert.strictEqual(scratchData.status, 'SCRATCHED_MEDICAL', 'Registration status must transition to SCRATCHED_MEDICAL');
  console.log(`DELETE /tournaments/${openTournamentId}/registrations/${createdRegId}?reason=... -> Status: ${scratchRes.status}`);

  // DB After Scratch
  const regDbAfterScratch = runSql(`SELECT id, status, notes FROM "TournamentRegistration" WHERE id = '${createdRegId}'`);
  assert(regDbAfterScratch.includes('SCRATCHED_MEDICAL'), 'Registration in DB must be SCRATCHED_MEDICAL');
  assert(regDbAfterScratch.includes('Precautionary veterinary rest'), 'Registration notes in DB must contain the scratch reason');
  console.log(`-> DB After Scratch: ${regDbAfterScratch}`);

  // -------------------------------------------------------------
  // R-3.7 Read Published Completed Results (Assert COMPLETED and has result)
  console.log('\n[R-3.7] Reading Published Completed Tournament Results as Head Trainer...');
  const completedTournament = tournsList.find((t) => t.status === 'COMPLETED');
  assert(completedTournament, 'At least one COMPLETED tournament must exist');
  const completedTournamentId = completedTournament.id;
  assert(completedTournamentId, 'Completed tournament must have an ID');

  const completedRes = await request('GET', `/tournaments/${completedTournamentId}`, token);
  assert.strictEqual(completedRes.status, 200, 'GET /tournaments/:id for completed event must return HTTP 200');
  const compData = completedRes.data.data || completedRes.data;
  assert.strictEqual(compData.status, 'COMPLETED', 'Tournament status must be COMPLETED');
  assert(Array.isArray(compData.registrations) && compData.registrations.length > 0, 'Completed tournament must have registrations');
  const withResult = compData.registrations.find((r) => r.result !== null && r.result !== undefined);
  assert(withResult, 'At least one registration in completed tournament must contain an official result');
  assert(typeof withResult.result.finalRank === 'number' && withResult.result.finalRank > 0, 'Official result must have positive numeric finalRank');
  assert(typeof withResult.result.finishTimeSeconds === 'number' && withResult.result.finishTimeSeconds > 0, 'Official result must have positive numeric finishTimeSeconds');
  console.log(`GET /tournaments/${completedTournamentId} -> Status: ${completedRes.status}`);
  console.log(`-> Tournament: ${compData.name}, Status: ${compData.status}, Registrations: ${compData.registrations.length}`);
  console.log(`-> Sample Official Result: Horse "${withResult.horse?.name}", Rank: ${withResult.result.finalRank}, Time: ${withResult.result.finishTimeSeconds}s, Prize: ${withResult.result.prizeMoneyWon}`);

  // -------------------------------------------------------------
  // C-1: Club Manager Permission Boundary & Plan Creation Check
  console.log('\n[C-1] Verifying Club Manager cannot author plans or retain createPlan...');
  const cmLoginRes = await request('POST', '/auth/login', null, {
    email: CM_EMAIL,
    password: CM_PASSWORD,
    remember: true,
  });
  assert.strictEqual(cmLoginRes.status, 200, 'Club Manager login must return HTTP 200');
  const cmToken = cmLoginRes.data.accessToken || cmLoginRes.data.data?.accessToken;
  const cmUser = cmLoginRes.data.user || cmLoginRes.data.data?.user;
  assert.strictEqual(cmUser.role, 'CLUB_MANAGER', 'User role must be CLUB_MANAGER');
  const cmUserId = cmUser.id || cmUser.userId;
  assertValidUuid(cmUserId, 'Club Manager User ID');

  // Attempt PUT /accounts/:id/permissions enabling createPlan for CM -> normalizes to false
  const cmPermPayload = {
    permissions: {
      createPlan: true,
    },
  };
  const cmUpdatePermRes = await request('PUT', `/accounts/${cmUserId}/permissions`, cmToken, cmPermPayload);
  assert.strictEqual(cmUpdatePermRes.status, 200, 'PUT /accounts/:id/permissions must return HTTP 200');
  const account = cmUpdatePermRes.data.data?.account || cmUpdatePermRes.data?.account || cmUpdatePermRes.data.data || cmUpdatePermRes.data;
  const updatedPerms = account?.permissions;
  assert(updatedPerms, `Updated permissions object must exist in response: ${JSON.stringify(cmUpdatePermRes.data)}`);
  assert.strictEqual(updatedPerms.createPlan, false, 'createPlan for CLUB_MANAGER must normalize to false');
  console.log(`PUT /accounts/${cmUserId}/permissions (createPlan=true) -> returned createPlan: ${updatedPerms.createPlan}`);

  // DB check for CM permissions
  const cmPermDb = runSql(`SELECT permissions->>'createPlan' FROM "User" WHERE id = '${cmUserId}'`);
  assert(cmPermDb === 'false' || cmPermDb === '', 'User in DB must not retain createPlan=true for Club Manager');
  console.log(`-> DB Verification for CM createPlan: "${cmPermDb}" (expected false or not set)`);

  // As Club Manager, attempt POST /training/plans -> must return HTTP 403 Forbidden
  const cmCreatePlanRes = await request('POST', '/training/plans', cmToken, planPayload);
  assert.strictEqual(cmCreatePlanRes.status, 403, 'Club Manager POST /training/plans must return HTTP 403 Forbidden');
  console.log(`Club Manager POST /training/plans -> Status: ${cmCreatePlanRes.status} (Forbidden as expected)`);

  // -------------------------------------------------------------
  // Negative Boundary Checks (R-e): Assert HTTP 403 on 15 Prohibited Endpoints
  console.log('\n[Negative Boundaries (R-e)] Verifying HTTP 403 Forbidden on Prohibited Endpoints...');
  const negativeChecks = [
    { method: 'POST', path: '/tournaments', body: { name: 'Unauthorized Event' }, label: 'Create Tournament' },
    { method: 'PATCH', path: `/tournaments/${openTournamentId}`, body: { name: 'Renamed' }, label: 'Edit Tournament' },
    { method: 'PATCH', path: `/tournaments/${openTournamentId}/status`, body: { status: 'CANCELLED' }, label: 'Change Tournament Status' },
    { method: 'DELETE', path: `/tournaments/${openTournamentId}`, label: 'Delete Tournament' },
    { method: 'POST', path: `/tournaments/${openTournamentId}/results`, body: { results: [] }, label: 'Record Tournament Results' },
    { method: 'POST', path: `/tournaments/${openTournamentId}/lock-results`, body: {}, label: 'Lock Tournament Results (R-e)' },
    { method: 'POST', path: '/horses', body: { name: 'Unauthorized Horse' }, label: 'Create Horse Profile' },
    { method: 'PUT', path: `/horses/${horseId}`, body: { name: 'Renamed Horse' }, label: 'Update Horse Profile' },
    { method: 'PATCH', path: `/horses/${horseId}/transfer-owner`, body: { newOwnerId: user.id || user.userId }, label: 'Transfer Horse Owner' },
    { method: 'DELETE', path: `/horses/${horseId}`, label: 'Delete Horse' },
    { method: 'POST', path: `/horses/${horseId}/restore`, body: {}, label: 'Restore Horse Profile (R-e)' },
    { method: 'GET', path: '/horses/deleted', label: 'View Deleted Horses' },
    { method: 'GET', path: '/accounts', label: 'View Accounts' },
    { method: 'PUT', path: `/accounts/${user.id || user.userId}/permissions`, body: { permissions: {} }, label: 'Mutate Permissions' },
    { method: 'PATCH', path: '/training/alerts/alert-1', body: {}, label: 'Acknowledge Medical Alert' },
  ];

  let failedNegative = 0;
  for (const check of negativeChecks) {
    const res = await request(check.method, check.path, token, check.body);
    const pass = res.status === 403;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${check.label} (${check.method} ${check.path}) -> Status: ${res.status} (Expected: 403)`);
    if (!pass) failedNegative++;
  }

  assert.strictEqual(failedNegative, 0, `${failedNegative} negative boundary checks failed to return HTTP 403`);

  console.log('\n=== Real-Stack Verification Completed Successfully ===');
}

main().catch((err) => {
  console.error('\nVerification script failed:', err.message);
  process.exit(1);
});
