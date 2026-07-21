# Tech Stack Decisions — experiment-contract-provenance

## Source constraints

`business-logic-model.md` のpure TypeScript contract、`business-rules.md` のclosed parser / dispatcher、`requirements.md` のdeterminism / blind provenance、`technology-stack.md` のcurrent stackを維持する。新しいruntime、database、queue、cloud serviceは追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Runtime | Bun 1.3.13 | repository既定のCLI / test runtime |
| Language | TypeScript ESM | closed discriminated unionとport contractを既存styleで表現 |
| Hash / bytes | `node:crypto` SHA-256、UTF-8 | 外部dependencyなしのcontent identity |
| Provenance store | U1 injected port + `node:fs` filesystem adapter | authoring event ledgerのownershipをU1に保ち、same-directory temp / flush / atomic rename / directory syncをadapterで閉じる |
| Unit tests | `bun:test` | repository既定、Result / state transitionを直接検査 |
| Property tests | fast-check 4.9.0 | canonicalization、parser、event sequenceの生成検査 |
| Static checks | TypeScript 6.0.3 / Biome 2.4.16 | current repository checkを変更しない |

## Rejected additions

database / ORM、message queue、web framework、OAuth SDK、cloud secret manager、別hash library、dynamic plugin frameworkを採用しない。U1はlocal single-process contractで、これらはclosed experiment scopeを広げ、determinismとblind input allowlistを弱めるためである。

## Version and packaging constraints

versionsはrepository lockfileを正本とし、本Unitのためにdependency versionを変更しない。source / testは既存TypeScript package境界へ置き、6 harness packaging面へruntime-specific forkを作らない。generated identity schemaには明示versionを持たせ、既存versionを黙って再解釈しない。

## Verification

import scanで新規runtime dependency、network client、database / queue packageが0件であることを確認する。`bun test`、typecheck、Biome、package checkの既存commandで検査し、環境にtoolが欠ける場合は成功へ丸めずmachine-readable failureとして記録する。
