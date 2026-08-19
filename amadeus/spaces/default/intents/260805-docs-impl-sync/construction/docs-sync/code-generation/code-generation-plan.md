# Code Generation Plan — docs-sync

上流入力(consumes 全数): business-logic-model.md(修正パイプライン 3 Phase を Bolt へ写像)、business-rules.md(BR-1〜BR-8 を各 Bolt の検証条件に適用)、domain-entities.md(Divergence→Bolt 割当)、requirements.md(FR/NFR の受け入れ基準を逐語で写す — 縮小禁止)

## Bolt 編成(4 Bolt、各 Bolt = 1 PR、直列実行)

ファイル交差(05 章 = A-1 と self-* 節、docs/README = D-4 とリンク追加)があるため直列とし、各 Bolt は前 Bolt の着地(または head)へ再接地する。実装は git worktree 分離(cid:code-generation:solo-bolt-worktree-required)、base は origin/main。

### Bolt 1 — divergence-fixes(乖離修正: FR-1 + FR-2)

- 対象: クラス A(A-1〜A-9、A-11 — A-10 は Bolt 4)+ クラス B(B-1〜B-3)+ クラス D の FR-2 対象 7 件(D-1〜D-4、D-7〜D-9)
- 手順: business-logic-model Phase 1 の決定木を全項目へ適用。置換値は書込直前にコマンド再実行で採取(BR-3)
- 受け入れ基準(FR-1/FR-2 準拠 — 判定述語の原文は requirements.md を正とし、本 plan は要約。縮小しない): A-1〜A-9・A-11 の各所在(EN/JA 両面)で実値更新か count-free 置換が適用され、残存誤件数語が対象面 grep(docs/ + README*.md 限定)で 0 件。FR-2 各項の修正後値が実装実測値と一致(検証コマンド実出力を PR 本文へ添付)
- 注意: 05 章の「## The 10 Scopes」見出し・スコープ件数語は本 Bolt では触らず Bolt 2 へ委譲(交差回避)。17 章の件数語(A-2)と D-8 のスキル列挙は本 Bolt で処理

### Bolt 2 — self-scopes-section(FR-3 = F-1 + 05 章の件数語)

- 対象: `docs/guide/05-scopes-and-depth.md` + `.ja.md` へ専用 H2 節「自己開発スコープ(self-*)」新設(FD-Q2=A)、一般スコープ列挙を 11 へ更新(A-1 含む)、17 章・harness-engineering/04 章(A-3)からの参照追加
- 受け入れ基準(FR-3 準拠 — 判定述語の原文は requirements.md:43 を正とし、本 plan は要約。縮小しない): (1) self-* 4 語の grep ヒットに H2/H3 解説実体を含むファイルが EN/JA 対で存在 (2) 15 スコープ全名が 05 章+self-* 節から到達可能(リンク/包含の grep 実在確認)

### Bolt 3 — tool-docs(FR-5 の F-2〜F-7)

- 対象(FD-Q1=B): F-2 → reference 22 章へ節追加 / F-3 → guide 19 章 + reference 11 章へ節追加 / F-4/F-5/F-6 → 新章(reference 24 番台 — 番号は PR 発行直前とマージ直前に `git ls-tree origin/main docs/reference/` 実測で確定、fail-closed)/ F-7 → reference 12 章へ節追加。全 EN/JA 対
- 受け入れ基準(FR-5 準拠 — 判定述語の原文は requirements.md の FR-5 受け入れ基準を正とし、本 plan は要約。縮小しない): 7 識別子の `grep -rc` が EN/JA 両面で 1 以上、ヒットは解説実体(目的・使い方・関連機構)。内容は実装実測から転記(NFR-3)

### Bolt 4 — freeze-and-parity(FR-4 + F-8/F-9/F-10 + A-10/D-5/D-6)

- 対象: research/upstream-sync 凍結注記(3 要素、内容バイト不変)/ amadeus-files.md 現況更新 + docs/README リンク / live-e2e.ja.md 新規作成 + 索引リンク
- 受け入れ基準(FR-4/FR-5 準拠 — 判定述語の原文(凍結 3 要素の列挙・各 grep コマンド)は requirements.md を正とし、本 plan は要約。縮小しない): 凍結注記 grep ≥1 かつ `git diff` が注記行のみ / amadeus-files 実測一致 + README リンク grep ≥1 / live-e2e.ja.md 実在 + H2 数一致 + 自己言及除く被リンク ≥1

## 検証(全 Bolt 共通、BR-6)

docs-only PR は CI テスト層 skip 確定(G-1)のため各 Bolt でローカル実行を正とする: `bun test tests/unit/t174-docs-legacy-refs-gate.test.ts tests/unit/t132-hooks-doc-count-sync.test.ts tests/unit/t68-version-changelog-sync.test.ts`、`bun test tests/integration/t48-audit-event-emitters.test.ts tests/integration/t52-drift-meta-validation.test.ts tests/integration/t287-mirror-docs-contract.integration.test.ts tests/integration/t291-mirror-docs-parity.integration.test.ts tests/integration/t-pi-docs-contract.test.ts`、`bun run typecheck`、`bun run lint`、+ 当該 Bolt の FR grep 述語全数。exit code を code-summary へ転記。

## Issue 起票(FR-6 — Bolt 外、build-and-test 前に conductor が実施)

3 系統(G-2 未配線 / バッジ同期 EN 限定 / G-1 CI skip 経路)を Issue-first で起票。起票前重複検索 → 種別+P ラベル → 共通契約 6 節 → Issue 番号を code-summary へ記録。

## 実行様式

- builder は amadeus-developer-agent subagent、worktree 分離、FR/受け入れ基準はプロンプトへ逐語焼き込み(fork 前コミット不要にする)
- ディスパッチプロンプト必須文言: 逸脱は実装前停止(既存様式準拠と判断する場合も停止対象)/ 割当 worktree 外の git 操作禁止 / 本線絶対パス非混入 / モニタ・バックグラウンド待ちでターンを終えない(検証は同期完遂)/ engine・state 操作禁止 / 完了時は最終テキストで結果返送
- TDD 適用外(文書のみの変更 — team.md Testing Posture の適用外 (1))。代替検証は上記ローカルガード+grep 述語
- PR 作成後は j5ik2o-gh-pr-converge-loop 相当の収束(mergeability → review → CI)を行い、マージ承認はユーザーへ(no-AI-merge)

## チェックボックス

- [x] Bolt 1 divergence-fixes 実装・検証・PR(#2302)
- [x] Bolt 2 self-scopes-section 実装・検証・PR(#2306 — ユーザーが #2302 へマージ済み)
- [x] Bolt 3 tool-docs 実装・検証・PR(#2310 — ユーザーが #2302 へマージ済み)
- [x] Bolt 4 freeze-and-parity 実装・検証・PR(#2314)
- [x] FR-6 Issue 3 系統起票(#2276 / #2277 / #2278 + #2296、付随 #2279 / #2311)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T16:49:51Z
- **Iteration:** 1
- **Scope decision:** none

plan/summary は上流と整合、D-9 超過・執行3判定・既決維持・ブリーフ相違すべて申告済み、AC の縮小なし・検証劇場なし。Minor 2 件(plan の『逐語』ラベルと実体の乖離、FR-6 AC(2) の Issue 別ラベル記録)は conductor が是正済み(機械検証可能クラスの受理)。

### Findings

- NIT | code-generation-plan.md の受け入れ基準見出し『逐語』が実体(要約)と不一致 — 『準拠(原文は requirements を正、縮小しない)』へ是正済み
- NIT | code-summary.md の FR-6 AC(2) が一括記載 — gh issue view --json labels 実出力の Issue 別転記へ是正済み
