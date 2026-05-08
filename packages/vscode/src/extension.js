'use strict';

const { execFile } = require('child_process');
const path         = require('path');

function getScanOptions(vscode) {
  const cfg    = vscode.workspace.getConfiguration('pompelmi');
  const host   = cfg.get('host', 'localhost');
  const port   = cfg.get('port', 3310);
  const socket = cfg.get('socket', '');
  const args   = ['scan'];
  if (socket) { args.push('--socket', socket); }
  else        { args.push('--host', host, '--port', String(port)); }
  args.push('--json');
  return args;
}

function runScan(filePath, args, callback) {
  const allArgs = [...args, filePath];
  execFile('npx', ['pompelmi', ...allArgs], { timeout: 30000 }, (err, stdout) => {
    if (err && !stdout) return callback(err, null);
    try {
      const result = JSON.parse(stdout);
      callback(null, result);
    } catch {
      callback(new Error('Failed to parse pompelmi output'), null);
    }
  });
}

function activate(context) {
  const vscode = require('vscode');

  const scanFileCmd = vscode.commands.registerCommand('pompelmi.scanFile', async (uri) => {
    const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!filePath) {
      vscode.window.showErrorMessage('pompelmi: No file selected.');
      return;
    }

    const args = getScanOptions(vscode);
    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `pompelmi: scanning ${path.basename(filePath)}...` },
      () => new Promise(resolve => {
        runScan(filePath, args, (err, result) => {
          resolve();
          if (err) {
            vscode.window.showErrorMessage(`pompelmi error: ${err.message}`);
            return;
          }
          const r = result?.results?.[0];
          if (!r) {
            vscode.window.showErrorMessage('pompelmi: unexpected response');
            return;
          }
          if (r.verdict === 'clean') {
            vscode.window.showInformationMessage(`✅ ${path.basename(filePath)} — Clean`);
          } else if (r.verdict === 'infected') {
            const virus = r.viruses?.[0] ? ` (${r.viruses[0]})` : '';
            vscode.window.showErrorMessage(`🚨 ${path.basename(filePath)} — INFECTED${virus}`);
          } else {
            vscode.window.showWarningMessage(`⚠️ ${path.basename(filePath)} — Scan error`);
          }
        });
      })
    );
  });

  const scanWorkspaceCmd = vscode.commands.registerCommand('pompelmi.scanWorkspace', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage('pompelmi: No workspace folder open.');
      return;
    }

    const args = getScanOptions(vscode);
    const dirPath = folders[0].uri.fsPath;

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'pompelmi: scanning workspace...' },
      () => new Promise(resolve => {
        runScan(dirPath, args, (err, result) => {
          resolve();
          if (err) {
            vscode.window.showErrorMessage(`pompelmi error: ${err.message}`);
            return;
          }
          const infected = result?.infected ?? 0;
          const scanned  = result?.scanned  ?? 0;
          if (infected === 0) {
            vscode.window.showInformationMessage(`✅ Workspace scan complete — ${scanned} files scanned, all clean.`);
          } else {
            vscode.window.showErrorMessage(`🚨 Workspace scan — ${infected} infected file(s) found out of ${scanned} scanned.`);
          }
        });
      })
    );
  });

  const configureCmd = vscode.commands.registerCommand('pompelmi.configure', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'pompelmi');
  });

  context.subscriptions.push(scanFileCmd, scanWorkspaceCmd, configureCmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
