# code-generation plan — Bolt FR-4 / Issue #840

## 対象
`packages/framework/core/tools/amadeus-utility.ts` の `detectWorkspace`(:1917)内、言語走査の再帰対象を `SCAN_SOURCE_DIRS`(:1762 = src/app/lib/pages/components/tests)限定から、SCAN_EXCLUDE・ドット始まり・symlink・非 dir を除く全トップレベル dir へ一般化する。

## 根本原因
:1949-1954 の再帰ループが `for (const dirName of SCAN_SOURCE_DIRS)` に限定されており、ソースが `packages/`・`scripts/` 等の非定型 dir にある repo では `langCounts` が空 → `hasSourceFiles=false`(:1977)→ 他の brownfield 信号も無い repo で Greenfield 誤判定(:1994-1999)→ bugfix scope の reverse-engineering が SKIP 降格され得る。

## 契約(元修正 765fe4f20 / #459 と同等)
- SCAN_EXCLUDE とドット始まり(`.`)を除く全トップレベル dir を再帰対象へ一般化。
- 深さ 6・symlink 除外・SCAN_EXCLUDE 除外は維持(`countFilesByLang` 内で SCAN_EXCLUDE を honor 済み、`topSet` は :1924 で SCAN_EXCLUDE を除外済み)。
- ドット dir は除外を維持(config/harness 空間。harness-only 空 project の Brownfield 化を防ぐ)。

## 現行適合点
- 元修正は当時のセルフインストール正本 `.agents/amadeus/tools/amadeus-utility.ts` に適用。現在の正本は `packages/framework/core/tools/amadeus-utility.ts`。dist/self-install は `scripts/package.ts`+`promote:self` で同期。
- `topSet`(:1924)は既に SCAN_EXCLUDE をフィルタ済みのため、元修正の `for (const entry of topSet)` 反復と同一構造で契約同等。

## 実装(surgical)
:1949-1954 の SCAN_SOURCE_DIRS ループを、topSet 反復(ドット始まりスキップ・lstat・symlink/非dir スキップ・countFilesByLang 再帰)へ置換。それ以外は不変。

## テスト(in-process seam 優先)
detectWorkspace は export 済み。`dist/claude/.claude/tools/amadeus-utility.ts` から import して temp fixture で駆動:
- (a) `packages/` 配下のみにコードを置き manifest/framework 信号なしの fixture → Brownfield 判定(修正前 RED)。
- (b) SCAN_EXCLUDE(node_modules 等)とドット dir(.hidden)が走査されない(性能ガード保全)。
- (c) 既存定型配置(src/App.tsx)の判定不変(回帰なし)。

## 落ちる実証
修正を一時 revert して (a) が RED になることを実測 → GREEN 復帰。

## 閉包実測
Issue #840 の症状(非定型配置 → Greenfield/Unknown 誤判定)を verbatim 再現する fixture で非再現(Brownfield + languages 検出)を実測。

## 同根棚卸し
`SCAN_SOURCE_DIRS` 参照箇所を grep 列挙(hasAppSourceDir 等)。元修正 diff の他ファイル面の喪失有無を確認。
