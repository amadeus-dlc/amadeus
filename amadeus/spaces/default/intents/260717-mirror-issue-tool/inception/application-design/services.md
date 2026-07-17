# Services — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## サービス構成

新規サービス(デプロイ可能プロセス)は **なし** — 本ツールは短命 CLI プロセスであり、常駐・デプロイ面を持たない(N/A の反証可能根拠: requirements FR-1 は CLI 契約のみを定義し、デプロイ基盤は project.md「デプロイ基盤は持たず」)。

## 外部サービス境界

| 外部 | 経路 | 契約 |
|---|---|---|
| GitHub(Issues) | gh CLI(C4 gh-gateway 経由のみ) | 認証は gh keyring 委譲。失敗は stderr 透過+exit 1(NFR-2)。scripts/ 限定境界(C-R1) |
