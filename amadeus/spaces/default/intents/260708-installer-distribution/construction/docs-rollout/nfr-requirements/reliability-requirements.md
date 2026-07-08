# Reliability Requirements — docs-rollout

> ステージ: nfr-requirements (3.2) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-D02/D04/D05)・`domain-entities.md`(変更対象表)

## REL-D01: 三者同期+配布物パリティの機械保証

バンプ・CHANGELOG・バッジの同期は t68 が保証するが、**t68 が読むのは `dist/claude/.claude/tools/amadeus-version.ts`(dist 側コピー)**であり、本 Unit が編集する `packages/framework/core/tools/amadeus-version.ts` との一致は保証しない。本 Unit は本 intent で**唯一 `packages/framework/core/` を触る Unit** であり、core→dist 再生成義務(project.md Mandated)が発火する。

**PR 完了条件**: t68 グリーン **かつ** `bun run dist:check` / `bun run promote:self:check` グリーン(バンプ後に `bun scripts/package.ts` と `bun run promote:self` を実行し同一コミットに含める)。

- 役割分担: t68 = dist/claude コピーと CHANGELOG/README の内部整合。dist:check / promote:self:check = 4つの dist ツリー+セルフインストールツリーがバンプ済み core を実際に反映していること — **相補的な2機構**であり片方では代替できない(新規検証コードは引き続き書かない — BR-D04)

## REL-D02: README 刷新の検証可能性

FR-014 の grep 2点(`cp -r` 主経路の不在/bunx・npx・ハーネス選択・install・upgrade 言及の存在)は、**PR レビューチェックリストとして手順化**する(機械化は「docs のみの変更に新規テストを足さない」BR-D04 とのバランスで見送り — 将来 README 構造が安定したら sensor 化を検討)。

## REL-D03: タグ発行の追跡可能性

マージ後の `vX.Y.Z` タグ発行(BR-D05)は publish 手順書(U4)の前提確認と連鎖する。タグ未発行のまま publish に進めないこと自体は U4 手順書の章立て1が防ぐ(責務の所在を重複させない)。
