# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の対象境界を stage 判定と workspace 対応記録に固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | BC001 自己開発運用を採用する | 採用 | D001 | [D002-bc001-self-development-governance.md](decisions/D002-bc001-self-development-governance.md) |
| D003 | Unit と Bolt を stage 方針記録と workspace provenance 記録に分ける | 採用 | D001, D002 | [D003-unit-bolt-granularity.md](decisions/D003-unit-bolt-granularity.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Issue #233 と D002 の対象範囲に従って Inception 境界を固定するため。 |
| D002 | D001 | Inception 境界に合わせて Unit のコンテキストを採用するため。 |
| D003 | D001, D002 | 採用した境界づけられたコンテキスト内で Unit と Bolt の粒度を固定するため。 |
