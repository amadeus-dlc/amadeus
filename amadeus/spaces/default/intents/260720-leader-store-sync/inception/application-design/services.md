# Services — 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, architecture, component-inventory, team-practices — 外部面の最小性は requirements.md NFR-1、gh/git の扱いは architecture.md 同定節と component-inventory.md の既存 runner 台帳、認証委譲は team-practices.md 参照の gh-scripts-boundary に依拠

## 外部サービス面

- **gh CLI(GhRunner port)**: `pr create` のみ(issue 系・merge 系は不使用 — auto-merge 不採用の意図的相違)。認証は gh keyring 委譲(トークン非保持、gh-scripts-boundary)。不在・未認証は loud exit 1。
- **git(GitRunner port)**: fetch / switch -c(main 起点)/ status --porcelain / checkout origin/main -- / add / commit / push。すべて no-shell の spawnSync(env: process.env 明示 — bun-spawn-env-snapshot)。
- **ファイルシステム**: elections/・audit シャード・memory 層の読取。書込はブランチ上の git 操作のみ(elections store 自体へは read-only — C-8)。

## 非サービス(明示)

- エンジン state/audit CLI は呼ばない(W-1)。選挙 CLI も呼ばない(W-2)— store は素の JSON として読む(様式は election-store の現行実物 — format-currency-grep-for-parser-intents 準拠で実装時に現世代 grep 確認)。
