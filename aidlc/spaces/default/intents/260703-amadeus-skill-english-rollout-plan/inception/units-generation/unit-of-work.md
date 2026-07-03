# Unit of Work：Amadeus skill 英語化実施計画

## 概要

この成果物は、Issue #399 の完了追跡を Unit へ分割する。

Unit 境界は、子 Issue 単位を基本にした機能別、中粒度とする。

実施順序と Bolt 分割は Delivery Planning の責務である。

## 境界戦略

| 項目 | 採用値 |
|---|---|
| 境界戦略 | 機能別 |
| 粒度 | 中粒度 |
| 基本単位 | #395、#400、#401、#402、#391〜#394、RU002〜RU006 |
| #401 配下 Issue | U003 で順序を確定し、U005 で個別完了または対象外判断を追跡する |
| #399 完了判断 | U010 の到達条件として扱う |

## Unit 一覧

| ID | Unit | 責務 | 対応要求 | 対応 Backlog |
|---|---|---|---|---|
| U001 | #395 方針確定 | Amadeus skill の SKILL.md 英語化方針、対象範囲、検証方法を確定し、後続 Unit の前提を作る。 | R001、R002、R004 | PB001 |
| U002 | #400 小さい土台 PR | 代表 skill で小さい土台 PR を作り、翻訳変更、意味変更、昇格フロー、検証結果の境界を確認する。 | R001、R002、R004 | PB002 |
| U003 | #401 AI-DLC v2 差分対応順序 | 英語化後の AI-DLC v2 差分対応順序を整理し、#391、#392、#393、#394 の扱いを #401 の完了証拠として追跡する。 | R001、R002、R003、R004 | PB003、PB005 |
| U004 | #402 残り展開単位 | 残り Amadeus skill の段階的英語化単位を決める。 | R001、R002、R004、R006 | PB004、PB006 |
| U005 | #391〜#394 AI-DLC v2 差分対応 | #401 で確定した順序に沿って、#391、#393、#392、#394 の完了または対象外判断を追跡する。 | R003、R005 | PB005 |
| U006 | Core entrypoints and verification 英語化 | `amadeus`、`amadeus-steering`、`amadeus-validator` の `SKILL.md` を英語化し、昇格先へ同期する。 | R004、R006 | PB006 |
| U007 | Construction stage skills 英語化 | 残り Construction stage skill の `SKILL.md` を英語化し、昇格先へ同期する。 | R004、R006 | PB006 |
| U008 | Inception stage skills 英語化 | Inception stage skill の `SKILL.md` を英語化し、昇格先へ同期する。 | R004、R006 | PB006 |
| U009 | Ideation and supporting skills 英語化 | Ideation stage skill、補助分析、review 系 skill の `SKILL.md` を英語化し、昇格先へ同期する。 | R004、R006 | PB006 |
| U010 | #399 最終検証 | Amadeus 系 `SKILL.md` の全面英語化、昇格先同期、検証結果、Issue #399 の完了条件を確認する。 | R005、R006 | PB006 |

## Unit 境界の補足

U001 は、後続 Unit の方針と検証方法の基準になる。

U002 は、代表 skill の小さい土台 PR により、英語化 PR の判断材料を確認する。

U003 は、#401 配下の #391、#392、#393、#394 を個別 Unit に分けない。

U004 は、残り展開単位を決める。

U005 は、#391〜#394 の差分対応を実際の残タスクとして追跡する。

U006〜U009 は、`docs/amadeus/skill-englishization-rollout-plan.md` の RU002〜RU006 を、実際の英語化 PR として進める。

U010 は、全面英語化完了後にだけ #399 の完了判断へ接続する。

## 対象外

この stage では、Bolt、実施順序、PR 作成手順、実装コードを定義しない。

これらは Delivery Planning 以降で扱う。
