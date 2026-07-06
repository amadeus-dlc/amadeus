# Domain Entities — model-overlay

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実体と責務

| 実体 | path | 責務 | parity |
|---|---|---|---|
| overlay 設定 | `dev-scripts/data/model-overrides.json` | 宣言（agent → model）、base 記録、fallbacks、fallback 発動記録 | 対象外（dev-scripts） |
| 適用スクリプト | `dev-scripts/apply-model-overrides.ts` | 適用 / --check / --use-fallback / --accept-upstream-base。管理外実値は拒否（BR-10）。promote-skill から import される唯一の適用実装（現状 2 agent には no-op の前方互換ガード、--dry-run 時は呼ばない） | 対象外 |
| 適用対象 | `.agents/amadeus/agents/amadeus-architect-agent.md`、`amadeus-design-agent.md`（初期宣言） | frontmatter `modelOverride:` 行だけが書き換わる | baseline 対象。逆変換正規化で整合（FR-3.1） |
| parity 正規化 | `dev-scripts/parity-check.ts`（checkEngineFiles への 1 段追加） | 宣言 agent の modelOverride 値を base へ戻して hash 比較 | — |
| doctor 検査 | `.agents/amadeus/tools/amadeus-utility.ts`（doctor） | overlay 乖離の警告（任意・fail-open） | engineFileExceptions 宣言済み + exceptions 理由追記（Corrections c3） |
| eval | `dev-scripts/evals/model-overlay/check.ts` | RED 9 系列（宣言未反映 / 冪等 / ラウンドトリップ / drift fail / bootstrap window / fallback 記録 / doctor no-op / apply 先行時の管理外値拒否 / 手編集値の parity fail） | 対象外 |
| npm scripts | `models:apply`、`models:check`、`test:it:model-overlay` | 入口（test:it:all 連鎖に組み込み） | — |

## 状態遷移（overlay 宣言 agent の modelOverride）

| 状態 | modelOverride 実値 | parity の扱い |
|---|---|---|
| 未適用（bootstrap window） | base のまま（= baseline と一致） | 通常比較で pass。宣言に base 未記録なら不一致時にヒント付き fail（FR-1.4） |
| 適用済み | model（fable） | 管理値集合 `{model} ∪ {fallbacks[model]}` とのトークン一致により base へ逆変換して比較 → pass（FR-3.1、BR-9） |
| fallback 適用中 | fallbacks[model]（opus） | 同上（管理値集合に含まれるため逆変換）+ 発動記録あり（FR-4.2）+ doctor は警告しない（宣言内の値のため） |
| 乖離（手編集等） | 管理値集合に一致しない値 | 置換せずそのまま hash → baseline 不一致 → parity fail + doctor 警告（FR-4.3）。apply も拒否（BR-10） |
| 上流 drift | 実値は overlay 管理値だが baseline 側が更新済み | base 置換後も新 baseline と不一致 → parity fail（FR-3.2） |
