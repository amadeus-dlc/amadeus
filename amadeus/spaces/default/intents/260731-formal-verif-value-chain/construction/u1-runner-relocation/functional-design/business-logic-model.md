# Business Logic Model — u1-runner-relocation

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u1 は「scripts/formal-verif/ の実行器をプラグイン所有ツリーへ移し、全消費点を追従させる」純移設 Unit(unit-of-work.md の u1、components.md の C1+C10 CI 面、FR-A1/A2/A4 — 台帳 remap は FR-A1 帰属改訂 2026-07-31 ユーザー裁定により u1 スコープ)。新規ビジネスロジックは持たず、本書は移設の**変換規則**と**不変条件**をモデル化する。

## 変換規則(移設写像)

| # | 変換 | 入力 → 出力 |
|---|---|---|
| T1 | ファイル移設 | `scripts/formal-verif/<f>.ts`(分類 A 16+B 7+C 1 = 24 ファイル、component-inventory の目録)→ `plugins/formal-model-check/tools/<f>.ts`。ディレクトリ内相対 import(`./x.ts`)は不変 |
| T2 | 外部依存の複製切替 | `canonical.ts:5` の `../../packages/framework/core/tools/amadeus-formal-verif-model-map.ts` 参照 → 同ディレクトリ複製 `./amadeus-formal-verif-model-map.ts` へ(ADR-2)。複製は core 正本からの機械コピー |
| T3 | drift check 配線 | 複製と core 正本の byte 同期を既存 drift 検査群(dist:check 流儀)へ1検査として追加(ADR-2 の成立条件 — components.md C1) |
| T4 | CI パス付け替え | `.github/workflows/ci.yml:584/:600` の `scripts/formal-verif/run-model-check-ci.ts` → `plugins/formal-model-check/tools/run-model-check-ci.ts`。run→verify→evidence upload→exit 分岐の意味論不変(FR-A4) |
| T5 | stage 本文参照書き換え | `plugins/formal-model-check/stages/formal-model-check.md:12/:41` の `scripts/formal-verif/run-model-check.ts` → プラグイン相対の新パス。compose 済みコピー・staging・stage-graph.json・dist 全変種へ同一変更で伝播(FR-A2) |
| T6 | テスト参照追従 | 移設 24 ファイルを参照する既存テスト(分類 A/B/C 消費分)の import/spawn パスを新パスへ。分類 D 参照テストは触らない(u2 の削除対象) |
| T7 | 台帳 remap(FR-A1 — 帰属改訂 2026-07-31 ユーザー裁定) | **列挙規則(固定列挙禁止)**: 実装時に `grep -n '"file": "scripts/formal-verif/' tests/.coverage-patch-allowlist.json` の結果を **E1 の移設対象 24 ファイル名リストと intersect** して対象を機械算出し remap する(分類 D のエントリは対象外 — u2 が削除する)(FD 起草時実測: 7 ファイル・14 件 — fs-tlc-toolchain×3 / tla-arm×4 / tlc-toolchain×2 / contract×2 / run-model-check×1 / tlc-spawn-planner×1 / node-ci-model-check-port×1。実装時に再 grep し、この数値は照合用スナップショットであって列挙の正本ではない)。complexity-baseline も同様に `scripts/formal-verif/` 参照エントリのうち移設対象分(起草時実測: contract.ts 2 件)を grep 機械算出で remap(c1-allowlist-mechanical-remap: 全エントリ機械 remap+reason 直読照合) |

## 不変条件

- **I1(挙動不変)**: 移設前後で runner の入出力契約(CLI 引数・exit code・evidence 様式)はバイト等価。TDD 適用外(純移設)だが前後 green+drift check 必須(NFR-2)。
- **I2(閉包自立)**: 移設後の `plugins/formal-model-check/tools/` は T2 の複製を含めてディレクトリ内で import が閉じる(repo 内 CI・配布先 host の両実行面で解決 — ADR-2 の根拠)。
- **I3(中間状態の正常性)**: u1 完了時点で分類 D 30 ファイルは `scripts/formal-verif/` に残る(ディレクトリ非存在は u2 の AC — units-generation reviewer 裁定)。
- **I4(grep AC)**: plugin 配布4面(plugins/ / dist/plugins/ / .claude/plugins/ / .claude/.amadeus-plugin-src/)から `scripts/formal-verif` 参照が 0 件。

## 実行順序(bolt-plan の PR 粒度想定に対応)

1. T1→T2→T3(移設+複製+drift)→ T4(CI)→ T6→T7(テスト・台帳)→ dist 再生成 → 検証一式(PR-1 想定)
2. T5(stage 本文)→ dist 再生成 → 検証一式(PR-2 想定)

順序の根拠: T4 を T1 と同一 PR に置かないと中間コミットで CI が構造赤になる(risk-and-sequencing R 系、intra-bolt-order-as-risk-control)。
