# Stage Diary — reverse-engineering (2.1)

## Intent
260709-integrity-batch(bugfix scope)— クロスレビュー済みバグ4件(#708 P1 / #707 P2 / #705 P2 / #706 P3)

## 観察記録

- 2026-07-09: diff-refresh 実行(project.md 是正 cid:reverse-engineering:c1 準拠)。Base `a1c79dc12`(前回 260709-bug-zero-batch の observed)→ Observed `162553b99`(origin/main)。Developer スキャン → Architect 合成の直列2サブエージェント(cid:reverse-engineering:c3 準拠)。
- 差分区間は15コミット・227ファイルだが、**今回4バグの焦点コードには当該区間で変更なし** — 全欠陥が前回スキャン点から残存していることを確認。
- #708 実装に効く発見: `ClaudeCodeHookInput`(amadeus-lib.ts:2029-2047)は `source?`/`prompt?` を既宣言。stdin parse 定型は `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` に既存。ただし UserPromptSubmit ペイロードに `source` が実際に来るかは**実機キャプチャが必須**(型在≠ランタイム到来)。
- #707 の自己言及に注意: 本ステージ自身が単一 `reverse-engineering-timestamp.md` を上書きしており、修正対象の構造をこのスキャンでも踏んでいる(timestamp 冒頭に注記済み)。
- 共有ファイル調整: claude-3(gate-mechanics-batch #685)と編集順合意済み — integrity-batch(#708)先行、mint-presence.ts は本 intent 専有、presence 関数群の変更は PR 時に差分直送。

## 成果物

- developer-scan.md(Developer スキャン)
- re-synthesis-summary.md(Architect 合成サマリ)
- codekb/amadeus/ 4ファイル差分更新 + timestamp 更新
