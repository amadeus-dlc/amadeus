# 業務ロジックモデル — unit: parallel-policy-docs

## 入力と前提

- 上流入力は `inception/requirements-analysis/requirements.md`（R001〜R006、N001〜N003、AC-1〜AC-4）である。
- scope refactor により units-generation と application-design はスキップ済み（unit-of-work、components 等は設計どおり不在）。本 unit は Intent 全体を 1 unit（parallel-policy-docs）として扱う。
- 変更対象の既存文書構造として team.md の「並行運用ポリシー」「Git Branching Policy」を参照する。`aidlc/spaces/default/memory/phases/construction.md` は現行 workspace に**存在しない**（reviewer 指摘で確定。@-import は空読み、seed 機構は既存 workspace では発火しない）ため、WF3 で**新規作成**する（Q3=A）。

## ワークフロー概要

本 unit は 4 個のワークフローで構成し、単一 unit / 1 PR で実施する。

| WF | 対応要求 | 概要 |
|---|---|---|
| WF1 worktree 階層節 | R001、R006 | team.md 並行運用ポリシーへ新節「worktree の階層と Bolt 実行契約」を追加する |
| WF2 実例反映 | R004 | 並行運用ポリシーの判断基準本文と根拠表へ 2026-07-05 の実例 4 件を追記する |
| WF3 切り直し手順 | R002、R003 | construction phase memory へ walking-skeleton の現行契約参照と Bolt 切り直し手順を追記する |
| WF4 disposition | R005 | #407 / #342 の disposition（実装済み / 文書化済み / 未確定）を記録し close / 継続を提案する |

## WF1: worktree 階層節（R001、R006）

1. team.md「並行運用ポリシー」の「同一 worktree での直列化」節の後に、新節「worktree の階層と Bolt 実行契約」を追加する。
2. 記載内容（Q1=A、AC-1 の項目対応表を含む）:
   - Intent worktree = 外側の隔離単位（既存規定の再掲＋関係の明示）。
   - Bolt worktree = Construction 内の実行隔離。エンジンの `amadeus-bolt start --worktree` / `complete --merge`（fragment fork・merge）が所有し、Intent worktree の内側に作られる（#407 項目 1・2 への答え）。
   - 直列化規定との整合: Bolt worktree の fork・merge はエンジンが所有するため、「同一 worktree 内の直列化」の例外ではなく内数である（項目 3）。
   - イベント契約と gate evidence: `WORKTREE_*` / `STATE_FORKED・MERGED` / `AUDIT_FORKED・MERGED` はエンジン内部の attestation であり、PR gate 運用が要求する gate evidence は Bolt PR の merge と `BOLT_COMPLETED` のまま。理由 = 人間が検証できる単位は PR であり、fork/merge の整合はエンジンと eval（engine e2e）が保証する（項目 4、R006-1）。
   - 差分の解消記録: 本家 `aidlc-worktree.ts` 相当は `amadeus-worktree.ts` として実装済み（項目 5、R006-2 訂正後。N001 の実装参照付き。訂正の経緯は diary）。
   - 末尾に #407 の 5 項目 → 本節の記述の対応表を置く（AC-1）。

## WF2: 実例反映（R004）

1. 判断基準本文への最小追記（Q2=A）:
   - 「並行させる単位」節へ: worktree（特に primary checkout）の占有は開始時に通知し、解放時に引き渡す（実例 a）。
   - 「共有成果物の統合」節または新規小段落へ: ファイル非接触でも、挙動変更と文書化が並行する場合は意味的接触として申し送る（実例 c）。完了済み Intent の cursor・hooks 状態も接触面として扱う（実例 b）。
   - 「ゲート承認の運用」節の後または適所へ: 指示系統の委任（Maintainer → 代理 → worker）による分配の一元化（実例 d）。
2. 根拠表へ 4 行追加（判断基準 / 実例 / 参照 = #476・PR #479、#477 × #479、#481 相談、agmsg 運用。日付 2026-07-05）。

## WF3: 切り直し手順と walking-skeleton 参照（R002、R003）

1. `aidlc/spaces/default/memory/phases/construction.md` を**新規作成**する（Q3=A）。構造は seed テンプレート（`.agents/amadeus/tools/data/memory-seed/phases/construction.md`）を踏襲: タイトル「Construction Phase Guardrails」相当の日本語タイトル、適用宣言、seed の既存 H2 見出し群（Code Completeness / Error Handling / Testing Standards / Security / Corrections）を保持し、新見出し「## Bolt 運用」を追加して次を置く（新見出しの追加理由は diary に記録済み）:
   - walking skeleton・ladder prompt・Construction Autonomy Mode は現行エンジンの契約（stage-protocol.md の Ladder prompt 節、amadeus-bolt set-autonomy）として実装済みである旨の参照（R002。新契約は追加しない）。
   - Bolt 切り直し手順（R003）: Construction 途中で Bolt 分割の見直しが必要になったら、halt-and-ask で人間に確認 → 必要なら delivery-planning への backward jump または単発 re-run で bolt-plan を更新 → 再開。これ以上の契約化は運用実績待ち。

## WF4: disposition（R005）

1. `construction/parallel-policy-docs/issue-disposition.md` に記録: #407 = 全 5 項目に文書で回答（close 提案）。#342 = 弱点 1 実装済み・弱点 2 文書化済み・弱点 3 運用実績待ち（close 提案＋弱点 3 は観測継続を明記、または継続提案。判断根拠を添える）。
2. PR 説明へ disposition の要約を含め、close 操作は Maintainer に委ねる。

## 処理順序と依存

```
WF1（階層節） --> WF2（実例反映。同じ team.md への編集を 1 回に統合）
WF3（phase memory）は独立
WF1〜WF3 --> WF4（disposition） --> 検証（N002〜N003）
```

## Review

**Verdict**: READY

**Iteration**: 2

**Findings**:

- **[解消済み] WF3 の前提だった `aidlc/spaces/default/memory/phases/construction.md` 不在問題は解消された。** functional-design-questions.md の Q3 で「A: 新規作成し、seed テンプレート（`.agents/amadeus/tools/data/memory-seed/phases/construction.md`）の構造を踏襲する」と自己回答が確定し、business-logic-model.md の「入力と前提」（7 行目）と WF3（41〜43 行目）が「存在しない → 新規作成」へ明示的に書き換えられている。再確認した事実は次のとおりで、この記述と矛盾しない。
  - `aidlc/spaces/default/memory/phases/` は本 worktree に実在せず（`ls` はディレクトリ不在を返す）、`git log --all` にも当該パスの追加コミットはない（引き続き不在）。
  - `.agents/amadeus/tools/data/memory-seed/phases/construction.md` は実在し、タイトル「Construction Phase Guardrails」＋適用宣言＋ H2 見出し 5 個（Code Completeness / Error Handling / Testing Standards / Security / Corrections）という、WF3 が引用する構造と完全に一致する。
  - `.agents/amadeus/tools/amadeus-utility.ts` の `ensureWorkspaceDirs`（2026〜2062 行）は `existsSync(defaultMemory)` が false（= default tree 全体が丸ごと不在）の場合だけ seed をコピーするガードのままであり、`org.md` 等が既存の本 workspace では自動生成されないという前回確認済みの事実と整合する。
  - 新見出し「## Bolt 運用」を立てる理由は `construction/functional-design/memory.md` の Deviations 節（2026-07-05T08:50:00Z のエントリ）に記録済みで、business-rules.md の「新しい見出し体系を作る場合は理由を diary に記録する」ルールへの適用漏れも解消されている。
  - business-rules.md の変更範囲ルール（14 行目）は `phases/construction.md` を変更許可対象として明記済みで、新規作成の可否と矛盾しない。
  - 開発者はこの記述だけで実装できる: 対象パスが存在しないので新規作成する／タイトルと適用宣言と 5 見出しは seed をそのまま踏襲する／新見出し「Bolt 運用」に R002（既存契約参照）と R003（切り直し手順）の内容を置く、という手順が一意に決まっており、アーキテクトへの追加確認は不要である。

- **[非ブロッキング] 保持する 5 見出し配下の本文（seed のブレット内容）を訳出コピーするか、空見出しのまま作るかは WF3 の文面からは一意に読み取れない。** 「seed の既存 H2 見出し群…を保持し」は見出しラベルの保持を明言しているが、その配下の説明文（Code Completeness 等の箇条書き）を日本語訳して転記するかどうかは明記がない。実装上は「既存の見出し体系・語彙・粒度に合わせる」という business-rules.md の一般原則と「踏襲」という語から、seed 本文を日本語化して転記するのが自然な既定解釈であり、開発者がこの解釈で進めても後戻りするような矛盾は生じない。次回改訂の余地として記録するに留め、ブロッキングとは扱わない。

- **[非ブロッキング・継続] WF1〜WF4 と R001〜R006 の対応は漏れなく、追跡可能である。** 対応表（WF1=R001,R006／WF2=R004／WF3=R002,R003／WF4=R005）で 6 要求すべてがちょうど 1 回ずつカバーされている。R006 の gate evidence 理由も requirements.md・business-rules.md と一致して明記されている。R005 の disposition も business-rules.md で `実装済み` / `本 Intent で文書化` / `未確定・運用実績待ち` の 3 値として定義されており、要求どおりである。

- **[非ブロッキング・継続] team.md 側の配置claim は実文書と一致する。** WF1/WF2 が挿入対象として挙げる節はすべて実在し、見出し名も一致する。新設予定の「worktree の階層と Bolt 実行契約」節を「同一 worktree での直列化」の後・「根拠」の前に置く計画も、既存の節順序と矛盾しない。

- **[非ブロッキング・継続] R006 が言及するイベント名・CLI サブコマンドは実装に存在する。** `amadeus-bolt.ts` に `start --worktree` / `complete --merge` / `set-autonomy` が存在し、`WORKTREE_*` / `STATE_FORKED` などのイベント名も `amadeus-worktree.ts` 等で使用が確認できる。N001 のファクトチェック要求に対する土台は妥当。

- **[非ブロッキング・継続] frontend-components.md の非適用判定は要求と整合している。** R001〜R006 に UI 要求がなく、変更対象がすべて Markdown 文書であるという根拠は requirements.md と矛盾しない。scope refactor での units-generation/application-design 不在は設計どおりであり、指摘対象外として扱った。
