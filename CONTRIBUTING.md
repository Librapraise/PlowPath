# Contributing to PlowPath

Thank you for your interest in contributing to PlowPath! We are building a robust, production-grade real-time snow plowing optimization system. To ensure high code quality, consistency, and clean git history, please read and follow these guidelines.

---

## 1. Codebase Structure

PlowPath is organized as a monorepo containing three core workspaces:

- `backend/`: Node.js Express API using PostGIS, Redis, Socket.io, and Jest for testing.
- `web-dashboard/`: React SPA with Vite, Leaflet maps, and Tailwind CSS.
- `mobile/`: React Native mobile application for plowing vehicle drivers.

---

## 2. Git Branching Model & Workflow

We follow a clean, structured git branching workflow:

### Branch Naming Conventions
- `feature/` or `feat/` for new features (e.g., `feat/offline-stop-queue`).
- `bugfix/` or `fix/` for bug fixes (e.g., `fix/jwt-expiration-handling`).
- `chore/` or `refactor/` for engineering hygiene, configuration, or refactorings (e.g., `chore/ci-integration`).

### Development Process
1. **Branch out** from the latest `main` branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/my-new-feature
   ```
2. **Commit often** with descriptive message titles following standard Angular conventional commits (e.g., `feat(mobile): add offline-first stop sync queue`).
3. **Keep branches updated** by regularly rebasing or merging `main` into your local feature branch to resolve conflicts early.

---

## 3. Pull Request Guidelines

Before submitting your Pull Request (PR) for review:

1. **Verify Builds & Linting**:
   Ensure all three workspaces typecheck and lint without errors.
   - **Backend**: `cd backend && npm run lint && npm run typecheck`
   - **Web**: `cd web-dashboard && npm run lint && npm run typecheck`
   - **Mobile**: `cd mobile && npm run lint && npm run typecheck`
2. **Execute Tests**:
   Ensure all automated backend tests pass successfully:
   - Run `npm test` inside the `backend/` directory.
3. **PR Description template**:
   Include a short summary of the changes, verification steps taken, and references to any issues resolved (e.g., `Closes #143`).

### Merging & Squash Guidelines
- We enforce **Squash and Merge** for all PRs.
- This compresses all intermediary commits in a feature branch into a single clear, conventional commit on the `main` branch to keep the history readable.
- Ensure the squashed commit message adheres to Conventional Commits: `<type>(<scope>): <subject>` (e.g., `feat(backend): implement deep database and redis healthchecks`).

---

## 4. Coding Standards & Best Practices

### Typescript & Type Safety
- **Strict Typing**: Avoid using `any` wherever possible. Define explicit interfaces and return types for functions.
- **Zod Schemas**: Use Zod in the backend to validate all HTTP payloads at the boundary before they enter controllers.

### Error Handling & Resilience
- **Robust Interceptors**: In both the web dashboard and mobile workspace, utilize the Axios 401 response interceptor. Ensure token refreshes block subsequent calls to prevent parallel refresh requests.
- **Offline Integrity**: For mobile driver tracking features, implement offline queuing (`AsyncStorage` + connection monitors) so that drivers can record plowing events regardless of cell coverage.
- **Crash Safety**: React components should be wrapped in high-quality Class-based `<ErrorBoundary>` wrappers.

### Formatting & Style
- Standard ESLint rules are configured per workspace. Make sure your editor auto-fixes code style on save.
