'use strict';

const CHECKS = [
  {
    key: 'scanEnabled',
    check: 'Virus scanning enabled',
    weight: 30,
    pass: c => c.scanEnabled === true,
    recommendation: 'Enable virus scanning by integrating pompelmi into your upload handler.',
  },
  {
    key: 'mimeTypeAllowlist',
    check: 'MIME type allowlist',
    weight: 20,
    pass: c => Array.isArray(c.mimeTypeAllowlist) && c.mimeTypeAllowlist.length > 0,
    recommendation: 'Define an explicit MIME type allowlist to reject unexpected file types.',
  },
  {
    key: 'fileSizeLimit',
    check: 'File size limit',
    weight: 10,
    pass: c => typeof c.fileSizeLimit === 'number' && c.fileSizeLimit > 0,
    recommendation: 'Set a maximum file size limit to prevent resource exhaustion.',
  },
  {
    key: 'diskWriteBeforeScan',
    check: 'No disk write before scan',
    weight: 15,
    pass: c => c.diskWriteBeforeScan === false,
    recommendation: 'Scan files in-memory before writing to disk to avoid storing malware even temporarily.',
  },
  {
    key: 'scanErrorBehavior',
    check: 'Scan error behavior is reject',
    weight: 10,
    pass: c => c.scanErrorBehavior === 'reject',
    recommendation: 'Set scanErrorBehavior to "reject" — failing open on scan errors is a security risk.',
  },
  {
    key: 'clamdUnavailableBehavior',
    check: 'clamd unavailable behavior is reject',
    weight: 10,
    pass: c => c.clamdUnavailableBehavior === 'reject',
    recommendation: 'Set clamdUnavailableBehavior to "reject" — if clamd is down, deny uploads rather than allowing them through.',
  },
  {
    key: 'tlsEnabled',
    check: 'TLS enabled on upload endpoint',
    weight: 5,
    pass: c => c.tlsEnabled === true,
    recommendation: 'Enable TLS (HTTPS) on your upload endpoint to protect files in transit.',
  },
];

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

async function generateScorecard(config = {}) {
  const maxScore = CHECKS.reduce((s, c) => s + c.weight, 0);
  let earned = 0;
  const findings = [];
  const recommendations = [];

  for (const def of CHECKS) {
    const passed = def.pass(config);
    findings.push({ check: def.check, status: passed ? 'pass' : 'fail', weight: def.weight });
    if (passed) {
      earned += def.weight;
    } else {
      recommendations.push(def.recommendation);
    }
  }

  const score = Math.round((earned / maxScore) * 100);
  const grade = scoreToGrade(score);

  return { grade, score, findings, recommendations };
}

module.exports = { generateScorecard };
