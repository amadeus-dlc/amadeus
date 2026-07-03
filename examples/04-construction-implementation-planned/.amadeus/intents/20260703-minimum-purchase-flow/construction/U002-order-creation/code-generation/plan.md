# Plan：注文作成

U002 注文作成の Code Generation の実装計画である。
Bolt B001（注文作成の walking skeleton）の対象であり、対応する要求は R003 と R004 である。
注文作成は購入の申し込みの記録までとし、決済を含めない（GD002）。
入力は、`functional-design/` の 4 成果物、`inception/requirements-analysis/requirements.md`、`inception/application-design/` の成果物である。

## 前提と判断

U002 は、選択した商品と数量の受け渡しで U001 商品閲覧に依存する（`unit-dependencies.md`）。
そのため、Bolt B001 内では U001 の実装を先行させ、U001 の計画が作る土台（`package.json`、`src/persistence/database.ts`、`src/persistence/schema.sql`、`src/server.ts`）を前提にする。
ディレクトリ編成、Web UI、データベース、テストランナーの仮の構成は、U001 の計画の前提と判断を共用する。

前段の成果物が Code Generation へ委ねた点は、次の判断で確定する。

| 判断 | 理由 |
|---|---|
| 注文番号は `ORD-` に続く 8 桁の大文字英数字にする | 形式の確定は Code Generation に委ねられており（`business-logic-model.md` の未確認事項）、`mockups.md` の表示例 ORD-XXXXXXXX に合わせる。一意性は注文テーブルの一意制約と、発行時に衝突した場合の再発行で担保する |
| 合計金額の算出は C005 注文作成サービスに置き、注文内容確認画面の表示にも同じ算出を使う | 画面表示と注文の記録で同じ算出結果を使うため（Application Design の設計判断 5、`business-rules.md` の 3） |
| 作成に失敗したことの表示は「注文を作成できませんでした。もう一度お試しください。」を仮の文言にする | 文言が未確認のため（`frontend-components.md`）、ゲートの承認で差し替えられる仮置きにする |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `src/domain/order.ts` | 新規。注文（注文番号、商品の識別子、商品名、数量、価格、合計金額）と、作成前の確認に使う注文内容を定義する（`domain-entities.md`） |
| `src/persistence/schema.sql` | 更新。注文テーブルと注文番号の一意制約を追加する |
| `src/persistence/order-repository.ts` | 新規。C008 注文リポジトリの「注文を記録する」と「注文番号で参照する」を実装する |
| `src/service/order-creation-service.ts` | 新規。C005 注文作成サービスの「注文を作成する」を実装する。合計金額の算出（価格に数量を乗じる）、注文の生成、注文番号の発行、注文リポジトリへの記録の指示を含む |
| `src/ui/order-confirmation-page.ts` | 新規。C002 注文内容確認画面。商品名、数量、価格、合計金額の表示。注文作成の指示と商品一覧への引き返しの受け付け。作成に失敗したことの表示 |
| `src/ui/order-completion-page.ts` | 新規。C003 注文完了画面。注文番号の表示と、商品一覧へ戻る操作の受け付け |
| `src/server.ts` | 更新。注文内容の確認、注文の作成、注文完了の画面遷移を追加する |
| `test/persistence/order-repository.test.ts` | 新規。注文の記録と注文番号による参照のテスト |
| `test/service/order-creation-service.test.ts` | 新規。合計金額の算出と、注文番号の発行と一意性のテスト |
| `test/ui/order-pages.test.ts` | 新規。注文内容確認画面と注文完了画面の表示、失敗時の振る舞い、戻る操作のテスト |

## 変更順序

1. 注文と注文内容（`src/domain/order.ts`）を定義する。
2. `schema.sql` に注文テーブルと一意制約を追加し、注文リポジトリとそのテストを書く。
3. 注文作成サービスとそのテスト（合計金額の算出、注文番号の発行と一意性、記録の指示）を書く。
4. 注文内容確認画面と注文完了画面を作り、`server.ts` に画面遷移を追加する。
5. 画面のテスト（表示内容、失敗時の振る舞い、戻る操作）を書く。

## 検証方法

テストコードで次を確認する。
テストの実行と結果の記録は、Stage 3.6 Build and Test の責務である。

- 選択した商品の商品名、数量、価格と、合計金額が表示される（R003）。
- 合計金額が価格に数量を乗じた金額になり、画面表示と注文の記録で同じ算出結果を使う（R003、Application Design の設計判断 5）。
- 注文を作成すると、一意の注文番号が発行され、注文完了画面に表示される（R004）。
- 作成した注文がリレーショナルデータベースに記録され、注文番号で参照できる（R004）。
- 注文の作成に失敗した場合、注文完了画面へ遷移せず、失敗したことを表示して注文内容確認画面に留まる（`business-rules.md` の例外）。
- 注文内容確認画面から商品一覧へ戻る操作では、注文を作成しない（R003、`business-rules.md` の 7）。

商品選択から注文の記録までの貫通は、Bolt B001 の Build and Test で確認する（`bolt-plan.md` の Definition of Done）。

## 未確認事項

- リレーショナルデータベースの製品は未確認である（`tech.md`）。U001 の計画の仮の構成（SQLite と `database.ts`）を共用する。
- 作成に失敗したことの表示の文言は未確認である（`frontend-components.md`）。前提と判断に書いた仮の文言を使う。
