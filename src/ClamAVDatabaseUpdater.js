const spawn = require("cross-spawn");
const fs = require("fs");
const { getUpdaterCommand } = require('./InstallerCommand.js');
const { PLATFORM } = require('./constants.js');
const { DB_PATHS } = require('./config.js');

const MESSAGES = {
    DB_PRESENT: "Virus database already present, skipping.",
    SUCCESS: "Database updated successfully!",
    FAILURE: (code) => `Database update failed with exit code: ${code}`,
    STARTING: "Downloading virus definitions...",
    PLATFORM_NOT_SUPPORTED: "Current platform is not supported."
};

function isDatabasePresent() {
    const dbPath = DB_PATHS[PLATFORM];
    return dbPath ? fs.existsSync(dbPath) : false;
}

function updateClamAVDatabase() {
    return new Promise((resolve, reject) => {
        if (isDatabasePresent()) {
            console.log(MESSAGES.DB_PRESENT);
            return resolve(MESSAGES.DB_PRESENT);
        }

        const [command, args] = getUpdaterCommand(PLATFORM);

        if (!command) {
            console.log(MESSAGES.PLATFORM_NOT_SUPPORTED);
            return resolve(MESSAGES.PLATFORM_NOT_SUPPORTED);
        }

        console.log(MESSAGES.STARTING);

        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(MESSAGES.FAILURE(code)));
            }
            console.log(MESSAGES.SUCCESS);
            resolve(MESSAGES.SUCCESS);
        });
    });
}

module.exports = { updateClamAVDatabase };