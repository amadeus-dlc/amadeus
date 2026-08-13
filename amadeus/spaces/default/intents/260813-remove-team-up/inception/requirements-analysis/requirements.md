# 要件

Intent: `260813-remove-team-up`  
Source: 利用者指示（team-up.sh は不使用なので削除）+ [Issue #2970](https://github.com/amadeus-dlc/amadeus/issues/2970)（ミラー #2973）  
Depth: Minimal（advisory: 削除は docs・doctor・テスト・8 harness 投影に波及するが、行為は「正本削除 + 消費者更新」で単一コンポーネント廃止。`--depth` 変更はしない）  
RE: `amadeus/spaces/default/codekb/amadeus/re-scans/260813-remove-team-up.md`  
観測: `97581b3e39187b13413c046e86f820d290a389eb`

## Intent analysis

bash 3.2 の空配列クラッシュを直すのではなく、使われなくなった Team Mode ランチャ `team-up.sh` とその専用結合をリポジトリとユーザー向け文書から除去する。#2970 の失敗経路は削除で消滅する。

## Functional requirements

### FR-1: ランチャ正本の削除

`packages/framework/core/tools/team-up.sh` を追跡対象から削除する。受け入れ: `git ls-files` に当該パスが無い。

### FR-2: Codex safety-wait 正本の削除

`packages/framework/core/tools/team-up-codex-safety-wait.ts` を削除する。本番消費者はランチャのみ（RE P6）。受け入れ: 同パスが `git ls-files` に無い。

### FR-3: ランチャ専用テストと fixture の削除

名前付き `tests/**/*team-up*`（12 files）と `t266-team-launcher-prerequisites`、`t267-clean-env-team-mode` のランチャ駆動を削除またはランチャ非依存へ縮退する。受け入れ: CI が存在しない `team-up.sh` を spawn しない。

### FR-4: doctor 修復文言の置換

`amadeus-utility.ts:964` と `t226-migration-doctor-heartbeats` が指す `team-up.sh` 再実行を、ランチャに依存しない修復手順へ置き換える。受け入れ: 当該テストが新文言で pass し、死んだ CLI を推奨しない。

### FR-5: ユーザーガイドから起動手順を除去

`docs/guide/20-team-mode.md` 対訳を「ランチャは廃止」と書き換え、live `bash …/team-up.sh` および live `team-msg.sh` レシピを残さない。glossary / team-messaging / codex-cli 対訳と core glossary の `scripts/team-up.sh` も同期する。受け入れ: 現行起動コマンドとして `team-up.sh` / `team-msg.sh` を教える文が docs/guide に無い。

### FR-6: 配送面は build で消える

8 harness の `coreDirs.tools` 投影は維持し、正本削除後 `bun run build` で dist / self-install から当該ファイルが消えることを確認する。受け入れ: 生成面を手編集しない。ソース削除 + build が唯一の経路。

### FR-7: `team-msg.sh` も削除する

メッセージング CLI も未使用のため同 Intent で削除する（当初 Q1 は残置だったが、2026-08-14 の利用者指示で上書き）。受け入れ: `git ls-files` に `packages/framework/core/tools/team-msg.sh` が無く、専用テスト `tests/integration/t-team-msg.test.ts` も無く、ユーザーガイドに live `team-msg.sh` レシピが無い。herdr / agmsg 本体と選挙 CLI は削除しない。

### FR-8: #2970 は削除で閉じる

クラッシュ修正（空配列ガード）は実装しない。受け入れ: ランチャ経路が無いため #2970 の再現手順が成立しない。Issue close はワークフロー完了後の mirror / 人手に委ね、コード完了条件には含めない。

## Non-functional requirements

- **NFR-1 テスト**: Comprehensive。削除したテストの代わりに「正本・投影・docs に `team-up.sh` 起動レシピが無い」ことを固定する回帰を 1 本以上置く。
- **NFR-2 互換**: 公開 CLI `/amadeus` のソロ経路は変えない。落とすのは Team Mode ランチャと `team-msg.sh` だけ。
- **NFR-3 再現性**: `bun run typecheck` / `lint` / source-only / 隔離 2 回 build を満たす。

## Constraints

- 正本は `packages/framework/core/`。生成物を独立正本として編集しない。
- `amadeus/**/*.md` は日本語。docs 既定は英語 + 対訳。
- GitHub Issue の自動 close は所有 provenance が必要。関連 enhancement の close は本 Intent のコード成果物ではない（Q3）。

## Assumptions

- 利用者の「利用しない」は Team Mode ランチャと `team-msg.sh` の廃止である。herdr / agmsg 本体と選挙 CLI は対象外。
- 区間 `854692fd7..HEAD` で team-up パス差分 0 のため、RE の消費者表は observed で有効。

## Out of scope

- #2970 の bash 3.2 ガード実装
- `team-msg.sh` の代替トランスポート新設
- herdr / agmsg 本体
- 関連 Issue #1250 / #998 / #1136 / #1087 の GitHub close（廃止注記のみ。close は削除 PR 後の follow-up）
- swarm / election / Orca worktree 一般

## Open questions

なし（Q1–Q3 は decide-question 済み。未測定だった dist 実コピー数は FR-6 の build 検証で閉じる）。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T14:37:58Z
- **Iteration:** 1
- **Scope decision:** none

Eight numbered FRs with pass/fail checks, answered Q1-Q3, and explicit out-of-scope bound the launcher deletion so construction can start without guessing.

### Findings

- FOLLOW-UP | FR-3 allows delete-or-degenerate for launcher-driven tests; pin one path in code-generation so t266/t267 do not fork mid-implementation.
- FOLLOW-UP | NFR-1 requires at least one absence regression but does not name the file; keep that as a construction deliverable, not a requirements gap.
