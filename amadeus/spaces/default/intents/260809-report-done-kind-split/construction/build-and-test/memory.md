<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-19T09:20:00Z — 本 intent はコード差分を持たない(`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus/'` → 0 行)ため、Step 4-8 の指示書は「新規作成」ではなく「着地済み実装を再検証できる手順」として書き、Step 10 は実行して帰属の切り分けに使った
- 2026-08-19T09:20:00Z — 成果物のファイル名はステージ本文の `test-results.md` ではなく directive の produces が解決した `build-test-results.md` を採った(engine-resolved 名が正)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-19T09:20:00Z — Test Strategy は `Comprehensive` だが performance / security の指示書は実体を作らず N/A 判定として書いた; `requirements.md` の NFR 節は生成物 drift・CI ブロッキング集合・coverage の3点のみで、合否を決める性能・セキュリティ目標が宣言されていない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。各ファイルに判定・根拠・将来この判定を覆す条件を明記した
- 2026-08-19T09:20:00Z — 新規テストを1本も追加しなかった; 実装は #2767 で着地済みで、いま追加すれば着地済み実装への事後テストとなり TDD 既定の趣旨から外れる。既存の要件駆動テスト(t528 / t115 / t118)の緑を実測して代えた

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-19T09:20:00Z — code-generation §12a iteration-2 の FOLLOW-UP 6件のうち、測定で閉じられる2件(FR-5 の docs 2面 census、NFR ブロッキング集合の未測定3要素 = 再現性・graph invariants・test:ci)は本ステージで測り直して閉じ、成果物改訂や別 Issue を要する4件は完了ゲートの申し送りへ集約した; §12a の contract が「FOLLOW-UP で再レビューを消費しない」と定めるため、code-summary.md の再改訂(= READY verdict が指す本文の事後変更)は避けた
- 2026-08-19T09:20:00Z — 再現性検査は CI の `Reproducible build` ジョブと同形(`git clone --no-hardlinks` → detach → `bun install --frozen-lockfile` → `bun run build` を2本)をローカルで実施した; release asset の byte parity までは追わず `dist` の `diff -r` に留めた(project.md が「Release Asset はクリーン checkout の release workflow だけが生成し、ローカル生成物との byte parity を追跡ファイルへ要求しない」と定めるため)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-19T09:20:00Z — `mirror-docs-contract.ts` と `scan-public-projections.ts` がフルスイート併走中の初回実行で exit 1 を返した件は、単独再実行の exit 0 をもって併走負荷に帰したが、識別的な再現条件は切り分けていない(§12a FOLLOW-UP)
- 2026-08-19T10:05:00Z — 上の判断は engine の実挙動により覆った; `report` が `advisory hold remains: formal-model-check/spec-change/...` で拒否し、`next` が `execute-advisory-handoff` を出したため hold の解消が必須になった。hold 理由は `never-run`(activation state が新規 worktree に不在)であって spec 変更ではないが、記録だけで解消するのは検証劇場に当たるため、登録済み全4モデルの TLC 網羅探索を実際に走らせ(全件 NOT_DETECTED / completion marker `complete: true`)、その裏打ちのうえで `record` した。`cid:formal-model-check:fmc-no-activation-record-on-not-applicable` が禁じるのは『検査を起動せずに記録すること』であり、実際に完走させてから記録する本経路はその禁止に触れない
