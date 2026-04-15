'use strict';

const { spawn } = require('child_process');

/**
 * A thin wrapper around Node's built-in child_process.spawn that handles the
 * one meaningful cross-platform difference: on Windows, .cmd/.bat launchers
 * (e.g. choco, npm) cannot be resolved without the shell, so shell:true is
 * required.  On POSIX systems the shell is never involved.
 *
 * All callers in this codebase pass only hardcoded, trusted arguments, so
 * enabling the shell on Windows introduces no injection risk.
 *
 * @param {string}   cmd
 * @param {string[]} args
 * @param {object}   [options] - Passed through to child_process.spawn.
 *                               `shell` is always overridden by this wrapper.
 * @returns {import('child_process').ChildProcess}
 */
function nativeSpawn(cmd, args, options) {
    return spawn(cmd, args, {
        ...options,
        shell: process.platform === 'win32',
    });
}

module.exports = { nativeSpawn };
