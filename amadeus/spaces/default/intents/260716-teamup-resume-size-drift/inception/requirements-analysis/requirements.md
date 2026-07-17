# Requirements — teamup-resume-size-drift(Issue #1081)

> 上流入力(consumes 全数): codekb の business-overview.md / architecture.md / code-structure.md(RE diff-refresh で「size 機構3ファイルは区間 86 コミット不変・body 温存」と判定済みの背景参照 — test-size 専用節は codekb に不在)、RE scan-notes.md(フォーカス6面の file:line 実測+Architect 合成 — 再照合7点全一致。本修正の直接根拠)、re-scans/260716-teamup-resume-size-drift.md、Issue #1081(クロスレビュー2名 CONFIRMED: e3 32.53s / e4 31.30s の独立再現)。bugfix スコープ(bugfix-scope-for-bug-intents 既決)。2026-07-16。
> 既決照合: 修正方式 = E-1081-FIX 裁定 C(2026-07-16T09:28:39Z、agmsg 出典 — size: large 宣言+短縮別 Issue)。配置 = ファイル最上部1行(covers 不在の実測に対し留保保持者 e4 が趣旨等価と回答、09:38Z — 選挙不要の裁定済み事項)。明確化質問 **0 問**(questions ファイル冒頭の選挙不要判定参照)。

## FR-1: `// size: large` 宣言の追加

`tests/integration/t-team-up-codex-resume.test.ts` の**ファイル最上部(現 :1 の import より前)**へ `// size: large` を1行追加する。

- AC-1a: 配置は先頭40行走査・先頭一致 wins の機構(`tests/lib/test-size.ts:279-291` parseSizeAnnotation)に適合すること — 最上部1行で `declared="large"` が有効化される(e4 趣旨等価確認済みの適応配置。#1077 の型のうち「1行宣言・テスト本体不変」は踏襲)
- AC-1a-2(修正の効く機序 — E-1081-FIX 共通留保の記録): drift 検出 `detectWallClockDrift`(`tests/lib/test-size.ts:113-121`)は `SIZE_ORDER[measured] > SIZE_ORDER[declared]` の **strictly-greater 一方向専用**判定(:117)であり、宣言を `large` へ引き上げると `SIZE_ORDER[large] > SIZE_ORDER[large]` が偽となって drift が `{kind:"none"}` に確定する。なお AC-1c の drift **guard**(`t-test-size-drift.test.ts:129`、`declared < static measured` 方向専用)とは**別機構**で、両者とも一方向専用という対称性が「large 宣言はどちらの方向にも触れない」という本修正の安全性根拠である
- AC-1b: 変更は**この1行のみ**(surgical)。テスト本体・test-size.ts・run-tests.ts・drift guard に触れない
- AC-1c: **落ちる実証**(Mandated): `// size: small` を一時注入 → `tests/unit/t-test-size-drift.test.ts:122-134` の on-disk drift guard が violation で**赤**(exit 1)を実測 → 除去して `// size: large` へ → 全 size ゲート**緑**(exit 0)を実測(guard は宣言<static 方向専用のため large 宣言は赤化しない — scan-notes 面5)
- AC-1d: **drift 0 閉包**(ruling-premise-closure): 修正後に対象テストを実走行し、`run-tests.ts:973` の `wall-clock drift: 0 file(s)`(または対象ファイルが drift 列挙に現れないこと)を実測する
- AC-1e: **宣言値の複数回実測裏取り**(E-1081-FIX e4 留保の保存): 修正時に対象テストを最低2回実測し、既存3実行系(31.30/31.99/32.53s)と合わせて ≥30s の恒常性を確認して code-summary に記録する(境界マージン約1.3〜2.5s の単発断定回避)

## FR-2: テスト短縮の別 Issue 起票(E-1081-FIX 裁定 C 第2項)

- AC-2a: t-team-up-codex-resume の実行時間短縮(重い区間の特定・分割)を別 Issue として起票する。本文に**時限判定**を明記: 「スイート予算圧迫が実測で示された場合に着手」(E-1081-FIX e3 留保の保存 — 事前コミットせず、実測条件で発動)
- AC-2b: Issue は日本語・enhancement+P ラベル見立て付き(issues-in-japanese / auto-label-triage)

## 横断(bugfix 品質契約)

- 既存テストスイートのグリーン維持。全検証コマンド同期実行+exit code 報告(package.ts 不要 — dist 非関与のテストファイルのみ。typecheck / lint / dist:check / promote:self:check / run-tests --ci / coverage+patch gate)
- patch gate: 追加行はコメント1行(lcov 非計測行)のため violation なしの見込み — 実測で確認
- PR は 1:1(closing keyword は `Fixes #1081` — 宣言追加で Issue の drift は閉じるため。短縮は AC-2a の別 Issue が引き継ぐ)。クローズは着地検証後(close-after-landing-verification)
- deslop / 他メンバー worktree 非接触。e1 codex-teamup-fixes との将来交差(同ファイル)は着手時報告済み — 後着側 rebase で対応

## トレーサビリティ

| Issue #1081 の期待 | FR |
|---|---|
| drift 表示ノイズの解消(宣言と実測の整合) | FR-1 |
| 実測帯の恒常性確認(境界近傍の慎重な確定) | FR-1 AC-1e |
| テスト自体の重さへの対処(裁定 C 第2項) | FR-2 |
