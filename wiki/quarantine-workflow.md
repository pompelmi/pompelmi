# Quarantine Workflow

Deleting malicious files immediately is the simplest response, but a quarantine folder lets you retain infected files for forensic review, audit logging, and pattern analysis before permanent deletion.

---

## Basic quarantine: move instead of delete

```js
const fs   = require('fs');
const path = require('path');
const { scan, Verdict } = require('pompelmi');

const QUARANTINE_DIR = path.join(__dirname, 'quarantine');
fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

async function scanAndQuarantine(filePath) {
  const result = await scan(filePath, { host: process.env.CLAMAV_HOST, port: 3310 });

  if (result === Verdict.Malicious) {
    const filename = path.basename(filePath);
    const dest     = path.join(QUARANTINE_DIR, `${Date.now()}-${filename}`);

    fs.renameSync(filePath, dest);

    console.warn({
      event:    'quarantined',
      original: filePath,
      dest,
      verdict:  result.description,
    });

    return { quarantined: true, dest };
  }

  if (result === Verdict.ScanError) {
    fs.unlinkSync(filePath);
    return { quarantined: false, deleted: true, reason: 'scan_error' };
  }

  return { quarantined: false, verdict: result.description };
}
```

`fs.renameSync` is atomic on the same filesystem. If `filePath` and `QUARANTINE_DIR` are on different filesystems, copy then delete:

```js
fs.copyFileSync(filePath, dest);
fs.unlinkSync(filePath);
```

---

## Quarantine folder structure

Organise quarantine files for easy review. A date-based hierarchy keeps any single directory manageable:

```
quarantine/
  2024/
    04/
      28/
        1714300800000-invoice.pdf
        1714301200000-resume.doc
```

```js
function quarantinePath(originalPath) {
  const now      = new Date();
  const year     = now.getFullYear();
  const month    = String(now.getMonth() + 1).padStart(2, '0');
  const day      = String(now.getDate()).padStart(2, '0');
  const dir      = path.join(QUARANTINE_DIR, String(year), month, day);
  const filename = `${Date.now()}-${path.basename(originalPath)}`;

  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}
```

---

## Logging quarantined files to a database

Store a record of every quarantined file for audit and reporting:

```js
const { scan, Verdict } = require('pompelmi');

async function scanAndLog(filePath, db, userId) {
  let result;
  try {
    result = await scan(filePath, { host: 'clamav', port: 3310 });
  } catch (err) {
    await db.scanEvents.insert({
      filePath,
      userId,
      event:     'scan_error',
      error:     err.message,
      createdAt: new Date(),
    });
    throw err;
  }

  if (result === Verdict.Malicious) {
    const dest = quarantinePath(filePath);
    fs.renameSync(filePath, dest);

    await db.scanEvents.insert({
      originalPath: filePath,
      quarantinePath: dest,
      userId,
      event:     'quarantined',
      verdict:   'malicious',
      createdAt: new Date(),
    });

    return { quarantined: true, dest };
  }

  await db.scanEvents.insert({
    filePath,
    userId,
    event:   'clean',
    verdict: 'clean',
    createdAt: new Date(),
  });

  return { quarantined: false };
}
```

---

## Alerting on quarantine events

Send a notification when malware is detected. Use any alerting mechanism — email, Slack, PagerDuty, a webhook:

```js
async function notifyAdmin(event) {
  const message = [
    `Malicious file quarantined`,
    `Original path: ${event.originalPath}`,
    `Quarantine path: ${event.quarantinePath}`,
    `User: ${event.userId}`,
    `Time: ${event.createdAt.toISOString()}`,
  ].join('\n');

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}
```

---

## Express integration with quarantine

```js
const express = require('express');
const multer  = require('multer');
const { scan, Verdict } = require('pompelmi');

const app    = express();
const upload = multer({ dest: './uploads' });

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file.' });

  const filePath = req.file.path;
  const result   = await scan(filePath, { host: 'clamav', port: 3310 }).catch(err => {
    try { fs.unlinkSync(filePath); } catch {}
    throw err;
  });

  if (result === Verdict.Malicious) {
    const dest = quarantinePath(filePath);
    fs.renameSync(filePath, dest);
    logger.warn({ event: 'quarantined', dest, userId: req.user?.id });
    return res.status(422).json({ error: 'Malicious file rejected.' });
  }

  if (result === Verdict.ScanError) {
    fs.unlinkSync(filePath);
    return res.status(422).json({ error: 'Scan incomplete — file rejected.' });
  }

  return res.json({ ok: true, filename: req.file.filename });
});
```

---

## Reviewing quarantined files

To review what was quarantined:

```bash
# List quarantined files with sizes
find quarantine/ -type f -exec ls -lh {} \;

# Count by day
find quarantine/ -type f | cut -d/ -f2-4 | sort | uniq -c
```

From a Node.js admin script:

```js
const { scanDirectory } = require('pompelmi');

// Re-scan the quarantine folder to verify signatures (optional)
const results = await scanDirectory('./quarantine', { host: 'clamav', port: 3310 });
console.log(`Quarantine: ${results.malicious.length} confirmed malicious, ${results.clean.length} clean`);
```

---

## Cleanup policy

Quarantined files should not accumulate indefinitely. Implement a retention policy:

```js
const fs   = require('fs');
const path = require('path');

const RETENTION_DAYS = 30;

function pruneQuarantine(dir) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const file of fs.readdirSync(dir, { recursive: true })) {
    const fullPath = path.join(dir, file);
    const stat     = fs.statSync(fullPath);

    if (stat.isFile() && stat.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted expired quarantine file: ${fullPath}`);
    }
  }
}

pruneQuarantine('./quarantine');
```

Run this as a daily cron job. Adjust `RETENTION_DAYS` based on your audit or compliance requirements.

---

## Permissions

Ensure the quarantine directory is not web-accessible. Never serve files from the quarantine folder through your web server. Set restrictive filesystem permissions:

```bash
mkdir -p quarantine
chmod 700 quarantine
```

On Linux, assign ownership to the user running your Node.js process and deny access to all others.
