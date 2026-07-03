# Code Generation Plan：商品選択

B001 注文作成の貫通（walking skeleton）における U001 商品選択の実装計画である。
入力は functional-design の 4 成果物、requirements.md（R001、R002）、application-design の成果物である。
greenfield のため変更対象はすべて新規作成であり、パスは対象リポジトリのルートからの相対パスである。
B001 の商品一覧は商品名と価格だけを表示し、在庫状況の表示と在庫にもとづく選択可否は B002 で在庫参照（U002）が加える（bolt-plan.md の B001）。

## 実装判断

| # | 判断 | 理由 |
|---|---|---|
| 1 | プロジェクトの土台（package.json、tsconfig.json）の作成を U001 の変更に含める | U001 は B001 で最初に実装する Unit であり、U003 はこの土台を前提にする（unit-of-work-dependency.md で U003 は U001 に依存する） |
| 2 | Web アプリケーションは Express のサーバーサイドレンダリングにし、3 画面を HTML で返す | 3 画面のルーティングとフォームの受け付けを最小の記述で成立させ、フロントエンドのビルドパイプラインを増やさない。代替の Node.js 標準 http は、ルーティングとフォーム解析の手書きが walking skeleton の骨格の見通しを損なう |
| 3 | 商品データは、商品一覧提供の中の定義済みデータ（TypeScript の定数）として投入済みにする | business-logic-model.md の未確認事項（保存先はこの実装計画で確定する）への判断である。walking skeleton の全層貫通はリレーショナルデータベースへの注文の記録（U003）で証明するため、商品の保存先を増やさないことが最小の変更である。商品の登録と更新の手段は本 Intent の対象外（intent-backlog.md の受け皿）のまま変わらない。代替の商品テーブルと seed 投入は、登録と更新の手段がない現時点では過剰である |
| 4 | 商品一覧画面の行の描画は選択可否を入力に取り、B001 では全商品を選択可として渡す | business-rules.md の 3 に従う。選択操作の可否を商品ごとに制御できる構造を用意し、在庫にもとづく判定は B002 で U002 が差し込む |
| 5 | テストは Node.js 標準の node:test で書く | テスト方針が未確認（practices-discovery は SKIP）のため、追加依存のない標準のテストランナーを使う |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| package.json | 新規作成。依存（express）、開発依存（typescript、@types/express、@types/node）、scripts（build、test、start）を定義する |
| tsconfig.json | 新規作成。strict を有効にし、src/ から dist/ へビルドする設定を定義する |
| src/product/product-catalog.ts | 新規作成。商品一覧提供。商品（商品識別子、商品名、価格）の投入済みデータを持ち、「商品一覧を取得する」（component-methods.md）を実装する |
| src/product/product-service.ts | 新規作成。商品サービス。商品一覧提供の一覧を、商品一覧画面の表示に使う情報として提供する |
| src/web/pages/product-list-page.ts | 新規作成。商品一覧画面。商品ごとに商品名、価格、選択操作を 1 行で表示する HTML を組み立てる。行の描画は選択可否を入力に取り、選択不可の商品には選択操作を表示しない |
| src/web/routes.ts | 新規作成。商品一覧画面の表示（GET /products）を定義する。選択操作の遷移先は GET /orders/new（商品識別子を query で引き継ぐ。画面は U003 が実装する）にする |
| src/web/server.ts | 新規作成。Express アプリケーションの組み立てと起動 |
| test/product/product-catalog.test.ts | 新規作成。商品一覧提供のテスト |
| test/web/product-list-page.test.ts | 新規作成。商品一覧画面のテスト |

## 変更順序

1. package.json と tsconfig.json を作り、ビルドとテストの実行手段を確定する。
2. 商品一覧提供（投入済みの商品データと「商品一覧を取得する」）を実装し、テストを書く。
3. 商品サービスを実装する。
4. 商品一覧画面（選択可否を入力に取る行の描画）を実装し、テストを書く。
5. ルーティングと Express アプリケーションを組み立て、GET /products で商品一覧画面を返す。

## 検証方法

テストの実行と結果の記録は Stage 3.6 Build and Test の責務であり、ここでは確認する観点だけを定める。

- ビルド（tsc）が通る。
- 商品一覧提供が、投入済みのすべての商品に商品識別子、商品名、価格が付いた一覧を返す（R001、business-rules.md の契約「商品一覧を取得する」）。
- 商品一覧画面が、商品ごとに商品名、価格、選択操作を 1 行で表示する（bolt-plan.md の B001 の Definition of Done。R001 のうち商品名と価格の表示、R002 のうち選択操作）。
- 選択不可を指定した商品には選択操作が表示されない（business-rules.md の 3 の制御構造。B001 では全商品が選択可であり、在庫にもとづく可否は B002 で確認する）。
- 選択操作が、選択した商品の商品識別子を注文内容確認画面へ引き継ぐ（business-rules.md の契約「商品を選択する」。遷移先の画面表示は U003 の検証で確認する）。
