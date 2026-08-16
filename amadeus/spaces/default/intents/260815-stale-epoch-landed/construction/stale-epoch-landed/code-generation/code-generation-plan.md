# Code Generation Plan — unit stale-epoch-landed(Issue #3110)

## 裁定(拘束)

- 方式: **C — 混合**(選挙 E-260815-3110-FIX-METHOD、2-0、GoA 2/2): (i) merged self PR への祖先実測つき landed 最終化を主経路に (ii) create の MERGED-head 誤 PR 作成防止(#3109)(iii) stage 文書の裁定反映を同一変更で

## 採用条件(両票の留保 — すべて拘束)

1. **祖先述語**: 「attested prHead が PR の **merged headRefOid** の祖先」で判定(merge commit の祖先と実装しない — squash 運用で不成立、実測済: #3092 で `git merge-base --is-ancestor <prHead> <mergeCommit>` → exit 1)。landed record の束縛は merge commit SHA + mergedAt
2. **第 2・第 3 遮断点の merged-arm 置換**: `pr-convergence-git-runner.ts:184-188`(remote-branch 存在 + local==remote==expected)と sensor `checkAttestationEnvironment`(:284-291)を、merged/landed アームに限り merge 事実束縛の検査へ**置換**(緩和ではない — fail-closed は merge commit SHA / mergedAt の改竄検査で保存)
3. **ブランチ削除後の commit 取得性**: 祖先実測の一次証拠を `git fetch origin refs/pull/<n>/head` か gh compare API のどちらかへ実装時に確定し、選定理由を code-summary へ記録
4. **create の誤 PR 防止**: MERGED PR の head で `gh pr create` 成功経路(cli.ts:1079-1105)へ入る前に merged 既往を検知し loud 拒否。`recoverCreateFailure` の OPEN-only read-back(gh-runner.ts:313-330)の意味論は不変
5. **文書是正の限定**: `pr-convergence.md:311-318`(「identity, epoch, and attestation prerequisites are unchanged」— 実装との矛盾)と `:341-346` を本裁定の反映に限り是正。ノルム本文の再設計へ広げない
6. **既存経路の無退行**: head 不変 landed(t3062)・OPEN epoch-resume(t541)・非 self landed(t482)無改変 Green

## 落ちる実証の設計拘束(RE 実測の 2 maskers 対応)

- 再現 fixture は **head 前進 × MERGED を同時に** seed し、`pr list` シームへ `--state open` の実意味論(merged なら空)を持たせる(t541 流用不可: state 無視/OPEN 前提。t3062 流用不可: 単一 head 定数)
- head を 2 値で返す gh スタブ(create 時=旧 head、report 時=merged headRefOid)

## 台帳(FR-6)

- allowlist `selfReportLifecycle`(:4399): 修正後 lcov DA 実測で削除 or 理由書換(散文で決めない)。signature/anchor 変更時は createSemanticSelector で再アンカー(census は最終 merge base)
- 新規テストファイル追加時は coverage-registry regen 同梱。model-map は非対象(pin 0)

## TDD 順序

1. Red(FR-1 主再現): 2 軸 fixture で `report` → 正規経路ゼロ(stale 拒否 or push-it 拒否)を実測
2. Green: merged-arm の祖先実測 + landed 書込
3. Red→Green(FR-1 削除ブランチ arm): remote-branch 不在でも landed 到達
4. Red→Green(FR-2): MERGED head での create → loud 拒否
5. Red→Green(FR-3): sensor が新 landed record を pass / merge 事実改竄は fail-closed
6. 無退行: t3062 / t541 / t482 / t448 / t447 / t450 / t533 / t534 無改変 Green

## 検証・配送

- push-first。blocking はリモート CI。worktree `bolt-stale-epoch-landed`(base origin/main)
- FR-5(obb6 実適用)は着地後に conductor が実施(受け入れ基準の実測)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T13:21:52Z
- **Iteration:** 1
- **Scope decision:** none

5/6 binding reservations traced cleanly, but reservation #3's mandated evidence-source disclosure is absent from code-summary and the TDD Red verbatims were deferred rather than delivered at this gate.

### Findings

- BLOCKER | code-summary.md | evidence-source selection (refs/pull/<n>/head vs gh compare API) and rationale required by election reservation 3 are missing from the artifact
- BLOCKER | code-summary.md | Red verbatims deferred to a later addendum contradicts the TDD NFR and the falling-proof mandate at this gate

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T13:23:28Z
- **Iteration:** 2
- **Scope decision:** none

Both iteration-1 BLOCKERs resolved: reservation #3's ancestry-proof selection recorded with rationale, and TDD Red verbatims for all five arms transcribed in place; nothing regressed.

### Findings

- FOLLOW-UP | code-summary.md | FR-2 narrowing properly disclosed with rationale and ladder ruling id auto-decision-c2b3dc09044c0023b3d8c13c22f468f6 — traceability note only
