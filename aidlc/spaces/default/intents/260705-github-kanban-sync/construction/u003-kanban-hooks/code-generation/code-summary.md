# Code Summary — u003-kanban-hooks（B003）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-rules.md](../functional-design/business-rules.md)

## 変更内容

| ファイル | 内容 | 対応 |
|---|---|---|
| `dev-scripts/kanban/hooks/kanban-queue.ts` | PostToolUse。TTY / parse ガード、Write・Edit のみ、default space の record → dirName、intents.json → `*`。ネットワーク・child process なし | FR-5.1、BR-1 / BR-8 |
| `dev-scripts/kanban/hooks/kanban-flush.ts` | Stop / SessionEnd。孤立回収（step 0.5）→ 2 分抑制 → rename 専有 → `*` は drop 化 → `--dirs` 部分 sync（timeout 60 秒）→ 成功で last-success、失敗で drop + 戻し。常に exit 0 | FR-5.2〜5.4、BR-2〜BR-5 / BR-9 / BR-10、D-AD11 |
| `.claude/settings.json` | PostToolUse / Stop / SessionEnd へ `bun $CLAUDE_PROJECT_DIR/dev-scripts/kanban/hooks/...` を追加（既存 hook 非変更） | FR-5.3、BR-6 / BR-7、D-AD9 |
| `.gitignore` | `/.claude/kanban-sync/` を追加 | 状態ファイル非コミット |
| `dev-scripts/evals/kanban-hooks/check.ts` | 決定論的検証 17 件（ネットワークなし）。`test:it:all` へ結線 | C08（TDD） |

## TDD の記録

- RED: モジュール不在で失敗を確認。
- GREEN: 17 検査 ok。実機スモーク（stdin → queue 追記、空 queue で exit 0）確認。多重スラッシュの実環境問題を検出し正規化 + 検査を追加。
- `npm run test:all` exit 0。

## US-6 との対応

- キュー記録と flush 起動、drop 回復、ネットワーク非接続（AC-4 の代理基準）を実装・検証済み。
- board への実反映を含む end-to-end は、B002 の人間操作（E1 / E2）完了後にセッション終了時の自動 flush で確認できる。
