# Walking Skeleton 実測レシート(FR-8: TLA × D4)— 2026-07-22

上流入力(consumes 全数): defect-ledger.md, final-fd-gate-ruling.md, live-toolchain-probe-receipt.md

## 実行構成

- 注入: 台帳 D4(invalid-timestamp)の arm-T 面 — canonical patch
  `tests/formal-verif/fixtures/arm-t/d4-invalid-timestamp.patch`(MODEL_SOURCE の
  SubmitOriginal invalid-timestamp 受理化)。composed tree 内で generateFrozenTlaModel →
  receipt 再生成照合 → 実TLC、という装置設計どおりの経路
- ランナー: `scripts/formal-verif/run-skeleton-ci.ts`(PR #1364)— 2回実行し、両run
  DETECTED かつ同一 counterexample identity のときのみ exit 0(決定性をランナーが強制)
- 前提修理: TLC 初期状態違反(MSG 2107)の正規化(#1359 → PR #1361、verdict中立の
  harness-repair としてユーザー裁定済み)

## 実測結果

### ローカル(Mac Studio / macos-arm64、実TLC 1.7.4、2026-07-22)

- run1: DETECTED, exit 12 / run2: DETECTED, exit 12 — **deterministic: true**
- counterexampleId: `def9b3475fab2abda3655dcd…`(両run一致)

### CI(GitHub Actions macos-15、run 29906204612、head `5594cff66`)

- workflow: `.github/workflows/formal-verification.yml`(workflow_dispatch、初回dispatch)
- conclusion: **success** — run1/run2 とも DETECTED, exit 12、**deterministic: true**
- counterexampleId: `def9b3475fab2abda3655dcd…` — **ローカルと完全一致**
- artifact: `formal-verif-skeleton`(skeleton-artifact.json + 両runの raw TLC stream)
- run URL: https://github.com/amadeus-dlc/amadeus/actions/runs/29906204612

### 環境跨ぎ決定性

2マシン(Mac Studio / GitHub macos-15)× 各2run = 4run 全てで同一の
counterexample identity。raw stream sha は実行時刻由来で異なるが、正規化後の
意味論的 identity(invariant名 + source span + trace)は不変 — 意図された不変性。

## FR-8 合否への写像

| 要求 | 状態 |
| --- | --- |
| 注入branch/patch | ✅ canonical patch(merge commit `5594cff66` に同梱)+ 台帳 D4 行 |
| 決定論的 verdict | ✅ DETECTED ×4run、identity 一致 |
| CI 証跡 | ✅ run 29906204612 success + artifact |
| raw measurement 保存 | ✅ artifact 内 raw stream(sha は本レシートに固定: run1 stdout `d6c620f1ccce…` / run2 `2c85258a985e…`) |
| blind な freeze SHA の provenance 記録 | ⏳ Phase 2(ARM_AUTHORING_STARTED / ARM_FROZEN の実イベント発行)で完結 — freeze 対象は #1327 着地コミット、#1361 を harness-repair として併記予定 |

## 残作業(skeleton後のfan-out前提)

- Phase 2: provenance 実イベント発行(freeze SHA 記録)
- D1〜D3 / D5〜D7 の arm-T 面 patch 作成(D4 と同機序。mutation probe に既存の
  unknown-choice / amend-budget / resolution 3種は流用可、choice winner / receivedAt /
  unknown-ref は新規起草)
- full matrix(96セル、このMacで実行 — ユーザー裁定済み)
