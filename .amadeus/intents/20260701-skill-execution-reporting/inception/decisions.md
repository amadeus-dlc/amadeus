# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の対象境界を skill 実行時問題報告契約に固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | BC001 自己開発運用を採用する | 採用 | D001 | [D002-bc001-self-development-governance.md](decisions/D002-bc001-self-development-governance.md) |
| D003 | 初期 Construction slice は新しい内部 skill ではなく共通契約から始める | 採用 | D001, D002 | [D003-common-contract-first.md](decisions/D003-common-contract-first.md) |
| D004 | Unit と Bolt を報告契約定義と代表 skill 反映に分ける | 採用 | D001, D002, D003 | [D004-unit-bolt-granularity.md](decisions/D004-unit-bolt-granularity.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Issue #248 と Ideation の対象境界に従って Inception 境界を固定するため。 |
| D002 | D001 | Inception 境界に合わせて Unit のコンテキストを採用するため。 |
| D003 | D001, D002 | 採用済み境界の中で、初期反映方式を固定するため。 |
| D004 | D001, D002, D003 | 採用した共通契約方式に合わせて Unit と Bolt の粒度を固定するため。 |
