# リバースエンジニアリング差分スキャン記録

## 実行メタデータ

- Intent: `260818-issue-3029-sensor-gate`
- Date: `2026-08-18`（UTC）
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `23d4ae767956cd56fc28fa78abe28096712eff8`（既存 re-scan の最新 observed、HEAD の祖先）
- Observed commit: `c8c393bba927e4c00a8c6de9ef2da76068d04bfa`
- Distance: `6` commits
- 差分規模: 全体 `155 files, +7,316 −3,968`。指定除外後 `+2,551 −53`。除外は `:(exclude,glob)amadeus/spaces/*/intents/**`、`elections/**`、`codekb/**`、`memory/**`、`metrics/**`。
- Focus: GitHub Issue #3029 の blocking sensor per-sensor script exit 127 と completion gate の意味論。対象は `amadeus-sensor.ts`、`amadeus-state.ts`、sensor schema、plugin sensor manifest、t511/t92 regression、audit-format。

## Developer scan

- リポジトリは Bun/TypeScript の短命 CLI モノレポ。core tool 144 files、全 tests 1,793 files、stage 32 files、plugin sensor manifest 14 files を確認した。
- manifest の `default_severity` は `amadeus-sensor-schema.ts` で `advisory | blocking` に検証され、graph compile が blocking severity を `sensors_applicable` へ搬送する。
- dispatcher の branch 0（spawn failure）は `script-error: spawn-failed`、branch b（exit 127）は `SENSOR_PASSED` + `tool-unavailable` である。
- completion guard は `SENSOR_PASSED`、receipt/digest 一致、`script-error:` でない note を pass とするため、exit 127 の監査行は blocking gate を拒否しない。
- t511 integration `:369-374` と unit `:512-527` はこの pass 挙動を固定し、t92 Group D は dispatcher の audit note を固定する。

## Architect synthesis

欠陥は「blocking severity の搬送不全」ではなく、severity を受け取った state guard が `tool-unavailable` を成功 terminal として扱う意味論の接合不一致である。RE は修正案を裁定せず、requirements が fail-closed 化または pass 維持を選ぶときの変更面を記録した。

## 未検証・引き継ぎ

- RE では全テスト、coverage、TLC、GitHub 書き込みを実行していない。`bun install && bun run build` のみ成功確認した。
- fail-closed の場合は t511 の integration/unit 期待値反転が必要。pass 維持の場合は `packages/framework/core/knowledge/amadeus-shared/audit-format.md:267-272`、plugin sensor schema、blocking guard の散文の整合を明文化する。
