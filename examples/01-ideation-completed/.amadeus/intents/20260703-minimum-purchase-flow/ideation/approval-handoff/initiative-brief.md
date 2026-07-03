# Initiative Brief：最小購入フロー

## 目的と成功条件

利用者が商品を選択して注文を作成できる最小の購入フローを実現する。

成功条件は次の 2 つである。

- 購入者が商品を選択して注文を作成できる。
- 注文作成の判断に在庫管理システムの在庫情報を参照できる。

## スコープ境界

対象: 商品選択、注文作成、在庫管理システムを参照元にする在庫参照、購入者向けの Web UI

対象外: 決済手段の拡張、会員ランク別価格、注文キャンセル

## バックログ要約

| 項目 | 優先度 |
|---|---|
| 注文キャンセル | Should |
| 決済手段の拡張 | Could |
| 会員ランク別価格 | Could |

詳細は [intent-backlog.md](../scope-definition/intent-backlog.md) にある。

## 制約

- 在庫情報は在庫管理システムを参照元にし、REST API で連携する。
- TypeScript と Node.js の Web アプリケーションとして開発し、注文はリレーショナルデータベースに記録する。
- 決済手段の拡張、会員ランク別価格、注文キャンセルは今回の対象にしない。

詳細は [constraint-register.md](../feasibility/constraint-register.md) にある。

## 体制

開発は単独開発者で行う。

チーム構成、キャパシティ、mob 計画が意味を持たないため、Team Formation は実行していない。
ステージ承認は会話内ゲート、phase と Bolt の確定は PR の人間 merge で行う。

## モック

- [wireframes.md](../rough-mockups/wireframes.md)：商品一覧、注文内容の確認、注文完了の 3 画面。
- [user-flow.md](../rough-mockups/user-flow.md)：商品選択から注文作成までのフロー。

## Inception への引き継ぎ

次の未確認事項を Inception で確定する。

- 在庫管理システムの REST API の具体的な連携仕様と確認先。要求分析の入力になる。
- 在庫管理システムを参照できない場合の振る舞い。RAID Log のリスクに対応する。
- Web UI のフレームワークとリレーショナルデータベースの具体的な製品。steering の `tech.md` で未確認のままである。

greenfield の Intent であり、既存コードベースはない。
