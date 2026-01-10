import subprocess
import os

os.chdir('/Users/tommy/pompelmi/pompelmi')

# Add files
subprocess.run(['git', 'add', '.github/workflows/ci.yml', '.github/workflows/build.yml', 
                '.github/workflows/publish.yml', '.github/workflows/deploy-pages.yml', 
                'pnpm-workspace.yaml'])

# Commit
subprocess.run(['git', 'commit', '-m', 
                'Fix all workflows: use --no-frozen-lockfile to resolve pnpm lockfile conflicts'])

# Push
result = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
