# Code Generation Plan：商品選択

U002 商品選択の Code Generation の実装計画である。
Bolt B001（注文作成貫通の walking skeleton）の対象であり、対応する要求は R001、R002、R006、R008 である。
入力は、`functional-design/` の 4 成果物、`inception/requirements-analysis/requirements.md`、`inception/application-design/` と `inception/refined-mockups/` の成果物である。

## 前提と判断

変更対象のパスは、対象リポジトリのルートからの相対パスで書く。
実装は Bolt B001 の branch と worktree で行う前提である。

U002 は、在庫状況の取得で U001 在庫参照に依存する（`unit-of-work-dependency.md`）。
Bolt B001 内では U001 の実装を先行させ、U001 の計画が作る土台（`package.json`、`tsconfig.json`、`src/domain/stock-status.ts`、`src/domain/inventory-lookup.ts`）とディレクトリ編成、テストランナーの判断を前提にする。

前段の成果物が Code Generation へ委ねた点は、次の判断で確定する。

| 判断 | 理由 |
|---|---|
| Web UI は特定のフレームワークを導入せず、Node.js 標準の HTTP サーバーとサーバー側の HTML 生成で実装する | Web UI のフレームワークが未確認のため（`project.md`）、B001 では追加依存のない最小構成で UI からの貫通を証明し、フレームワーク確定時の置き換えを画面層に閉じる |
| 商品カタログの商品情報は、コード内の固定データにする | 商品情報の出どころが未確認で（`business-logic-model.md` の未確認事項）、商品管理は最小スコープに含まれないため（Application Design の設計判断 5）、walking skeleton の前提「投入済みのデータ」をコード内の固定データで満たす |
| 数量の検証は、サーバー側の検証と商品一覧画面の再表示で実現する | 「その旨をその場で表示」（`interaction-spec.md`）の実現手段が未確認のため、クライアントスクリプトを持ち込まない最小構成にし、検証ルールをサービス層と画面で共有する |
| 商品一覧の在庫状況の表示は、在庫あり、在庫なし、在庫不明の 3 値の文言だけにする | 在庫数量の表示は要求されておらず（R001、`business-rules.md` の未確認事項の判断）、在庫不明は在庫なしと表示文言と導線が異なるため区別する（`functional-design/memory.md`） |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `src/domain/product.ts` | 新規。商品（商品識別子、商品名、価格）を定義する（`domain-entities.md`） |
| `src/domain/product-catalog.ts` | 新規。商品カタログの「商品を一覧する」を実装する。販売対象の商品情報はコード内の固定データで持つ |
| `src/domain/stocked-product.ts` | 新規。在庫状況つき商品（商品と、在庫あり、在庫なし、在庫不明のいずれか）を定義する（`domain-entities.md`） |
| `src/service/product-list-service.ts` | 新規。商品一覧サービスの「商品一覧を取得する」を実装する。商品カタログの商品と在庫参照の在庫状況を商品識別子で合成する。在庫参照が参照失敗を返した場合は、全商品を在庫不明として返す（GD001、`business-rules.md` の 2）。数量の検証（1 以上の整数、未入力は 1）もここに置く（`business-rules.md` の 3） |
| `src/ui/product-list-page.ts` | 新規。商品一覧画面。商品ごとの商品名、価格、在庫状況、数量入力、選択ボタンの表示（`frontend-components.md`）。在庫がない商品と在庫不明の商品は選択ボタンを無効にする。在庫不明の場合は在庫を確認できない旨と再試行ボタンを表示する。不正な数量はその旨を表示して再表示する |
| `src/server.ts` | 新規。アプリケーションの起動と画面遷移の入口。商品一覧の表示、再試行、選択した商品識別子と数量の注文内容確認画面への引き継ぎを受け付ける |
| `test/service/product-list-service.test.ts` | 新規。商品と在庫状況の合成、参照失敗時の全商品在庫不明、数量の検証のテスト |
| `test/ui/product-list-page.test.ts` | 新規。商品一覧の表示、選択可否、在庫参照失敗の表示と再試行、不正な数量の表示のテスト |

## 変更順序

1. 商品（`src/domain/product.ts`）と在庫状況つき商品（`src/domain/stocked-product.ts`）を定義する。
2. 商品カタログ（`src/domain/product-catalog.ts`）を固定データで作る。
3. 商品一覧サービスとそのテスト（合成、参照失敗時の在庫不明、数量の検証）を書く。
4. 商品一覧画面と `src/server.ts` を作り、画面のテスト（表示、選択可否、再試行、不正な数量）を書く。

## 検証方法

テストコードで次を確認する。
テストの実行と結果の記録は、Stage 3.6 Build and Test の責務である。

- 商品一覧が、販売対象のすべての商品に商品名、価格、在庫状況を付けて返る（R001、R006、Intent Contract「商品一覧を取得する」）。
- 在庫がない商品は選択できず、表示で判別できる（R001、`business-rules.md` の 1）。
- 在庫参照が参照失敗を返した場合、全商品が在庫不明として選択不可になり、在庫を確認できない旨と再試行の導線が表示される（R008、GD001、`business-rules.md` の 2）。
- 再試行で在庫参照が成功したら在庫状況が更新され、再び失敗したら同じエラー表示が維持される（`interaction-spec.md`）。
- 数量が未入力の場合は 1 として扱われ、0 以下または整数でない数量は受け付けられず、その旨が表示される（R002、`business-rules.md` の 3）。
- 在庫がある商品を選択すると、商品識別子と数量が注文内容の確認へ引き継がれる（R002、Intent Contract「商品を選択する」）。

商品一覧画面から在庫参照までの貫通は、Bolt B001 の Build and Test で確認する（`bolt-plan.md` の Definition of Done）。

## 未確認事項

- 販売対象の商品情報の出どころ（登録と更新の手段）は未確認である。コード内の固定データで代替する。
- Web UI のフレームワークは未確認である。前提と判断に書いた最小構成を使う。
