# Performance Test Instructions — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（D1 の軽量供給裁定を消費）、`code-summary.md`（実装実測を消費）

## 適用判定

Test Strategy は Comprehensive だが、承認済み NFR と実在境界へ trace できる検査のみを選定する（`cid:build-and-test:bt-proportional-selection` / `cid:build-and-test:c4` — NFR 不在の専用試験は検証劇場になるため新設しない）。

- **NFR-1（evaluator 60 秒 timeout 内の完走・停止耐性）**: 専用負荷試験は**新設しない**。担保面は設計側 — D1 が「checkpoint からの intent 成果物全走査」案を NFR-1 を根拠に却下し、供給を宣言ファイル読取（O(宣言サイズ)）に限定した。実測面: t528 が評価器実行（in-process）込みの端到端を 1 秒未満で完走しており（対象スイート実測 [595ms]/26 tests — build-test-results.md）、60 秒 budget に対し 2 桁の余裕がある。実時間待機試験より決定的検証を優先する（`cid:build-and-test:bt-timeout-verification-shape` の趣旨）。

## 非生成の根拠

負荷・スループット・スケーリング試験は対応する承認済み NFR が存在しないため生成しない。既存の性能面 blocking gate（complexity / coverage）は CI で全 green。
