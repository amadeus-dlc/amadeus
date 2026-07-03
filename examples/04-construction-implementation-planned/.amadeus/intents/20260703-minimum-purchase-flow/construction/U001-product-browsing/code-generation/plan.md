# Plan：商品閲覧

U001 商品閲覧の Code Generation の実装計画である。
Bolt B001（注文作成の walking skeleton）の対象であり、対応する要求は R001（在庫状況の表示を除く）と R002 である。
入力は、`functional-design/` の 4 成果物、`inception/requirements-analysis/requirements.md`、`inception/application-design/` の成果物である。

## 前提と判断

変更対象のパスは、Bolt B001 の worktree のリポジトリルートからの相対パスで書く。
実装は Bolt の branch と worktree で行うためである。

greenfield の Intent であり、対象リポジトリにはまだコードがないため、この Unit で TypeScript と Node.js のプロジェクトの土台も作る。

前段の成果物が確定していない点は、次の判断で補う。

| 判断 | 理由 |
|---|---|
| ディレクトリは domain、service、ui、persistence の責務別に分ける | `structure.md` の編成方針が未確認のため、Application Design の設計判断 1（画面、サービス、外部連携、永続化の 4 責務）に合わせる |
| Web UI は特定のフレームワークを導入せず、Node.js 標準の HTTP サーバーとサーバー側の HTML 生成で実装する | Web UI のフレームワークが未確認のため（`tech.md`）、B001 では追加依存のない最小構成で全層の貫通を証明し、フレームワーク確定時の置き換えを画面層に閉じる |
| 開発用のリレーショナルデータベースには組み込みで動かせる SQLite を仮に使い、接続を `src/persistence/database.ts` に閉じる | 製品が未確認のため（`tech.md`）、walking skeleton の Definition of Done「画面、サービス、永続化の各層が実際に接続されて動く」を満たしつつ、製品確定時の差し替えを接続定義に閉じる |
| テストコードは Node.js 標準のテストランナー（node:test）で書く | テスト方針が未確認のため（`tech.md`）、追加依存なしで実行できる標準機能を使う |
| 動作確認用の商品の初期データを `src/persistence/seed.sql` として同梱する | 商品情報の登録手段がこの Intent の対象外で未確認のため（`business-logic-model.md`）、C007 商品リポジトリが読み取る登録済みの商品情報を初期データで用意する |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `package.json` | 新規。TypeScript と Node.js の実行、ビルド、テストのスクリプトを定義する |
| `tsconfig.json` | 新規。TypeScript の設定を定義する |
| `src/domain/product.ts` | 新規。商品（商品の識別子、商品名、価格）を定義する。在庫状況は属性に持たない（`domain-entities.md`） |
| `src/persistence/database.ts` | 新規。リレーショナルデータベースへの接続を 1 箇所に閉じる |
| `src/persistence/schema.sql` | 新規。商品テーブルを定義する |
| `src/persistence/seed.sql` | 新規。動作確認用の登録済みの商品の初期データを定義する |
| `src/persistence/product-repository.ts` | 新規。C007 商品リポジトリの「商品一覧を参照する」を実装する |
| `src/service/product-browsing-service.ts` | 新規。C004 商品閲覧サービスの「商品一覧を取得する」を実装する。商品情報の取得と一覧の組み立てを、U003 在庫参照連携が組み込む在庫状況の合成と分けられる構造にする |
| `src/ui/product-list-page.ts` | 新規。C001 商品一覧画面。商品ごとの商品名と価格の表示、数量の入力（既定値 1、1 以上の整数）、選択操作の受け付け、選択した商品と数量の注文内容の確認への受け渡し。B001 では在庫状況を表示しない（GD006） |
| `src/server.ts` | 新規。アプリケーションの起動と画面遷移の入口 |
| `test/persistence/product-repository.test.ts` | 新規。商品一覧の参照のテスト |
| `test/service/product-browsing-service.test.ts` | 新規。商品一覧の取得のテスト |
| `test/ui/product-list-page.test.ts` | 新規。数量の検証と選択の受け渡しのテスト |

## 変更順序

1. `package.json` と `tsconfig.json` を作り、TypeScript の実行とテストの土台を整える。
2. 商品（`src/domain/product.ts`）を定義する。
3. 永続化層（`database.ts`、`schema.sql`、`seed.sql`、`product-repository.ts`）を作り、商品リポジトリのテストを書く。
4. 商品閲覧サービスとそのテストを書く。
5. 商品一覧画面と `server.ts` を作り、数量の検証と選択の受け渡しのテストを書く。

## 検証方法

テストコードで次を確認する。
テストの実行と結果の記録は、Stage 3.6 Build and Test の責務である。

- 商品一覧が、登録済みの商品ごとに商品名と価格を返す（R001 の受け入れ条件のうち、在庫状況の表示を除く）。
- 商品一覧画面が在庫状況を表示しない（GD006、`business-rules.md` の 2）。
- 数量の既定値が 1 で、1 以上の整数だけを受け付ける（R002）。
- 商品を選択すると、選択した商品と数量が注文内容の確認へ渡る（R002）。

画面から永続化までの貫通は、Bolt B001 の Build and Test で確認する（`bolt-plan.md` の Definition of Done）。

## 未確認事項

- Web UI のフレームワーク、リレーショナルデータベースの製品、テスト方針は未確認である（`tech.md`）。この計画では前提と判断に書いた仮の構成を使う。
- 商品情報の登録手段は未確認である（`business-logic-model.md`）。動作確認用の初期データで代替する。
