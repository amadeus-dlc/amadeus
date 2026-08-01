# Business Logic Model — U1 perf-tier-and-migration

上流入力(consumes 全数): unit-of-work.md(U1 定義)、unit-of-work-story-map.md(ジャーニー1/3)、requirements.md(FR-1/4/5、NFR-1/3)、components.md(C-1/C-2/C-5/C-6)、component-methods.md(C-1 seam 表・C-5 定数・C-6 操作列)、services.md(実行面表 — ci.yml blocking 区分)

測定 ref = observed `da51af375`。

## ロジック0: 実行面の位置づけ

本 Unit の変更は services.md の実行面表のうち「ci.yml tests/coverage-*(blocking)」行の実行集合を縮め、「perf.yml perf-tests(非 blocking)」行の実体(tests/perf/)を供給する。blocking 区分そのもの(トリガー・needs)は U2/U3 の責務であり本 Unit は触れない。

## ロジック1: tier 選択(run-tests.ts)

```
入力: argv
parseArgs:
  --perf        → runPerf=true, levelSelected=true
  --ci          → runSmoke+runUnit+runIntegration(現行 :197-202 不変 — runPerf は立てない)
  --all/--release → 現行フラグ群 + runPerf=true
  レベル未指定   → 現行既定(--ci 相当、runPerf=false)
実行:
  runPerf → runFilesPartitioned("perf", args.parallel, sizeCollector)
  (e2e 分岐 :1186-1207 と同型。smoke/unit の serial 強制 :881 は perf に適用しない)
出力: 既存プロファイルの stdout は byte-identical(perf 非実行時)
```

## ロジック2: テスト分割移設(C-2 表の実行計画)

components.md C-2 表の6ファイルを per-test 粒度で処理する。各分割は:
1. `tests/perf/<新名>.test.ts` を新設(covers: ヘッダ複製、`// size: large` 正規宣言、必要 import 複製)
2. 元ファイルから perf describe/test を削除(残置テストは無変更 — diff は削除+新設のみ)
3. whole-file 移設2件(t269、t-plugin-stage-discovery)は git mv + `// size:` 確認

## ロジック3: t258 timeout 導出(C-5)

component-methods.md C-5 の定数コメント契約どおり: `250_000`(式 `ceil(2 × 122_147.12ms / 10^4) × 10^4`、出典 #1830 経路A / #1835 クロスレビュー22断面)。t257 は 120_000 維持(24% 使用率 — 判断コメント記載)。

## ロジック4: coverage 整合の操作列(C-6)

component-methods.md C-6 の 1→2→3→4 を同一 PR 内で実行。順序固定: TEST_TIERS 追加 → registry regen/--check → coverage:ci 実測 → baseline 再カット → allowlist remap → patch-gate --check。

## TDD 順序(NFR-3)

1. Red: 新規 `tests/unit/t-run-tests-perf-tier.test.ts` — (i) `--perf` 選択 (ii) `--ci` 除外 (iii) `--all` 包含 を parseArgs/levelFiles の in-process seam で失敗させる(perf tier 未実装のため赤)
2. Green: ロジック1 の最小実装
3. 以後、移設(ロジック2)は挙動不変のリファクタ分類(テスト自体の移動)— 移動前後で `--ci` / `--perf` の実行集合を機械照合

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:48:00Z
- **Iteration:** 1
- **Scope decision:** none

BR/FR 対応・対称対・timeout 導出・TDD 順序は健全。business-logic-model.md と domain-entities.md の services.md consumes が本文未参照の装飾トークン(c12/body-derivation-before-header 違反)で NOT-READY。

### Findings

- [Major] business-logic-model.md:3: services.md が header 記載のみで本文参照ゼロ(装飾トークン)
- [Major] domain-entities.md:3: 同上 — 実行面・blocking 区分への本文言及なし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:49:43Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の装飾トークン2件は本文実引用(ロジック0 節・実行面との対応 節)で閉包。services.md 実表と逐語整合、U1 の責務境界とも無矛盾。新規指摘なし。

### Findings

- None
