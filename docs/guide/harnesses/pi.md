# AI-DLC on Pi Coding Agent

> Languages: **English** | [日本語](pi.ja.md)

Amadeus supports **Pi Coding Agent 0.83.0 or later** on macOS and Linux. The
Pi distribution uses Pi's native project skill and extension loading, while the
workflow engine, state machine, audit log, and swarm referee remain the shared
Amadeus core.

Pi project trust is an execution decision, not a sandbox. A trusted Pi package
or extension can execute arbitrary code with the permissions of the user who
started Pi, including access to that user's files, processes, network, and
available credentials. Review the source and the generated resource catalog
before granting trust. Amadeus never approves trust or edits Pi's trust store.

## Prerequisites

- macOS or Linux. Native Windows is not a formal-success target.
- [Pi Coding Agent](https://github.com/earendil-works/pi), package
  `@earendil-works/pi-coding-agent`, 0.83.0 or later.
  `0.82.x` and earlier are unsupported.
- Bun available on the non-interactive `PATH`.
- A provider and credentials configured in Pi. Amadeus does not ship, copy, or
  configure provider credentials.
- A Git project whose Amadeus source and generated Pi resources you have
  reviewed.

Check the two runtime versions before installation:

```bash
pi --version
bun --version
```

## Complete project installation with the setup CLI

This is the normal installation path. It installs the complete `dist/pi`
candidate into the project: `.pi/`, the project `AGENTS.md`, and the `amadeus/`
workspace shell. It also records an installer receipt used by Pi doctor.

```bash
bunx @amadeus-dlc/setup install \
  --harness pi \
  --target /absolute/path/to/project \
  --yes
cd /absolute/path/to/project
pi
```

`--yes` makes setup non-interactive; it does **not** approve Pi project trust.
At Pi's trust prompt, inspect the project-local `.pi` resources and decide
yourself. If trust was previously declined or has no applicable saved decision,
use Pi's `/trust` command and review the decision. Neither setup nor doctor
changes `trust.json`.

After trust is granted, verify the candidate:

```text
/skill:amadeus --doctor
```

The equivalent read-only shell check is:

```bash
bun .pi/tools/amadeus-utility.ts doctor
```

Doctor checks the supported OS, Bun, the Pi version floor, the applicable
native trust decision, the manifest-generated catalog and installer receipt,
and the catalogued skill, extension, and internal driver resources. Missing,
extra, modified, symlinked, non-regular, or hash-mismatched resources fail
closed. Follow the reported remediation; do not repair one file and then treat
the remaining candidate as verified.

## Native Pi package activation: local and Git sources

The repository root has a generated-from-manifest `pi` entry in `package.json`.
It exposes the Pi-native Amadeus extension and orchestrator skill through Pi's
[package mechanism](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md).

Use one of these project-local activation forms only after reviewing the
candidate:

```bash
# Local source: use a clean repository at a full commit identity.
pi install -l /absolute/path/to/amadeus

# Git source: use credential-free canonical HTTPS and a full 40-hex commit SHA.
pi install -l https://github.com/amadeus-dlc/amadeus.git@<full-commit-sha>
```

A local candidate is formally identifiable only when its worktree is clean and
`git rev-parse HEAD` returns the full commit SHA. A Git branch name, short SHA,
floating tag, credential-bearing URL, or mutable working tree is not a formal
Amadeus source identity.

Pi package activation is **not a replacement for the complete project
installation**. The package metadata activates only the declared native skill
and extension; Amadeus still requires the matching project-local `.pi/tools`,
internal drivers, generated catalog, `AGENTS.md`, `amadeus/` workspace shell,
and installer receipt from the same candidate. A package-only or mixed-revision
project must not be reported healthy and will fail doctor.

## Start and resume a workflow

From a trusted, verified project:

```text
/skill:amadeus Describe what you want to build
/skill:amadeus --status
/skill:amadeus --resume
```

Pi renders gates as numbered prose. Reply in Pi's normal interactive input with
the requested number or text. Only a native Pi `input` event whose source is
exactly `interactive` establishes a human turn. RPC input, extension-generated
input, tool output, and custom messages cannot answer a question or approve a
gate. Do not work around a stopped gate by editing state or audit files.

Pi has no built-in subagent primitive. During Construction, Amadeus uses its
packaged internal Pi RPC driver. Driver failure, lifecycle registration drift,
an unmatched tool lifecycle, or an ambiguous continuation blocks progression;
there is no silent manual-success fallback.

## Update

For a setup-managed project, stop active Pi sessions and run:

```bash
bunx @amadeus-dlc/setup upgrade \
  --harness pi \
  --target /absolute/path/to/project \
  --yes
```

The setup upgrade is transactional and preserves user-owned files according to
the installer manifest. Re-run doctor and review trust after the update.

For a project-local Pi package registration, `pi update --extensions` updates
unpinned packages. Amadeus Git candidates should remain pinned: move to a new
reviewed commit explicitly with `pi install -l <url>@<new-full-sha>`, then
upgrade the complete project distribution to the same candidate. Do not mix a
new package entry with old project-local runtime files.

## Uninstall

`@amadeus-dlc/setup` currently has no uninstall subcommand. Do not recursively
delete `amadeus/`: it contains version-controlled intent records, audit shards,
team memory, and knowledge. Preserve those records, then remove only reviewed
installer-owned paths using your VCS and
`amadeus/.installer/amadeus-setup-manifest.json` as evidence. Keep shared and
user-owned files unless the project owner explicitly decides otherwise.

Remove a project-local Pi package registration with the same source specifier:

```bash
pi remove -l /absolute/path/to/amadeus
pi remove -l https://github.com/amadeus-dlc/amadeus.git@<full-commit-sha>
```

`pi uninstall` is an alias for `pi remove`. Removing the package registration
does not remove setup-installed project files or the Amadeus workspace.

## Unsupported and fail-closed cases

- Pi earlier than 0.83.0, including `0.82.x`.
- Native Windows as a formal-success platform.
- Treating Pi project trust as isolation, auto-approving it, or modifying the
  trust store on the user's behalf.
- Treating a package-only activation, a mixed catalog, or changed resources as
  a complete healthy install.
- Supplying provider credentials in the distribution, source URL, installer
  metadata, logs, or documentation examples.
- Claiming a live provider journey passed when it was not actually run in the
  current environment.

For a failure, start with `/skill:amadeus --doctor`. If the catalog or receipt
is invalid, reinstall from a reviewed immutable source instead of loading the
changed extension or driver.
