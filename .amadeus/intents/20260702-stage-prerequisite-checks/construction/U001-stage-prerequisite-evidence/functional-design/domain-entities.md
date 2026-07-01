# Domain Entities

## 目的

stage 前提確認で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Skill Supply Evidence | source skill、昇格先成果物、host environment の確認結果を表す。 | DE002, DE003 |
| DE002 | Stage Prerequisite Evidence | stage0、stage1、stage2、stage0 採用判断の確認結果を表す。 | DE001, DE003 |
| DE003 | Stage Prerequisite Decision Node | decision review が stage 前提を評価する判断ノードを表す。 | DE001, DE002, DE004 |
| DE004 | Phase Skill Startup Guidance | phase skill 起動時に確認する説明を表す。 | DE003 |

## 関係

Skill Supply Evidence は Stage Prerequisite Evidence の入力になる。

Stage Prerequisite Evidence は Stage Prerequisite Decision Node で評価される。

Stage Prerequisite Decision Node の結果は、phase skill の起動時判断と Skill Contract の入力証拠に使われる。

Phase Skill Startup Guidance は、Ideation、Inception、Construction の phase skill から参照される。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001 内の stage 前提確認を扱うため。 |

## 未確認事項

なし。
