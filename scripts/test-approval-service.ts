import { db, databaseDriver } from '../lib/db';
import { localDb, type LocalPayment } from '../lib/local-db';
import { approvePayment } from '../lib/payments/service';

/**
 * Input for savePayment.
 *
 * `period` is not part of LocalPayment, but the service layer reads it off the
 * payment row, so tests pass it. These calls are written with this alias rather
 * than `as any` to document that intent instead of silencing the compiler.
 * Note: localDb.savePayment does not currently persist `period`, so it is
 * dropped locally exactly as before — this only changes the type, not behavior.
 */
type PaymentInput = Partial<LocalPayment> & { period?: string };

async function runTests() {
  console.log('====================================================');
  console.log('=== PAYMENT APPROVAL SERVICE & RPC TEST SUITE ===');
  console.log(`=== Active Driver: ${databaseDriver.toUpperCase()} ===`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string, detail?: unknown) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`, detail ? `-> Detail: ${JSON.stringify(detail)}` : '');
      failed++;
    }
  }

  const userId = 'test_user_approval_123';
  const courseId = '11111111-1111-1111-1111-111111111111'; // standard course
  const adminId = 'admin_user_999';

  // --------------------------------------------------------------------------
  // PART 1: MOCKED / LOCAL-DB UNIT TESTS
  // --------------------------------------------------------------------------
  console.log('>>> [PART 1] MOCKED / LOCAL-DB UNIT TESTS <<<\n');

  // Cleanup pre-existing test data
  localDb.deleteProfile(userId);

  // TEST 1: Fresh Approval creates Active Enrollment with correct expires_at
  console.log('--- Test 1: Fresh Payment Approval ---');
  const payment1 = await localDb.savePayment({
    user_id: userId,
    course_id: courseId,
    amount: 299000,
    currency: 'UZS',
    provider: 'card',
    status: 'receipt_submitted',
    order_id: 'NE-TEST-001',
    period: 'monthly',
  } as PaymentInput);

  const res1 = await approvePayment(payment1.id, adminId);
  assert(res1.ok === true, 'Fresh approval succeeded');
  assert(res1.payment?.status === 'approved', 'Payment status updated to approved');

  const enrollments1 = await localDb.getEnrollments(userId);
  const enrollment1 = enrollments1.find((e) => e.course_id === courseId);
  assert(Boolean(enrollment1), 'Enrollment record created in DB');
  assert(enrollment1?.status === 'active', 'Enrollment status is active');
  assert(Boolean(enrollment1?.expires_at), 'Enrollment expires_at is set');

  const expectedMinExpiry1 = Date.now() + 29 * 24 * 60 * 60 * 1000;
  const actualExpiry1 = new Date(enrollment1?.expires_at || 0).getTime();
  assert(actualExpiry1 > expectedMinExpiry1, 'Expires_at is set ~30 days in future');

  // TEST 2: Same-Payment Retries never extend access twice
  console.log('\n--- Test 2: Same-Payment Retry (Does NOT double extend) ---');
  const expiryBeforeRetry = enrollment1?.expires_at;

  const res2 = await approvePayment(payment1.id, adminId);
  assert(res2.ok === true, 'Same-payment retry returned ok: true');

  const enrollments2 = await localDb.getEnrollments(userId);
  const enrollment2 = enrollments2.find((e) => e.course_id === courseId);
  assert(
    enrollment2?.expires_at === expiryBeforeRetry,
    'Same-payment retry did NOT double-extend expiration date'
  );

  // TEST 3: Already-Approved Payment with Missing Enrollment (Recovery Path)
  console.log('\n--- Test 3: Recovery Path (Approved Payment Missing Enrollment) ---');
  // Delete/revoke active enrollment to simulate missing enrollment record
  localDb.revokeEnrollment(userId, courseId);

  const res3 = await approvePayment(payment1.id, adminId);
  assert(res3.ok === true, 'Recovery approval returned ok: true');

  const enrollments3 = await localDb.getEnrollments(userId);
  const enrollment3 = enrollments3.find((e) => e.course_id === courseId);
  assert(Boolean(enrollment3), 'Missing enrollment restored via recovery path');
  assert(enrollment3?.status === 'active', 'Restored enrollment is active');

  // TEST 4: Renewal of Active Course extends expiration date
  console.log('\n--- Test 4: Renewal of Active Course (Extends Expiration) ---');
  const fixedExpiryMs = Date.now() + 10 * 24 * 60 * 60 * 1000;
  const fixedExpiryIso = new Date(fixedExpiryMs).toISOString();

  await localDb.saveEnrollment({
    user_id: userId,
    course_id: courseId,
    status: 'active',
    expires_at: fixedExpiryIso,
    source: 'payment:NE-OLD-000',
  });

  const payment2 = await localDb.savePayment({
    user_id: userId,
    course_id: courseId,
    amount: 299000,
    currency: 'UZS',
    provider: 'card',
    status: 'receipt_submitted',
    order_id: 'NE-TEST-002',
    period: 'monthly',
  } as PaymentInput);

  const res4 = await approvePayment(payment2.id, adminId);
  assert(res4.ok === true, 'Renewal payment approved');

  const enrollments4 = await localDb.getEnrollments(userId);
  const enrollment4 = enrollments4.find((e) => e.course_id === courseId);
  const newExpiryMs4 = new Date(enrollment4?.expires_at || 0).getTime();
  const expectedExtendedMs = fixedExpiryMs + 30 * 24 * 60 * 60 * 1000;

  assert(
    Math.abs(newExpiryMs4 - expectedExtendedMs) < 5000,
    'Active enrollment extended by 30 days from previous expiration date',
    { actual: enrollment4?.expires_at, expected: new Date(expectedExtendedMs).toISOString() }
  );

  // TEST 5: Concurrent Distinct Payments for Same User/Course (No Renewal Time Lost)
  console.log('\n--- Test 5: Concurrent Distinct Payments (Preserves Renewal Duration) ---');
  const currentExpiryBeforeConcurrent = new Date(enrollment4?.expires_at || 0).getTime();

  const payment5a = await localDb.savePayment({
    user_id: userId,
    course_id: courseId,
    amount: 299000,
    currency: 'UZS',
    provider: 'card',
    status: 'receipt_submitted',
    order_id: 'NE-TEST-005A',
    period: 'monthly',
  } as PaymentInput);

  const payment5b = await localDb.savePayment({
    user_id: userId,
    course_id: courseId,
    amount: 299000,
    currency: 'UZS',
    provider: 'card',
    status: 'receipt_submitted',
    order_id: 'NE-TEST-005B',
    period: 'monthly',
  } as PaymentInput);

  const [concurrentResA, concurrentResB] = await Promise.all([
    approvePayment(payment5a.id, adminId),
    approvePayment(payment5b.id, adminId),
  ]);

  assert(concurrentResA.ok === true && concurrentResB.ok === true, 'Both distinct concurrent payments approved');

  const enrollments5 = await localDb.getEnrollments(userId);
  const enrollment5 = enrollments5.find((e) => e.course_id === courseId);
  const finalExpiryMs5 = new Date(enrollment5?.expires_at || 0).getTime();
  const expectedTotalExtendedMs = currentExpiryBeforeConcurrent + 60 * 24 * 60 * 60 * 1000;

  assert(
    Math.abs(finalExpiryMs5 - expectedTotalExtendedMs) < 5000,
    'Concurrent distinct payments extended expiration by cumulative 60 days without losing renewal time',
    { actual: enrollment5?.expires_at, expected: new Date(expectedTotalExtendedMs).toISOString() }
  );

  // Cleanup test data
  localDb.deleteProfile(userId);

  // --------------------------------------------------------------------------
  // PART 2: REAL POSTGRESQL INTEGRATION TESTS
  // --------------------------------------------------------------------------
  console.log('\n>>> [PART 2] REAL POSTGRESQL RPC INTEGRATION TESTS <<<');

  const hasPgConfig = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!hasPgConfig) {
    console.log('ℹ️ SKIPPED: Real PostgreSQL integration tests skipped (SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not configured in environment).');
  } else {
    console.log('Running real PostgreSQL database tests against Supabase RPC...');
    try {
      const pgPayment = await db.savePayment({
        user_id: '00000000-0000-0000-0000-000000000002',
        course_id: courseId,
        amount: 299000,
        currency: 'UZS',
        provider: 'card',
        status: 'receipt_submitted',
        order_id: `NE-PG-${Date.now()}`,
        period: 'monthly',
      } as PaymentInput);

      const pgRes = await approvePayment(pgPayment.id, adminId);
      assert(pgRes.ok === true, 'Real PostgreSQL RPC payment approval succeeded');
    } catch (pgErr) {
      console.error('❌ FAIL: PostgreSQL integration test failed:', pgErr);
      failed++;
    }
  }

  console.log(`\n====================================================`);
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
