const { nativeSpawn: spawn } = require('./spawn.js');
const { execSync } = require("child_process");
const { getInstallerCommand } = require('./InstallerCommand.js');
const { PLATFORM } = require('./constants.js')

const MESSAGES = {
    ALREADY_INSTALLED: "ClamAV is already installed, skipping.",
    SUCCESS: "Installation completed successfully!",
    PLATFORM_NOT_SUPPORTED: "Current platform is not supported.",
    FAILURE: (code) => `Installation failed with exit code: ${code}`
};

function isClamAVInstalled() {
    const command = PLATFORM === 'win32' ? 'where clamscan' : 'which clamscan';
    try {
        execSync(command, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function ClamAVInstaller() {
    return new Promise((resolve, reject) => {
        if (isClamAVInstalled()) {
            console.log(MESSAGES.ALREADY_INSTALLED);
            return resolve(MESSAGES.ALREADY_INSTALLED);
        }

        const [packageManager, packageToInstall] = getInstallerCommand(PLATFORM);

        if (!packageManager) {
            console.log(MESSAGES.PLATFORM_NOT_SUPPORTED);
            return resolve(MESSAGES.PLATFORM_NOT_SUPPORTED);
        }

        const child = spawn(packageManager, packageToInstall, { stdio: 'inherit' });
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

module.exports = { ClamAVInstaller};