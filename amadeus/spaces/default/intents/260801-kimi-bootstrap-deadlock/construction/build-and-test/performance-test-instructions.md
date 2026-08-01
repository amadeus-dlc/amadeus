# Performance Test Instructions — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも `../fix-1922-session-start-ordering/code-generation/`)

## 適用外の理由

- 本変更は SessionStart hook 内で `writeCurrentSessionId`(best-effort の小さなファイル書き込み 1 回)を state-file ガードの前へ移動しただけで、新たなループ・I/O 多重化・同期待ちを追加していない。NFR 要求(NFR-1..3、requirements.md)にも性能目標は存在しない。
- hook のレイテンシ影響は「no-state 経路で +1 回の best-effort write」のみで、t10 は hook を spawn して exit 0・空 stdout を pin しており(18 pass / 実行 ~1 秒)、性能面の退行検出は既存の unit 観測で足りる。
- repo には perf スイート(`tests/perf/`)があるが、対象は orchestration/metrics 系であり本 hook 経路を測るベンチマークは存在しない。hook 順序修正のために新規ベンチマークを発明しない(Minimal 戦略)。

## 代替となる既存カバレッジ

- `tests/unit/t10-hook-session-start.test.ts`: hook 起動〜終了の決定的 pin(spawn 実測)。
- `bash tests/run-tests.sh --ci` 内の session lifecycle 系スイート: 全体実行時間の baseline からの逸脱で退行を検知可能。
