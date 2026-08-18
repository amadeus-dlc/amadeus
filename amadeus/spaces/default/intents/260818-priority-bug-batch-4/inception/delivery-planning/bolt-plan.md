# Bolt Plan

Intent: 260818-priority-bug-batch-4(2 Bolt、直列 — 根拠は `risk-and-sequencing-rationale.md`)

上流: `../units-generation/unit-of-work.md`(unit 定義)・`unit-of-work-dependency.md`(依存 0 + 共有ファイル競合)・`unit-of-work-story-map.md`(FR 割当)、`../requirements-analysis/requirements.md`(NFR — 配送規律)、`../application-design/components.md`(patch 面)。

walking-skeleton: 非適用(scope self-fix — org.md のスケルトン免除。全 Bolt を通常実行)。

## Bolt 1

- **Units:** `issue-2837-invoke-swarm-context`
- **Walking skeleton**: no
- **Definition of Done**: FR-2837-1〜5 の受け入れ全充足(ADR-1 実装契約 1〜8 準拠)。TDD Red→Green(batch 導出直接検証 + failed-terminal 再提示回帰)。engine 正本 + 7 conductor 面の `--batch` 同期 + 8 面への check_cmd 正規取得元明記を同一変更で実施し `bun run build` 後の配送先ツリー述語で実測。台帳 resync(model-map / allowlist / registry)同梱。per-unit PR 作成 → 必須 CI green → pr-convergence `converged`
- **Confidence hypothesis**: 「conductor が engine-owned routing を再導出せずに swarm fixed Unit pool 手順を実行できる」— t135 再構築(directive 実物の batch 搬送 assert)と failed-terminal 再提示回帰の green が証明する
- **Expected demo**: `next` が emit する invoke-swarm directive(JSON 実物)に batch/pool identity が載り、それをそのまま `prepare --batch` へ転記して pool が旧 terminal と衝突せず成立する系列(テストで再生)

## Bolt 2

- **Units:** `issue-3106-per-unit-outcome`
- **Walking skeleton**: no
- **Definition of Done**: FR-3106-1〜4 の受け入れ全充足(ADR-2 実装契約 1〜9 準拠)。TDD Red→Green(per-unit settle × cancelled の Red 必須、failed は到達可能性実証を前提に対の Red)。supersession round-trip・pool 優先 de-dup のテスト固定。docs 英日同期(grep exit code 受け入れ)。台帳 resync 同梱(Bolt 1 着地後の rebase 断面で再実施)。per-unit PR 作成 → 必須 CI green → pr-convergence `converged`
- **Confidence hypothesis**: 「per-unit 経路で unit を cancel してもワークフローが構造停止しない(pool 経路と対称)」— reviewer-1 の再現手順(solo Skip → 下流 stage `next`)の exit 0 転化が証明する
- **Expected demo**: cancel を挟んだ per-unit batch で `build-and-test` 相当の下流 stage が pending で止まらず、cancelled unit の paths だけが除外されて consume が通る系列(t533 対テストで再生)

## 実行規約(両 Bolt 共通)

- Bolt worktree 分離(base = main、merge target = main、squash)。record checkpoint を bolt ブランチへ同梱 commit してから `pr-convergence create`(multiunit-pr-procedure の定型: bolt-plan の `- **Units:**` 形式・カーソル複製・worktree 側 runtime compile・report/audit の conductor record 還流)
- push-first / remote-first 検証。直列着地(Bolt 1 の PR 着地 → Bolt 2 rebase → 再 mint → CI 再走)
- マージは常任承認条件(必須 CI green ∧ converged: true 実測)内でのみ自発実行可、条件外は人間承認
