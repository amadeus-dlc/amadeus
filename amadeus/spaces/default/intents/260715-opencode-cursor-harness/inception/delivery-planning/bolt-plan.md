# Bolt Plan — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)
上流入力: requirements.md(FR/AC)、application-design の components.md(C1〜C5)、units-generation の unit-of-work.md / unit-of-work-dependency.md(bolt_dag 実測済み)/ unit-of-work-story-map.md、team-practices.md(Way of Working 変更なし)。

## Bolt 列(Bolt = Unit 1:1、各 Bolt 1 PR スカッシュ)

| Bolt | Unit | 規模 | batch | ゲート | 主な完了条件 |
| --- | --- | --- | --- | --- | --- |
| 1 | opencode-skeleton | M | 1 | **walking-skeleton(単独ゲート)** | dist:check exit 0 / --version・--doctor 手動配置実測 / AC-2b 最小疎通(directive 受領1回)/ CI 基準 green |
| 2 | opencode-surface | M | 2 | ラダー選択に従う | AC-2a/2b/2c 完全実測、AGENTS.md/設定例/skills 合成、write⇔check 貫通 |
| 3 | cursor-port | L | 2 | 同上 | tool_name 語彙実測 → manifest+emit+アダプタ、AC-3a〜3d、dist:check exit 0 |
| 4 | verification-docs | M | 3 | 同上 | smoke test、README/harness guide(機能単位表)、installer 別 Issue+opencode hooks 将来 Issue 起票 |

- Bolt 1 出荷後に**ラダープロンプト**(自律継続 or 全ゲート)をユーザーへ提示し、`Construction Autonomy Mode` として永続化(org.md 既決)
- 各 Bolt の PR はレビュー READY 時に「Bolt ブランチ切り出し+PR 発行」を明示タスク化(bolt-pr-taskization)
- コード変更を含む Bolt のみ PR(全 Bolt がコード/テスト/docs 変更を含むため、本 intent に「コード変更なし Bolt」は現時点で存在しない — E-CS5 の解釈が必要になった場合は diary 記録+PM 再上程)

## 検証契約(全 Bolt 共通)

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0 + push 前ローカル lcov(diff 追加行未カバー 0)+ deslop + AC-4d core-neutrality grep(レビュー観点)。

## walking-skeleton マーカー

Bolt 1 = walking-skeleton。scope=amadeus は greenfield 要素(新 harness port・新配布ツリー)を含むため org.md 規律どおり単独ゲート(practices との矛盾なし — PRACTICES_OVERRIDE 不要)。
