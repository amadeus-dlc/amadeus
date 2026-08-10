# Code Generation Plan — Bolt 3 projection-sweep(事後作成)

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: projection-sweep (packaging)

上流入力(consumes 全数): `bolt-plan.md`(Bolt 3 の Definition of Done と検証列)、`unit-of-work.md`(U3 完了条件 — 各 Step の AC 正本)、`security-design.md`(配布投影の完全性統制 = 既存検証集合の再利用のみ・新規機構ゼロ)、`requirements.md`(FR-PROJ-2/3/4 の AC 逐語)、`component-methods.md`(C6 の投影面)。FD 成果物は packaging kind の produces_kinds 解決により本 unit に不在(`consumes_absent`、`expected: true`)。

> 本 plan は swarm 経路の事後作成(cid:code-generation:swarm-unit-artifact-backfill)。Step の述語は unit-of-work.md U3 完了条件の逐語(cid:code-generation:c3-260803-state-integrity — 縮小しない)。

## Steps(実績確定)

1. **FR-PROJ-2(prose 消費者の全数更新)**: `git grep -in "one question at a time"`(**大小文字非区別が既定** — cid:requirements-analysis:c1-prose-sweep-case-insensitive-default)の全 hit と、対訳側の実語彙「一度に1質問」(cid:reverse-engineering:c1-translation-pair-vocabulary-key)を frontier 語彙へ更新。語彙は `grilling-protocol.md` §2.1/§2.2/§2.4 と `stage-protocol.md:277` の確定文言へ接地させ、新語彙を発明しない。en/ja 対で同一変更。
2. **FR-PROJ-3(hybrid 残存の自然消滅)**: `docs/reference/04-stage-protocol.md` / `.ja.md` の hybrid 終了記述を新契約の記述へ書き換え、`hybrid termination` / 「ハイブリッド終了」が docs/ で 0 hit。
3. **申告付きスコープ拡張(ユーザー裁定 2026-08-10)**: `packages/framework/core/templates/onboarding.md` に残存したハイフン結合形 `one-question-at-a-time` を是正し、投影面を再生成で追従(cid:code-generation:c6 の対称適用 — Bolt 1 が conductor.md:51 を同じ理由で先行是正した前例)。
4. **FR-PROJ-4(配布面の再生成検証)**: `bun run build` → `bun run source-only:check` → 隔離2回ビルド再現性検査 → `t199` を exit 0 で実測。生成物は直接編集せず再生成で追従(project.md Forbidden)。
5. 全数 sweep の述語(パターン・対象ディレクトリ集合・除外条件)を**そのまま再実行できる形**で結果と同じ場所に記録(cid:requirements-analysis:enumeration-completeness-review の E-ASD-RES13 追補)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T13:42:52Z
- **Iteration:** 1
- **Scope decision:** none

レビュー環境(conductor ツリー)に Bolt 3 の実装が未取込のまま出したため、code-summary が申告する sweep 0 hit を再現できず BLOCKER 4件。実装自体は PR #2844 の head に存在する(conductor のミラー順序の誤りであり実装の欠陥ではない)。

### Findings

- BLOCKER | packages/framework/core/templates/onboarding.md:13 | 旧語彙(ハイフン結合形)が残存 — レビュー環境に Bolt 3 未取込
- BLOCKER | docs/reference/04-stage-protocol.md:320 | hybrid termination が現存 — 同上
- BLOCKER | docs/guide/02-your-first-workflow.md:89 ほか FR-PROJ-2 対象全ファイル | 旧語彙が残存 — 同上
- BLOCKER | CLAUDE.md:62 / .claude/CLAUDE.md:33 / .agents/rules/amadeus-codex-suffix.md:31 | 申告付きスコープ拡張の是正が未反映 — 同上
- FOLLOW-UP | conductor | レビュー環境の HEAD が PR head と一致するかを確認し、一致しないなら取込後に再レビューへ出すこと
- NIT | code-summary.md | 様式(上流入力ヘッダ・H2 構成)は契約を満たす

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T13:51:51Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER 4件は conductor ツリーへの取込後に全件閉包を確認。残る BLOCKER 3件は conductor ツリーの自己インストール投影(.claude/.codex)が未再生成であることに起因し、R4 述語の申告と矛盾する。追跡ファイル面の FR-PROJ-2/3 は充足。

### Findings

- BLOCKER | .claude/amadeus-common/protocols/stage-protocol.md:349 | 自己インストール投影に旧語彙 one question at a time / hybrid termination が現存(正本は更新済み・投影が未再生成)
- BLOCKER | .claude/amadeus-common/protocols/grilling-protocol.md:10-11,29,34 | 同投影が Bolt 1 以前の内容のまま
- BLOCKER | .codex/amadeus-common/protocols/stage-protocol.md:349 | 同型の旧語彙残存 — 複数ハーネス投影が未再生成
- FOLLOW-UP | conductor | conductor ツリーで bun run build を実行し R4 を再実行して 0 hit を実測してからゲートへ出すこと。git status --porcelain 空は追跡ファイルの不変を示すのみで gitignore された自己インストール木の更新を証明しない
- NIT | code-summary.md:32-37 | 全数再実行をどのワークツリーで行ったかの明記がない — 以後は実行ツリーを明記すること
