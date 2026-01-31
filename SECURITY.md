# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FamilyHub, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly with details of the vulnerability
3. Include steps to reproduce the issue if possible
4. Allow reasonable time for the issue to be addressed before public disclosure

## Security Practices

This project follows security best practices to protect user data and prevent common vulnerabilities.

### Input Validation

All user inputs are validated using [Zod](https://zod.dev/) schemas before processing:

- Username: Alphanumeric and underscores only, 3-30 characters
- Password: 8-100 characters with confirmation matching
- Form fields: Type-checked and sanitized at the validation layer

### XSS Prevention

- No use of `dangerouslySetInnerHTML`
- No direct DOM manipulation with `innerHTML`
- React's automatic escaping handles all text content

### Authentication

- JWT tokens used for API authentication
- Tokens stored in localStorage (standard SPA pattern)
- **Production recommendation:** Configure backend to use httpOnly cookies

### Environment Variables

Sensitive configuration is managed through environment variables:

- Never commit `.env` files (only `.env.example` with placeholders)
- API URLs and feature flags configured via `VITE_*` variables
- See `.env.example` for required variables

> **Warning:** Any variable prefixed with `VITE_` is embedded into the client bundle and exposed to users. Never place secrets (API keys, private tokens, database credentials) in `VITE_*` variables.

### Dependencies

- Regular dependency audits via `npm audit`
- Dependabot enabled for automated security updates
- Only trusted, well-maintained packages used

## For Contributors

### Before Committing

1. **Never commit secrets** - API keys, passwords, tokens, or private keys
2. **Use environment variables** - For any configurable or sensitive values
3. **Run the linter** - `npm run lint` catches many security issues
4. **Check for PII** - Don't include real names, emails, or personal data in test fixtures

### Pre-commit Hooks

This repository uses Husky with pre-commit hooks that run lint-staged for code quality.

### Secret Scanning

This repository has GitHub Secret Scanning and Push Protection enabled, which automatically blocks pushes containing detected secrets (API keys, tokens, credentials) before they reach the repo.

### Code Review Checklist

When reviewing PRs, verify:

- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user-provided data
- [ ] No `dangerouslySetInnerHTML` or `innerHTML` usage
- [ ] Environment variables used for configuration
- [ ] Test data uses generic/fake information

## Architecture Security Notes

### Mock Authentication (Development Only)

The mock API (`src/api/mocks/auth.mock.ts`) stores passwords in plaintext for development convenience. This is:

- Clearly documented in the code
- Only active when `VITE_USE_MOCK_API=true`
- Never used in production builds

### Content Security Policy

CSP headers should be configured at the server/hosting level, not in the frontend. When deploying:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

### HTTPS

Always serve the application over HTTPS in production to protect:

- Authentication tokens in transit
- User data from interception
- API requests from tampering
