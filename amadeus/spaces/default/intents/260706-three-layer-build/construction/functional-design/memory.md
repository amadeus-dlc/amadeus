<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-07-06T00:00:00Z — build.ts の責務境界を「リポジトリ内生成物のみ」と解釈した。installer が `.agents/skills/` → `.claude/skills/` を担う現行契約は変えず、build.ts は `.agents/amadeus/` と `.agents/skills/` の生成のみを扱う（FR-2 の「`.claude/skills/` の責務境界は functional-design で確定」に対する解答）。

2026-07-06T00:00:00Z — #543（インストーラ manifest）は OPEN・PR なし（実測）のため、本 Intent の Construction では build.ts Step 6 への接続点設計のみを行い、実装は後続 Intent に委ねると確定（FR-4 に対する解答）。

2026-07-06T00:00:00Z — parity-check.ts の checkSkills は `parity-map.json` に `skillsSourceDir` フィールドを追加して制御する設計とした。parity-check.ts 本体の変更を 1 行のフォールバック対応に最小化し、B002 Bolt の変更スコープを絞るため（FR-6 / BR-11）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T10:00:00Z — reviewer 再判定 NOT-READY（RH-1 = domain-entities §2.4 のステップ番号が business-logic-model §1.2 と逆順で H4 が設計内で自己矛盾、RM-1 = amadeus-templates eval の追従漏れ 3 件 L49/L68/L214-B002 分）。conductor が直接反映（§2.4 を権威順へ整合、§3.4 表へ 3 行追記）。
2026-07-06T00:00:00Z — rename-leftovers eval の走査対象（`.agents/amadeus/tools/`）は restructure 後も変更なし。走査パスが生成物パスのままであることを実測（check.ts line 12-13）で確認し、BR-5 の 3 点セット中の「検出器追従」は変更不要と判定。要求（FR-6「rename-leftovers 型検出器の追従」）に対して「追従なし」が正答であることを明記する。

2026-07-06T00:00:00Z — architecture-reviewer NOT-READY 差し戻し（H1/H2/H3/H4/M1/M2）を受けて 4 文書を修正した。主要な設計変更は次の 4 点: (1) build.ts のステップ順を「engine copy → skill copy → harness overlay（後勝ち）」に再定義（H4）、(2) harness/codex の per-skill レイアウト（`harness/codex/skills/<name>/agents/openai.yaml`）を明示し単一ファイル化の誤りを訂正（H4）、(3) BR-13 の「ランタイムパス不変」に `amadeus-utility.ts:3561 skillMdPath()` の例外（B002 で `.agents/skills/` パスへ変更）を追記（H2）、(4) BR-5 の追従対象を amadeus-templates eval（H1）、grilling-wiring.ts（H3/M1）、issue-ref-contract.ts（H3）、parity eval fixture（M2）まで拡張（各 B002 担当、amstemplaets line 214 の promote 呼び出し置き換えのみ B003）。

2026-07-06T00:00:00Z — architecture-reviewer ラウンド 1〜3 の連続差し戻し（Medium 8 件 + Low 1 件を含む）により、逐次列挙による網羅が不可能であることが実証された。BR-5 の設計方針を「手作業の追従対象一覧（逐次列挙表）」から「全数棚卸し + 検出器」方式へ切り替えた。変更の概要: (1) BR-5 を書き換え — B002 実装者が `grep -rn "skills/"` を Step 1 として実行し、全ヒットを B002/B003/allowlist に分類してから全件更新する手順を規定、(2) BR-17 を新設 — runtime tool と eval fixture の path 変更を同一 commit に含める「fixture 同一 commit 規則」を追加（M-D〜M-H の根拠）、(3) BR-14 に L-A 中間 red 防止を追記 — B002 で `promote-skill.ts:153` の最小 path 変更を行い B002〜B003 間の green を維持する、(4) business-logic-model.md §5 を新設 — B002 の実装手順（Step 1 = 棚卸し grep）と rename-leftovers eval 拡張（tree-wide `skills/` token 検出）を B002 成果物として明記、(5) domain-entities.md §4 を新設 — 棚卸し実測全数表（B002 対象 22 件、B003 対象 1 件、allowlist 18 件）を付録として記録。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-07-06T00:00:00Z — Bolt 順序を「B001 = build.ts 先行」→「B002 = restructure（git mv）」の 2 フェーズに分けた。build.ts の eval が先に存在することで B002 の等価性検証が build.ts 実行で行える（build 後 git diff = 0 を確認）。逆順（restructure 先行）は tool が整備される前に大規模移動が起き、検証手段がなくなるリスクがある。

2026-07-06T00:00:00Z — promote-skill.ts の退役を B003 に分離した。B001 + B002 が通らないと promote-skill.ts の test:it:promote-skill eval が fail する可能性があり、分割するとどちらかが fail する不可分な関係ではない（tool 変更 → eval 置き換え → 退役の 3 段階が独立）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T10:25:00Z — reviewer 最終判定 READY（Low 2 = 文書精度）。L-1（promote-skill/check.ts:43,46,98 の §4.3 未掲載）と L-2（amadeus-templates:214 diff-qr の §4.3 未掲載。runner-gen:67 は §4.5 掲載済みと確認）を conductor が §4.3 へ追記して精度を閉じた。BR-5 の強制 grep が実装時の最終安全網。
