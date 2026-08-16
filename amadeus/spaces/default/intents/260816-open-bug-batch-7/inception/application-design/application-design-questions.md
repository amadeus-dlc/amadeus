# Application Design — 設計質問(260816-open-bug-batch-7)

Intent Autonomy Mode = `full` のため、設計質問は `amadeus-bolt decide-question` の梯子で裁定した(solo-election 不在の loud degradation 記録つき)。E-code `E-AD-<hex8>` は AUTO_DECIDED 裁定 ID 先頭 8 hex の大文字化(full grant `intent-grant-f3cd750783eded708416acde804af0b5`、260814-priority-bug-batch で確立した規約)。要件で既決の Q1〜Q3(requirements-analysis-questions.md)は再質問しない。

## D1. FR-NSD-1/2(#2162)の方式 — 修復か退役か

RE 実測(codekb `component-inventory.md` の #2162 節): bootstrap fallback(`validateBootstrapHistory`)は trustedSha に `events/` が無い場合のみ到達し、ULID event 台帳は 2026-08-05 着地(#2338/#2353)。通常 CI(base-revision = 直近 merge-base)は常に events 分岐を通る。fallback の provenance(postRevision)は PR #2127 以降 dangling のまま約 3 週間 CI 無影響 — 実運用で不使用の強い証拠。

A. 修復: `bootstrap-provenance.json` を到達可能 revision へ再束縛し、postRevision へ preRevision 対称の到達性検査を追加、fallback は維持(evidence bundle の再取得が必要で digest 束縛の再構成は非自明)
B. 退役: legacy fallback 分岐 + provenance 面 + その fixtures を除去し、gate テストを events-only へ再構成、`baselineAtRevision` 死経路も削除(削除 diff は大きいが欠陥クラスごと消える。「要求されない互換維持を追加しない・古い挙動は削除して置き換える」ノルムに整合)
X. Other (please specify)

[Answer]: B — 裁定 E-AD-BFDBEC73(= AUTO_DECIDED `auto-decision-bfdbec73b206f95470b43f930444e1d7`)。根拠: fallback は実運用で不使用(3 週間 broken で CI 無影響)かつ provenance 再構成のコストとリスクが高い。退役は欠陥 2 点(到達性検査不在・死経路)を単一の削除で同時に閉じ、org.md Forbidden(要求されない fallback 分岐の維持禁止)に整合する。
