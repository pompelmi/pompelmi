# Contributing to pompelmi

Thank you for your interest in contributing to **pompelmi**! We welcome contributions from developers of all experience levels.

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥18
- **pnpm** (recommended) or npm
- **Git**

### Development Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pompelmi.git
   cd pompelmi
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run tests** to ensure everything works:
   ```bash
   pnpm test
   ```

4. **Build the project**:
   ```bash
   pnpm build
   ```

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the full test suite**:
   ```bash
   pnpm repo:doctor
   ```

## 📋 Pull Request Process

1. **Link to an issue** or provide detailed description
2. **Update tests** and documentation
3. **Ensure CI passes** all checks
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Checklist

- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Breaking changes noted
- [ ] Commit messages follow conventional format

## 🎯 What to Contribute

### Priority Areas

- **New scanning engines** (ClamAV, custom heuristics)
- **Framework adapters** (Fastify, Hapi, etc.)
- **Performance optimizations**
- **Documentation improvements**
- **Bug fixes and edge cases**

## 🔒 Security Contributions

Security is paramount for pompelmi. If you find a security vulnerability:

1. **DO NOT** open a public issue
2. **Create a private security advisory** on GitHub
3. **Include** detailed steps to reproduce
4. **Wait** for maintainer response before disclosure

## Code of Conduct

### Our Pledge

In the interest of fostering an open and welcoming environment, we as
contributors and maintainers pledge to making participation in our project and
our community a harassment-free experience for everyone, regardless of age, body
size, disability, ethnicity, gender identity and expression, level of experience,
nationality, personal appearance, race, religion, or sexual identity and
orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment
include:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

* The use of sexualized language or imagery and unwelcome sexual attention or
advances
* Trolling, insulting/derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or electronic
  address, without explicit permission
* Other conduct which could reasonably be considered inappropriate in a
  professional setting

### Our Responsibilities

Project maintainers are responsible for clarifying the standards of acceptable
behavior and are expected to take appropriate and fair corrective action in
response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or
reject comments, commits, code, wiki edits, issues, and other contributions
that are not aligned to this Code of Conduct, or to ban temporarily or
permanently any contributor for other behaviors that they deem inappropriate,
threatening, offensive, or harmful.

### Scope

This Code of Conduct applies both within project spaces and in public spaces
when an individual is representing the project or its community. Examples of
representing a project or community include using an official project e-mail
address, posting via an official social media account, or acting as an appointed
representative at an online or offline event. Representation of a project may be
further defined and clarified by project maintainers.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by contacting the project team at [INSERT EMAIL ADDRESS]. All
complaints will be reviewed and investigated and will result in a response that
is deemed necessary and appropriate to the circumstances. The project team is
obligated to maintain confidentiality with regard to the reporter of an incident.
Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good
faith may face temporary or permanent repercussions as determined by other
members of the project's leadership.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 1.4,
available at [http://contributor-covenant.org/version/1/4][version]

[homepage]: http://contributor-covenant.org
[version]: http://contributor-covenant.org/version/1/4/