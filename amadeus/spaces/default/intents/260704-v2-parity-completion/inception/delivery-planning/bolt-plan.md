# Bolt Plan：260704-v2-parity-completion

束ね方は、最初の Bolt だけ Unit 横断の薄い縦切り（walking skeleton）、以降は関連 Unit の束とする。
順序は risk-first（GD011）で、Unit 依存 DAG と矛盾しない。
中間 PR は人間指示により省略し、Bolt 境界は audit イベントで記録して最終 PR 1 本に統合する。

## 一覧

| ID | Bolt | 含む Unit | 順序 | Definition of Done | 確信仮説（この Bolt が証明すること) |
|---|---|---|---|---|---|
| B001 | walking skeleton（エンジン縦切り） | U001 + U002 + U003 の薄切り（intent-capture 1 skill 分） | 1 | エンジン一式（tools、aidlc-common、sensors、hooks）が `.claude/` 配下で動作し、settings が aidlc-* 名前空間でマージされ、amadeus-intent-capture（適応コピー 1 個）が directive 駆動 + grilling 結線で実行でき、既存開発環境の回帰がない（`npm run test:all` green） | 適応コピー戦略（無改変エンジン + プロンプト層結線 + amadeus-* 改名）が成立する。以降の skill 置換が同じ型の繰り返しになる |
| B002 | skill 置換と整理 | U003 の残り + U004 | 2 | 本家 38 skill との名前写像が 1 対 1 で完成し、独自 5 skill が削除され、amadeus-steering が退役（0.1 / 2.2 へ畳み込み）し、promote 検証（`npm run test:it:promote-skill`）が green | B001 の型が全 skill にスケールする。削除後も入口に空白がない |
| B003 | 検査整備 | U005 + U006 | 3 | validator が新成果物契約で pass を判定し（旧形式の完了済み record は backward-compatibility.md の一覧で検査対象外）、parity-check.ts + parity-map.json が TDD で実装され green、npm script から実行できる | 双方向一致が機械観測できる（成功条件 1 の観測手段が成立する） |
| B004 | 文書と実証 | U007 + U008 | 4 | 規範文書（AMADEUS.md、rules、Skill Language Policy、sensor-learn-mapping、backward-compatibility.md）が新契約へ改定され、examples 4 snapshot が real provider 再生成されて provenance の staleReason が解消し、本 Intent の残り実行がエンジン駆動で行われて audit にエンジン記録が残り、`npm run test:all` が green | 成功条件 3 点（パリティ green、test:all green、1 周完走）がすべて観測される |

## 補足

- backward-compatibility.md への互換対象登録（完了済み 2 record）だけは、B003 の validator 変更より前に B003 内で先行実施する（backward-compatibility rules の「実装前に記録」に従う）。
- walking skeleton gate（B001 の人間承認）は、中間 PR 省略の指示により最終 PR のレビューへ統合する。
