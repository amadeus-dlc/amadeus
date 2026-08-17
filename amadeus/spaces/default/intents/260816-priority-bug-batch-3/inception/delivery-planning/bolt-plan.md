# Bolt Plan — intent 260816-priority-bug-batch-3

1 Unit = 1 Bolt の 5 Bolt 構成(粒度裁定は delivery-planning-questions.md Q2)。順序は優先度キュー + 依存制約 + 同一ファイル直列化(同 Q1、AUTO_DECIDED q-dp-sequencing)。walking skeleton はスコープ既定でスキップ(同 Q5)。ブランチ運用は org.md(worktree ベース = main、マージターゲット = main、スカッシュマージ)。検証は remote-first / push-first。

## Bolt 1

- **Units:** `autonomy-refusal-idem`
- **内容**: FR-2 / #3152 — INTENT_AUTONOMY_HUMAN_REQUIRED の発火点分離 + 冪等鍵(ADR-2)
- **Definition of Done**: ADR-2 実装契約 1-4 充足。落ちる実証2条件(未開設 next×5 → 0行 / 再試行混合 → ちょうど1行)が Red→Green。audit-format + event-registry 同期。PR 作成・必須 CI green・収束
- **確信仮説**: 発火点をゲート提示へ移しても正当な human-required 提示の記録が1行残ること(監査の意味論が「提示回数 = 行数」に一致すること)を出荷が証明する
- **期待デモ**: t482 系テストの Red→Green ログ + 台帳の before/after 行数比較

## Bolt 2

- **Units:** `milestone-presence`
- **内容**: FR-1 / #3153(P1/S2)— milestone 限定 presence 境界 + GATE_APPROVED 機械識別(ADR-1)。Bolt 1 の ProductionAutonomyContext 供給に依存
- **Definition of Done**: ADR-1 実装契約 1-6 充足。3点 pin の落ちる実証(gate-open 前ターンのみ→拒否 / 通常 stage-gate 非退行 / gate-open 後ターン→承認)。#1647 への申し送りコメント。PR 収束
- **確信仮説**: semi/full の milestone ゲートが「その問いに答えた人間」なしに通過しないこと、かつ既存の正当な承認フローが1件も偽拒否されないことを出荷が証明する
- **期待デモ**: #3153 代表例(同一秒3イベント)の再現が修正後に拒否されるログ

## Bolt 3

- **Units:** `prc-finalization`
- **内容**: FR-3 / #3149 — attestation ベース束縛 + in-place finalisation(ADR-3)+ human-presence 付き override(ADR-4)。着地後に intent 260815-rfc-autonomy-modes の resume が可能になる(resume 実施はスコープ外)
- **Definition of Done**: ADR-3 契約 1-4 + ADR-4 契約 1-5 充足。クラスA/B の拒否を Red 実測 → 正規経路で Green。負例(偽造 merge facts / presence 不在 override)の拒否 pin。単一 unit 従来フロー(#3113 経路)非退行。クラスB 3件の現存性再実測記録。PR 収束
- **確信仮説**: swarm 多 unit + レーン rebase の運用形態で converged report が正規に最終化でき、恒久 park クラスが消滅することを出荷が証明する
- **期待デモ**: HEAD 前進後の converged report がセンサー PASS になる before/after

## Bolt 4

- **Units:** `source-work-probe`
- **内容**: FR-4 / #3156 — record 初コミット後追い形状の第4プローブ(方式裁定不要)
- **Definition of Done**: 両側テスト(後追い形状で受理 / sibling のみで拒否)+ 新プローブの落ちる実証(注入→赤→revert)。`bun run build` 後の dist 断面で t206 green。PR 収束
- **確信仮説**: degrade solo Bolt フローが AMADEUS_SKIP_ARTIFACT_GUARD バイパスなしで完了できることを出荷が証明する
- **期待デモ**: #3156 の実形状 fixture での approve 成功ログ

## Bolt 5

- **Units:** `election-append`
- **内容**: FR-5 / #3046(P3)— voter スコープ採番 + 複合一意 + 辞書式順序(ADR-5)
- **Definition of Done**: ADR-5 契約 1-6 充足。実プロセス並行の Red→Green + property 3種(voter ローカル単調 / 複合一意 / 到着順非依存)。D-09 コメント書換。PR 収束
- **確信仮説**: 並行 voter 運用(将来の選挙並行化)へ store が耐えることを出荷が証明する
- **期待デモ**: 並行 driver の corrupt 再現 → 修正後の決定的順序出力

## 並行レーン注記

Bolt 3 / Bolt 5 は Bolt 1-2 チェーン・Bolt 4 と write scope 交差がなく、実装は並行レーン可。着地(マージ)は record 同梱 PR の構造的競合により直列(cid:pr-convergence:serial-landing-rebase-shape の反復形)。エンジンの batch fan-out(DAG 由来)が並行実装を許す場合も、finalize / 着地は Bolt 番号順を基本とする。
