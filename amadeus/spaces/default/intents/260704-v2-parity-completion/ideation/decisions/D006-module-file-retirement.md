# D006：モジュールファイルと intents.md 索引の廃止

## 判断

Intent モジュールファイル（`intents/<dirName>.md`）と `intents.md` 索引を廃止する。
概要、依存、目標プロファイルは v2 の `intent-statement.md` と `intents.json` で代替し、人間向け一覧は `intents.json` から必要時に生成する。

## 根拠

- 判断基準「重複系は削除」に該当する（Issue #396 論点 1、論点 4）。
- 前 Intent の CD009（現状維持）は「独自色検討の後続 Issue で再評価する」と明記しており、この Intent がその再評価である。

## 影響

- CD009 を上書きする。
- IndexGenerate.ts の常設運用と validator の Index 検査カテゴリを退役する。
- Intake の合流判定の照合先を intents.json と intent-statement.md へ移す。

## 由来

G002 の GD009。
