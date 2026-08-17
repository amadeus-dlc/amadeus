# Unit Test Instructions — intent 260816-priority-bug-batch-3

各 unit の受け入れ条件(requirements.md FR-1〜FR-5)に対応する unit 層テスト。TDD で実装済み(各 unit の code-summary.md に Red→Green の実測)。

| Unit | 主テスト | 検証面 |
|---|---|---|
| autonomy-refusal-idem | tests/integration/t482(10本)+ t435 / t247 追従 | 発火0行 pin / ちょうど1行 pin / occurrence 境界 / fail-open エラーパス |
| milestone-presence | tests/unit/t188(26本、Red 3点 pin)+ t208 / t112 / t509 | 空振り承認の拒否 / 一般ゲート非退行 / gate後応答の承認 / provenance 4値 |
| prc-finalization | tests/integration/t3149(12本)+ t3062 / t3110 / t450 / t481 追従 | クラスA/B の Red→Green / 負例2種 / #3113 経路非退行 |
| source-work-probe | tests/unit/t206 拡張(両側+cherry-pick sibling 拒否)+ t185 | 後追い record 受理 / sibling 拒否 / 落ちる実証 |
| election-append | tests/integration/t3046(実プロセス並行)+ t549 / t235 / t373 追従 + property(fast-check seed 0x3046) | 並行 corrupt の解消 / voter ローカル単調 / 複合一意 / 順序決定性 |

実行: 各レーンで `bun test <対象ファイル>`(実測 exit code は各 code-summary.md に転記済み)。フルスイート(`bash tests/run-tests.sh --ci`)は CI が実行。
