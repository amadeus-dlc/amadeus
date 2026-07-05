# Code Summary — u002-kanban-sync-cli（B002、walking skeleton）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-rules.md](../functional-design/business-rules.md)

## 変更内容

| ファイル | 内容 | 対応 |
|---|---|---|
| `dev-scripts/kanban/scan.ts` | IntentScanner + ColumnMapper。凡例コメント非誤検知（行頭 `- [?] ` アンカー）、host は shard 本文 Timestamp 最大・legacy 除外、欠損は 未確認 で継続 | FR-2.1〜2.3、C-1/C-2 契約 |
| `dev-scripts/kanban/board.ts` | ProjectsClient。scope 検査、project 解決（作成しない）、ensureFields（option 完全セット再送）、listItems（ページング）、draft issue upsert + alias 束ね mutation | FR-3.1〜3.7、FR-4.1、C-3 契約、D-AD1/D-AD4 |
| `dev-scripts/kanban-sync.ts` | CLI。`--all`（メインリポジトリ限定、worktree 拒否 = D-AD11）と `--dirs`（部分 sync）。失敗は 1 段落エラー + 非 0 exit | FR-3.4、FR-4.2、C-4 契約 |
| `dev-scripts/kanban/{intent-card,column,project-ref,status-option,field-spec,field-map}.ts` | 型定義（lint 規約: 1 ファイル 1 public type） | — |
| `dev-scripts/evals/kanban-sync/check.ts` | 決定論的検証 30 件（ネットワークなし） | C08（TDD） |
| `package.json` | `test:it:kanban-sync` 結線、`kanban:sync` 入口 | 検証結線 |

## TDD の記録

- RED: モジュール不在で check.ts が失敗することを確認。
- GREEN: 30 検査 ok。CLI ガード（usage、worktree の `--all` 拒否）は実行して確認。
- REFACTOR: lint 対応の型分割後も全検査 ok、`npm run test:all` exit 0。

## US-2〜US-5 との対応

- US-2 / US-3 / US-4 のフィールド・列・鮮度はコードとして実装済み。board 実表示の確認（受け入れの最終確認）は E1 / E2 の人間操作後に `npm run kanban:sync` で行う（walking skeleton gate = Bolt PR の人間承認）。
- US-5（認証不備の明示失敗）は assertProjectScope / resolveProject の明示エラーとして実装し、worktree 拒否と usage は実機確認済み。
