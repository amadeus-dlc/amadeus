# Refined Mockups Questions — インストーラの実装

> Stage: refined-mockups / Intent: `260706-installer-impl`  
> Interaction mode: Grill me  
> Upstream inputs: `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, `team-practices.md`

## Q0: Interaction Mode

This stage has ~3 questions to work through. How would you like to answer them?

- A. Guide me
- B. Grill me
- C. I'll edit the file
- D. Chat
- X. Other

[Answer]: B. Grill me

## Q1: Developer Experience Artifact Shape

The rough mockups used terminal transcripts and flows, but they still contain the older `init` wording. Requirements supersede this with `install` and `upgrade`, with no `init` alias in the first release.

How should refined mockups represent the CLI/developer experience?

- A. Transcript-first mockups for `amadeus-setup install` and `upgrade`, with command output, prompts, summaries, and error states. (Recommended)
- B. Abstract sequence diagrams first, with transcripts only as examples.
- C. Implementation-oriented command spec only, no mock transcript layer.
- X. Other

[Answer]: A. Transcript-first mockups for `amadeus-setup install` and `upgrade`, with command output, prompts, summaries, and error states.

## Q2: Confirmation And Safety Pattern

The installer must be safe in both interactive and non-interactive use. The key UX tension is how much confirmation is required before file writes, especially around collisions, backups, and `--force`.

Which interaction pattern should the refined design use?

- A. Always show a pre-apply plan; interactive mode asks for confirmation, `--yes` suppresses prompts but not validation, and `--force` bypasses collision prompts while still requiring backups. (Recommended)
- B. Keep install terse and only show a detailed plan on upgrade.
- C. Make `--force` a destructive overwrite mode without backup, with a stronger warning.
- X. Other

[Answer]: A. Always show a pre-apply plan; interactive mode asks for confirmation, `--yes` suppresses prompts but not validation, and `--force` bypasses collision prompts while still requiring backups.

## Q3: Output Density And Accessibility

The CLI should be human-readable, testable, and usable in CI logs and screen readers. The rough mockups used tables and terse progress lines.

Which output style should be the default?

- A. Plain-text, line-oriented output with compact tables only for file-operation summaries, explicit words for state, and no color-only meaning. (Recommended)
- B. Rich TTY output with spinners, colors, and icons, falling back only when non-TTY is detected.
- C. JSON-first output for automation, with human output as a wrapper.
- X. Other

[Answer]: A. Plain-text, line-oriented output with compact tables only for file-operation summaries, explicit words for state, and no color-only meaning.
