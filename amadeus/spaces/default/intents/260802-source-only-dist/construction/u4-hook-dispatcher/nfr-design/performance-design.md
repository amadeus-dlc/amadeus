# Performance Design — u4-hook-dispatcher

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 遅延予算

dispatcher は各hook実行へ file existence check 1回と Bun child spawn 1回だけを追加する。directory scan、network、cache、retryを持たない。実体不在時はspawnせず同期判定でexit 0とする。

## 退行検査

`bun test tests/integration/<dispatcher-test>`で既知slug全件の実体あり/全tree不在/部分欠落fixtureを駆動し、追加I/O回数をcounterで固定する。各case 5秒timeoutを停止guardとする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

reliability/security-design の cross-slug 全数チェックが FD の単一 slug 薄型契約から無申告逸脱し、同バンドル performance-design と自己矛盾(Critical 2)

### Findings

- Critical: 全不在/部分欠落の実行時判定は FD 逸脱 — 実行時は当該 slug 単体判定へ是正、partial 検出は build 後検証+テスト時 smoke へ再配置
- Minor: consumes 定型・fallback 実参照の薄さ

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:32:31Z
- **Iteration:** 2
- **Scope decision:** none

cross-slug 全数チェックの撤回と単一 slug 契約への再整合を確認、バンドル内自己矛盾解消。責務再配置(u7+テスト時 smoke)の参照先実在も確認、退行なし

### Findings

- 閉包確認: Critical 2件の是正着地。Minor 残存(scalability の consumes 文言非定型)は非ブロッキング
