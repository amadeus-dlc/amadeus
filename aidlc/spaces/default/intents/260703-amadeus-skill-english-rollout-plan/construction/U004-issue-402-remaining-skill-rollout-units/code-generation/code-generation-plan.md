# Code Generation Plan：#402 残り展開単位

## 目的

Issue #402 の受け入れ条件として、残り Amadeus skill の英語化単位、優先順位、検証コマンド、#391 から #394 との衝突回避を追跡できるようにする。

この Unit では残り skill の英語化そのものは行わない。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `docs/amadeus/skill-englishization-rollout-plan.md` | 新規作成 | 残り skill の英語化単位、優先順位、検証コマンド、衝突回避を定義するため。 |
| `docs/amadeus/skill-language-policy.md` | 関連文書リンクを追加 | #395 の方針から #402 の展開単位へ辿れるようにするため。 |
| `aidlc-state.md`、`audit/audit.md` | B003 完了証跡と B004 開始を記録 | 親 Issue #399 が #395、#400、#401、#402 の順序と依存関係を追跡できるようにするため。 |
| `construction/U004-issue-402-remaining-skill-rollout-units/code-generation/*` | 計画、要約、memory を追加 | B004 の判断と対象外範囲を記録するため。 |

## Rollout Unit

| 優先 | Rollout Unit | 対象 |
|---:|---|---|
| 0 | Representative foundation | `amadeus-construction-functional-design` |
| 1 | AI-DLC v2 difference PRs | #391、#393、#392、#394 で触る skill |
| 2 | Core entrypoints and verification | `amadeus`、`amadeus-steering`、`amadeus-validator` |
| 3 | Construction stage skills | Construction stage skills から `amadeus-construction-functional-design` を除いた skill |
| 4 | Inception stage skills | Inception stage skills |
| 5 | Ideation stage skills | Ideation stage skills |
| 6 | Supporting analysis and review skills | 補助分析と review 系 skill |

## 判断

AI-DLC v2 difference PRs を先に扱う。

reviewer、sensor、Learn、Build and Test、Operation phase の判断が、後続英語化の語彙と意味保存に影響するためである。

Core entrypoints and verification は、stage skill が参照する単一公開入口、Space 初期化、検証の語彙を先にそろえるため、stage family より前に扱う。

Construction stage skills は、代表 skill の知見を直接再利用できるため、Inception と Ideation より前に扱う。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B004 の Build and Test で行う。

## 対象外

- 残り Amadeus skill の実際の英語化。
- #391、#392、#393、#394 の個別 close。
- Operation skill の追加。
- Issue #402 の close。
- PR の作成。
