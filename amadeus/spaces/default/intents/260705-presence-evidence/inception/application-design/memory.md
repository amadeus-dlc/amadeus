<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:30:00Z — O-1 を確定（AD-1 = knowledge 側フルパス、AD-2 = 独立 H2・カウント更新不要）。requirements の引き継ぎ（parity / skills 同期の要否）は AD-3 で解消（コード変更なし + 別系統。parity:check で裏取り）。実行時コンポーネント不在のため各成果物は契約の代替記述とした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T01:45:00Z — reviewer iteration 1 は NOT-READY（重大 = AD-3 の事実誤り: parity-map は knowledge/ を対象に含み audit-format.md は例外登録済み。正しくは既存 reason への追補。parity:check の pass は例外により裏取りにならない、中 = O-1 前倒し確定の委譲関係未説明、軽微 = H2 不足 4 件）。全件修正: AD-3 を reason 追補へ書き換え（parity-map.json が変更対象に加わり、#428 との追記型接触が復活 → component-dependency に確認手順を明記）、O-1 前倒しの節を追加（functional-design は追認 + 執筆のみ）、H2 を 4 ファイルへ追加。iteration 2 の残 1 件（components.md 構成節の「1 件」表記の取り残し）を 2 ファイル構成の表へ更新し、共有 reason の混同回避注意（reviewer 留意点）も表内に明記。反復上限のため確定は gate に委ねる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
