上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun、`business-logic-model.md` と `business-rules.md` の決定的台帳処理、`requirements.md` の規模増条件を前提とする。分散処理基盤は導入しない。

# スケーラビリティ要件 — U3 移設選定台帳と層別カバレッジ整合計画

本書は、テスト数、signal 組合せ、tier×size キーが増減しても、移設台帳と coverage 整合計画が固定件数に依存せず追随する条件を定める。

## SCAL-1: テスト数増加へ再生成で追随する

現行の 442件、unit 非 small 163件、排他的5バケットは measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` のスナップショットであり、恒久定数ではない。将来の母集団は次の手順で再導出する。

1. `tests/` 全域再帰から U1 `SizeLedger` を再生成する。
2. unit ∧ 非 small を抽出し、signal 配列を排他的組合せへ機械分類する。
3. 候補ごとの versioned `CandidateEvidence` を確認し、閉じた決定表で4つの final state へ分類する。
4. `classification-review` は独立 `reviewQueue`、確定 remediation は `migrationQueue` へ分け、各 queue を定義済みの比較キーで安定順序へ並べる。

候補抽出とエビデンス確認は台帳行数 N と確認対象ソース総量 B に対して O(N + B) を維持する。2つの queue を比較 sort で安定順序へ並べる処理を含む全体は O(N log N + B) とし、全体再走査の入れ子やネットワーク問い合わせを行わない。ファイル数の上限や増加率は強制メカニズムと将来予測がないため発明しない。

## SCAL-2: signal 集合の変化を無音で吸収しない

現在の排他的バケットは filesystem のみ、filesystem + timer、spawn のみ、filesystem + spawn、network のみの5種で、合計163件である。将来、新 signal または新しい組合せが現れた場合は既存バケットへ類推せず、分類規則が追加されるまで fail-closed とする。

signal 出現数の重複合計を候補数として使わず、排他的バケットの合計と母集団行数を機械照合する。重複 file、欠落行、複数 final state の同時付与も失敗とする。

priority は件数増加に依存しない閉じた値域を使う。`reviewQueue` は repository 相対 file 昇順、`migrationQueue` は `seam-to-small = rank 0`、2つの retier = rank 1 とし、同順位を repository 相対 file 昇順で tie-break する。review queue と migration queue の間に架空の numeric rank を置かず、review queue の解消を計画閉包条件にする。

## SCAL-3: 4 NamedTier と開いた Tier を分離する

coverage binding は `unit`、`integration`、`e2e`、`smoke` の **4 NamedTier ごとに1件**とする。各 binding は単一 `ledgerKey` ではなく、その tier に存在する非ゼロの `${tier}_${size}` キーをすべて保持する `ledgerKeys[]` を持つ。

| NamedTier | 現行の非ゼロ `ledgerKeys[]` |
| --- | --- |
| unit | `unit_small`, `unit_medium`, `unit_large` |
| integration | `integration_small`, `integration_medium` |
| e2e | `e2e_small`, `e2e_medium`, `e2e_large` |
| smoke | `smoke_medium` |

U1 台帳の `Tier` は harness/lib 等を含む開いた集合のまま維持するが、harness/lib は標準 runner tier ではないため coverage binding は N/A とする。新しい補助 tier が増えても台帳では可視化する一方、4 NamedTier の binding へ自動昇格させない。NamedTier の追加は runner と要件を伴う仕様変更として人間へ確認する。

## SCAL-4: per-tier coverage path の容量計画は PENDING とする

現行 `coverage:ci` は smoke・unit・integration を単一 `coverage/lcov.info` へ結合し、e2e と補助 tier を含めない。per-tier path は未実装なので、4 binding の path 存在状態はすべて **PENDING** とする。CI 参加状態は unit/integration/smoke が **EXECUTED**、e2e が **NOT EXECUTED** であり、path 状態と独立に保持する。harness/lib は binding を生成せず、補助 tier 観測で path/CI ともに **N/A** とする。

水平スケール、worker pool、queue、DB sharding、cache、保存容量の閾値はこのローカル決定的処理に該当しない。層別 lcov のファイル数・容量・並列度は follow-up の実装案と実測が得られるまで決めない。
