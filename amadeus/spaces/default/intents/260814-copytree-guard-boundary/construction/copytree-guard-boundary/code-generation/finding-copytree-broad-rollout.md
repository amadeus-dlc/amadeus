## 背景・対象範囲

Issue #3014 のトリアージ裁定(intent 260814-copytree-guard-boundary の Q3)で分離した、スコープ (b) = **未ガード素 cpSync 面全域への post-condition 契約の適用拡大**の追跡。#3014 本体はスコープ (a)(同一関数内の dest-fresh 再帰木 5 サイトへの guard 適用)と (c)(CopyTreeOps.exists 除去)を実装して閉じる。

## 根拠・実測証拠

測定 ref: origin/main `f60b3f4c8`(xrev-260814-3014 凍結断面)。

- dist 由来の素 cpSync の上界: **64 サイト / 33 ファイル**(reviewer-1 の変数束縛追跡述語 R1' — #3014 コメント参照。うち再帰木コピー 51 / 単一ファイル 13)。狭い述語(P-A)では 19/15
- これらは copyTreeWithRetry の post-condition 契約(「partial copy を無音で通さない」fixtures.ts:633-637)の適用外で、src 側並行変異時に部分コピーが無音通過する(reviewer-1 実測: src 並行追加で 12/12 無音乖離)
- 特筆面: `tests/helpers/upstream-v2-fixture.ts:161`(ガード面と同一 src ツリー `dist/claude/.claude`)、`tests/integration/t52-drift-meta-validation.test.ts:93`(最大規模)、`tests/harness/fixtures.ts:861-871`(seed 済み dest への merge 依存 — **merge 意味論を検証できる別ヘルパの設計が必要**)、`fixtures.ts:1030-1048`(setupWorkspaceJourney)

## 期待結果・完了条件

トリアージで適用範囲を裁定し実装する: (1) 適用対象の検索述語を AC に固定(件数は述語依存 — 19〜233 の12倍散らばりを実測済み) (2) 単一ファイル面の扱い(guard は ENOTDIR 非リトライで適用不能 — 単一ファイル用 post-condition の要否) (3) merge 依存面(fixtures.ts:861)用の merge 検証ヘルパの要否 (4) 赤フレーク化コスト(並行 writer 下では 3 attempt 全滅が確定的 — 可視化と安定性のトレードオフ)の受容判断。

## 影響・価値

未ガード面では partial copy が無音通過し後段が偽 green / 偽 red を出しうる(#3014 xrev 両レビュアーの指摘)。可視の赤より悪い欠落クラスの解消。

## 関連

- #3014(スコープ (a)(c) の本体 — 本 Issue はその (b) 分離)/ #3003・#2397(guard の起源)/ PR #2593(置換述語が識別子リテラルだった起源因果)

## 初期分類

- 種別: enhancement(既存契約の適用範囲の意図的拡大 — xrev 裁定により bug ではなく契約の追加)/ 優先度: P3
