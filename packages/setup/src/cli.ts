#!/usr/bin/env node
// Minimal placeholder entry point for @amadeus-dlc/setup.
//
// The real CLI (argument parsing, install/upgrade command flows) belongs to a
// later unit (U2). This stub only proves the build and bin wiring work
// end-to-end (FR-002): bunx/npx can resolve and run the published binary.

const HELP_TEXT = `amadeus-setup

Usage: amadeus-setup <command> [options]

This CLI is under construction. Commands will be added in a future release.
`;

process.stdout.write(HELP_TEXT);
process.exit(0);
