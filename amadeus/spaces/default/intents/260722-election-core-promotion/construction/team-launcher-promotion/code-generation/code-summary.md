# U3 Team Launcher Promotion — Code Generation Summary

## 実装結果

- `scripts/` にあった `team-up.sh`、`team-msg.sh`、`team-up-codex-safety-wait.ts` を `packages/framework/core/tools/` へ移設し、6 harness の `dist/` と project-local self-install 面へ正本から投影した。
- `team-up.sh` の同伴 helper 解決を launcher 自身のディレクトリ相対へ変更した。Claude/Codex 起動コマンドも配布コピー内で完結させ、開発 checkout の launcher wrapper 依存を除いた。
- チーム起動前に Darwin/Linux、herdr、agmsg の固定閉集合を定数回で検査する fail-fast prerequisite 境界を追加した。`TEAM_MSG=herdr` の場合も agmsg を常時検査し、既存の `HERDR`、`AGMSG_ROOT` override を維持した。
- doctor の既存 seam に exported pure helper `detectTeamPrerequisites` を追加し、herdr/agmsg の検出結果または固定 guidance を advisory 表示するようにした。doctor の既存 pass/fail 集計と exit code は変更していない。
- 新規 unit 6件と integration 8件を追加し、既存 launcher、backend、message、安全待機、doctor 関連テストを新しい正本パスへ追随させた。

## 主な設計判断

- prerequisite 検査は backend に依存せず OS → herdr → agmsg の順で一度だけ行い、セッション・worktree・登録処理より前に失敗させる。
- doctor 検出は `PathProbe` を注入する純粋関数として切り出し、process-global PATH 依存をテストから分離した。
- agmsg/herdr 本体や外部コードは同梱せず、missing 時は公式入手先と `docs/guide/20-team-mode.md` を案内する。
- U4 専有の clean-environment journey／選挙完走 E2E は追加していない。U3 では package/self-install 投影と公開パス・exit・stderr・doctor 契約を既存回帰および unit/integration で固定した。

## Review Iteration 1 修正

- 設計正本の FR-3c、BR-3/BR-7、performance-design に合わせ、条件付き agmsg 検査を撤回した。`TEAM_MSG=herdr` でも OS → herdr → agmsg の固定順・固定閉集合を検査する。
- `t266` の herdr backend ケースと `t-team-up-msg-backend` の旧期待値を fail-fast 契約へ変更した。agmsg 欠落時に exit 1、固定 guidance、run record／current-run 未作成を確認した。
- FR-8a の実在契約を再列挙し、`team-msg.sh` の `AGMSG_SEND` override 実 spawn、選挙 CLI の `--send-script` 実 spawn、選挙 CLI の既定 `$HOME/.agents/skills/agmsg/scripts/send.sh` 実 spawn を検証した。

## Comprehensive Test Evidence

| コンポーネント | Unit | Integration | E2E／配布証拠 |
|---|---:|---:|---|
| C4 Team launcher / messaging | `t265` の共有 prerequisite 6件、safety-wait 14件 | `t266` launcher 6件、team-msg 15件、backend 16件、watcher 7件、resume 54件 | `dist:check` 6 harness、`promote:self:check` 4 self-install faces。U4専有のclean-env launcher E2Eは未追加 |
| C5 Doctor advisory | `t265` 6件 | `t266` doctor 2件、既存 `t226` doctor suite 10件 | doctor専用E2Eは既存0件。advisoryはin-process exit semanticsと全配布投影で固定 |
| FR-8a Election transport | N/A（U2責務） | `t236` 14件（override・既定パスを含む）、`t240` 9件 | `t237-election-walking-skeleton`: `the CLI directive loop completes a zero-confirm election end-to-end`、1 pass / 0 fail |

- 10〜15 tests/component は soft guideline として、C4 は unit 20件・integration 98件、C5 は unit 6件・integration 12件で満たす。`t265` の6件は C4/C5 が共有する prerequisite 閉集合、順序、固定回数、override、guidance の契約テストである。
- repository 内の既存 E2E を列挙した結果、C4 launcher の配布/self-install を直接起動する既存ケースと C5 doctor 専用ケースは0件だった。この不足を隠さず、U3では実生成器の `dist:check`／`promote:self:check` と integration 契約で検証し、clean-env 合流 journey は計画どおりU4へ残した。

## 検証結果

- 変更前の影響対象5ファイル: 109 pass / 0 fail / 70.03秒。
- 変更後の新規・影響対象8ファイル: 133 pass / 0 fail / 73.60秒。テスト3ファイル・24ケース増加込みで約3.57秒増であり、prerequisite 実装自体は定数回検査を維持した。
- 境界ガード修正後の関連4ファイル: 89 pass / 0 fail / 70.91秒。
- 最終 fixture パス監査後の resume suite: 54 pass / 0 fail / 64.72秒。
- 新規対象 coverage: 14 assertions / 0 fail。`detectTeamPrerequisites` の新規行が LCOV 到達済み。
- `bun run typecheck`: PASS。
- `bun run lint`: exit 0。既存 warning 251件、info 17件、error 0件。
- `bun run dist:check`: 6 harness すべて PASS。
- `bun run promote:self:check`: 全 self-install 面 PASS。
- `bun tests/gen-coverage-registry.ts --check`: PASS。
- `git diff --check`: PASS。
- `bash tests/run-tests.sh --ci`（iteration 1 最終）: 476 files / 6788 assertions、failed files 0、failed assertions 0、RESULT PASS。
- Review iteration 1 対象6ファイル（C4/C5、team-msg、選挙transport、packaging）: 57 pass / 0 fail。
- `t237-election-walking-skeleton.test.ts`: 1 pass / 0 fail / 21 assertions。
- FR-8a の subprocess テスト追加に伴う coverage mechanism の `none` → `cli` 昇格を honesty allowlist へ明示登録し、`gen-coverage-registry.test.ts` は42 pass / 0 fail、registry freshness check も PASS。

## 差分監査

- `scripts/` 側の旧3ファイル残置は0件で、正本・生成面に旧 `scripts/team-*` 参照は残っていない。
- U3 外の agmsg/herdr 同梱、Windows 対応、選挙機能、release/version/badge/changelog、clean-env E2E は変更していない。
- 共有 worktree に存在する `amadeus-state.md`、audit shard、`.agmsg-ballots/` の他エージェント変更は編集・削除していない。

## Issues / Concerns

- **明示逸脱／上流要件不整合:** requirements FR-8a は選挙 transport の env override として `AGMSG_SEND` を列挙するが、現行 `scripts/amadeus-election.ts` は `AGMSG_SEND` を参照せず、CLI `--send-script` と既定 `$HOME/.agents/skills/agmsg/scripts/send.sh` を実装する。責務外コードへ契約を捏造せず、実在する3経路を実 spawn で検証した。要件文言を直すか選挙側へ env override を追加するかは iteration 2 の判断事項である。
- CI 実行環境の AWS credentials が無効または期限切れのため、live SDK/substrate tests は runner により skip された。
- `tests/integration/t-codex-hooks-migration.test.ts` は declared medium に対して 32.35秒で large 判定となる既存 wall-clock drift advisory が1件ある。CI 成否には影響しない。
- 初回全CIでは、移設ファイル中の literal `scripts/` を境界ガードが1件検出した。外部 agmsg scripts の導出名と launcher wrapper 依存を修正し、再実行で全件 green を確認した。

## Next Steps

1. 推奨: U4 で clean-environment E2E と fake herdr/agmsg を用いた起動・送信・選挙完走 journey を実装する。
2. U3 差分を quality stage でレビューし、AWS credentials が利用可能な環境で live tests を補完する。
3. 別Unitとして wall-clock drift advisory の再計測・分類見直しを行う。
