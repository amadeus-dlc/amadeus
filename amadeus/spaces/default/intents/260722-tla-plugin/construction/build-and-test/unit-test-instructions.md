# Unit Test 手順

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

## 対象と目的

Comprehensive戦略として、plugin composition/index、TLA model loader、TLC outcome、spawn planner、artifact schema、CI判定、model-completeness evaluatorの正常・境界・異常系を検証する。

- plugin source `stages/<slug>.md` とhost targetの一度だけのprefix付与
- trust grant/indexのparse、digest、重複・不正schema拒否
- TLC outcome `NOT_DETECTED | DETECTED | HARNESS_ERROR` とexit `0 | 1 | 2`
- plannerの固定digest、network deny、read-only mount、deadline
- model-map/completeness判定とredaction
- CI terminal-state優先順位とartifact schema

## 実行方法

全unitテストはCIランナーから実行する。

```bash
bash tests/run-tests.sh --ci
```

局所診断では実在pathを確認してから `bun test <paths...>` を使う。filesystem/processを使うテストはunitへ移さずintegrationに置く。

## 期待結果とカバレッジ

- 全CIで失敗0。
- happy pathに加え、各主要境界で最低2つのerror/edge caseを持つ。
- project coverageがbaselineを下回らず、変更行の未カバーが0。
- fixture専用分岐や常時成功assertionをproduction codeへ追加しない。

## テストデータ管理

- 一時repository・plugin・model-mapは各テストが所有し、共有mutable stateを持たない。
- production secretや実利用者データを使用しない。
- symlink、TOCTOU、容量超過、改竄はfixture側から注入し、終了後に一時資産を回収する。
