# Intent Statement — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Date**: 2026-08-10 / **Stage**: intent-capture (1.1) / **Scope**: self-feature

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)。一次入力は GitHub Issue #2785(クロスレビュー済み・REFRAME 反映済み本文)、クロスレビューコメント2件(2026-08-10、収束 REFRAME_REQUIRED)、および本ステージの質問票回答3件である。

## Problem Statement

grilling(Grill me モード / `/amadeus-grilling`)の終了条件と depth 契約が同じ軸(質問数)で衝突しており、grilling の存在意義である「深掘り」が構造的に成立しない。現行 D6(`grilling-protocol.md:34`)は Minimal 4 / Standard 8 / Comprehensive 12 のハード上限で継続提案を禁止し、10領域級の論点空間では1領域1問強しか割けない — 幅を守れば深さが死に、深さを守れば幅が死ぬ。数の予算では両方守れない。

この上限は欠陥ではなく、#1999 のユーザー裁定(PR #2063)が移植時要件 FR-1.6(Hybrid 終了)を上位置換した承認済み仕様変更である。本 intent が求めるのはその**再変更**: 終了条件の意味論を「質問数の予算」から「論点ツリーの被覆完了」へ移す。上流 mattpocock/skills の現行 grilling(frontier 駆動、ピン SHA `1495d014`、MIT)を骨格として逐語採用し、Amadeus 契約(depth = 枝刈りの materiality 閾値、第4段 Free、回路遮断器、質問ファイル・監査契約)を overlay として分離する。正しい対立軸は「被覆保証」対「セッション長の有界性」であり、両立は枝刈り閾値+毎ラウンド人間ゲート+回路遮断器で図る。

## Target Customer

1. **この repo の開発チーム自身(一次)** — ドッグフーディング。直近の実需は Rust ナレッジ(`amadeus-shared/rust/`)起草前の10領域設計議論で、現行 grilling は Comprehensive 12問でも深掘り不能と判断されセッション中断に至った(2026-08-10 実測、standalone は監査を出さないため会話記録ベース)。
2. **Amadeus を導入する外部チーム(二次)** — 全ハーネス配布の標準機能として、ルール集起草・アーキテクチャ裁定のような列挙型の設計議論を1セッションで完走できる深掘りインタビューを得る。

## Success Metrics

| 指標 | 種別 | 測定方法 |
|---|---|---|
| 骨格の逐語採用 | 機械検証 | ピン済み原文(`1495d014`、sha256 `fa5c1e5e…`)との機械照合(diff)で骨格文言の無改変を確認。帰属ヘッダに取り込み SHA を記録 |
| 被覆駆動の終了 | 受け入れ実走 | **Rust ナレッジ設計議論(10領域)を standalone Free モードで「全分岐訪問済み」まで完走する dogfood**(Q2 裁定)。刈られたノードの明示列挙も確認 |
| 回路遮断器の実効 | 落ちる実証 | depth 指定時の桁超過で「ツリー未完走」を明示開示して停止することをテストで固定(silent 打ち切り禁止) |
| 契約面の同期 | 既存ゲート | t199 維持、**t415 の逐語 pin は仕様裁定とセットで明示改訂**、question-budget センサー契約の改訂、`bun run build` + `source-only:check` + 隔離2回ビルド再現性検査 green |

## Initiative Trigger

実利用での機能不全の観測(2026-08-10、Rust ナレッジ議論の中断)を起点に、乖離の系譜を調査で確定した: 2026-07-06 移植(`f94a5a7ab`、Hybrid 終了)→ 2026-07-31 上流が frontier 駆動へ進化(コミット `a4b2009a1a3a`、Amadeus 未追随)→ 2026-08-03 Amadeus 側が #2063 で逆方向に硬化。市場圧力や規制ではなく、上流プラクティスの進化への追随+自リポジトリでの実測欠陥駆動。#2785 はクロスレビュー(2名独立、収束 REFRAME_REQUIRED → 機械的訂正反映済み)を経ている。

## Initial Scope Signal

`self-feature`(確定済み — 終了条件の意味論変更はユーザー可視契約の変更)。スコープ境界:

- **In**: `grilling-protocol.md` 全面書き直し(上流骨格+overlay 2層)、`stage-protocol.md` §3 Step 3d・§8 Depth-Level Contract・§3 depth 表の整合改訂、`/amadeus-grilling` スキル(standalone 既定 = Free)、`question-budget` センサー契約、`VALID_DEPTH_VALUES` との整合、t415 の明示改訂、prose 消費者(「1問ずつ」8箇所)、docs(hybrid 残存2箇所を含む — **書き直しで自然に消える面のみ同梱、独立修正としては扱わない**(Q3 裁定))。
- **Out**: #2683 L2 行の改訂(**本 intent 単独で進め、着地後に #2683 へ反映報告**(Q1 裁定))。Guide me 等の他モードの質問上限自体の変更。#2063 が導入した bounded review 契約の grilling 外の面。
- **要件段で裁定する未決4点**(#2785 完了条件8): (a) Free = depth 第4値 vs standalone 専用パラメータ (b) 「depth は上限でない」と workflow の §8 depth 契約の緊張の一意化 (c) semi 下の Grill me 除外契約の要否 (d) は Q1 で裁定済み(単独先行・後反映)。
