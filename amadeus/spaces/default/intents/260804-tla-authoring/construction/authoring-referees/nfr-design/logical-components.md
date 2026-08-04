# NFR Design: 論理コンポーネント構成 — U3 authoring-referees

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U3 functional-design)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent。

## 層構成(NFR-004/NFR-006 の実装構造)

| 層 | 内容 | 配置(canonical) | テスト層 |
|---|---|---|---|
| 純関数層 | C3 coverage 集合演算(4 欠陥クラスの全数収集)、C5 の 5 条件判定表・receipt 構成検査(completion marker / 統計 / witness / reduction 対応 / identity 照合の判定) | `plugins/formal-model-check/tools/tla-referees.ts`(新設 library module) | unit(fake toolchain 注入で全分岐) |
| I/O handler 層 | trace rows / manifest / invariant 一覧の読取、変異系の一時領域生成・破棄、toolchain 起動(既存 `tlc-toolchain.ts` 契約の注入) | 同 module 内 handler 関数群 | integration(実 TLC 最小 1 系 — BR-U3-19 の FD 裁定) |
| CLI dispatch 層 | `tla-authoring.ts` の `trace` / `proof` サブコマンド(U1/U2 と同居) | `plugins/formal-model-check/tools/tla-authoring.ts` | in-process seam + integration |

- 依存方向: CLI → handler → 純関数、および handler → 既存 toolchain(一方向 — ADR-5)。純関数層は toolchain 型(port)にのみ依存し、実行系へ依存しない。
- 変異系(falling の違反注入・vacuity の ¬witness 注入)の生成は handler 層が `tla-module-deps.ts` 閉包内で行い、一時領域限定・実測後破棄(BR-U3-05)。**変異系の TLC 実行は invariant ごとに逐次(直列)とし、並行実行しない** — 一時領域の書込競合を構造的に排除し、TLC のホスト負荷重畳による偽赤(`memory/team.md` fanout-load-settle-before-integration の類型)とログ帰属の曖昧化を避ける。逐次でも各実行は独立 run ディレクトリを使う(security-design.md の異常系 2 層防御と整合)。
- handler は export して in-process 駆動可能にする(`memory/team.md` seam-export-handler-amend)。新設 module は plugin manifest へ登録し U6 guard の閉包検査対象(NFR-005)。

## モジュール境界の根拠

- **C3 と C5 を単一 module(tla-referees.ts)に同居**: 両者は「referee(評価のみ)」という同一責務クラスで、CoverageProof / ProofEvidence はともに C6(U4)の登録前提として消費される対の証明型。U1(evidence 語彙)・U2(判定/hold 語彙)と module を分け、`unit-of-work.md` の unit 境界を module 境界に一致させる。
- **toolchain を port 注入に保つ**: fake toolchain で 5 条件判定表を決定的に unit test でき(NFR-006)、実 TLC 依存は integration 最小 1 系へ隔離する(`memory/project.md` cid:build-and-test:wtfbt-c1 逐語「孤立mockの新規unit testより承認済みNFR経路を直接観測できる既存integration seamを要件駆動の最小検証集合として実行する」— 実 TLC 境界の検証を最小 integration 集合に置く根拠)。

## 上流トレーサビリティ

- `construction/authoring-referees/functional-design/business-logic-model.md`(評価アルゴリズム・CLI 面・層分離宣言)、`business-rules.md`(BR-U3 群)、`domain-entities.md`(receipt 型・port)
- `inception/requirements-analysis/requirements.md`(NFR-001、NFR-004〜NFR-006)
- `inception/units-generation/unit-of-work.md`(U3 境界・CLI 契約)、`inception/application-design/decisions.md` ADR-5
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)
