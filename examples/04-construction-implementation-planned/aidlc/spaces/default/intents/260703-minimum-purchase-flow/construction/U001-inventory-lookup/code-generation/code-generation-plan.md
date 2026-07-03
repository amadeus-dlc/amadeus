# Code Generation Plan：在庫参照

U001 在庫参照の Code Generation の実装計画である。
Bolt B001（注文作成貫通の walking skeleton）の対象であり、対応する要求は R006、R007、R008 である。
入力は、`functional-design/` の 3 成果物、`inception/requirements-analysis/requirements.md`、`inception/application-design/` の成果物である。

## 前提と判断

変更対象のパスは、対象リポジトリのルートからの相対パスで書く。
実装は Bolt B001 の branch と worktree で行う前提である。

greenfield の Intent であり、対象リポジトリにはまだコードがないため、B001 の先頭 Unit であるこの Unit で TypeScript と Node.js のプロジェクトの土台も作る。

前段の成果物が Code Generation へ委ねた点は、次の判断で確定する。

| 判断 | 理由 |
|---|---|
| ディレクトリは `src/ui/`、`src/service/`、`src/domain/` の 3 層に分ける | 編成方針が未確認のため（`project.md`）、Application Design の設計判断 1（UI、サービス層、ドメインの 3 層。GD005）に合わせる。U001 はこのうち `src/domain/` だけを使う |
| テストコードは Node.js 標準のテストランナー（node:test）で書く | テスト方針が未確認のため（`project.md`）、追加依存なしで実行できる標準機能を使う |
| 在庫管理システムの REST API 呼び出しは Node.js 標準の fetch で実装する | HTTP クライアントの選定が未確認のため、追加依存のない標準機能を使い、置き換えを在庫参照の内部に閉じる |
| 参照失敗と判定するまでの待ち時間の実装既定値は 3 秒にする | 閾値が未確認のため（`business-rules.md` の未確認事項）、NFR の特別な要求がない前提で、購入者の操作を待たせすぎない値を実装既定値として選ぶ。値は在庫参照の内部に定数として置き、確定時に差し替える |
| EXT001 の API 契約は「商品識別子の一覧を渡すと、商品ごとの在庫数量を JSON で返す」と仮置きし、同じ仮契約のスタブサーバーを同梱する | API 仕様と接続条件が未確認のため（`external-dependency-map.md`）、契約を仮置きしたスタブで進め、確定後に在庫参照の接続部分へ反映する |
| 応答に含まれない商品は解釈できない応答として扱い、参照失敗にする | 一部の商品しか含まれない場合の扱いが未確認のため（`business-logic-model.md` の未確認事項）、在庫状況を推測せず参照失敗として返す業務ルール（`business-rules.md` の例外）に寄せる |

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `package.json` | 新規。TypeScript と Node.js の実行、ビルド、テストのスクリプトを定義する |
| `tsconfig.json` | 新規。TypeScript の設定を定義する |
| `src/domain/stock-status.ts` | 新規。在庫状況（商品識別子、在庫の有無、在庫数量）と参照失敗を定義する。参照失敗は失敗の理由を区別しない（`domain-entities.md`） |
| `src/domain/inventory-lookup.ts` | 新規。在庫参照の「在庫を参照する」を実装する。商品識別子の一覧（1 件以上）を受け取り、EXT001 の REST API を呼び出し、応答を商品ごとの在庫状況へ変換する。接続失敗、時間切れ（3 秒）、解釈できない応答は、区別せずすべて参照失敗として返す（`business-rules.md` の 2）。在庫の引き当てや更新は行わない（`business-rules.md` の 3） |
| `src/dev/inventory-management-stub.ts` | 新規。EXT001 の仮契約に従うスタブサーバー。動作確認とテストで在庫管理システムの代わりに応答する |
| `test/domain/inventory-lookup.test.ts` | 新規。在庫状況への変換、接続失敗、時間切れ、解釈できない応答のテスト |

## 変更順序

1. `package.json` と `tsconfig.json` を作り、TypeScript の実行とテストの土台を整える。
2. 在庫状況と参照失敗（`src/domain/stock-status.ts`）を定義する。
3. EXT001 の仮契約を固定するスタブサーバー（`src/dev/inventory-management-stub.ts`）を作る。
4. 在庫参照（`src/domain/inventory-lookup.ts`）とそのテストを書く。

## 検証方法

テストコードで次を確認する。
テストの実行と結果の記録は、Stage 3.6 Build and Test の責務である。

- 商品識別子の一覧を渡すと、一覧のすべての商品について在庫状況（商品識別子、在庫の有無、在庫数量）が得られる（R006、Intent Contract「在庫を参照する」）。
- 接続失敗、時間切れ、解釈できない応答のいずれでも、区別のない参照失敗が呼び出し元へ返る（R008、`business-rules.md` の 2）。
- 応答に一部の商品しか含まれない場合、参照失敗として返る（前提と判断で確定）。
- 在庫参照が在庫情報の読み取りだけを行い、在庫管理システムへ更新の要求を送らない（`business-rules.md` の 3）。

商品一覧と注文作成からの利用は、U002 と U003 のテストおよび Bolt B001 の Build and Test で確認する（`bolt-plan.md` の Definition of Done）。

## 未確認事項

- 在庫管理システムの API 仕様（エンドポイント、認証方式、応答形式、在庫数量の粒度）と接続条件は未確認である。前提と判断に書いた仮契約とスタブで進め、確定後に `src/domain/inventory-lookup.ts` の接続部分とスタブへ反映する。
- 参照失敗と判定するまでの待ち時間の閾値は未確認である。実装既定値 3 秒を使う。
