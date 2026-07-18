# C-13/C-14 Probe 手順書 — Codex native subagent の prepared unit worktree 隔離書き込み

対象: 新規 Codex セッションの probe 実施者(leader からディスパッチ)
目的: constraint-register C-13(隔離書き込み)/ C-14(writable-root 境界)の live evidence を取得する。requirements FR-5(Codex floor 確約)の hard stop を解除する。
出典: `feasibility-assessment.md`(spawn / 回収 / ultra 受理は実測済み — 未実測は本2点のみ)、`scope-document.md` Conditional Boundary。

## 前提

- Codex CLI >= 0.139.0(C-20。feasibility 実測は 0.144.5)
- 実施者自身の worktree(割当ツリー)内で作業。scratch は repo 外(scratch-script-discipline)
- 本 probe は**実装ではない** — 評価のみ。フレームワーク正本・dist に変更を加えない

## 手順

1. **prepared worktree の fork(referee 実経路)**: 自 worktree で
   `bun .claude/tools/amadeus-swarm.ts prepare --batch 99 --units probe-c13 --base <現在のブランチ名>`
   を実行し、出力の worktree パス(以下 `<WT>`)を記録する。exit code と stdout を verbatim 保存。
   - 注意: prepare は SWARM_STARTED を emit する(実験である旨を diary に記録。record 汚染を避けたい場合は leader と相談のうえ project-root override の scratch 実行でも可 — その場合も worktree fork は実リポで行うこと)
2. **native subagent への隔離書き込みタスク**: 同一 Codex セッション内で native subagent を 1 体 spawn し、次のタスクを与える(worktree 内相対パス指示、c2 遵守 — 本線絶対パスをプロンプトに書かない):
   - `<WT>` 内に `probe-c13-evidence.txt` を作成し、任意の1行を書いてコミット(`git -C <WT> add/commit`)
   - `<WT>` 以外への書き込み・git 状態変更を一切しない
3. **隔離の検証(実施者が実測)**:
   - `<WT>` にファイルとコミットが実在: `git -C <WT> log --oneline -1` / `ls <WT>/probe-c13-evidence.txt`
   - 本線 worktree の git 状態が不変: probe 前後の `git status --porcelain` と `git rev-parse HEAD` の一致
   - 他 unit worktree・共有 stash に変化なし: `git stash list` 前後一致
4. **C-14(writable-root 境界)**: subagent の書き込みが sandbox 拒否されなかったこと(exit 0)、または拒否された場合はそのエラー実文を記録。`<WT>` のパスが child の writable-root 内にあるかの判定材料(セッションの sandbox 設定表示等)を添付
5. **後片付け**: `bun .claude/tools/amadeus-swarm.ts finalize` は**実行しない**(merge 不要)。worktree は `git worktree remove <WT> --force` で破棄し、ブランチも削除。破棄後の `git worktree list` を記録
6. **evidence 記録**: 本ファイルと同じディレクトリに `c13-probe-evidence.md` を作成し、各手順の実行コマンド・exit code・出力(verbatim)・測定 ref(HEAD SHA)を記録。判定は次の3値のみ: 成立 / 不成立(writable-root/cwd 制約 — 実文添付)/ 部分成立(条件明記)

## 判定と後続

| 結果 | 後続 |
|---|---|
| 成立 | conductor(e2)が FR-5 の PENDING を解除し requirements を確定 |
| 不成立 | fallback を追加せず No-Go — leader 経由で Intent owner へ再裁定(scope Conditional Boundary) |
| 部分成立 | 条件を requirements の前提へ転記のうえ選挙 |

完了・ブロッカーは leader へ自発報告(push-reporting)。evidence 作成後、e2 へも agmsg で完了通知をお願いします。
