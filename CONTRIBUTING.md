# Contributing to FHE Cipher Notes

Thank you for your interest in contributing to FHE Cipher Notes! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Testing Guidelines](#testing-guidelines)
- [Code Style](#code-style)
- [Security Considerations](#security-considerations)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

### Key Principles
- **Respect**: Be respectful to all contributors and users
- **Collaboration**: Work together constructively
- **Security**: Prioritize security in all cryptographic implementations
- **Quality**: Maintain high standards for code and documentation

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.x or higher
- **npm**: Version 7.x or higher (comes with Node.js)
- **Git**: Latest stable version
- **Wallet Extension**: MetaMask, Rainbow, or similar

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MirandaBaker/fhe-cipher-notes.git
   cd fhe-cipher-notes
   ```

2. **Install dependencies**:
   ```bash
   # Install root dependencies
   npm install

   # Install UI dependencies
   cd ui
   npm install
   cd ..
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start local development**:
   ```bash
   # Terminal 1: Start blockchain network
   npm run node

   # Terminal 2: Deploy contracts
   npm run deploy

   # Terminal 3: Start frontend
   cd ui && npm run dev
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Development Workflow

### Branching Strategy

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: Feature branches
- **`bugfix/*`**: Bug fix branches
- **`hotfix/*`**: Critical fixes for production

### Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing related changes
- `chore`: Maintenance tasks

**Examples**:
```
feat(auth): add user registration endpoint
fix(encryption): resolve ChaCha20 key derivation bug
docs(readme): update deployment instructions
```

### Pull Request Process

1. **Create a feature branch** from `develop`
2. **Make your changes** following the guidelines below
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Run the full test suite** locally
6. **Create a pull request** with a clear description
7. **Request review** from maintainers
8. **Address feedback** and make necessary changes
9. **Merge** after approval

## Submitting Changes

### Before Submitting

Ensure your changes meet these criteria:

- [ ] Code compiles without errors
- [ ] All tests pass (`npm test`)
- [ ] Code follows the established style guidelines
- [ ] Documentation is updated for API changes
- [ ] Security implications have been considered
- [ ] Performance impact is acceptable

### Pull Request Template

Please use the following template for pull requests:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe the testing performed:
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

## Security Considerations
- [ ] Security impact assessed
- [ ] No sensitive data exposure
- [ ] Cryptographic operations validated

## Additional Notes
Any additional information or context.
```

## Testing Guidelines

### Test Coverage Requirements

- **Smart Contracts**: >95% coverage
- **Frontend Components**: >80% coverage
- **Integration Tests**: All critical user workflows

### Test Categories

1. **Unit Tests**:
   - Individual function/component testing
   - Mock external dependencies
   - Fast execution (< 100ms per test)

2. **Integration Tests**:
   - Component interaction testing
   - API endpoint testing
   - End-to-end encryption workflows

3. **End-to-End Tests**:
   - Full user journey testing
   - Multi-user collaboration scenarios
   - Production environment simulation

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/FHECipherNotes.ts

# Run UI tests
cd ui && npm test
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Strict type checking enabled
- Use meaningful variable and function names
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promises for readability

### Solidity

- Follow official Solidity style guide
- Use NatSpec documentation for all public functions
- Implement proper access controls
- Gas optimization considerations
- Comprehensive input validation

### React Components

- Functional components with hooks
- Proper TypeScript typing
- Custom hooks for shared logic
- Consistent naming conventions
- Proper error boundaries

### File Structure

```
contracts/          # Smart contracts
  FHECipherNotes.sol

deploy/            # Deployment scripts
  deploy.ts

test/              # Test files
  *.ts

ui/src/            # Frontend source
  components/      # React components
  utils/           # Utility functions
  hooks/           # Custom hooks
  config/          # Configuration files
```

## Security Considerations

### Cryptographic Security

- **Never** log or expose encryption keys
- **Always** validate cryptographic inputs
- **Regularly** audit cryptographic implementations
- **Consider** side-channel attacks and timing attacks

### Smart Contract Security

- **Access Control**: Implement proper authorization
- **Input Validation**: Validate all inputs thoroughly
- **Reentrancy Protection**: Guard against reentrancy attacks
- **Gas Limits**: Consider gas costs in loops and operations

### Frontend Security

- **XSS Prevention**: Sanitize user inputs
- **CSRF Protection**: Implement proper request validation
- **Secure Storage**: Never store sensitive data in localStorage
- **Dependency Updates**: Keep dependencies updated

## Documentation

### Code Documentation

- **Functions**: Document purpose, parameters, and return values
- **Components**: Document props and usage
- **Complex Logic**: Explain algorithmic decisions
- **Security**: Document security assumptions and considerations

### API Documentation

- **OpenAPI/Swagger**: For REST API endpoints
- **NatSpec**: For smart contract functions
- **TypeScript**: Self-documenting through types
- **README**: Comprehensive project documentation

### Updating Documentation

When making changes that affect users or developers:

1. Update relevant README sections
2. Update API documentation
3. Add migration guides for breaking changes
4. Update CHANGELOG.md

## Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussion
- **Documentation**: Check the README and docs folder first

### Issue Reporting

When reporting issues, please include:

- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Environment information (OS, Node version, etc.)
- Relevant code snippets or error messages

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for significant contributions
- GitHub repository contributors list
- Project documentation acknowledgments

Thank you for contributing to FHE Cipher Notes! 🚀
