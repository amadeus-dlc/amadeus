上流入力(consumes 全数): unit-of-work, requirements

# Code Summary — kimi-hook-adapter

unit-of-work.md の U2 と requirements.md の FR-2/FR-7a の実装記録(code-generation-plan.md の全6ステップ完了)。

## 作成・変更ファイル

| ファイル | 内容 |
|---|---|
| `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` | 変換ロジック(parse-only・無状態・未知フィールド破棄・全経路 fail-open)。cursor-lib の shim+lib 分離踏襲 |
| `packages/framework/harness/kimi/hooks/amadeus-kimi-adapter.ts` | 薄い shim(core hook 不在でも exit 0) |
| `packages/framework/harness/kimi/manifest.ts` | harnessFiles に adapter/lib 追加(B1 open issue 解消) |
| `tests/fixtures/kimi-hooks/` | 実機 capture 12 件(全イベント種・手書き合成なし) |
| `tests/integration/t-kimi-adapter.test.ts` | 契約テスト 37 件(spawn spy + fixture 駆動) |
| `dist/kimi/` | 再生成(adapter/lib 配置済み) |

## 実機で確定した契約(12/12 イベント capture・kimi 0.28.1)

- envelope 共通: `{hook_event_name, session_id, cwd}`
- `tool_input.path`(Claude の `file_path` ではない)→ リネーム写像
- UserPromptSubmit の `prompt` は content-block 配列 → text 結合
- TodoList: `todos:[{status,title}]` → 最初の in_progress を TaskUpdate 形状へ
- SubagentStop: `agent_name`(agent_id なし)→ agent_type へ写像
- **Stop block = exit 2 + stderr**(reason がモデルに verbatim で届くことを実測)
- **SessionStart context 注入は 0.28.1 に不存在**(3形式を probe も全て不達。core session-start は副作用のみ)
- UserPromptSubmit の stdout plain text は注入可(0.28.1 で唯一の注入チャネル)

## 検証(conductor が再実行して裏取り)

- `bun test tests/integration/t-kimi-adapter.test.ts` → 37 pass / 0 fail(conductor 再実行でも 0 fail・106 expect)
- `bun scripts/package.ts kimi --check` → exit 0(conductor 再実行でも exit 0)
- `bun run typecheck` / `bun run lint` / `bun run dist:check` → 全て exit 0
- `bun tests/run-tests.ts --integration` → PASS(2994 assertions。worker 実行)
- Step 1 の config は probe 除去済み・`[[hooks]]` 14件を確認。CLI 0.28.1 自身の config 再シリアライズ(display_name 1行 + コメント除去)を実測

## 逸脱

- `routeTarget(target)` は payload 構成のため `routeTarget(target, env)` に具体化(高レベル記述の実装詳細)
- PostCompact イベントは Kimi に存在するが BR 表どおり配線対象外

## オープン事項(後続 Bolt へ)

1. **SessionStart 注入不在の代替**: UserPromptSubmit stdout(実測で注入可)を workflow context 表示の経路にする検討(B3/B4)
2. **kimi CLI が config を再シリアライズしてコメントを落とす**: B3 の managed block(マーカーコメント依存)に影響しうる — B3 で要実測・設計対応
3. `KNOWN_HARNESS_DIRS` への `.kimi-code` 追加は B4 で対応(script-path 導出で現状実害なし)
