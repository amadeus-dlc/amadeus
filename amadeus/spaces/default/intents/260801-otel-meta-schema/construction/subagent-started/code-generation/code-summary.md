# Code Summary — U4 subagent-started(Bolt 3)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan の経過どおり、裁定 A の範囲内。

## 着地

- **PR [#1924](https://github.com/amadeus-dlc/amadeus/pull/1924) — MERGED**(スカッシュ、origin/main で subagent-lifetime.ts の grep 実測済み)

## 変更面(正本)

- `otel/event-registry.ts`: SUBAGENT_STARTED canonical 登録(78→**79**)。硬ピン全数(registry:77 / drift 5値 / t28 2値 / t81+算出根拠 / VALID_EVENT_TYPES)+doc 同期2件
- 新設 `core/hooks/amadeus-log-subagent-start.ts`+claude settings.json.example の **PreToolUse(matcher ^Task$)** 配線。kimi は SubagentStart 写像。他4ハーネス非対称は docs 明記
- 新設 `otel/subagent-lifetime.ts`: composeSubagentLifetimes — ID 一致 → (ID 欠落側があるときのみ)Type LIFO → seq tie-break、**未完了 started は incomplete: true / completedAt: null で報告**、両側 ID 不一致は孤児+open、孤児 completed は除外(非対称の理由コメント付き)
- 散文 count-free 化16箇所(en/ja 対称)。tests: purpose 14 / lifetime 13 / 実 hook spawn integration 8

## 検証実測

- typecheck / lint / run-tests --ci(733 files・10028 assertions・0 failed)/ dist:check / promote:self:check(7ハーネス)/ lcov 未カバー 0 / coverage-registry = 全 exit 0
- 落ちる実証2セット(79 ピン1箇所除去 → drift 5 fail / 未登録キー注入 → t385 call site 名指し 2 fail)。allowlist 行ピンは機械 remap+base 対比 byte 一致の直読照合
- subagent.duration が production 発火(U5 前方宣言との接続を t399 実測)
- 独立 PR レビュー: iteration 2 READY(GoA 1)。referee check converged / tampered=false
