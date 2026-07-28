# Performance Requirements — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

U4 は設定 parse(オフライン)と read-only 診断であり、性能規定は「診断が呼び出し予算内に収まり mutation 0 であること」。常駐サービスなし(technology-stack: Bun/TypeScript ESM の CLI)のためレイテンシ SLO は置かない。

## 設定 parse のコスト

- `mirror-projects` の parse・層解決(business-logic-model の4面一般化)は完全オフライン — API 呼び出し 0 回。層解決はキー単位の全置換(business-rules BR-U4-2)で、層数は既存3層固定のため parse コストは設定サイズに線形。

## 診断の呼び出し回数(requirements NFR-3 の read-only 面)

- `repair status` の Project 診断(business-logic-model の手順): 所属照会 `listProjectItems` 1回+Project あたり Status フィールド解決 1回。**mutation は 0 回**(business-rules BR-U4-4 — FR-9b の negative assert)。
- 部分成功検出は台帳読取から導出し remote 再照会しない(business-logic-model 手順1 — 追加 API コストなし)。
- 検証は2系統に分離する: (i) mutation 0 回の negative assert(受入条件12 — business-rules テスト規約どおり FakeGateway history で検査) (ii) 診断の照会回数上限の assert は requirements NFR-3 の事項であり、上限の数値は application-design の呼び出し設計から導出済みの値を消費する(本書で新しい数値を確定しない — constants-from-code の委任)。実時間の負荷試験は行わない(counter assertion で構成)。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile を維持(実装直読: amadeus-mirror-runner.ts:29 `single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB }`)。U4 で新しいタイムアウト・throttle を導入しない(requirements NFR-3 後段)。

## 非目標

- レスポンスタイム SLO・スループット目標: N/A(根拠: requirements FR-1b — repair status は read-only のオンデマンド単発照会であり polling ではない。cid:observability-setup:c3 の N/A 規律)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T09:17:15Z
- **Iteration:** 1
- **Scope decision:** none

実装引用・consumes 実参照・N/A 根拠は健全だが、performance-requirements.md:15 が受入条件12 に NFR-3 の照会回数上限(application-design 委任の数値)を誤帰属で束ねた Major 1件。

### Findings

- [Major] performance-requirements.md:15 受入条件12 へ照会回数上限 assert を誤帰属(正: mutation 0=受入条件12 / 呼び出し回数上限=NFR-3・design 委任 — requirements.md:82・:111)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T09:18:48Z
- **Iteration:** 2
- **Scope decision:** none

是正は requirements.md:82(受入条件12)と :111(NFR-3 design 委任)へ正しく接地し、mutation 0 と照会回数上限の分離は他4ファイルとも整合。新規矛盾なし。

### Findings

- None
