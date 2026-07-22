# ドメイン用語集(Ubiquitous Language)

このプロジェクトで使う用語の正本。Tier 2 Team Knowledge(`amadeus/spaces/<space>/knowledge/amadeus-shared/`)として全エージェントのステージ実行コンテキストに自動ロードされる。

## 運用ルール

- **正本は1箇所**: フレームワーク用語の定義正本は `docs/guide/glossary.md`(英)/ `docs/guide/glossary.ja.md`(日)。本ファイルはそれらを再定義せず、チーム固有の用語と表記の決定だけを持つ。既存正本にある用語はポインタで参照する。
- **意見を持つ**: 同じ概念に複数の呼び名があるときは1つを正とし、他を「避ける表記」に列挙する。
- **定義は短く**: 1〜2文。何であるかを書き、実装詳細は書かない。
- **確定した時点で書く**: 用語が結晶化するのはステージ作業中(requirements-analysis の語彙固定、functional-design の domain-entities 等)。確定したらためずにその場で本ファイルへ反映する。
- **出典を残す**: 定義が選挙・裁定・成果物に由来する場合は出典(cid・E-code・file:line)を併記する。

## 用語(チーム決定分)

<!-- 書式:
**用語**:
定義(1〜2文)。(出典)
_避ける表記_: 別名1、別名2
-->

(未登録 — 用語が確定し次第、上の書式で追記する)

## フレームワーク用語(正本へのポインタ)

以下は定義済みのため本ファイルでは再定義しない:

- **Bolt / Unit of Work / Intent / Space / Record dir / Scope / Artifact / Audit trail / Knowledge / memory.md / Runtime graph** ほか — `docs/guide/glossary.md` を参照
- **チーム運用用語**(leader / conductor / builder / reviewer、選挙、ノルム、delegate-approval 等)— `amadeus/spaces/default/memory/team.md` の該当 cid を参照
