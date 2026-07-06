<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-07-06T00:00:00Z — `applyModelOverrides` は `./apply-model-overrides` から import する設計を採用した。Step 5 の実装を独立再実装せず既存実装を再利用することで、model overlay の単一正典ソースを維持する。`loadOverlay` が overlay ファイル不在で throw する挙動を build.ts の try/catch で吸収し fail-soft を実現した。

2026-07-06T00:00:00Z — `--check` モードは `git diff --exit-code <generated-paths>` で実現した。build.ts を実行すると生成物が再作成される。コミット済みの生成物とソースが一致する clean 状態では git diff = 0 になり check が pass する。ソースを変更して生成物を再コミットしていない状態では git diff ≠ 0 になり check が fail する。index 比較（`--cached` なし）で working tree の実ファイルを検査するため、シンボリックリンクの再作成も差分として検出できる。

2026-07-06T00:00:00Z — シンボリックリンクの冪等性確保に `lstatSync`（`existsSync` ではなく）を使う設計を採用した。`existsSync` はリンク先が存在しない壊れたシンボリックリンクを false と返すため、既存の壊れたシンボリックリンクを `unlinkSync` せずに `symlinkSync` を呼ぶと EEXIST になる。`lstatSync` はリンク自体の存在を返すためこの問題を回避できる。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-07-06T00:00:00Z — eval のテストケースを 37 件（full pipeline、conditionalDirs、BR-16 違反、--check モード、冪等性）の 5 グループで構成した。fixture workspace をすべて一時ディレクトリ（mkdtempSync）に分離し、本番 `.agents/` や `.claude/` に一切触れない設計とした。cleanup は finally 相当のループで成功時・失敗時ともに確実に実行する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T10:55:00Z — B001 reviewer READY（Medium 2 / Low 3）。B002/B003 への申し送り: (M1) stepHarnessOverlay に core スキル整合ガードなし（孤立 harness エントリが部分 skill dir を生成しうる。B002 の restructure 直後に harness と core のセットが揃うため、B002 の eval で ghost エントリ検出を追加）。(M2) overlay fail-soft が不在と実エラー（malformed JSON / drift throw）を区別しない（promote-skill と同パターンだが、B003 の productionization で不在 = skip / 在中エラー = 警告文言の区別を検討）。(L3) 後勝ち証明は BR-16 制約下では「harness 唯一ソース」の確認が正（コメント文言の整理）。(L4) --check は staged-but-uncommitted を検出しない（CI clean checkout では非問題、記録のみ）。(L5) 37 検査の件数は条件分岐で 36 になる経路あり（記述精度、B002 で整理）。
