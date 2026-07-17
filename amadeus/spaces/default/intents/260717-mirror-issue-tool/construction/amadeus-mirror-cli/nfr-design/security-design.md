# Security Design — amadeus-mirror-cli

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 機構写像(security-requirements S-1〜S-4 → 実装機構)

| 要求 | 機構 |
|---|---|
| S-1 トークン非保持 | コード・state・ログにトークンを書く経路を持たない(gh keyring 委譲)。GhResult の stderr 透過は gh の出力のみ |
| S-2 インジェクション排除 | spawnGh は cmd 配列 `["gh", ...args]` 固定でシェルを経由しない(ADR-2)。args に文字列連結で外部値を埋めない |
| S-3 境界検証 | parseArgs が未知サブコマンド/フラグを usage 拒否(exit 2、business-logic-model.md のエラー分類 error/usage 経路)。--intent 値は recordDirMatches で実在照合(不在は SnapshotOutcome.error) |
| S-4 認可委譲 | gh の失敗(403 等)は GhResult.error として透過 exit 1 — 権限昇格・リトライ経路なし |

## 検証設計

- 前提: 実装言語・spawn 原語は tech-stack-decisions.md の既決(Bun.spawnSync)に従う。performance-requirements.md / scalability-requirements.md / reliability-requirements.md と独立に、本書はセキュリティ面のみを扱う
- unit: parseArgs の未知値拒否。integration: fake GhRunner が受け取る引数配列の形状固定(文字列連結混入の検出)
