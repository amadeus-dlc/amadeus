# Performance Requirements — amadeus-mirror-cli

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

- P-1: technology-stack.md の実行モデル(Bun 直接実行の単発 CLI、常駐プロセスなし)を前提とする。各コマンドの処理時間はネットワーク(gh)往復が支配的であり、ツール自身の処理(状態読取+テンプレート生成)に性能要求は設けない — 対象データは intents.json(数十エントリ)+ state.md(数百行)で、逐次読取で十分
- P-2: タイムアウトは gh CLI 既定に委譲(独自タイムアウト機構を追加しない — 強制メカニズムなき数値を作らない、nfr-requirements:c3)

## 検証

- 追加の性能テストは作らない(build-and-test:c1 — 承認 NFR に trace しない検査を機械追加しない)
