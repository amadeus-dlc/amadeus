# Requirements：Bolt worktree 実行契約と並行運用 policy の整理・補強

Intent: 260705-parallel-policy-docs
対象 Issue: [#407](https://github.com/amadeus-dlc/amadeus/issues/407)、[#342](https://github.com/amadeus-dlc/amadeus/issues/342)
確定判断の記録: `requirements-analysis-questions.md`（Q1〜Q4、Maintainer の包括委任に基づく自己回答。根拠付き）

## Intent 分析

2 個のオープン Issue を 1 Intent に束ね、「worktree の隔離単位と Bolt 実行契約の関係」を文書として一意にする。

重要な前提: 両 Issue は起票後にエンジン駆動 v2 lifecycle が実装され、指摘の一部（walking skeleton の不在、Bolt worktree 機構の不在）は現行エンジンで解消済みである。本 Intent の仕事は、(1) 現状契約との突き合わせで「実装済み」「本当に残る穴」を仕分けし、(2) 実装済み分は文書整合で閉じ、(3) 残る穴（Bolt 切り直し手順）を最小限で明文化し、(4) 2026-07-05 に観察した並行運用の新実例を policy の根拠表へ追記することである。

変更対象は文書のみ（`aidlc/spaces/default/memory/team.md`、`aidlc/spaces/default/memory/phases/construction.md`、必要なら `docs/amadeus/` の参照整合）。エンジンコード・skill・validator には触れない。

scope refactor は Ideation をスキップするため、intent-statement と scope-document は存在しない（設計どおりの不在）。

## 機能要求

### R001-worktree-relation（#407、Q1=A）

team.md の並行運用ポリシー（または Git Branching Policy との責務分担節）に、Intent worktree と Bolt worktree の関係を明文化する。

- Intent worktree = 外側の隔離単位（並行は Intent 単位、worktree を Intent ごとに分ける現行規定）。
- Bolt worktree = Construction 内の実行隔離（エンジンの `amadeus-bolt start --worktree` / fragment fork・merge / `STATE_FORKED` 系イベント）。Intent worktree の内側に作られる。
- 同一 worktree 内の直列化規定との整合: Bolt worktree はエンジンが fork・merge を所有するため直列化規定の例外ではなく内数である旨を明記する。

### R002-skeleton-resolved（#342 弱点 1、Q2=A）

walking skeleton 相当（stance 分類、ladder prompt、Construction Autonomy Mode）が現行エンジンに実装済みであることを、#342 が参照する文書側（team.md または phase memory）から現行契約（stage-protocol.md の該当節）への参照で示す。新しい契約は追加しない。

### R003-bolt-replan（#342 弱点 2、Q3=A）

`aidlc/spaces/default/memory/phases/construction.md` に、Bolt 切り直しの手順を短く明文化する: Construction 途中で Bolt 分割の見直しが必要になった場合、halt-and-ask で人間に確認し、必要なら delivery-planning への backward jump（または単発 re-run）で bolt-plan を更新してから再開する。運用実績が積まれるまで、これ以上の重い契約化はしない。

### R004-parallel-examples（Q4=A）

team.md の並行運用ポリシーの根拠表へ、2026-07-05 の実例 4 件を追記する。

1. primary checkout の占有・解放の調整（Intent 単位並行における worktree 占有の通知と引き渡し）。
2. 完了済み workflow への hooks 誤動作の観測と修正（#476 → PR #479。policy 側は「完了済み Intent の cursor / hooks 状態も並行運用の接触面である」ことの根拠）。
3. 意味的接触の申し送り（ファイル非接触でも、挙動変更と文書化が並行すると乖離が起きる。#479 × #477 の実例）。
4. 指示系統の委任による並行統制（Maintainer → 代理セッション → worker セッション。タスク分配と接触面判断を代理が一元化）。

### R006-event-gate-policy（#407 の判断項目 4・5）

team.md（並行運用ポリシーまたは Git Branching Policy の適切な節）へ、次の 2 点を明文化する。

1. **イベント契約と PR gate の要求水準（項目 4）**: `WORKTREE_*` / `STATE_FORKED・MERGED` / `AUDIT_FORKED・MERGED` はエンジン（amadeus-bolt の fork・merge）が emit する内部 attestation であり、PR gate 運用が要求する gate evidence は従来どおり「Bolt PR の merge と `BOLT_COMPLETED`」とする。理由（人間が検証できる単位は PR であり、fork/merge の整合はエンジンと eval が保証する）を記す。
2. **本家 deterministic tool 差分の扱い（項目 5）**: 本家 `aidlc-worktree.ts` 相当は `amadeus-worktree.ts`（create / merge / discard / list / verify、`WORKTREE_*` emit）として実装済みであり、`amadeus-bolt.ts` の fork・merge と併せて差分は存在しない。「実装済み」として実装箇所の参照（N001）付きで記録する。（訂正: 当初「独立 tool は新設しない意図的差分」と記載したが、code-generation のファクトチェックで実装済みと確認。diary 参照）

### R005-issue-disposition

作業完了時に #407 / #342 の disposition を記録する: 実装済みと確認した項目、本 Intent で文書化した項目、未確定のまま残す項目（#342 の弱点 3 = Delivery Planning 分業の要否は運用実績待ちとして残す想定）を明記し、close または継続を提案する。

## 非機能要求

| ID | 要求 | 検証方法 |
|---|---|---|
| N001-fact-check | 「実装済み」と記す項目は、現行コード・文書の該当箇所（ファイルパス）を根拠として引用する。 | 成果物内の参照が実在すること（レビューで確認） |
| N002-standard-verification | 変更後に repo 標準検証が pass する。 | `npm run test:all` |
| N003-artifact-validity | 本 Intent の成果物が構造検証を pass する。 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-parallel-policy-docs` |

## 制約

- 変更は文書のみ。エンジンコード・skill・validator・example に触れない。
- team.md の既存の見出し・語彙・粒度に合わせる（生成前チェック規則）。
- 並行運用ポリシーの「観察済みの実例に根拠がある範囲だけを扱う」原則を守り、推測の判断基準を足さない。

## 前提

- kanban-470 セッションが並行で #481（エンジン修正）を進めている。本 Intent は文書のみのため接触しないが、team.md を参照する記述を書く場合は相互に一報する取り決め済み。

## 対象外

- #342 弱点 3（Delivery Planning 相当の独立 stage 化の要否）の結論。運用実績待ちの未確定事項として disposition に記録するに留める。
- #407 候補 3（aidlc-worktree.ts 相当の新規実装）。
- CONTEXT.md・docs/adr の変更。

## 受け入れ条件

- AC-1: #407 の「判断が揺れる」5 項目それぞれに、team.md の該当節で答えがある。対応は 項目 1〜3 = R001、項目 4〜5 = R006 とし、成果物側に項目→節の対応表を含める（#407 の受け入れ条件「採用しない場合は、PR gate と BOLT_COMPLETED を gate evidence にする理由が記録されている」を R006-1 が満たす）。
- AC-2: #342 の弱点 1 が「実装済み」の根拠付きで閉じ、弱点 2 の切り直し手順が construction phase memory に存在する。
- AC-3: 並行運用ポリシーの根拠表に 2026-07-05 の実例 4 件が、追跡可能な参照（PR / Issue）付きで追加されている。
- AC-4: `npm run test:all` と validator（本 Intent）が pass する。

## オープンな疑問

- なし（Q1〜Q4 で確定済み。#342 弱点 3 は対象外として disposition で扱う）。

## Review

**Verdict**: READY

**Iteration**: 2

**Findings**:

- **[解消済み] 旧ブロッキング指摘（AC-1 が #407 の 5 項目中 3 項目しか答えていない）は解消された。** 新設の R006-event-gate-policy が項目 4（`WORKTREE_*`/`STATE_*`/`AUDIT_*` は engine-internal attestation であり、PR gate evidence は従来どおり Bolt PR merge + `BOLT_COMPLETED` とする、という要求水準と理由）と項目 5（本家 `aidlc-worktree.ts` 相当は `amadeus-bolt.ts` が担い、独立 tool は新設しない意図的差分として N001 参照付きで記録する）に明示的に答えている。AC-1 の対応表要求（項目 1〜3 = R001、項目 4〜5 = R006）は、#407 本文で確認した実際の 5 項目の切り分けと一致しており、#407 自身の受け入れ条件（「採用しない場合は、PR gate と `BOLT_COMPLETED` を gate evidence にする理由が記録されている」）も R006-1 で満たされている。

- **[確認済み] R006 と対象外節の候補 3 除外は矛盾しない。** 対象外節「#407 候補 3（aidlc-worktree.ts 相当の新規実装）」は「新規 tool を作らない」という結論を、R006-2 は「作らない理由を N001 参照付きで根拠記録する」という作業を担っており、両者は同じ判断の異なる側面（何をしないか／なぜしないかを書くか）を述べているだけで対立していない。

- **[非ブロッキング／確認済み] N001（実装済み主張）のファクトチェックは妥当だった。** `stage-protocol.md`（89〜114 行、369 行、708 行）に ladder prompt と walking-skeleton gate の記述があり、`amadeus-bolt.ts` に `start --worktree` / `complete --merge` / `set-autonomy` と fork・merge の実装が確認できた。`amadeus-orchestrate.ts` にも skeleton stance の classify round-trip（`GATE_UNRESOLVED` → stance 記録 → 決定的 gate）が確認できた。R002・Q2 の「実装済み」という主張は裏付けが取れている。

- **[非ブロッキング] #342 弱点 3 の対象外化は明確に記録されている。** 対象外節と R005 の両方に「Delivery Planning 相当の独立 stage 化の要否は運用実績待ちの未確定事項」と明記されており、#342 自身の推奨候補（候補 1: 現状維持し運用で観測する）とも整合する。追加対応は不要。

- **[非ブロッキング] Q4 で追記予定の実例（#476、PR #479、#477、#481）は実在確認済み。** いずれも参照可能な Issue/PR であり、根拠の追跡可能性は担保されている。

- **[非ブロッキング] AC-1・AC-2 の検証文言がやや主観的。** 「一意に読める」「文書内の対応が追跡できる」は、QA がテストを書くには曖昧さが残る。ブロッキングではないが、functional-design 以降で「該当節の見出し名」など具体的な検証手段に落とすことを推奨する。

- **[非ブロッキング] FR の掲載順序が ID 順と食い違っている。** R004-parallel-examples の直後に R006-event-gate-policy、その後に R005-issue-disposition が続く。追跡には支障ないが、可読性のため次回更新時に ID 順へ揃えることを推奨する。
