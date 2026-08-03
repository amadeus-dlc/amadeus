# Unit Test Instructions — advisory-human-choice

## 上流成果物と検証範囲

`code-generation-plan.md`と`code-summary.md`のFR-1〜FR-6、NFR-1〜NFR-4、受け入れ基準1〜17を、directive schema、presence hook、Codex adapter、Formal Model Check parser contractへ分割して検証する。Filesystemを使うdomain artifact検証は実態どおりintegration層へ置く。Comprehensive戦略のため、要件・境界リスク・発見済み回帰を優先し、件数を目的化しない。

## 実行コマンド

```bash
bun test --timeout 120000 \
  tests/unit/t113.test.ts \
  tests/unit/t203-mint-presence-classify.test.ts \
  tests/unit/t210-adapter-mint-classifier.test.ts \
  tests/unit/t-formal-verif-run-model-check.test.ts
```

## 主要テストケース

- receipt欠落、破損、identity不一致をdenyへ倒す。
- exact choiceだけをfreshな物理`HUMAN_TURN`と相関し、同じturnの再利用を拒否する。
- Codexの実運用adapter経由でも`HUMAN_TURN`とprotected receiptを同じ入力から成立させる。
- `run-now`は相関済み`NOT_DETECTED`だけで解除し、`DETECTED`、`HARNESS_ERROR`、partial、不正provenanceはholdする。
- 複数advisory、再提示、fresh retry/defer、instance再発番を検証する。
- user-visible questionが全messageを逐語・配列順で保持する。

## テストデータと独立性

- 各testは一時directory、固定intent UUID、固定audit shardを所有し、終了時に削除する。
- production分岐へtest専用modeを追加しない。
- 外部network、常駐process、共有mutable stateへ依存しない。

## 成功条件

- 対象testがすべてpassし、失敗・skipが0件である。
- testが実装詳細だけでなく、各受け入れ基準のobservable outcomeを検証する。
- 新たに発見した欠陥は、修正前に再現testをRedにしてからGreenへ戻す。
