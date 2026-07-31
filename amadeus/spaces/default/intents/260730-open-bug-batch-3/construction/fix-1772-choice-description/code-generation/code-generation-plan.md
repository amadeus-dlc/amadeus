# Code Generation Plan — fix-1772-choice-description

上流入力(consumes 全数): requirements.md — FR-2(#1772、裁定 Q2=A = description+question 追加、BR-2 契約明示改訂)を実装対象とし、受け入れ基準1〜3をテスト計画の導出元とした。

## 計画(実施順)

FR-2 を TDD の単一スライスで実装する。

1. 再接地: worktree で `origin/main`(PR #1802/#1808 着地後)へ merge し、完遂を機械確認(unmerged 0)してからブランチ `bolt/fix-1772-choice-description` を作成。
2. 実装前 RE: `amadeus-election-model.ts`(Choice/parseChoices/DistributionView/shuffleView)、`amadeus-election.ts` の view 書き出し、`amadeus-election-record.ts` の label 出力、`tests/unit/t234-election-model.test.ts` のキー集合 assert、docs(20-team-mode en/ja)、`skills/amadeus-election/SKILL.md` の定義 JSON 規定を実読。
3. **Red**: model 層 unit(t234)+CLI 層 integration(t236)の2層で欠陥を実測 — view に question 不在・description drop・非 string description の誤受理を assert し 45 pass / 5 fail(exit 1)。
4. **Green**(最小実装): `Choice.description?`(任意)を parseChoices で保持(present な非 string は fail-closed、不在はキー省略)。`DistributionView` に `question` と choice ごとの `description` を追加し `shuffleView` が搬送。50 pass / 0 fail(exit 0)。
5. **BR-2 契約の明示改訂**: t234/t236 のキー集合 verbatim assert と設計コメントを新キー集合へ改訂。中核禁止(推薦マーカー・先行票・peer status 不搬送)は網羅キー集合 assert が執行機構としてそのまま維持。
6. docs 英日同期+SKILL.md 定義規定へ description 追記。
7. 配布同期(7ハーネス dist+self-install)→ TLA model-map の sha256 再ピン(#1808 と同一手順)→ 全検証 → deslop(網羅 assert の上位互換により常に真になる禁止語ループを除去 — assert True 相当の排除)→ コミット → push → PR #1809 → 収束ループ(CodeRabbit スレッド2件を解決、CI 全 green・CLEAN まで)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T04:21:41Z
- **Iteration:** 1
- **Scope decision:** none

FR-2a〜2d は PR #1809 で実装され、受け入れ基準1〜3をテストが実測固定 — 逸脱・検証劇場・スコープ混入なし。

### Findings

- None
