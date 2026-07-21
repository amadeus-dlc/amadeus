# Tech Stack Decisions — sealed-fixture-registry

## Constraints

`business-logic-model.md` のisolated Git proof / Registry ports、`business-rules.md` のclosed scan / immutable seal、`requirements.md` のblind / public-source境界、`technology-stack.md` のcurrent repository stackを維持する。database、cloud vault、remote fixture serviceは追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Runtime / language | Bun 1.3.13 / TypeScript ESM | current CLIとclosed Result unionを再利用 |
| Repository isolation | Git worktree / diff / tree identity | 同一baselineから1 fixture patchを独立実測 |
| Storage | `node:fs` immutable directories + flush / sync / atomic rename | seal / disclosure / promotionをdurableにpublish |
| Identity | `node:crypto` SHA-256 | patch / payload / receiptをcontent-address |
| Scanner | repository-local fixed rule-set adapter | 3分類とmanifest bijectionをversion固定 |
| Tests | `bun:test` + temporary repositories | proof / branch / crash / grant境界を実証 |

## Tool identity and paths

Git / Bun / scanner executableはrealpath、version、content / rule-set identityをfreezeする。GitはRegistry所有のempty system / global config、hooks無効path、`--no-ext-diff` / `--no-textconv`、`LC_ALL=C`、closed environmentで実行し、実効config key/value列のidentityをproofへ記録する。system / global / local config、hook、external diff / textconv、locale、PATH shadowingがidentity外から介入した場合は拒否する。worktree / payload / materialization pathはrepository-contained canonical pathへ限定し、shell stringへ再結合しない。external election store path / URIをscanner sourceとして許可しない。

## Rejected additions and checks

SQLite、object storage、cloud secret scanner、dynamic plugin discovery、arm direct-read APIを採用しない。import / diff scanで新規runtime dependency、network client、credential read 0件を確認し、既存typecheck / Biome / bun test / package checkを使う。Git config / hook / external-diff / locale改竄fixtureを含め、tool failureはzero findingへ丸めない。
