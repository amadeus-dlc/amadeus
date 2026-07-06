# Code Generation Plan — u003-kanban-hooks（B003）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/kanban-hooks/check.ts` を追加。queueEntryFor（default space 限定、`*`、直下ファイル除外、多重スラッシュ正規化）、shouldSuppress（2 分）、splitQueueLines（uniq + `*` 分離）、搬送（孤立回収、失敗時の戻し）を検証し、モジュール不在で失敗することを確認する。
2. GREEN: `dev-scripts/kanban/hooks/kanban-queue.ts`（C-5）と `kanban-flush.ts`（C-6）を実装する。PROJECT_DIR は CLAUDE_PROJECT_DIR 優先（BR-8）、flush は rename 専有（BR-9）+ timeout 60 秒（BR-10）+ 常に exit 0（BR-4）。
3. 結線: `.claude/settings.json` の PostToolUse / Stop / SessionEnd へ絶対パス形式で追加（既存 hook は変更しない = BR-7）。`.gitignore` へ `/.claude/kanban-sync/` を追加。
4. 実機スモーク: QueueHook への stdin 流し込みで queue 追記を確認。FlushHook が queue 空で exit 0 を確認。
