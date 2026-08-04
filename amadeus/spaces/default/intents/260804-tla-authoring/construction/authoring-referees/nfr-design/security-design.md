# NFR Design: セキュリティ設計 — U3 authoring-referees

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U3 functional-design、READY 確定)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent(設計どおりの欠落 — 内容を発明しない)。

## 守る資産と証跡の真正性

U3 が守る資産は **referee 判定の真正性**(coverage / proof の verdict が実行結果から導出されたものであること — 検証劇場の構造的排除)。認証・暗号は要件に存在しない(cid:nfr-design:c1 の CLI/library 置換)。

| 資産 / 脅威 | 対策(`business-logic-model.md` の確定設計の NFR 面) |
|---|---|
| NOT_DETECTED の偽主張(部分探索・timeout の成功丸め) | TlcRunReceipt は completion marker + state 統計の実在が構成要件(BR-U3-12 — 型で表現不能化)。既定ノルム finite-exploration-not-detected-proof を型で強制 |
| 空振り注入(壊したはずが赤が出ない falling proof) | 変異系 NOT_DETECTED は falling 不成立として missing 列挙(BR-U3-14)— 成功へ読み替えない |
| 空虚な invariant の proof 通過 | witness 到達性の実測(¬witness → DETECTED)を obligation 成立要件とし、witness 未宣言も不成立(BR-U3-14a) |
| 古いモデルの proof 流用 | manifest declaredIdentity と現在 identity の compareIdentity 照合(BR-U3-15a) |
| 変異成果物の正本混入 | 注入 → 実測 → 破棄の 1 セット規律(BR-U3-05)— 変異 `.tla`/`.cfg` は一時領域限定 |
| toolchain 経路の改変による verdict 汚染 | 既存 TLC toolchain の child process 契約を無変更再利用(BR-U3-03、ADR-5)— executor/verdict 経路の保護境界(FR-013)に不侵 |

## 入力検証(システム境界)

- InvariantName は TLA+ 識別子文法のスマートコンストラクタ検証(`domain-entities.md`)。
- TraceRow は rationale 空文字拒否・解決不能 row の全数列挙(BR-U3-07)。
- reduction manifest は全縮約項目の意味保存対応 + sourceSubjects 非空を検査(BR-U3-15)。

## 権限・攻撃面

- 新規のネットワーク経路・秘密情報はゼロ。TLC 実行は既存 child-process 境界のみ(実行面の攻撃面は不変 — ADR-5 セキュリティ影響節)。
- U3 は evidence store・model-map へ書き込まない(評価のみの referee — BR-U3-01)。verdict は値として呼び手へ返るだけで、永続化は U1 経由。
- 変異系の実行は一時領域に隔離し、正本 `specs/tla/` 配下への書込を持たない(BR-U3-05 の攻撃面の帰結)。**異常終了時の防御は 2 層**: (1) 一時領域は run 単位の専用ディレクトリ(repo 外の OS temp 配下)に取り、handler が finally 相当で破棄する (2) crash・timeout 強制終了でクリーンアップが走らなかった場合でも、残骸は repo 外にあるため正本混入・git 追跡混入は構造的に起きない(破棄漏れは無害な OS temp ゴミであり、次回実行が新しい run ディレクトリを使うため誤読もない)。正本混入防止は (2) の配置選択が一次防御で、(1) の破棄は衛生面の二次責務。

## 上流トレーサビリティ

- `construction/authoring-referees/functional-design/business-logic-model.md`(coverage / proof 評価)、`business-rules.md`(BR-U3 群)、`domain-entities.md`(receipt 型)
- `inception/requirements-analysis/requirements.md`(FR-006、FR-008、FR-013、NFR-003)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T23:09:14Z
- **Iteration:** 1
- **Scope decision:** none

security-designはBR-U3群への比例配分・logical-componentsは層分離とport注入がFD/ADR-5と整合しており、無申告逸脱や引用不備は検出されなかった

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/nfr-design/security-design.md:28 — 変異成果物の破棄はBR-U3-05の「注入→実測→破棄」1セット規律に従うと記載されるが、プロセス異常終了時(child process crash・timeout強制終了)に一時領域の破棄が保証されるかの設計(finally相当のクリーンアップ責務)が明記されておらず、正本混入防止という本表の脅威緩和が異常系で成立するか読み取れない
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/nfr-design/logical-components.md:14 — falling proof(invariantごと)とvacuity proofの変異系実行が逐次か並行かが未記載。並行実行を許容する場合、同一一時領域(tla-module-deps閉包内)への複数変異書込みが競合しうるため、security-design.mdの一時領域隔離設計との整合を明示すべき
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/construction/authoring-referees/nfr-design/logical-components.md:20 — cid:build-and-test:wtfbt-c1の引用が原文(『対象がシェル関数・tmux・実FS境界である場合は…既存integration seamを要件駆動の最小検証集合として実行する』)の逐語でなく要約言い換えになっている。確約級の設計根拠として引くなら逐語断片を併記した方が照合しやすい
