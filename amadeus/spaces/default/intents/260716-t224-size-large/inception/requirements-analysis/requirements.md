# Requirements — t224-size-large(Issue #1059)

> 上流入力: Issue #1059(クロスレビュー2名 — e4 1人目 2026-07-16+e1 2人目)、codekb `code-structure.md`「t224 wall-clock drift 観測面」節(RE 実測、observed 720b0145b)、re-scans/260716-t224-size-large.md。宣言 consumes のうち `business-overview.md` / `architecture.md` は本 bugfix の観測面(テストランナーの size 機構)と非交差のため参照非該当 — RE scan-notes と code-structure.md の当該節を上流の正とする(c1 の差分限定と同じ根拠)。
> 既決照合: 修正方式=leader 割当(size: large 1行)、機序=RE 2段実測(**30s 閾値に対し一貫して十分なマージンの large 帯** — 実測系列は 35.75〜46.03s(起票2系+e4/e1/RE/レビュー2系の計7実行、レンジは追加実行で拡張されうるため閾値相対で規定)・static 分類 medium との構造乖離)。明確化質問 0問(判定は questions 冒頭、leader 承認フロー準拠)。
> **性質注記**: 本 drift 表示は run-tests.ts の observability 行(run-tests.ts:915 コメント「MUST NOT affect the process exit code」、t112 がピン)で**非ブロッキング** — RESULT: PASS/exit 0 のまま表示のみ FAIL 様に見える偽陽性の解消が本修正の目的であり、exit code 側の変更は行わない。

## FR-1: t224 への size 宣言追加

`tests/integration/t224-upstream-v2-migration-cli.test.ts` の先頭コメント域(parseSizeAnnotation の走査域 = 先頭40行、test-size.ts:279-287)に `// size: large` を追加する。

- AC-1a: 配置は既習例(t207/t209 の :2 — `// covers:` 行の直後)に倣う
- AC-1b: テスト本体・他ファイルへの変更なし(1行 surgical。**repo 初の large 宣言** — RE で4通り反証 grep 済み)
- AC-1c: 追加後、`bash tests/run-tests.sh --integration --filter t224`(または同等)で wall-clock drift 0 を実測(修正前は同条件で drift 1 = declared=medium measured=large — **落ちる実証は修正前実測がそのまま該当**、4実行系で記録済み)

## FR-2: 検証(既存ゲート準拠)

- AC-2a: `bun run typecheck` / `bun run lint` exit 0(コメント1行につき影響なし確認)
- AC-2b: t-test-size-drift / t-test-size-dynamic 系の既存ゲートテストが green(宣言意味論の検査は既存側 — 新設ゲートなしのため落ちる実証 Mandated は適用外、ただし AC-1c の修正前 drift 実測がリグレッション根拠を兼ねる)
- AC-2c: `bash tests/run-tests.sh --smoke` green+t224 単独実行 green(58 pass 維持)
- AC-2d: dist/self-install 非関与(tests/ 直下のみ)— dist:check / promote:self:check は不変確認として exit 0

## FR-3: クローズ条件

- AC-3a: PR マージ後、着地面 grep(t224 の size: large 実在)→ Issue #1059 手動クローズ+in-progress:amadeus ラベル除去(close-after-landing-verification+Issue 可視化運用)

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1 | Issue #1059 対処候補(宣言更新)+クロスレビュー2名の最小修正確定+RE の機序精密化(static 分類由来) |
| FR-2 | org.md Testing Posture(既存スイート green 維持)+ Mandated 適用範囲判断 |
| FR-3 | close-after-landing-verification + Issue 可視化運用(user decision 2026-07-16) |

## スコープ外(明示)

- 「未宣言×30s 超」の全数棚卸し — フル run の test-size-report.json 集計を要するため別 Issue 候補(RE scan-notes に記録済み)
- t224 の fixture 分割・高速化 — 40s 実測に対し過剰(両クロスレビューで整理済み)
