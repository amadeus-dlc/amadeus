# Code Generation Plan — `semi-docs-revision`(#2253、swarm batch 4 事後作成)

上流入力(consumes 全数): business-rules.md, domain-entities.md, security-design.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(隔離 worktree `agent-a7a1d34157cb1a413`、最終 HEAD `02a4e4e1f39b4e33bf7d7b8b7515090540335505`、base = origin/main `00da4bdda`)からの転記である。docs 専任 unit(実行コード非接触、TDD 適用外クラス 1 — ただし前後 green・BR-10 機械検査を実施)。

## 実装ステップ(実績)

1. **BR-9 棚卸し再実行を先行** — FD 測定 ref `5f6561eef` と自 base の docs/正本差分は semi 無関係の +1 行のみで全行番号有効を実測確認。差分 3 件を検出: (i) 第2キー新検出 `17-skill-system.md:78`+ja(FD 表の取りこぼし → carveout-split 意図を適用、V6 が 22→24 に増加する理由を確定) (ii) V1 新検出 `16-worked-examples.md:284`+ja:336(token `semi` 非含有の旧定義 description → R 相当で改訂) (iii) V1 偽陽性 2 件(`none` 行の検索語衝突 → 意味論不変の言い換えで 0 hit 化)。
2. **canonical 改訂**(`93bb68d79`)— `packages/framework/core/amadeus-common/protocols/stage-protocol.md` の BR-6 処遇表どおり 4 行のみ改訂(:33 直接反転 / :119 隣接 description / :125 `--autonomy` 追記 3 点 / :131 BR-8 全 8 要素の新定義へ置換)。保存対象 :105/:133/:442/:796/:808 は diff 非出現。
3. **docs 16 ファイル改訂**(`02a4e4e1f`)— 8 対訳ペア完全閉包(BR-2)。R 13 行全改訂・P 12 行不変・U 39 行不変(BR-7)、第2キー 4 箇所+棚卸し差分適用。
4. **`bun run build`** — self-install ミラー同期を byte 一致(cmp)で確認、tracked 不変(V5)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T23:17:26Z
- **Iteration:** 1
- **Scope decision:** none

code-generation-plan.md/code-summary.md は FD(business-rules.md BR-1〜BR-10、domain-entities.md E1〜E5)の全項目(BR-6の9行処遇、BR-7の64行分類+新規検出3件、BR-8の8要素、BR-10のV1〜V6)と実績が file:line レベルで整合し、無申告の逸脱・検証劇場・swarm backfill様式違反は検出されなかった。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-docs-revision/code-generation/code-generation-plan.md:9 — 第2キー新検出 17-skill-system.md(+ja)は business-rules.md の E1/BR-7 が列挙する11対訳ペア(22ファイル)のいずれにも含まれない新規ファイルである。BR-9/BR-10 V6が再走査による増減とその理由確定を明示的に許容しているため本 Unit の逸脱ではないが、BR-7 本文(business-rules.md:75)は第2キー検出を『いずれも FR-DOC-1 の 22 ファイル集合の内側』と明記しており、実装時にその前提集合外まで検出範囲が広がった。次回以降の FD 起草では、BR-9 再走査が対象集合そのものを拡張しうることを明示しておくと、実装時の解釈揺れを防げる。
