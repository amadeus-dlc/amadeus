# Delivery Planning — 質問票(0問様式)

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

## 選挙不要判定(E-OC1 証跡)

- 判定: 本ステージの質問は 0 問。Bolt 編成は unit-of-work-dependency.md の bolt_dag(compile 実測 4 バッチ)と既決ノルム(walking-skeleton 単独ゲート・並行 builder 上限4・1 Unit=1 Bolt=1 PR)からの機械導出=執行クラス(根拠種別: 既決ノルム+compile 実測からの一意導出、1問1行)。ソロモードのため team-allocation は役割配分でなく工程担当の記述とする。
- ユーザー承認: 2026-07-31T10:40:04Z(AskUserQuestion「0問で進める」)

## 裁定の記録

- 質問 0 件で成果物生成へ進むことをユーザーが承認した。
- ユーザー承認: 2026-07-31T10:40:04Z

## ノルム改訂への追従(2026-07-31、ゲート承認後)

- 判定当時の既決ノルムは「1 Unit=1 Bolt=1 PR」固定だった。#1842 の2段のノルム改訂(#1843 は誤った階層 `1 Unit = 1..N Bolt` を導入、#1847 `c358acf10` が本家 v2.3.0 実測により訂正)を経て、現行ノルム(定義と Bolt 粒度は正準へ委譲、PR 粒度は Bolt ごと既定・分割可)へ bolt-plan.md / unit-of-work.md を追従させた(執行クラス)。Unit 分割・依存・バッチは全経緯を通じて不変。
- 正準 2.8 の設問「What is Bolt granularity」への本 intent の回答: **one Unit per Bolt**(8 Unit は依存 DAG 上で凝集しており束ねる利得がない)。この回答は当初ゲート承認時の Bolt 列(B1〜B8 = u1〜u8)と同一であり、承認済み編成の再解釈のみで実体変更なし。
