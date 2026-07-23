# Performance Test Instructions — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## 判定: N/A（性能テストは選定しない）

cid:build-and-test:c1 / c3 の比例選定基準に従い、承認済み NFR と実在境界へトレースできる場合にのみ性能テストを追加する。本 intent の NFR(requirements.md NFR-1〜4)は CI green・dist/self-install 同期・依存追加なし・カバレッジであり、**レイテンシ / スループット / 可用性の定量目標(性能 NFR)は存在しない**。

修正の性質:
- 根の修正は `recordEngineError` に projectDir 引数を追加し、既存の argv 再抽出を「引数未指定時のフォールバック」へ降格するもの(制御フローの分岐追加なし、追加の I/O なし)。
- 増幅の修正は単一値メモ(`_cloneId: string | null`)を projectDir キー付き Map(`_cloneIdByProject: Map<string,string>`)へ置換するもの。Map lookup は O(1) 相当で、CLI 同期 one-shot 実行のプロセス寿命内でエントリ数は projectDir 数(通常 1)に等しく、性能特性に実測可能な影響を与えない。

したがって性能ホットパス・負荷境界・スケーリング対象がなく、戦略名だけで検査を機械追加しない(cid:build-and-test:c1)。

## 再評価条件

以下のいずれかが成立した場合、本 N/A 判定を再評価する:
- clone-id / shard 名解決がホットループ(高頻度呼び出し)に組み込まれ、Map サイズが非有界に増大しうる設計変更が入る。
- 承認済み NFR に定量的な性能目標(レイテンシ percentile・スループット・監査書込みの時間窓など)が追加される。
- 監査シャード書込みが同期 I/O のクリティカルパスに載る運用要件が発生する。

上記が満たされない限り、性能テストは比例原則により不追加とする。既存の CI 必須ゲート(typecheck / lint / dist・self ドリフト / test / coverage)の省略根拠には本 N/A を用いない(cid:build-and-test:c3)。
