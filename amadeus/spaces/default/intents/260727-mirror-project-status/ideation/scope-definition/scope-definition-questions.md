# Scope Definition 質問ファイル — 260727-mirror-project-status

**モード**: Guide me
**前提**: スコープ境界(Issue #1560 全体・非対象4項)は上流 intent-statement の Initial Scope Signal で裁定済み。本ステージの未決は優先度分類の確認とシーケンス方針の2点のみ。

---

## Q1. MoSCoW 分類の確認

Issue #1560 の受入条件15項目の優先度分類。intent-capture Q3 で「全体を本 intent で扱う」と裁定済みのため、推奨は「全項目 Must、非対象4項を Won't、Should/Could は置かない」(cid:scope-definition:c2 の先例 — 公開契約を完結させる能力はすべて Must とし中間分類を置かない)。制約条件は上流 constraint-register(C-T1〜C-E2)を分類の境界条件として参照する。

A. 全15項目 Must / 非対象4項 Won't / Should・Could なし(推奨)
B. コア同期系を Must、repair status 拡張・Status 名上書き設定を Should に落とす(ただし Q3 裁定の「全体を扱う」とは実装順の含意のみ整合)
C. その他の分類を提案したい
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## Q2. シーケンス方針(何を最初に証明するか)

上流 feasibility-assessment の R-3(updateProjectV2ItemFieldValue mutation 未実測 = live risk)を受け、Construction の並び順の方針。推奨は risk-first: walking skeleton で「mutation の成立を含む最小 end-to-end(検出→解決→更新→receipt 記録)」を最初に証明し、その後に幅(複数 Project・上書き設定・parked マッピング)と診断(repair status)を広げる(cid:scope-definition:c3 の先例 — 未証明の基盤に依存する価値面を先行着地させない)。

A. risk-first: skeleton で mutation 成立を最初に証明(推奨)
B. value-first: 単一 Project の Running→In Progress 同期を最短で使える状態にすることを優先
C. dependency-first: 状態モデル(pending/safety-blocked の codec/reducer)から積み上げる
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## 裁定の記録

- Q1=A(全項目 Must / 非対象 Won't)、Q2=A(risk-first)。回答は Guide me バッチ1回で取得し、下記の確認サマリーでユーザーが確定した。
- ユーザー承認: 2026-07-27T04:13:31Z(確認サマリー「はい、生成へ進む」の実受領時刻へ訂正 — 先行記入していた見込み時刻 04:12:00Z を実測値で置換)
- 2026-07-27 改訂(revision 1): 承認ゲートで Request Changes — 写像対象を作業進行状態から lifecycle フェーズ(Ideation/Inception/Construction/Operation/Done)へ訂正(Issue #1560 本文も同時改訂、受入条件は15→17項目、parked 明示マッピング廃止)。Q1(全項目 Must)と Q2(risk-first)の裁定自体は改訂後の17項目にそのまま適用(ユーザーのフィードバックは分類・順序方針への異議ではなく写像対象の訂正)。
