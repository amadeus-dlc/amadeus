# Performance Test Instructions — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

Testing 既決ノルム(build-and-test:c1/c3)に従い、性能検査は承認済み NFR と実在境界へ trace できるものだけを選定し、戦略名だけで機械追加しない。

## 選定(NFR-1 決定性 / NFR-5 検証への trace)

- **runner 内蔵の wall-clock 監視**: `tests/run-tests.sh --ci` の size 宣言 vs 実測 drift 検査を性能面の常設ゲートとして使う(既存インフラ再利用、新設ジョブなし)。本実行の drift は既知2件(t-codex-hooks-migration、t225 — いずれも本 intent 非改変の負荷起因 advisory)。
- **決定性(NFR-1)**: U09/U10 の決定的出力(canonical sort・同一入力→同一 bytes)は t-plugin-projection / t252 が同一入力の再実行比較で検証(性能というより再現性だが、時間依存の非決定性を排除する検査として本節に記録)。

## 非選定の根拠

- 負荷試験・throughput 試験: 本 intent は常駐 service・network 面を追加せず(services.md「新規の常駐・network・AWS service は追加しない」)、承認済み NFR に応答時間・スループット目標が存在しないため N/A。既存必須検査の省略根拠にはしない。
