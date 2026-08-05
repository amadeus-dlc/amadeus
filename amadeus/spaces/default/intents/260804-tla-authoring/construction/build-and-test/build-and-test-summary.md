# Build & Test Summary — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit の検証宣言・TDD スライス)と code-summary.md(実測の一次記録)。

## verdict

**READY(無条件)** — 受け入れ基準(FR-001〜013 / NFR-001〜)に対する検証は全 green。無条件の根拠(既定ノルム c2-unconditional-ready-boundary): 未検証面として残るのは (1) 変異系実 TLC(#2286 — 裁定 C で AC 外へ確定済み) (2) revise-model の replace-by-name(#2289 — FD 承認済み意味論の外) (3) coverage collector の repo 外 SF 除外(#2315 — 計測基盤の恒久修正)の3件で、いずれも requirements.md の FR/NFR 実文照合で AC 外(起票済み Issue に台帳化)。

## 出荷実績(6 Bolt / 6 unit)

| Bolt | Unit | PR | 主要成果 |
|---|---|---|---|
| 1 | tla-evidence-foundation(U1) | batch 1 着地 | evidence store(bundle build/verify/read) |
| 1 | import-closure-guard(U6) | batch 1 着地 | plugin import closure guard |
| 2 | applicability-hold(U2) | #2268 | 適用判定 J1..J6 + C9 hold + 宣言駆動 advisory |
| 3 | authoring-referees(U3) | #2269 | trace/proof referee + production TLC adapter |
| 5 | registration-committer(U4) | #2287 | 前提6検査 + atomic model-map replace |
| 6 | authoring-stage-e2e(U5) | #2312 | tla-authoring stage 文書 + 未知題材 E2E(t450) |

## FR-012(未知題材 E2E)の充足

t450 が swarm unit-pool 題材で「要求入力 → 適用判定 → authoring → referee → レビュー → 承認 → bundle → 登録 → 既存 formal-model-check 実行 → 相関 verdict」の全経路を composed runtime(spawn 駆動)で実測。fail-closed 2系込み。合否実測の受け入れは本ステージが所有(BR-U5-12)し、本 summary がその判定である。

## 特記(工程内の是正と裁定)

- U5 で CI project coverage の universe 汚染(temp host コピー混入)を検出 → ソロ選挙 E-TLA-U5COV 裁定 A(spawn 化)で解消、恒久修正は #2315
- build-and-test 直前の spec-hash advisory(並行 intent #2224 由来)は人間選択 run-now → 実 TLC で両モデル NOT_DETECTED を確認して解消
- 初回 full CI 赤2件は self-install stale(並行 intent #2284 の新 sensor)由来と assertion 実文で帰属確定 → build 再生成で回復
