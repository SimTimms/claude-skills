#!/usr/bin/env node
// Builds the test timeline: prints it to the terminal and writes the one-screen HTML page.
// Usage: node build.js <timeline.json> <results.json> <out.html>
const fs = require('fs');
const path = require('path');

const [dataPath, resultsPath, outPath] = process.argv.slice(2);
if (!dataPath || !resultsPath || !outPath) {
	console.error('Usage: node build.js <timeline.json> <results.json> <out.html>');
	process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Every test that ran; a name can be a title, a full name, or file::title (any end of the file path)
const ran = [];
for (const file of results.testResults || []) {
	const fileName = file.name || file.testFilePath || '';
	for (const t of file.assertionResults || []) {
		const status = t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : 'skipped';
		ran.push({ fileName, title: t.title, fullName: t.fullName || '', status });
	}
}
// A failure wins when a name matches more than one test
const lookup = (name) => {
	const [filePart, title] = name.includes('::') ? name.split('::') : [null, name];
	const hits = ran.filter(
		(t) => (t.title === title || t.fullName === title) && (!filePart || t.fileName.endsWith(filePart))
	);
	if (!hits.length) return 'missing';
	if (hits.some((t) => t.status === 'failed')) return 'failed';
	return hits.some((t) => t.status === 'passed') ? 'passed' : 'skipped';
};

const people = new Set(['teacher', 'student', 'admin', 'user', 'customer']);
const defaultLabel = {
	teacher: 'Teacher', student: 'Student', admin: 'Admin', user: 'User', customer: 'Customer',
	app: 'App', server: 'Server', db: 'Database', external: 'Service', job: 'Scheduled job',
};
const labelOf = (s) => s.label || defaultLabel[s.who] || s.who;
const shortTitle = (t) => (t.includes('::') ? t.split('::').pop() : t);

// Terminal
const sym = { passed: '✓ passed ', failed: '✗ FAILED ', skipped: '- skipped', missing: '? not found' };
const counts = { passed: 0, failed: 0, skipped: 0, missing: 0 };
console.log(`\n${data.title}`);
if (data.subtitle) console.log(data.subtitle);
for (const j of data.journeys) {
	console.log(`\n${j.name.toUpperCase()}${j.note ? `  (${j.note})` : ''}`);
	j.steps.forEach((s, i) => {
		console.log(`${String(i + 1).padStart(2)}  ${labelOf(s).padEnd(13)} ${s.isNew ? '★ ' : ''}${s.what}`);
		const tests = s.tests || [];
		for (const t of tests) {
			const st = lookup(t);
			counts[st] += 1;
			console.log(`${' '.repeat(18)}${sym[st]}  ${shortTitle(t)}`);
		}
		if (s.weak) console.log(`${' '.repeat(18)}!  weak: ${s.weak}`);
		if (!tests.length) console.log(`${' '.repeat(18)}–  ${s.none || 'no test'}`);
	});
}
console.log(`\nTests: ${counts.passed} passed, ${counts.failed} failed${counts.skipped ? `, ${counts.skipped} skipped` : ''}${counts.missing ? `, ${counts.missing} NOT FOUND (fix the titles)` : ''}`);

// Page
const enriched = {
	...data,
	runSummary: `${counts.passed} passed, ${counts.failed} failed${counts.missing ? `, ${counts.missing} not found` : ''}`,
	journeys: data.journeys.map((j) => ({
		...j,
		steps: j.steps.map((s) => ({
			who: s.who,
			person: people.has(s.who),
			label: labelOf(s),
			what: s.what,
			isNew: !!s.isNew,
			none: s.none || 'no test',
			weak: s.weak || '',
			tests: (s.tests || []).map((t) => ({ title: shortTitle(t), status: lookup(t) })),
		})),
	})),
};
const template = fs.readFileSync(path.join(__dirname, '..', 'assets', 'template.html'), 'utf8');
const json = JSON.stringify(enriched).replace(/</g, '\\u003c');
const html = template
	.replace('__TITLE__', escapeHtml(data.pageTitle || 'Test Timeline'))
	.replace('/*__DATA__*/null', json);
fs.writeFileSync(outPath, html);
console.log(`Page written to ${outPath}`);

function escapeHtml(s) {
	return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
