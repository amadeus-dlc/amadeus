# Code Generation Plan：#401 AI-DLC v2 差分対応順序

## 目的

Issue #401 の受け入れ条件として、#391、#392、#393、#394 の対応順序と PR 境界を追跡できるようにする。

この Unit では #391 から #394 の個別実装は行わない。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `docs/amadeus/aidlc-v2-difference-response-plan.md` | 新規作成 | #391、#392、#393、#394 の対応順序、分類、PR 境界、検証コマンドを定義するため。 |
| `docs/amadeus/skill-language-policy.md` | 関連文書リンクを追加 | #395 の方針から #401 の差分対応順序へ辿れるようにするため。 |
| `aidlc-state.md`、`audit/audit.md` | B002 完了証跡と B003 開始を記録 | 親 Issue #399 が #395、#400、#401、#402 の順序と依存関係を追跡できるようにするため。 |
| `construction/U003-issue-401-upstream-difference-order/code-generation/*` | 計画、要約、memory を追加 | B003 の判断と対象外範囲を記録するため。 |

## 対応順序

1. #391 reviewer 指定の対応。
2. #393 sensor と Learn の写像。
3. #392 Build and Test の失敗時処理。
4. #394 Operation phase の対象外理由。

## 判断

#391 と #393 を先に扱う。

reviewer、sensor、Learn は stage skill の確認、検証、知見記録の境界に影響するためである。

#392 は Build and Test の失敗時処理であり、#391 と #393 で確認と知見記録の境界を決めた後に判断する。

#394 は Operation phase の対象外境界を明文化する docs 中心の対応であり、Construction までの差分判断後に扱う。

## 検証方法

Code Generation ではテスト実行結果を記録しない。

テスト実行と結果記録は B003 の Build and Test で行う。

## 対象外

- #391、#392、#393、#394 の個別 close。
- reviewer、sensor、Learn の新規実装。
- Operation skill の追加。
- 残り Amadeus skill の段階的英語化単位の決定。
- Issue #401 の close。
- PR の作成。
