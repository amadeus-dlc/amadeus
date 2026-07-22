# Build and Test Results — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）。

## 測定断面

測定refは conductor HEAD `1971eda71`。#1314 merge `44ec1481b6c` を含む最新mainを再接地し、fresh grant issuer checkpoint `5c2030f8a` を単体取込した断面である。

## 実測結果

| 検証 | 結果 |
|---|---|
| targeted 5 files | exit 0、89 pass / 443 assertions / 0 fail |
| typecheck | exit 0 |
| lint | exit 0、208 warnings / 16 infos はrepo既存complexity advisory |
| dist / self | `dist:check` 6 harness同期、`promote:self:check` 4面同期、各exit 0 |
| full coverage CI | exit 0、391 files / 5544 assertions / failed files 0 / failed assertions 0 / wall-clock drift 0 |
| project coverage | PASS、71.7891%（baseline 40.9395%、+30.8496pp） |
| patch coverage | PASS、measured 71 / covered 71 / allowlisted 0 / uncovered 0 |
| final sensors | required-sections 8件 + upstream-coverage 8件 = 16/16 `SENSOR_PASSED`。type-check対象TS 0、answer-evidence対象questions 0でN/A |

## Failure / advisory 分類

- blocking failure: なし。
- advisory: repository既存complexity warning、AWS credential不在に伴う既知SDK/substrate skip。
- N/A: service load/DAST/auth/crypto/deployment resource。承認済みscopeに追加面がないため。

## 構造NFRと安全境界

- scanner shape: `N=1/2/4` で `H=1/2/4`、offset厳密単調、`execCalls=2/3/5=H+1`。
- 実memory corpus: 実行時列挙7 files、heads 28、records 28、accepted 12、rejected 16。旧/new E-code occurrence は259/259。
- fail-closed: sparse 4 failure class、election IDのlowercase/空節/hyphen境界/非文字列、scanner-prefix/validator-whole-value分離をunit/integrationでgreen確認。
- dependency/network/credential/runtime service追加は0。生成物は正本からの同期面のみ。
