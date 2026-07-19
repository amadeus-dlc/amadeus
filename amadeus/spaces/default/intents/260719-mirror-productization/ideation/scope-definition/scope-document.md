# Scope Document — mirror-productization

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## In Scope(全て Must)

| ID | 能力 | 内容 | 対応 grilling 裁定 |
|---|---|---|---|
| S-01 | ツール移設 | scripts/amadeus-mirror.ts → packages/framework/core/tools/(scripts 版廃止、全ハーネス投影) | G-2 |
| S-02 | status verb | 読取専用の乖離診断(状態行 stale / ミラー未作成 / Issue 手動変更の3クラス検出) | G-3 |
| S-03 | SKILL /amadeus-mirror | status 診断→create/sync/close 分岐の薄い user-invocable SKILL(session skills 様式の in-tree 配布、read-only 分類ではない) | G-3 |
| S-04 | 3層 config 機構 | Global(amadeus/ 直下 git 共有)→Space→Intent の汎用階層解決。初キー auto-mirror のみ | G-5b/G-6 |
| S-05 | phase 境界 ask | engine が phase boundary で「ミラー同期しますか?」ask directive(ミラー未作成時は create 選択肢込み)。既存 directive 語彙のみ | G-4 |
| S-06 | auto-mirror | 設定有効時、phase 境界の ask を飛ばして sync 実行の print 指令。auto は sync のみ(create/close は常に ask) | G-4/G-7 |
| S-07 | ノルム改定 | gh optional runtime 依存の許容(gh-scripts-boundary 改定)を norm PR で | G-1 |

## Out of Scope(Won't)

| ID | 除外 | 根拠 |
|---|---|---|
| W-01 | 既存設定(Construction Autonomy Mode 等)の3層 config への移行 | G-5b — 将来 intent |
| W-02 | マシンローカル config 層(gitignore) | G-6 — YAGNI、将来キーが要求したら |
| W-03 | GitHub 以外のトラッカー対応・transport 抽象化 | stakeholder-map 非ステークホルダー |
| W-04 | mirror 本体の機能拡張(本文様式変更・双方向 sync 等) | 移設は挙動不変が原則(A-1)。status は新規 verb であり本体3 verb は不変 |
| W-05 | auto での create/close 実行 | G-7 — 副作用境界の確約 |

## Bolt 分割方針(U-01 裁定 2026-07-19: 1 intent・Bolt 分離)

- **Bolt 1(先行・単独ゲート)**: S-01+S-02+S-03 — 移設+status+SKILL の縦スライス(既存機構に乗る低リスク面。greenfield 要素 = 新配布経路につき walking-skeleton 扱い)
- **Bolt 2 以降**: S-04(config 機構)→ S-05/S-06(engine 組込)。S-07(norm PR)は Bolt 1 マージの前提として先行
- 正確な Bolt 列・依存は units-generation / delivery-planning で確定

## 実施範囲と出口

- 本 intent: ideation を本セッションで実施(ユーザー直接対話方式 — P-02)。以降の Inception 続行/park はユーザー判断
- 出口: ideation 完了時に mirror Issue を起票・同期(intent-first-mirror-issue 準拠 — 本 intent 自身が mirror 運用のドッグフード)

## 成功指標(intent-statement から)

1. 配布3面の drift guard 機械同期
2. phase 境界のミラー同期漏れゼロ(組込後 intent で実測)
3. status が乖離3クラスを検出
