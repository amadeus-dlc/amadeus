# build-test results（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 実行記録（fresh、2026-07-06、rebase 追従後 origin/main = 29f3122c 基点）

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査（build 相当） | `npm run typecheck` | pass（test:all 内で実行、exit 0） |
| unit 相当（eval 10 系列） | `npm run test:it:model-overlay` | pass（`model-overlay eval: ok`、37+ 検査全件） |
| 統合 1: 宣言一致 | `npm run models:check` | pass（`model overlay check: ok`） |
| 統合 2: parity | `npm run parity:check` | pass（`parity check: ok（39 skills、199 engine files）`） |
| 統合 3: promote 全 skill | `npm run test:it:promote-skill` | pass（`promote skill eval: ok`、実 repo への差分なし） |
| 統合 4: 標準検証 | `npm run test:all` | pass（exit 0、typecheck 〜 diff:check 全チェーン） |
| 構造検証 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-model-overlay` | pass |

## 検出力の証跡（恒真でないことの確認）

- 遡及 RED 1: bootstrap 時 base 未記録バグ — 旧ロジック復元で (b regression) が FAIL、修正で GREEN（code-summary.md 記録）。
- 遡及 RED 2: promote フックの fail-soft — 修正前ロジック復元で (j-ii) が crash で FAIL、修正で GREEN。
- 遡及 RED 3: redirect スキップ条件 — 条件を外した退行版で (j-i) の警告不在検査が FAIL（exit 1）、復元で GREEN（conductor が独立実施）。
- 手動独立検証: modelOverride を管理外値（sonnet）へ改変 → apply 非ゼロ拒否 + base 不変、parity 1 件差分検出、復元後 models:check ok（conductor 実施）。

## 実適用の状態

- `.agents/amadeus/agents/amadeus-architect-agent.md` / `amadeus-design-agent.md`: `modelOverride: fable`（frontmatter 1 行のみの差分）
- `dev-scripts/data/model-overrides.json`: 両 agent の `base: "opus"` 記録済み、`fallbacks: {"fable": "opus"}`
