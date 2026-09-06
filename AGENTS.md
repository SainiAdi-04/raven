# AGENTS.md

## Issue Implementation Workflow

When implementing an issue (e.g. via `/implement <issue>`):

1. **Write and Test Code (Uncommitted)**:
   - Implement the necessary changes for the issue in a feature branch.
   - Run tests and verify functionality.
   - **Do NOT commit** before explicit user approval. Keep all changes uncommitted in the working tree.

2. **Present Code for Review**:
   - Show the exact changes/diff to the user.
   - Summarize test verification and results.
   - Explicitly request user approval of the code changes.

3. **Commit Only After Approval**:
   - Only create the git commit after the user explicitly approves the presented changes.

4. **Raise Pull Request**:
   - Push the branch and open a GitHub Pull Request linking the issue (e.g. `Resolves #<issue>`).
   - The user will merge the PR before proceeding to the next ticket.

## Project Guidelines

- **Domain Model**: Adhere to the canonical terms defined in [`CONTEXT.md`](./CONTEXT.md).
- **Architecture**: Respect architectural decisions recorded in [`docs/adr/`](./docs/adr/).
- **Tooling & Tasks**:
  - Run tests: `deno test`
  - Run development: `deno task dev`
  - Compile binary: `deno task compile`
