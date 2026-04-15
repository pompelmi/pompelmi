const { Verdict } = require('./verdicts.js');

module.exports = Object.freeze({
    INSTALLER_COMMANDS: Object.freeze({
        win32:  ['choco',  ['install', 'clamav', '-y']],
        darwin: ['brew',   ['install', 'clamav']],
        linux:  ['sudo',   ['apt-get', 'install', '-y', 'clamav', 'clamav-daemon']],
    }),
    UPDATER_COMMANDS: Object.freeze({
        win32:  ['freshclam', []],
        darwin: ['freshclam', []],
        linux:  ['sudo',      ['freshclam']],
    }),
    DB_PATHS: Object.freeze({
        darwin: '/usr/local/share/clamav/main.cvd',
        linux:  '/var/lib/clamav/main.cvd',
        win32:  'C:\\ProgramData\\ClamAV\\main.cvd',
    }),
    SCAN_RESULTS: Object.freeze({
        0: Verdict.Clean,
        1: Verdict.Malicious,
        2: Verdict.ScanError,
    }),
});