# Phase Check — Ideation(260820-fmc-drift-batch)

検証時刻: 2026-08-20T07:32:00Z / 検証者: conductor(full grant 下、fail-closed 境界ガード対象)
方法論: `.claude/knowledge/amadeus-shared/verification.md` の Ideation → Inception チェック(Intent → Scope → Intent Backlog の一貫性、scope 項目の裏付け)

## トレーサビリティ連鎖(Intent → Scope → Backlog)

| Intent(Success Metrics) | Scope capability | Backlog proto-Unit | 状態 |
|---|---|---|---|
| SM-1 drift 検出2腕 + 落ちる実証 | C-3186a / C-3186b | PU-4 applicability-arms | Fully traced |
| SM-2 replace-by-name + fail-open 閉鎖 + t448 再スコープ | C-2289 | PU-2 revise-model-commit | Fully traced |
| SM-3 境界3面是正 + PR系2モデル pin + 落ちる実証両境界 | C-2929 | PU-1 boundary-three-face | Fully traced |
| SM-4 advisory 完全撤去(互換ゼロ) | C-3187 | PU-3 advisory-retirement | Fully traced |
| SM-5 配送条件(CI green / squash / 着地後クローズ) | (横断制約 — scope-document §制約) | 全 PU に適用 | Fully traced |

補助項目: t448 自己参照比較の起票のみ(intent-capture Q3=C)→ scope-document Out of Scope + PU-5。Orphan なし(backlog 5 行はすべて上流へ遡れる。PU-5 は Q3=C 裁定が上流)。

## 実施済みステージと裏付け

- **Intent captured**: `ideation/intent-capture/` — intent-statement / stakeholder-map / questions(4問 AUTO_DECIDED、decision ID 併記)/ issue-evidence(4 Issue)。sensors: required-sections / upstream-coverage / question-budget / answer-evidence すべて PASSED(answer-evidence は初回 FAILED 2件 → タイムスタンプ・承認エビデンス行の是正後 PASSED — 検出面は正しく機能)
- **Scope defined**: `ideation/scope-definition/` — scope-document(in/out/制約/依存)/ intent-backlog(proto-Unit 5件、数値見積・MoSCoW)/ questions(operational 3問 AUTO_DECIDED)。sensors: required-sections / upstream-coverage / scope-sizing すべて PASSED
- **Feasibility confirmed**: feasibility ステージは self-feature スコープで SKIP(consumes_absent expected)。実現可能性の裏付けはクロスレビュー4名の実測(XR-260820-2289 / XR-260820-2929 — 対照実験・静的再現・境界述語の逐語評価)と #3186 改訂本文が代替し、scope-document §制約 に反映済み
- **Initiative approved**: intent-capture ゲートは full grant 下で auto-approve(AUTO_DECIDED、audit 記録)。バッチ構成・full grant・並列重視はユーザー実 HUMAN_TURN(2026-08-20)の直接指示

## 整合性チェック

- 矛盾: なし(scope-document の依存1本 [C-3187→C-3186] と intent-capture Q4=A [1 Issue = 1 Unit] は両立 — unit は4つ、順序依存が1本)
- 警告: C-3186 ⇔ C-2929 の弱い順序依存の可能性(検出の腕の語彙ソース次第)を scope-definition の Open question として functional-design へ申し送り

## 判定

Ideation → Inception 境界: **PASS** — 上記チェック全項目を満たす。

- [x] 検証完了(conductor、full grant 下の auto-approve 経路。境界ガードの実測はこの artifact の存在を前提とする)
