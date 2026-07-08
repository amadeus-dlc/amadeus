# Reliability Requirements — docs-rollout

> ステージ: nfr-requirements (3.2) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-D02/D04/D05)・`domain-entities.md`(変更対象表)

## REL-D01: 三者同期の機械保証

バンプ・CHANGELOG・バッジの同期は t68 が既にリグレッションとして保証する(新規検証コードを書かない — BR-D04)。PR は t68 グリーンを完了条件とする。

## REL-D02: README 刷新の検証可能性

FR-014 の grep 2点(`cp -r` 主経路の不在/bunx・npx・ハーネス選択・install・upgrade 言及の存在)は、**PR レビューチェックリストとして手順化**する(機械化は「docs のみの変更に新規テストを足さない」BR-D04 とのバランスで見送り — 将来 README 構造が安定したら sensor 化を検討)。

## REL-D03: タグ発行の追跡可能性

マージ後の `vX.Y.Z` タグ発行(BR-D05)は publish 手順書(U4)の前提確認と連鎖する。タグ未発行のまま publish に進めないこと自体は U4 手順書の章立て1が防ぐ(責務の所在を重複させない)。
