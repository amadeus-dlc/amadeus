# Business Rules — u003-kanban-hooks

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | QueueHook はローカルファイル追記だけを行う。ネットワーク・child process を持たない | FR-5.1 / N2 / C05 |
| BR-2 | FlushHook の自動実行は `--dirs`（キューに載った dirName）だけ。`*` は drop 記録に落とし、`--all` を自動実行しない | D-AD11 |
| BR-3 | 2 分抑制はハードコード定数。worktree ローカルで、目的は同一セッションの連続起動抑止だけ | FR-5.2 |
| BR-4 | hook はどんな失敗でも exit 0 で終わり、drop 記録（drops.log、hooks-health と同型）を残す | FR-5.4 |
| BR-5 | flush 失敗時は queue を残す（次回 flush で再試行 = 回復経路） | FR-4.2、受け入れ条件 5 |
| BR-6 | hook の実体は `dev-scripts/kanban/hooks/` に置き、`.claude/settings.json`（非 symlink）から直接指す。`.claude/hooks/`（Amadeus 本体への symlink）には置かない | D-AD9 / C02 |
| BR-7 | 結線は PostToolUse（QueueHook）と Stop / SessionEnd（FlushHook）の 3 箇所だけに追加し、既存 hook 設定を変更しない | FR-5.3 |
| BR-8 | PROJECT_DIR は CLAUDE_PROJECT_DIR 環境変数を最優先で解決し、process.cwd() を信用しない。settings 結線は絶対パス形式 | 既存 hook 規約（resolveProjectDirFromHook） |
| BR-9 | flush は queue を rename（queue.processing）で専有してから処理する。実行中の新規追記は次回 flush が拾う | TOCTOU 対策 |
| BR-10 | 子プロセス実行は timeout 60 秒。超過は失敗扱い（drop 記録 + 再試行）で、hook がセッション終了を止めない | amadeus-stop.ts の timeout 流儀 |

## 検証の分担

BR-1 / BR-2 / BR-3 / BR-5 / BR-8 / BR-9 は TDD の自動検証対象（stdin fixture → queue / drops / 起動判定の純関数部、rename 専有と孤立回収の挙動）。queue / drops.log の書き込み値が dirName と定型理由文字列に限られること（秘匿値非混入）も書式テストで確認する。
BR-6 / BR-7 は settings.json の diff レビューで担保する。
BR-4 の「常に exit 0」は hook エントリポイントの検証で確認する。
