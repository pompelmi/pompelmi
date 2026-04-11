const { INSTALLER_COMMANDS, UPDATER_COMMANDS } = require('./config.js');

function getInstallerCommand(platform) {
    return INSTALLER_COMMANDS[platform] ?? [null, []];
}

function getUpdaterCommand(platform) {
    return UPDATER_COMMANDS[platform] ?? [null, []];
}

module.exports = { getInstallerCommand, getUpdaterCommand };