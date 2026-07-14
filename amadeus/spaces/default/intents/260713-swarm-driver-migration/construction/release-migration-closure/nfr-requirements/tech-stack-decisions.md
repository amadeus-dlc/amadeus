# Release & Migration Closure Tech Stack Decisions

## 上流とbrownfield制約

本成果物はU-06の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、CodeKB `technology-stack.md`を消費する。release closureは既存Bun/TypeScript、package/self-install scripts、Git/GitHub Actions、authenticated GitHub publisher surfaceを組み合わせ、新しいservice、database、cloud SDKを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| checker | TypeScript ESM + repository既定Bun | existing core/tool/test/package parity |別runtime、hosted service |
| input/provenance | fixed versioned manifest + canonical SHA digest | self-reference防止、same-tree binding | full repo heuristic、mtime |
| registry | production composition root + public `forDriver` | fake/source regexでなく実assembly検証 | regex/file-existence only |
| projection | existing `scripts/package.ts --check`、`scripts/promote-self.ts --check`、setup offline fixture | source/generated/self-install parity | generated direct edit |
| docs | source docs manifest + semantic ID checker |表現自由度とcontract coverageを両立 | byte match、generated docs正本 |
| tests | existing `bun:test`/runner、typecheck/Biome/complexity、GitHub Actions Linux | current CI/test strategy維持 | new test framework |
| live evidence | provider Unit sealed JSON summary/index + driver別transport/capture/resource receipt | ownership/redactionとprocess lifecycle維持 | raw PTY/JSONL trace reparse、ready signal単独、CI live requirement |
| Issue | existing authenticated GitHub publisher、fixed repo/marker、全page検索、single-writer ensure | idempotent external trackingと重複false green防止 | new GitHub SDK、partial search、auto reopen/delete |
| report | closed versioned JSON、canonical findings/digests | deterministic immutable closure | mutable dashboard/database |
| dependencies | node標準API + existing repository modules、runtime package 0件追加 | supply-chain最小化 | cache/database/schema package |

## Placement and ownership

- authored closure checker、manifest、docs/coverage schemasは`packages/framework/core/`または既存release tool配置へ置く。
- 4 harness projectionは`packages/framework/harness/`を正本とし、`dist`/self-installを直接編集しない。
- provider live producer/parser、selector、checkpoint、refereeをU-06へ複製せず、sealed summaryだけを参照する。
- GitHub Actionsは既存CI/release workflowへdeterministic receiptを追加し、credentialed provider liveをCI secretへ移さない。
- migration Issue URLはsource docsへ反映してからpackage/checkし、0.2.0削除自体は実装しない。

## Security, portability, and operations

macOS local receiptとGitHub Actions Linux receiptを同じtree/SHAへ束縛する。Windows jobや未検証success表現を追加せず、既存Windows専用codeを目的なく変更しない。

GitHub/provider credentialは既存process envだけで使用し、Issue body、receipt、report、live indexへ保存しない。操作signalはblocked finding、receipt digest、transport/capture/resource variant、process terminal、workflow run SHA/conclusion、Issue referenceを使い、新telemetry backendを追加しない。

## Decision consequences

all-domain same-tree closureは一部receiptだけを古いcandidateから流用できないため再実行コストがあるが、stale/fake proofによる誤releaseを防ぐ。Issue競合を自動修復しないためhuman resolutionが必要になる場合があるが、重複作成や意図しないreopen/deleteを避けられる。
