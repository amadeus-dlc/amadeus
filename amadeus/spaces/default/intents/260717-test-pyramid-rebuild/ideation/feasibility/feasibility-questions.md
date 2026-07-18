# Feasibility — 明確化質問(260717-test-pyramid-rebuild、#684)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全3問 選挙不要(既決導出 — 実ツール検証・スコープ限定・設計論点の選挙送り)。
申告: e2 → leader(agmsg 送信 2026-07-17T10:30Z 頃 — agmsg 一次記録)
leader 承認: 2026-07-17T10:30:49Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
[Answer] 記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../intent-capture/intent-statement.md`

## 選挙不要判定(1問1行)

- Q1: 既決導出 — GO 判定は既存機構の実測(classifyTestSize 実在 tests/lib/test-size.ts・test_pyramid コレクタ・size ドリフトゲート)から導出
- Q2: 既決導出 — スコープは本 intent = 分類台帳+層設計+再編計画まで、実移設は Issue 分割(intent-statement 明記の転記)
- Q3: 既決導出 — 比率目標・層境界の具体値は requirements/design 段の選挙送り(intent-statement 明記)

## Q1: 技術的実現可能性の判定は?

- A. GO — サイズ分類基盤が**既に実在**: classifyTestSize(tests/lib/test-size.ts:23-, small/medium/large の3値・signal→最小サイズの決定的 rubric)+test_pyramid コレクタ(metrics-snapshot.ts:97-104 で tier_size 集計)+size ドリフトゲート(declared<measured で CI 赤)。分類スイープは fan-out で機械実行可、層設計・再編計画は文書化作業
- B. NO-GO
- C. 条件付き GO(新分類器の実装が前提)
- X. その他

[Answer]: A — GO(既存分類基盤の実ツール検証、E-OC1 承認 10:30:49Z)

## Q2: スコープ制約は?

- A. 本 intent = (i) サイズ分類台帳の計測導出 (ii) 層責務+比率目標+実行時間予算の設計 (iii) サイズ違反の移設是正を Issue 分割で計画。**実移設(テストの書き換え)は本 intent 範囲外**で別 intent 候補(単一 Bolt に押し込まない — units-generation 分割)
- B. 実移設まで本 intent に含める
- C. 分類のみ(設計・計画を除く)
- X. その他

[Answer]: A — 分類台帳+層設計+再編計画まで・実移設は Issue 分割(E-OC1 承認 10:30:49Z)

## Q3: 設計論点(比率目標・層境界・移設対象選定)の扱いは?

- A. requirements/design 段のエージェント選挙で確定(feasibility では制約登録のみ — t_wada 知見+実測データを前提材料に)
- B. feasibility で今決める
- X. その他

[Answer]: A — 設計論点は requirements/design 選挙送り(E-OC1 承認 10:30:49Z)
