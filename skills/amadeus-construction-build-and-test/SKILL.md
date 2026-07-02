---
name: amadeus-construction-build-and-test
description: >-
  Amadeus Construction の内部 skill。Stage 3.6 Build and Test だけを Bolt ごとに 1 回実行する。
  Bolt 内の全 Unit の Code Generation 完了後に、ビルドとテストを実行して手順と結果を
  construction/bolts/<bolt-id>-<slug>/ に記録する場面では必ず使う。失敗時は autonomy に
  関わらず停止して人間に確認する。実装の修正と Bolt PR の作成は行わない。
---

# amadeus-construction-build-and-test

## 目的

Construction の Stage 3.6 Build and Test だけを、対象 Bolt ごとに 1 回進める。

この skill は `amadeus` 入口から Bolt 実行の中で呼び出される内部 skill である。

Bolt 全体のビルドとテストを実行し、手順と結果を記録する。

## 前提

対象 Intent の `state.json` で、`stages["build-and-test"]` が実行対象であり、対象 Bolt の `bolts["<bolt-id>"]` が `active` であることを前提にする。
対象 Bolt に束ねた全 Unit の `stages["code-generation"].units["<unit-id>"].state` が `completed` であることを確認する。
未完了の Unit があれば停止し、`amadeus` へ戻る。

テストの量は `state.json.depth` のテスト戦略に従う。
Minimal は要求 1 件につきテスト 1 件と、コンポーネントごとの happy-path を下限にする。
Standard はコンポーネント境界を検証し、Comprehensive は網羅的に検証する。
workshop はテスト戦略だけを Minimal に上書きする。

少なくとも次を読む。

- 対象 Bolt の全 Unit の `construction/<unit-id>-<slug>/code-generation/plan.md` と `summary.md`
- `inception/delivery-planning/bolt-plan.md`（対象 Bolt の Definition of Done。Delivery Planning を実行しなかった場合は暗黙 Bolt として Intent の成功条件を使う）
- `state.json`

## テンプレート

優先順位は次である。

1. `.amadeus/settings/templates/intents/construction/build-and-test/`
2. この skill に同梱された `templates/construction/build-and-test/`

分からない項目は空欄にせず、`未確認` と書く。
実行しなかったテスト種別の成果物は作らない。

## 成果物

作成または更新するものは次だけである。

`construction/bolts/<bolt-id>-<slug>/` に置くもの:

- `build-instructions.md`（ビルド手順）
- `unit-test-instructions.md`（ユニットテスト手順）
- `integration-test-instructions.md`（統合テストを実行した場合）
- `performance-test-instructions.md`（性能テストを実行した場合）
- `security-test-instructions.md`（セキュリティテストを実行した場合）
- `summary.md`（ビルドとテストの要約）
- `test-results.md`（テスト実行結果。実行したコマンドと結果を含める）

Intent のモジュールディレクトリ直下で更新するもの:

- `state.json`（`bolts["<bolt-id>"]` の記録。Bolt ディレクトリには置かない）

## 手順

以下の手順は、対象 Bolt で最初に実行する場合の流れである。
再実行では、失敗の原因に関係する手順だけをやり直す。

1. 対象 Bolt の全 Unit の Code Generation が `completed` であることを確認する。未完了なら停止し、`amadeus` へ戻る。
2. Bolt の worktree でビルドを実行し、`build-instructions.md` に手順を記録する。
3. テスト戦略に従いテストを実行し、実行した種別ごとの手順と `test-results.md` を記録する。
4. `summary.md` に、Definition of Done に対する充足を記録する。
5. すべて成功した場合は、`amadeus` 入口へ戻る。Bolt PR の作成、`bolts["<bolt-id>"].gate` の記録、Bolt の完了確定は入口の Bolt 境界処理が行う。

ビルドまたはテストが失敗した場合は、`state.json.autonomy` に関わらず停止し、失敗内容を `test-results.md` に記録して人間に確認する（halt-and-ask）。
失敗の修正は、人間の指示を受けて対象 Unit の Code Generation の修正として行う。

## ゲート

このステージの完了確認は、Bolt PR と人間 merge で行う。
会話内のステージゲートは提示せず、手順 5 で `amadeus` 入口へ戻る。
`stages["build-and-test"]` は、全 Bolt の完了後に `completed` にし、`approval` には最後の Bolt の `via: "pr"` evidence を記録する。

## 禁止事項

- Code Generation 未完了の Unit を含む Bolt に対して実行しない。
- 失敗を無視して先へ進まない。失敗時は必ず停止して人間に確認する。
- テスト結果を要約だけにしない。実行したコマンドと結果を `test-results.md` に残す。
- 実装の修正をこの skill で行わない。修正は Code Generation の責務である。
- Bolt PR の作成と merge をこの skill で行わない。

## 次の skill

- 続きを進める場合: `amadeus`（入口が Bolt 境界処理と次の Bolt を解決する）
- 成果物の構造検証: `amadeus-validator`
