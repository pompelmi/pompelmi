# pompelmi — VS Code Extension

Scan files for viruses directly from VS Code using pompelmi and ClamAV.

## Requirements

- [ClamAV](https://www.clamav.net/) installed (or clamd running via Docker)
- Node.js and npm available in your PATH

## Installation

Install from the VS Code Marketplace:

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Run: `ext install pompelmi.pompelmi`

## Usage

### Scan a single file

Right-click any file in the Explorer sidebar and select **"Scan with pompelmi"**.

Results appear as VS Code notifications:

- `✅ file.pdf — Clean`
- `🚨 malware.exe — INFECTED (Win.Malware.Agent)`

### Scan the workspace

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
pompelmi: Scan Workspace
```

### Configure

Run `pompelmi: Configure` from the Command Palette to open settings.

## Settings

| Setting           | Default     | Description                              |
|-------------------|-------------|------------------------------------------|
| `pompelmi.host`   | `localhost` | clamd host                               |
| `pompelmi.port`   | `3310`      | clamd port                               |
| `pompelmi.socket` | *(empty)*   | clamd UNIX socket path (takes precedence over host/port) |

## Using with Docker

Start clamd via the official pompelmi Docker image:

```bash
docker run -p 3310:3310 -p 8080:8080 pompelmi/scanner
```

Then set `pompelmi.host` to `localhost` and `pompelmi.port` to `3310`.

## License

ISC © pompelmi contributors
