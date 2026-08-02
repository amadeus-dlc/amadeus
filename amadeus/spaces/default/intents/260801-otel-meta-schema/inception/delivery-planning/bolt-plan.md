# Bolt Plan — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md — Bolt 列は unit-of-work-dependency.md の YAML DAG(機械正)から、各 Bolt の中身と規模は unit-of-work.md の按分から、walking skeleton の位置づけは requirements.md FR-RES-3 と story-map の段1から、ゲート要件は components.md の pin 連動(U4)から導出した。

## Bolt 列(YAML DAG の Kahn 展開と 1:1)

| Bolt | Unit | 内容 | ゲート |
|---|---|---|---|
| **Bolt 1** | U1 resource-core | resource 一元組み立て+supplier seam+3シグナル搬送+span-exporter redaction。**walking skeleton を内包**: 最初のスライスは「claude の SessionStart hook から供給された 1 属性(amadeus.harness — detectHarnessType 由来)+session.id が spans-/監査 v2 行/metrics store の resource に現れる end-to-end」 | **walking-skeleton gate(単独・ゲート付き)** — Bolt 1 出荷後にユーザー承認を得てから残り Bolt へ |
| **Bolt 2a/2b/2c** | U2 / U3 / U5(並行) | span attrs+stage memo / exception 3属性+stacktrace redaction / metrics arm+計器5つ | batch 末尾ゲート(gated モード) |
| **Bolt 3** | U4 subagent-started | canonical 79 化(pin 6箇所同一 PR)+PreToolUse hook+lifetime 合成 | batch 末尾ゲート |
| **Bolt 4** | U6 docs | telemetry スキーマ章 | batch 末尾ゲート |

各 Bolt = 1 PR、スカッシュマージ、worktree 分離(solo-bolt-worktree-required)。TDD 既定・deslop・local lcov 事前確認・NFR-4(package.ts+promote:self 同一変更)を全 Bolt 共通制約とする。

## Bolt 内実行順のリスク制御(intra-bolt-order-as-risk-control)

Bolt 1 内は (1) resource.ts+suppliers(純関数層 TDD)→ (2) bootstrap 一元化 → (3) 3プロバイダ搬送 → (4) span-exporter redaction → (5) hooks 供給(walking skeleton の end-to-end 実証)の順。(4) を (3) より後に置くのは「redaction 未接続のまま resource が store に出る」窓を作らないため。
