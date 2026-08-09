// Self-development project guidance is harness-owned but not a distribution
// surface. Root CLAUDE.md is a tracked projection of this prefix followed by
// .claude/CLAUDE.md; promote-self validates that projection without writing it.
export const PROJECT_INSTRUCTIONS = `To avoid collisions with other agents, always create a dedicated worktree and branch and switch to them before starting work.

## Project Instructions

- Communicate with the user in Japanese.
- Write documentation in English by default.
- As an exception, write \`amadeus/**/*.md\` in Japanese.
- Write code comments in English.
- Write commit messages in English.
- If you find violations of these language rules while working, fix them as part of the same change.

### Fable 5 Delegation Policy

To avoid hitting the Fable 5 rate limit prematurely, reserve the main session for
requirements clarification, design, planning, audits, reviews, and final integration
decisions. During implementation, delegate well-scoped execution tasks to subagents
whenever the expected resource savings exceed the coordination overhead:

- Use Sonnet for routine implementation with clear boundaries.
- Use Opus for complex or high-risk implementation that requires stronger reasoning.
- Use Fable 5 directly for exceptionally difficult or tightly coupled work that
  cannot be delegated safely or efficiently. Keep small, well-scoped tasks in the
  main session when delegation overhead would exceed the expected resource savings.

Every delegation prompt must define the scope, owned files, acceptance criteria,
and verification steps. Assign non-overlapping write scopes. The Fable 5 main
session remains responsible for reviewing the complete diff, confirming final
verification, and deciding whether the integrated result is acceptable.

`;
