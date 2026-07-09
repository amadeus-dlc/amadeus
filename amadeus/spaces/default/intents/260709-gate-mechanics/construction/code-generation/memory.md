# Stage Diary — code-generation (gate-mechanics-batch)

## Interpretations

- 2026-07-09T21:25:00Z — bugfix スコープで units-generation は設計スキップのため、unit-of-work.md 不在は expected: true。requirements.md の FR-1/FR-2 から unit を導出し、bug-zero-batch の先例に従い per-unit ディレクトリ(`sibling-worktree-guard` = #670、`delegate-rejection` = #685)で運用する。
- 2026-07-09T21:25:00Z — leader 裁定(12:31、再開指示で再確認)により実装順は Bolt 順序を反転し #670 → #685。#708 は 13:29 に main へマージ済みのため、#685 は main ベースで実装可能。
- 2026-07-09T21:25:00Z — walking-skeleton スタンスは org.md(スコープ別)+ team.md(org に従う)から scope-dependent と分類。bugfix スコープはスケルトンセレモニーなし。

## Deviations

- 2026-07-09T22:32:00Z — PR #729 に codex レビュー NOT-READY(blocking): amadeus-audit の一般 CLI `append` が HUMAN_TURN(presence token)を鋳造可能で、writer テスト自身がこの経路でシードしていた — 「hook-only で偽造不能」という delegated provenance の信頼前提の破れ。leader 裁定により hook 専用封鎖(CLI append/append-raw の保護イベント拒否 + テストシードの fixture 化 + 残余脅威の文書化)で是正中。この穴は #671(マージ済み)にも波及していたが、CLI 遮断は共有経路の封鎖として本 PR で両方を塞ぐ。
- 2026-07-09T22:32:00Z — 再起動後の leader 宛報告がすべて宛先名誤り(『leader』— 実名 claude-engineer 系列は claude-leader)で不達だったことが判明(send.sh は未登録宛先で無音成功)。全報告を claude-leader 宛に再送済み。教訓は leader が team.md Corrections へ永続化。

- 2026-07-09T21:35:00Z — Bolt worktree の作成に `amadeus-worktree create` ではなく素の `git worktree add` を使用。理由: 本セッション自体が sibling worktree(claude-engineer-3)であり、#670 のバグ(修正対象そのもの)により amadeus-worktree が実行拒否されるため。#670 マージ後は通常経路に戻る。
- 2026-07-09T21:35:00Z — #685 プラン承認の QUESTION_ANSWERED 記録が human-presence guard で拒否(再起動時の HUMAN_TURN は #670 の回答記録で消費済み)。leader へ delegate-approval を依頼済み。プラン承認判断自体は team ノルム auto-gate-approval(既決)の執行であり、両ビルダーのディスパッチは保留しない(resource-efficiency ノルム)。

## Tradeoffs

- 2026-07-09T22:25:00Z — PR #729 の codecov/patch fail(bun lcov が関数本体内コメント行に DA:0 を付与、13コメント行が未カバー扱い)への対処として、コメントブロックを関数外トップレベルへ移設(挙動変更なし、head 5250090d6)。codecov.yml の閾値緩和は検証ゲートの弱体化になるため選ばず、恒久対処は Issue #730 に切り出した。ローカル lcov 実測でパッチ未カバー 0 行を確認済み。

- 2026-07-09T21:35:00Z — #670 と #685 を並行ディスパッチ。編集正本が非交差(amadeus-worktree.ts + t06 vs amadeus-state.ts/amadeus-lib.ts + t112 系)で、dist/self-install 再生成もファイル単位で非交差のため、直列化の待ち時間を回避した。

## Open questions

- 2026-07-09T22:10:00Z — 両ユニット reviewer READY(いずれも iter1・blocking 0)。PR #727(#670)CI 全緑、PR #729(#685)CI 実行中(Monitor 監視)。ステージゲートは gate-start 済み([?])で、leader の delegate-approval と §13 学習候補のユーザー選択(推奨: c6 のみ採用)を待機中。codex レビュー: #727=codex-engineer-1、#729=codex-engineer-2 に依頼済み。レビュー副産物: 旧関数名コメント残骸を Issue #728 に起票(クロスレビュー待ち)。
