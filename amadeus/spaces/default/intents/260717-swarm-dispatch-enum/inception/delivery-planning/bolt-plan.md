# Bolt Plan — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Bolt 列(3 Bolt = UG 3 Unit の 1:1 写像、直列)

| Bolt | Unit | 内容(unit-of-work.md より) | 概算行数レンジ | 完了条件(受け入れ) |
|---|---|---|---|---|
| 1 | driver-contract-core | C1 三値契約+resolve+C2 audit 追随+契約テスト | 165-305 | decision table 全セル green / 副作用ゼロ negative / ultracode 残存 0 / t134・t135・t207・t211・t28 green / local lcov 未カバー 0 |
| 2 | harness-wiring | C3〜C5 の SKILL/emit/onboarding 三値化+headless 撤去+t181 parity・journey 追随 | 90-190 | t181 一致 / codex source の headless floor 記述 0 / Kiro 系旧 `1` 記述 0 |
| 3 | docs-and-parity | C6 docs 同期+C8 dist/self-install 再生成 | 40-80(+生成物) | docs 表=FR-1 一致 / opencode・cursor 1行実在 / dist:check・promote:self:check green |

- 各 Bolt = 1 ブランチ+1 PR(スカッシュ、Bolt スラッグ命名)+ deslop + push 前 local lcov(既決運用)
- walking-skeleton: `team-practices.md` の既決(greenfield 要素なしの加算は ceremony 比例縮小)により skeleton Bolt は設けない。Bolt 1 から通常実行 — Construction 進入自体がユーザー決定(既決)で、Bolt 1 出荷後に org 既定の autonomy ladder(自律継続 or 全 Bolt ゲート)をユーザーへ諮る
- 検証コマンド(全 Bolt 共通): `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`

## 順序の根拠

`unit-of-work-dependency.md` の bolt_dag(runtime compile 済み・非 null 3 units 確認済み)そのまま。並行実装なし(直列依存 — c6 交差判定は UG で非交差確認済みだが依存が直列のため並行化しない)。
