# Code Generation Plan — fix-1811-supervisor-orphans

上流入力(consumes 全数): requirements.md — FR-1(#1811、裁定 Q3=A = 方式 C)を実装対象とし、受け入れ基準1〜3をテスト計画の導出元とした。

## 計画(実施順)

1. 実装前 RE: 対象テストファイル実読で機序を再確定(stub 不死化 setInterval / afterEach が rmSync のみ / 漏洩3経路)。行番号は実読で再解決。
2. ブランチ `bolt/fix-1811-supervisor-orphans` を worktree 隔離で作成。
3. **Red**(TDD): 新規リグレッションテスト t374 を既存 serial ファイル内へ追加(fixture `createCliFixture` はファイルローカルのため新規ファイル化は約230行の複製 — 要件が許す既存ファイル内追加を選択)。fixture 起動 → 親終了済み孤児に run-record を無シグナル削除 → 10秒以内の全消滅を assert → exit 1 実測(survivors 7件)。
4. **Green**(最小実装): FR-1b(stub の run-record ディレクトリ実在ポーリング — 起動時 record 不在の supervisor は SIGTERM 待ち維持で FR-1c 保護)→ FR-1a(afterEach の期限付き kill/reap 掃引を rmSync の**前**に — pid ファイルが削除対象ツリー内にあるため順序が本質)。
5. 検証(個別直書き): typecheck / lint / 対象スイート(57 pass)/ FR-1c 3テスト個別 / dist:check / promote:self:check(非接触確認)/ pgrep 前後差分(新規増分 0)。
6. deslop → **Red 再実証**(stub ポーリング分岐のみ一時無効化 → exit 1 → 復元)→ 全検証再実行 → コミット → push → PR #1821 → converge loop(CLEAN・全 green・thread 0 まで)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T06:20:43Z
- **Iteration:** 1
- **Scope decision:** none

PR #1821 は FR-1a〜1d を忠実に実装 — record 不在時 SIGTERM 待ち維持分岐は FR-1c 保護に必要な申告済み精密化。

### Findings

- None
