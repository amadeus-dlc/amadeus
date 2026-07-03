# Code Generation Plan：注文作成

U003 注文作成の Code Generation の実装計画である。
Bolt B001（注文作成貫通の walking skeleton）の対象であり、対応する要求は R003、R004、R005、R007、R008 である。
入力は、`functional-design/` の 4 成果物、`inception/requirements-analysis/requirements.md`、`inception/application-design/` と `inception/refined-mockups/` の成果物である。

## 前提と判断

変更対象のパスは、対象リポジトリのルートからの相対パスで書く。
実装は Bolt B001 の branch と worktree で行う前提である。

U003 は、注文可否の判断で U001 在庫参照に、選択した商品識別子と数量の引き継ぎで U002 商品選択に依存する（`unit-of-work-dependency.md`）。
Bolt B001 内では U001 と U002 の実装を先行させ、両計画が作る土台（`src/domain/inventory-lookup.ts`、`src/domain/product-catalog.ts`、`src/server.ts`）と、ディレクトリ編成、Web UI、テストランナーの判断を共用する。

前段の成果物が Code Generation へ委ねた点は、次の判断で確定する。

| 判断 | 理由 |
|---|---|
| リレーショナルデータベースは、walking skeleton では SQLite（Node.js 標準の node:sqlite モジュール）を仮の製品にし、接続を `src/domain/database.ts` に閉じる | 製品が未確認で、確定はこの実装計画に委ねられている（`external-dependency-map.md`、`functional-design/memory.md`）。追加のインフラなしで注文の記録と注文番号による照会（R005）を成立させ、製品確定時の差し替えを接続定義に閉じる |
| 注文の永続化と接続定義は `src/domain/` に置く | 注文の記録と照会は注文コンポーネントの責務であり（`components.md`）、Application Design の設計判断 1 は永続化を独立の層にしていないため、注文の近くに置く |
| 注文番号の日内連番は、記録と同じトランザクション内で当日の注文件数から採番し、注文番号の一意制約で衝突を検出する | 注文番号の採番は注文コンポーネントの責務であり（Application Design の設計判断 4）、一意性（R004）をアプリケーションの採番とデータベースの一意制約の 2 段で守る |
| 注文の記録に失敗した場合は、注文を作成しない扱いにし、注文番号を提示せず、注文内容確認画面で失敗した旨を表示する | 表示が未確認のため（`business-rules.md` の未確認事項）、「注文を作成できませんでした。もう一度お試しください。」を仮の文言にし、ゲートの承認で差し替えられるようにする |
| 金額（価格 × 数量）と合計金額の算出は注文の組み立てに置き、注文内容確認画面の表示にも同じ算出を使う | 画面表示と注文の記録で同じ算出結果を使うため（R003、`business-rules.md` の 5） |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `src/domain/order.ts` | 新規。注文（注文番号、商品識別子、商品名、価格、数量、金額、合計金額、作成日時）と注文番号（形式 ORD-YYYYMMDD-NNNN）を定義する（`domain-entities.md`）。「注文を組み立てる」で採番と金額、合計金額の算出を行う。商品名と価格は注文作成時点の商品カタログの値を保持する（`business-rules.md` の 7） |
| `src/domain/database.ts` | 新規。リレーショナルデータベースへの接続を 1 箇所に閉じる |
| `src/domain/schema.sql` | 新規。注文テーブルと注文番号の一意制約を定義する |
| `src/domain/order-repository.ts` | 新規。注文の「注文を記録する」と「注文を取得する」を実装する（R005） |
| `src/service/order-creation-service.ts` | 新規。注文作成サービスの「注文を作成する」と「注文を照会する」を実装する。在庫参照で注文対象の商品の在庫状況を取得し、注文可否を判定する。在庫数量が注文数量に満たない場合は在庫不足、参照失敗の場合は在庫参照失敗として注文を作成しない（R007、R008、`business-rules.md` の 1〜3）。在庫が確認できた場合だけ、注文の組み立て、記録、注文番号の返却を一連で行う |
| `src/ui/order-confirmation-page.ts` | 新規。注文内容確認画面。商品名、数量、金額、合計金額の表示、注文作成の指示、商品一覧へ戻る操作の受け付け、在庫不足と在庫参照失敗と記録失敗の表示（`frontend-components.md`） |
| `src/ui/order-completion-page.ts` | 新規。注文完了画面。注文番号と、注文番号で注文を確認できる旨の表示（`frontend-components.md`） |
| `src/server.ts` | 更新。注文内容の確認、注文の作成、注文完了の画面遷移を追加する |
| `test/domain/order.test.ts` | 新規。注文番号の形式と採番、金額と合計金額の算出、作成時点の商品名と価格の保持のテスト |
| `test/domain/order-repository.test.ts` | 新規。注文の記録と注文番号による照会のテスト |
| `test/service/order-creation-service.test.ts` | 新規。在庫確認を経た注文作成、在庫不足、在庫参照失敗、記録失敗のテスト |
| `test/ui/order-pages.test.ts` | 新規。注文内容確認画面と注文完了画面の表示、例外系の表示、戻る操作のテスト |

## 変更順序

1. 注文と注文番号（`src/domain/order.ts`）を定義し、採番と算出のテストを書く。
2. 接続定義（`src/domain/database.ts`）と注文テーブル（`src/domain/schema.sql`）を作り、注文リポジトリとそのテストを書く。
3. 注文作成サービスとそのテスト（注文可否の判定、組み立てから記録までの一連、例外系）を書く。
4. 注文内容確認画面と注文完了画面を作り、`src/server.ts` に画面遷移を追加して、画面のテストを書く。

## 検証方法

テストコードで次を確認する。
テストの実行と結果の記録は、Stage 3.6 Build and Test の責務である。

- 注文内容確認画面に、選択した商品の商品名、数量、金額、合計金額が表示され、注文を作成せずに商品一覧へ戻れる（R003）。
- 在庫が確認できた場合だけ注文が作成され、一意の注文番号（形式 ORD-YYYYMMDD-NNNN）が付与され、注文完了画面に表示される（R004、R007、`business-rules.md` の 1、4）。
- 作成した注文（注文番号、商品、数量、金額、合計金額、作成日時）がリレーショナルデータベースに記録され、注文番号で照会できる（R005、Intent Contract「注文を照会する」）。
- 在庫数量が注文数量に満たない場合、注文は作成されず、その旨が表示される（R007、`business-rules.md` の 2）。
- 在庫参照に失敗した場合、注文は作成されず、在庫を確認できない旨と再試行の案内が表示される（R008、`business-rules.md` の 3）。
- 注文の記録に失敗した場合、注文番号は提示されず、失敗した旨が表示される（前提と判断で確定）。

商品選択から注文の記録までの貫通は、Bolt B001 の Build and Test で確認する（`bolt-plan.md` の Definition of Done）。

## 未確認事項

- リレーショナルデータベースの製品は、walking skeleton の仮の製品として SQLite を使う。運用で使う製品の確定は、walking skeleton ゲート（Bolt PR）の判断材料にする。
- 日内連番の桁あふれ（1 日 1 万件以上の注文）の扱いは未確認である。walking skeleton では許容する（`business-rules.md` の未確認事項）。
- 在庫確認から記録までの間の在庫変動は扱わない（`business-rules.md` の例外）。
