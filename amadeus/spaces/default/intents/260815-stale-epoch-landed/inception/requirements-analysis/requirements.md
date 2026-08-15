# Requirements — intent 260815-stale-epoch-landed(Issue #3110)

> Depth: Minimal(FR 6 件)。上流入力: Issue #3110 とクロスレビュー 2 名(ESTABLISHED_WITH_REFINEMENTS — 精緻化込み)、RE 差分スキャン(observed `83e1dbeef`)。consume した codekb のうち `architecture.md` / `code-structure.md` / `code-quality-assessment.md` は本 intent の RE が更新した §260815-stale-epoch-landed 節から引用し、機序の一次記録は Issue #3110 のクロスレビューコメント 2 通(r1 / r2)を正とする。質問裁定は `requirements-analysis-questions.md`(Q1=A / Q2=A、full 梯子 AUTO_DECIDED)。

## Intent 分析

created attestation が stale 化した(= create 後に head が前進した)MERGED self PR に、pr-convergence の正規最終化経路が存在しない欠陥(#3110)を解消する。精緻化済みの機序: `transitionAllowed` は `created→landed` を許可済みだが、`currentSelfContext` の head 一致検査(`attestationBindsIdentity`)が verb 分岐より先に評価され、head 前進ケースでは到達不能な死コードになっている(r1)。stale 化の一般原因は「create 後の任意の追加 push(理由不問)」(r2、監査シャード一次証拠)。根本は #3062 選挙の設問スコープ外だった head-integrity ゲートとの未検討交差であり、**team.md『record checkpoint 同梱可』ノルムと CLI『create 後 head 前進禁止』暗黙契約の規範衝突**をどちら側で解消するかが方式選定の核心(選挙事項)。

## Functional Requirements

### FR-1: stale created × MERGED の landed 最終化(方式中立)
create 時点から head が前進した MERGED self PR が、**正規 CLI の何らかの経路**(どの verb・どの検査が吸収するかは FR-4 の選挙裁定に従う)で merge 事実(merge commit SHA・mergedAt)に束縛された `kind: landed` の record へ到達できること。この回復要件は**既に stale 化した既存 record に対して選挙のどちらの裁定でも成立が必要**(将来予防のノルム側是正だけでは既存 record を救えないため — FR-5 が依存)。あわせて、merge queue が head ブランチを削除済みでも回復が成立すること(remote-branch 不在の先行拒否 `remote branch origin/<head> is missing; push it` が landed 回復を恒久遮断しない — 本セッション実測の第 3 遮断点)。
受け入れ確認: 落ちる実証 — 再現 fixture は **head 前進と MERGED の 2 軸を同時に** seed し(既存 t541 は OPEN 限定・t3062 は head 不変のため流用不可 — RE 実測の 2 maskers)、`pr list` シームに `--state open` の実意味論を持たせること。修正前は正規経路ゼロ(Red 実測)、修正後は landed record 到達(Green)。head 不変の既存経路(#3062/t3062)と OPEN の epoch-resume(t541)は無改変 Green。

### FR-2: 誤 PR 作成の再発防止
MERGED PR の head ブランチを再 push して `create` を実行しても、新規 PR を開かないこと(reuse 不能なら loud 拒否 — #3109 の実測クラス)。
受け入れ確認: 落ちる実証 — 修正前は新規 PR 作成経路へ到達(または既存挙動の実測固定)、修正後は loud 拒否メッセージで停止。`recoverCreateFailure` の OPEN-only read-back(gh-runner.ts:322)の意味論は保存。

### FR-3: 完全性検査(sensor)の landed 受理整合(方式中立)
blocking sensor `pr-convergence-report-format` が、FR-1 の経路(選挙裁定後に確定)で書かれた landed record を合格させること。検査の束縛対象は当該 record 種別の意味論(landed なら merge commit)に整合させ、fail-closed 性は保存する。
受け入れ確認: obb6 実 record 断面相当の fixture で sensor pass。改変行(merge commit SHA 改竄等)は fail-closed のまま(落ちる実証)。

### FR-4: 規範衝突の明示的解消(選挙裁定の反映)
修正方式は選挙で裁定し(checkpoint 同梱ノルム側を緩めるか、head 前進を landed 判定で許容するか、その混合か)、裁定と留保を成果物・該当文書(stage 文書 / 学習 Inbox の該当追補)へ同一変更で反映すること。
受け入れ確認: 選挙 record が terminal(established)で、stage 文書の記述が実装挙動と一致(文書検査)。

### FR-5: park 中 obb6 への実適用(Q2=A)
修正着地後、intent 260814-open-bug-batch-6 を resume し、5 unit の report を landed へ最終化して pr-convergence ステージ→ワークフロー完了まで到達すること。
受け入れ確認: 5 report が `kind: landed`、blocking sensor pass、workflow Completion まで実測。pool・attestation の捏造ゼロ(機械確認)。

### FR-6: 台帳・検証同期
coverage-patch-allowlist の pr-convergence-cli.ts selector 3 件のうち `selfReportLifecycle`(:4399)は免除根拠が本修正の変更対象(head 束縛による到達不能)そのものである — 修正後は lcov DA 実測で去就を決める(被覆されれば削除、未被覆なら理由の書換。散文で判断しない — c-measure-not-prose)。他 selector は交差時のみ再アンカー。新規 export/イベント導入時のみ coverage-registry regen。model-map は非対象(pin 0 — RE 実測)。新規テストの母集団膨張なし(既存 in-process import 面で構成)。
受け入れ確認: CI の該当 gate 全 green。

## Non-Functional Requirements

- TDD 必須(Red 実測 → 最小実装 → Green)。
- 監査・attestation の append-only / 非偽装(P2)。fail-closed ゲートの緩和・無音バイパスを導入しない(stage 文書の「no environment variable, flag …」契約を保存)。
- 後方互換レイヤー禁止(org.md Forbidden)— 古い挙動は置き換える。

## Constraints

- 方式選定は選挙(fresh 2 voter・blind)。実装は裁定後(P1)。留保矛盾時は runoff(cid:code-generation:c1 の学習)。
- S1/S2 への格上げ疑義(両レビュアー指摘)はユーザー専権事項として本 intent 外 — Out of scope に記載しゲートで提示。

## Assumptions

- **環境変化(2026-08-15、ユーザー操作)**: リポジトリのマージ時ブランチ自動削除を OFF に変更。以後のマージでは head ブランチが残存するため、FR-1 の「remote-branch 不在」条件は既定経路では発火しない。同 arm は (a) 手動削除・既往 record(obb6 の 5 ブランチは削除済み)への回復手段 (b) 防御的堅牢性として維持する — 選挙裁定(遮断点置換)の実装スコープは不変。

- クロスレビュー引用の currency は observed `83e1dbeef` で 5/5 逐語一致を実測済み(RE)。
- obb6 の 5 PR の merged head・attested head は record と GitHub の実測どおり(C1/C7 補完実測)。

## Out of Scope

- Issue ラベルの S1/S2 格上げ(ユーザー GitHub 操作事項)。
- 同クラス残留 record(260814-plugins-rename-drift 3 unit)の再最終化(Q1=A — 修正着地後に同じ回復を適用可能な future work として記録)。
- RFC-0001 実装・#3106(cancelled unit)。

## Open Questions

- 修正方式(規範衝突の解消側)— code-generation 前の選挙で裁定。候補の構造材料は Issue #3110 コメント(r1 の評価順分析・r2 の交差帰属)と codekb §260815-stale-epoch-landed。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T12:38:09Z
- **Iteration:** 1
- **Scope decision:** none

Minimal band/testability/upstream fidelity/Q&A are all clean, but FR-1 pre-decides the very norm-conflict the election (FR-4) is supposed to settle.

### Findings

- BLOCKER | requirements.md FR-1 | unconditional acceptance check commits to loosening attestationBindsIdentity (method (b)) and forecloses election option (a) (norm-side tightening + create read-back recovery), the c3-measurable-ac-must-not-void-ruling class; FR-3 inherits via its FR-1 scoping — reword both resolution-neutral (outcome-level: stale-created x MERGED must reach kind: landed via the canonical CLI, mechanism per election)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T12:40:17Z
- **Iteration:** 2
- **Scope decision:** none

FR-1/FR-3 are now resolution-neutral and compatible with every FR-4 election option (a/b/c); nothing regressed on the other lenses.

### Findings

- FOLLOW-UP | requirements.md FR-1 | dense multi-clause paragraph edges toward narrative rationale; load-bearing so non-blocking — if depth-budget flags it, move the why-clause into Intent analysis rather than trimming acceptance-relevant clauses
