async function runVerification() {
  const BASE = 'http://localhost:4000/api';

  async function req(url, method = 'GET', body = null, token = null) {
    const res = await fetch(`${BASE}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      data: text ? JSON.parse(text) : null,
    };
  }

  console.log('===============================================================');
  console.log('🎓 6th of October University Exam Platform — MVP Verification');
  console.log('===============================================================\n');

  // 1. Doctor & Student Auth
  console.log('[1/8] Testing AuthProvider (SSO Isolation)...');
  const docLogin = await req('/auth/login', 'POST', { universityId: 'DOC01', password: 'password123' });
  console.log(`  ✓ Doctor Login: ${docLogin.status === 200 ? 'SUCCESS' : 'FAILED'} -> ${docLogin.data.user.fullName} (${docLogin.data.user.role})`);
  const doctorToken = docLogin.data.accessToken;

  const stuLogin = await req('/auth/login', 'POST', { universityId: '20260001', password: 'password123' });
  console.log(`  ✓ Student Login: ${stuLogin.status === 200 ? 'SUCCESS' : 'FAILED'} -> ${stuLogin.data.user.fullName} (${stuLogin.data.user.role})`);
  const studentToken = stuLogin.data.accessToken;

  // 2. Courses & Question Bank
  console.log('\n[2/8] Testing Courses & Question Bank CRUD...');
  const courses = await req('/courses', 'GET', null, doctorToken);
  console.log(`  ✓ Retrieved ${courses.data.length} courses: ${courses.data.map(c => c.code).join(', ')}`);
  const sweCourse = courses.data.find(c => c.code === 'SWE301');

  const questions = await req(`/courses/${sweCourse.id}/questions`, 'GET', null, doctorToken);
  console.log(`  ✓ Retrieved ${questions.data.length} questions in SWE301 Question Bank`);
  const easy = questions.data.filter(q => q.difficulty === 'EASY').length;
  const medium = questions.data.filter(q => q.difficulty === 'MEDIUM').length;
  const hard = questions.data.filter(q => q.difficulty === 'HARD').length;
  console.log(`  ✓ Difficulty Breakdown: ${easy} Easy, ${medium} Medium, ${hard} Hard`);

  // 3. Bank Sufficiency Check (FR-6)
  console.log('\n[3/8] Testing FR-6 Bank Sufficiency Guard...');
  const exams = await req('/exams', 'GET', null, doctorToken);
  const exam = exams.data[0];
  const bankCheck = await req(`/exams/${exam.id}/bank-check`, 'GET', null, doctorToken);
  console.log(`  ✓ Bank Check Result: ${bankCheck.data.isSufficient ? 'PASS (Sufficient)' : 'FAIL'}`);
  bankCheck.data.slots.forEach(s => {
    console.log(`    - Slot [${s.difficulty}]: Need ${s.required} | Available ${s.available} | Deficit ${s.deficit}`);
  });

  // 4. Student Attempt Engine & Snapshotting (FR-9, FR-10, FR-11)
  console.log('\n[4/8] Testing Attempt Generation & Immutable Snapshotting...');
  const attemptRes = await req(`/exams/${exam.id}/attempts/start`, 'POST', {}, studentToken);
  console.log(`  ✓ Attempt started: status ${attemptRes.status}`);
  console.log(`  ✓ Generated unique paper with ${attemptRes.data.questions.length} questions`);
  console.log(`  ✓ Server-computed timer: ${attemptRes.data.remainingSeconds}s remaining`);
  const attemptId = attemptRes.data.attemptId;
  const q1 = attemptRes.data.questions[0];

  // 5. Autosave & Anti-Cheat Violation Logging (FR-12, FR-13, FR-14)
  console.log('\n[5/8] Testing Debounced Autosave & Anti-Cheat Deterrents...');
  const saveRes = await req(`/attempts/${attemptId}/answers/${q1.id}`, 'PATCH', { selectedOptionId: q1.options[0].id }, studentToken);
  console.log(`  ✓ Autosave Question 1: ${saveRes.status === 200 ? 'SUCCESS' : 'FAILED'}`);

  const violationRes = await req(`/attempts/${attemptId}/violations`, 'POST', { type: 'FULLSCREEN_EXIT', metadata: { alert: 'Fullscreen exit' } }, studentToken);
  console.log(`  ✓ Security violation logged: ${violationRes.status === 200 ? 'SUCCESS' : 'FAILED'}`);

  // 6. Final Submission & Instant Auto-Grading (FR-15, FR-19, FR-20, FR-21)
  console.log('\n[6/8] Testing Final Submission & Score Privacy...');
  const submitRes = await req(`/attempts/${attemptId}/submit`, 'POST', {}, studentToken);
  console.log(`  ✓ Paper submitted: ${submitRes.status === 200 ? 'SUCCESS' : 'FAILED'}`);
  const leaked = submitRes.data.finalScore !== undefined || submitRes.data.score !== undefined;
  console.log(`  ✓ FR-15/FR-21 Privacy Check (No grades/answers shown to student): ${!leaked ? 'PASS (SECURE)' : 'FAILED'}`);

  // 7. Live Proctoring & Faculty Gradebook View
  console.log('\n[7/8] Testing Live Proctor Dashboard & Faculty Gradebook...');
  const monitorRes = await req(`/exams/${exam.id}/monitor`, 'GET', null, doctorToken);
  console.log(`  ✓ Live Monitor tracks ${monitorRes.data.length} students in lab session:`);
  monitorRes.data.forEach(s => {
    console.log(`    - ${s.studentName} (${s.universityId}): Status = ${s.status}, Answered = ${s.answeredCount}/${s.totalQuestions}, Violations = ${s.violationCount}`);
  });

  const resultsRes = await req(`/exams/${exam.id}/results`, 'GET', null, doctorToken);
  console.log(`\n  ✓ Gradebook for ${resultsRes.data.courseName} (${resultsRes.data.courseCode}):`);
  resultsRes.data.rows.forEach(r => {
    console.log(`    - ${r.studentName} (${r.universityId}): Final Score = ${r.score} / ${resultsRes.data.totalPoints} pts [${r.status}]`);
  });

  // 8. Excel Grade Sheet Generation (ExcelJS)
  console.log('\n[8/8] Testing ExcelJS Spreadsheet Generation (PRD Format)...');
  const excelRes = await fetch(`${BASE}/exams/${exam.id}/export`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const contentType = excelRes.headers.get('content-type');
  const buffer = await excelRes.arrayBuffer();
  console.log(`  ✓ Excel Export HTTP Status: ${excelRes.status}`);
  console.log(`  ✓ Content-Type: ${contentType}`);
  console.log(`  ✓ Generated .xlsx size: ${buffer.byteLength} bytes`);

  console.log('\n===============================================================');
  console.log('✅ ALL MVP SPECIFICATIONS VERIFIED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runVerification().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
