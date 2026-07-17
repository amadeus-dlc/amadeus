# Code Generation Plan — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): requirements.md(FR-1/FR-2 — reviewer iteration 2 READY GoA 1)、RE scan-notes.md(機序・配置・落ちる実証設計)。

## 実行形態

- builder subagent 1名(amadeus-developer-agent)、worktree `bolt-1081-size-drift`(base = origin/main cdd843c29)。c2 隔離規律+builder-prompt-sync-completion+deviation-stop-before-implement をプロンプトに明記
- 変更は `tests/integration/t-team-up-codex-resume.test.ts` 最上部への `// size: large` 1行のみ(AC-1b surgical)
- FR-2(短縮別 Issue)は conductor が並行起票 — **Issue #1087**(時限判定明記、enhancement/P3)

## 検証設計(プロンプトへ焼き込み)

1. 落ちる実証: `// size: small` 注入 → t-test-size-drift exit 1 → `// size: large` へ → exit 0(AC-1c、注入面 = 対象ファイル自体で drift guard が読む面 — injection-surface-verify)
2. drift 0 閉包: run-tests --integration --filter で wall-clock drift 行に対象が現れないこと(AC-1d)
3. 複数回実測: 2回の実測秒を記録(AC-1e — 既存3実行系に追加して恒常性確認)
4. 決定的ゲート全 exit 0+patch gate(コメント行 = lcov 非計測の実測確認)

## 計画からの逸脱と裁定(履歴)

(発生時に追記)
