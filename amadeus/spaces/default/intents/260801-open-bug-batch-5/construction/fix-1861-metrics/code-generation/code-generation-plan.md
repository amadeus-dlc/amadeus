# Code Generation Plan — fix-1861-metrics(Bolt 5)

上流入力(consumes 全数): requirements.md

- 本 unit の実装対象は `requirements.md` の FR-9(#1861 metrics publication の TOCTOU 偽赤是正)。共通契約 CR-1〜CR-6(CR-3 の dist 再生成は scripts/ のみのため対象外)と AC-9a〜9c を検収基準とする。functional-design 系 consumes は degrade スコープにより不在。

## 方針

1. `loadRemoteBranch` の戻り値を判別ユニオン `RemoteBranchLoad`(`loaded` / `absent`)へ変更(parse-don't-validate)。fetch 失敗時、**後続の ls-remote で不在を実測確認できた場合のみ** `absent` と分類し、呼び出し側が候補を inventory から除外して再ポーリング継続。
2. 分類はエラーメッセージ照合ではなく **ls-remote による不在の実測**で行う(ロケール依存・他失敗の巻き込み回避)。不在を確認できない場合は元の失敗を throw(fail-open 化しない)。
3. 所有権証拠異常(`parseSnapshotCandidate` / `parseMaintenanceCandidate` 失敗)と ref 不在以外の fetch 失敗は従来どおり `problems` → terminal(AC-9b)。
4. same-root: maintenance 経路(`#candidateInventory`)が同一 `loadRemoteBranch` を共有 — 同一 PR で修正(要件指定どおり)。domain 側の無条件 terminal 述語は両経路とも無改変(所有権証拠異常の terminal 性を保存)。
5. **TDD**: AC-9a/9c は hermetic Git/GitHub boundary(実 bare remote + fake gh + 実 git fetch)の integration fixture で Red(publication-not-converged verbatim)→ Green(converged + dispatches===1)。AC-9b は unit で terminal 性を pin。

## テスト計画

- `tests/integration/t222-metrics-publication.integration.test.ts` 拡張: 「ls-remote と fetch の間でブランチが消える」fixture(snapshot 経路+maintenance 経路)。
- `tests/unit/t222-metrics-publication.test.ts` 拡張: problems 由来 terminal 性(所有権証拠異常)+「ref 不在ではない fetch 失敗は problem のまま」。
- t398 予約は既存 t222 拡張で足りるため**返上**。

## リスクと対処

- 既存 pin 衝突なし(t222 の publication-not-converged pin は hasTerminalPullRequest 側のみ — builder が独立確認)。
- 修正前面への切替は stash でなく `git checkout <base> -- <path>` 限定+修正コミット SHA からの復元(falling-proof-no-stash)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T04:29:47Z
- **Iteration:** 1
- **Scope decision:** none

FR-9 の ls-remote 実測分類・fail-open なし・maintenance same-root 同梱・domain 無改変・t222 既存 pin 不触を diff 実読で確認。指摘 0 件。

### Findings

- None
