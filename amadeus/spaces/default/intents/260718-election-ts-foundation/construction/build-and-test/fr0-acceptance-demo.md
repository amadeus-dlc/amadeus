# FR-0 受け入れ実演記録(ADR-6 実演層)— election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニットの code-generation-plan.md と code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 構成(2026-07-19 実施)

- 実行主体: general-purpose subagent(プロンプトに選挙ノルム・手順知識を一切含めず、SKILL 文書全文+ツールパス+定義/票ファイルのみを供給 — requirements.md FR-0 受け入れ基準の「fresh なセッション断面」構成。ambient なプロジェクト文脈の完全遮断はハーネス上不能のため、プロンプトで参照禁止を明示し、実行列が指令転送のみであることを証跡とする — 申告)
- 対象: zero-confirm 選挙1件(E-FR0DEMO1、投票者1名)を scratch project(--project override — 実 record 非汚染)で完走

## 実測結果(subagent 報告の転記)

- 指令列: **distribute → collect-wait → tally-ready → render → verify → done**(全コマンド exit 0・判断点/hold/エラーなし・verb/report は全て指令の字義実行)
- 生成 record(全文転記):

```
# Election Record — E-FR0DEMO1

- question: 本ステージの追加学習候補は 0 件でよいか(FR-0 受け入れ実演)

裁定: 採用
票タイムライン: demo-voter 2026-07-19T11:25:00Z → 開票 2026-07-19T11:29:49Z
GoA[E-FR0DEMO1]: 1x1 2x0 3x0 4x0 5x0 6x0 7x0 8x0
```

- GoA 行は実 parseGoaLine 互換様式(verify verb が round-trip 検証済み — code-summary.md の U5 検証列)

## 判定

FR-0 受け入れ基準(SKILL とツール指令のみで選挙1件を完走)を充足(bolt-plan.md Bolt 1 の e2e 実証+本実演の2層 — team-practices.md の実測 verdict 様式で記録)
