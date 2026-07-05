# Code Generation Plan — u002-kanban-sync-cli（B002、walking skeleton）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/kanban-sync/check.ts` を追加。凡例コメント非誤検知、host 判定（Timestamp / legacy 除外）、列決定の全分岐、fixture スキャン（欠損・混在・--dirs）、GraphQL 引数生成（alias 束ね、option 完全セット、draft body）を検証し、モジュール不在で失敗することを確認する。
2. GREEN: `dev-scripts/kanban/scan.ts`（C-1/C-2）、`dev-scripts/kanban/board.ts`（C-3）、`dev-scripts/kanban-sync.ts`（C-4）を実装する。
3. ガード実機確認: usage エラーと worktree からの `--all` 拒否（D-AD11）を実行して確認する。
4. REFACTOR: lint（1 ファイル 1 public type）に合わせ、型を `intent-card.ts` / `column.ts` / `project-ref.ts` / `status-option.ts` / `field-spec.ts` / `field-map.ts` へ分割する。
5. 結線: `test:it:kanban-sync` を `test:it:all` へ、手動実行入口 `kanban:sync` を package.json へ追加する。

## 未消化（人間操作待ち）

board への実 sync（walking skeleton の実測）は E1（`gh auth refresh -s project`）と E2（org project「Amadeus Intents」作成 + repo リンク）の後に `npm run kanban:sync` で行い、人間が board を確認して Bolt PR を承認する（bolt-plan B002 の DoD）。
