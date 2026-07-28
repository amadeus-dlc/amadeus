# Initiative Brief — solo-election

上流入力(consumes 全数): intent-statement.md(問題・承認系譜・成功指標)、scope-document.md(MoSCoW・skeleton)、intent-backlog.md(後続候補・共有面)、feasibility-assessment.md(GO 判定・ギャップ)、constraint-register.md(境界条件)。

## 概要

ソロモードに2体 subagent 選挙を導入する。main agent が選挙管理委員(open・blind verbatim 配布・開票・record 固定、不投票)、fresh subagent 2体が投票者(独立実測・自身で CLI 投票)。D-12 裁定(260718-election-ts-foundation)の残余実装であり、輸送層・票スキーマは実装済み — 残るは tally の2体 GoA 意味論、駆動プロトコル、SKILL ソロ分岐、ノルム改定(詳細: scope-document.md Must 7件)。

## ビジネス価値

ソロユーザーの裁定負荷を「全件」から「割れたケース(1-1/ブロック/棄権/追加議論残存)」へ縮小しつつ、人間コントロール(P4)と独立検証合意(P1)を保存する。チームモードの偶数設計の対称縮小形。

## リソースと前提(Ideation で確約する範囲)

- ソロモード・単一セッションの conductor + 発動ごとの subagent 2体(コールドスタート×2 が上限コスト)。Construction の staffing・Bolt 数は Delivery Planning で確定する(未確定の schedule を本書で捏造しない)。
- Team Formation は SKIP(ソロ運用)— named mob は存在しない。

## SKIP ステージの N/A 根拠

- market-research: N/A — 内部フレームワーク機能で市場仮説なし。価値根拠は intent-statement の Target Customer / Success Metrics が代替。
- team-formation: N/A — ソロモード対象機能そのもの。チーム編成は発生しない。
- rough-mockups: N/A — UI なし。CLI/プロトコルの出力契約は feasibility の verb 実測と後続 requirements が代替(cid:requirements-analysis:ui-less-mockups-as-output-contract は Inception 段で適用)。

## Go 判断の材料

- feasibility: GO(外部依存ゼロ、実装ギャップ5点はすべて既存機構の延長)
- 最大リスク: tally voters-aware 化のチームモード退行(R-01)— regression+落ちる実証の両側固定で緩和
- walking skeleton: 実選挙1件 e2e 完走+2-0/1-1 両分岐実証(最初の Bolt、ゲート付き)
