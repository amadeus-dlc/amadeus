# Contributing to Amadeus

Thank you for your interest in contributing to Amadeus.
This document describes the licensing terms and the workflow for contributions.

[English](CONTRIBUTING.md) | [日本語](CONTRIBUTING.ja.md)

## Licensing of Contributions

Amadeus is dual-licensed under MIT OR Apache-2.0.
See [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE).

Each contributor, whether an individual or a company, keeps the copyright of their own contributions.
There is no copyright assignment and no CLA.

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in this project by you, as defined in the Apache-2.0 license, shall be dual-licensed under MIT OR Apache-2.0, without any additional terms or conditions.

## Developer Certificate of Origin

Every commit must be signed off to certify that you have the right to submit it under the project licenses, as defined by the [Developer Certificate of Origin](https://developercertificate.org/).

Add a `Signed-off-by` line to each commit.

```sh
git commit -s
```

Use a name and an email address you can be reached at.

## Workflow

- Before making a large change, open an issue that describes the scope, affected skills, expected artifacts, and validation plan.
- Base your branch on the latest `origin/main`.
- Verify your changes locally before opening a pull request.

```sh
npm run test:all
```

## Language Conventions

- `README.md` and this document are written in English, with Japanese counterparts.
- Markdown artifacts under `amadeus/**`, `skills/**`, and `.agents/skills/**` are written in Japanese.
