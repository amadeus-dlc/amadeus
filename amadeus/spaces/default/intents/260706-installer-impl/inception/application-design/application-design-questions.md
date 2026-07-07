# Application Design Questions — インストーラの実装

> Stage: application-design / Intent: `260706-installer-impl`  
> Interaction mode: Grill me  
> Upstream inputs: `requirements.md`, `stories.md`, `architecture.md`, `component-inventory.md`, `team-practices.md`, refined CLI/DX mockups

## Q0: Interaction Mode

This stage has ~3 questions to work through. How would you like to answer them?

- A. Guide me
- B. Grill me
- C. I'll edit the file
- D. Chat
- X. Other

[Answer]: B. Grill me

## Q1: Installer Package Internal Architecture

The installer must parse CLI flags, resolve GitHub tag archives, plan file operations, back up shared files, write a manifest, and verify the target. It also must avoid duplicating `scripts/package.ts` as a build system.

Which internal architecture should `packages/setup/` use?

- A. Hexagonal package: CLI shell + domain planning core + ports/adapters for filesystem, GitHub, archive extraction, prompts, and package metadata. (Recommended)
- B. Thin imperative CLI script: one command module that performs parsing, network, file planning, writes, and output directly.
- C. Reuse `scripts/package.ts` logic directly inside the installer and make the installer a wrapper around existing packaging.
- X. Other

[Answer]: A. Hexagonal package: CLI shell + domain planning core + ports/adapters for filesystem, GitHub, archive extraction, prompts, and package metadata.

## Q2: Distribution Metadata And File Classification

The installer needs required file lists, file classes (`owned`, `shared`, `user-preserved`), and md5 values to build plans and manifests. Requirements leave exact per-harness file lists to Functional Design.

Where should the application design place metadata ownership?

- A. A setup-side distribution metadata reader consumes metadata from the selected release archive when present, with a path-policy fallback derived from the selected `dist/<harness>/` tree for the first release. (Recommended)
- B. The installer infers all file classes from target paths at runtime, without source metadata.
- C. `scripts/package.ts` becomes responsible for emitting a complete installer metadata artifact and install fails if it is absent.
- X. Other

[Answer]: A. A setup-side distribution metadata reader consumes metadata from the selected release archive when present, with a path-policy fallback derived from the selected `dist/<harness>/` tree for the first release.

## Q3: Package And Repository Integration

The root package is dev-only, while `@amadeus-dlc/setup` must be independently publishable. CI and release workflows must validate the setup package without full repository layout normalization.

How should package/repo integration be designed?

- A. Add independent `packages/setup/package.json` and setup-specific scripts, while root stays dev-only and orchestrates CI/release checks by path. (Recommended)
- B. Convert root `package.json` into a workspace root with package manager workspaces and publish only `packages/setup`.
- C. Keep one root package and publish root as `@amadeus-dlc/setup`.
- X. Other

[Answer]: A. Add independent `packages/setup/package.json` and setup-specific scripts, while root stays dev-only and orchestrates CI/release checks by path.
