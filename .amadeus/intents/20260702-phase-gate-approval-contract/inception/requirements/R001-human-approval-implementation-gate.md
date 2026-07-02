# R001 人間承認済みの場合だけ実装へ進める実装ゲート

## 要求

人間承認済み（`taskGeneration.status` が `passed`）の場合だけ実装実行へ進める契約が、`amadeus-construction-implementation-execution` と `amadeus-construction-bolt-preparation` の両方から読める。

## 背景

現在の `amadeus-construction-implementation-execution` の前提は「`ready_for_approval` または `passed` でない場合は、実装せずに停止する」であり、人間承認前（`ready_for_approval`）でも実装へ進める迂回路がある。
`amadeus-construction-bolt-preparation` は「人間承認済みの場合だけ `passed` にする」と書くが、`ready_for_approval` へ到達した後に停止して承認を待つ行動が明記されていない。

## 受け入れ条件

- `amadeus-construction-implementation-execution` の前提が「`taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む」になっている。
- `amadeus-construction-bolt-preparation` に、`ready_for_approval` へ到達したら停止して人間の承認を待ち、承認を得てから `passed` にして `approval` evidence を追加する行動が肯定形で書かれている。
- 両 skill の変更が同じ変更単位で扱われ、`ready_for_approval` で停止したまま前へ進めない状態にならない。

## 依存

なし。

## 対応する対象境界

- SC-IN-001
- SC-IN-002

## 未確認事項

- なし。
