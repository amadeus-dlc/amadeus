# Unit of Work — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

- `requirements.md` の FR-1〜FR-6 と `components.md` の C1〜C7 を Unit へ束ね、`component-dependency.md` の層依存(判定基盤 → 発行側 → approve 側)を Unit 依存へ転記した。
- 各 Unit の規模見積り(行数)は `component-methods.md` のメソッド粒度見積りの合算、変更面のモジュール割当は `services.md` の層配置(lib 純判定層 / orchestrate・runtime I/O 層)に従う。
- U1〜U3 の検収 AC 割当は `decisions.md` の ADR-1〜ADR-4 の帰結(3値化・bolt_dag_absence・実績述語・guardMessage canonical)と 1:1 対応。

## Unit 一覧

### U1: dag-integrity(判定基盤+#1893 是正)

- 対象: FR-3(computeBoltDag の absent/malformed fail-closed+`bolt_dag_absence` 判別子 — ADR-2)+FR-5(260712 record の edge block 是正)。
- 変更面: `amadeus-runtime.ts`(computeBoltDag / compile)、`amadeus-lib.ts`(欠落理由型)、260712 record の unit-of-work-dependency.md。
- 規模見積り: production 約 90 行+record 是正。テスト約 180 行。
- 検収: AC-3a / AC-3a2 / AC-3b / AC-3c / AC-5a / AC-5b。
- 独立実装可能: はい(下流ガードなしでも判別子と loud エラーは単独で価値 — 無音 null 化の封鎖)。

### U2: issuance-guard(発行側ガード+3部メッセージ)

- 対象: FR-1(tryEmitSwarm 3値化+単一分岐点 — ADR-1)+FR-4(guardMessage canonical ビルダー — ADR-4)。
- 変更面: `amadeus-orchestrate.ts`(tryEmitSwarm / 呼び出し元2箇所の seam 統合)、`amadeus-lib.ts`(guardMessage+純判定器)。
- 規模見積り: production 約 170 行。テスト約 280 行。
- 検収: AC-1a / AC-1b / AC-1c / AC-4a(発行側分)。
- 独立実装可能: はい(U1 の判別子を消費するが、U1 着地後は単独で計画不履行クラスを塞ぐ)。

### U3: approve-reconciliation(実績突合)

- 対象: FR-2(approve 時の SWARM 実績突合 — ADR-3)+FR-4(approve 側メッセージ)。
- 変更面: `amadeus-orchestrate.ts` / `amadeus-state.ts`(approve 経路)、audit 読み(readAllAuditShards 再利用)。
- 規模見積り: production 約 120 行。テスト約 220 行。
- 検収: AC-2a / AC-2b / AC-2c / AC-4a(approve 側分)+FR-6 の corpus sweep(全ガード横断)。
- 独立実装可能: はい(U2 なしでも engine 迂回の手動 fan-out 検出として単独価値)。

### U4: docs-sync(文書同期)

- 対象: reference(12-state-machine / 08 系)と guide の該当節、en/ja 対訳。
- 規模見積り: docs のみ約 120 行。
- 検収: docs 検査+対訳同期(B4)。
- 独立実装可能: はい(U1〜U3 着地後の記述)。

## テスト採番予約

現最大 `t397`。予約: `t399`(U1)/ `t400`(U2)/ `t401`(U3)— **t398 は回避**(現 main では空きだが未マージブランチ bolt-metrics に t398-otel-metrics-vocabulary.test.ts が実在、E-CPG-UGS13 投票者1の git log --all 実測による交差予防)。U4 はテストなし。既存拡張で足りる場合は返上を報告(cid:code-generation:swarm-test-number-reservation)。

## 機械可読 DAG(required-sections センサー要求様式)

```yaml
units:
  - name: dag-integrity
    depends_on: []
  - name: issuance-guard
    depends_on: [dag-integrity]
  - name: approve-reconciliation
    depends_on: [issuance-guard]
  - name: docs-sync
    depends_on: [approve-reconciliation]
```

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T09:37:16Z
- **Iteration:** 1
- **Scope decision:** none

edge block の in-process parse ok(直列4バッチ・散文一致)、Unit 独立性・FR/AC 全数割当・依存根拠・採番実在を確認。Minor 2件は advisory(AC-4a 分担の plan 明記、t398 の branch 交差注意)— delivery-planning へ引き継ぎ。

### Findings

- Minor(advisory): AC-4a の U2/U3 分担を plan 段で明記(重複/欠落防止)。
- Minor(advisory): t398 は他ブランチとの交差に注意(現 main では空き実測)。
