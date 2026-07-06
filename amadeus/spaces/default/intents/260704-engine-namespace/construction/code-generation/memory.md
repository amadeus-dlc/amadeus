<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T00:30:00Z — N005 の残存 grep は 0 件にならず、機能上不可避な 2 ファイル（nameMappings 対応表自体、上流 clone を読む generate-parity-baseline.ts）を decision 記録付きで許容例外へ追加した
- 2026-07-05T00:30:00Z — reviewer が対応表の取りこぼし（scopes 9 + sensors 4 の aidlc-*.md）を検出し、gate の Request Changes で今回改名に含めた。設計時の棚卸しは tools/hooks（.ts）に偏り、.md のエンジンデータファイルを見落とした
- 2026-07-05T00:30:00Z — 実装が 2 回とも API ストリーム停止で中断したが、subagent の transcript 再開で作業を失わず完遂した

## Tradeoffs 追記

- 2026-07-05T00:30:00Z — byte-match 対象の protocol 文書内の naming-convention プレースホルダ（aidlc-<name>.md 等）にも正規化行が必要だと実装中に判明し、literal 13 行に加えて placeholder 2 行を nameMappings へ追加した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
