# Code Summary — fix-mirror-state-split(Issue #1547 + #1534)

上流入力(consumes 全数): requirements.md(FR-1〜FR-7 / NFR-1〜3 — 本実装の対応表・検証の導出元)。code-generation-plan.md の Steps に従い regression-first で実装。

- ブランチ: `fix/1547-1534-mirror-read-unification`(worktree `.claude/worktrees/mirror-state-split`)
- base: `origin/main = 2c80d6ead`(再接地2回実施 — 下記「base 前進と履歴再構成」)
- 規模: **57 files changed, 2662 insertions(+), 4530 deletions(-)**(うち dist/self-install 再生成 48 ファイル。測定 ref: `git diff --stat origin/main...HEAD`)
- コミット: `8dae765a3` fix(mirror) / `03021d1a6` refactor(mirror) comment hoist / `cccf3e9f1` test(coverage) allowlist re-pin

## FR 対応表

| FR | 実装 |
|---|---|
| FR-1 status 読取の v1 権威化 | mirror.ts の legacy `buildSnapshot` を削除し、lifecycle 新設 export `buildMirrorStatusRecordView`(readMirrorState → issueNumber)経由へ。findings 語彙・exit code 契約(0/1/2)不変 |
| FR-2 orchestrate 境界判定の v1 権威化 | `hasMirrorIssue = mirrorIssueNumberFromDocument(stateContent) !== null`(2箇所)。判定は codec 新設の純ヘルパー `mirrorIssueNumberFromDocument`(canonical 1定義)から導出 |
| FR-3 重複 create の正しい拒否 | `runMirrorMutation`(旧 runLegacyMutation をリネーム)の create 前ガード — `mirror already exists: #N (duplicate create is refused; run sync instead)`、exit 非0、lifecycle 不到達 |
| FR-4 デッドコード削除 | handleCreate / handleSync / handleClose / writeMirrorIssueField+重複ビュー(renderBody/renderStatusLine/renderTitle/buildSnapshot/countStageProgress/ローカル MirrorSnapshot 型)を削除。`amadeus-worktree.ts` の同名 handleCreate は非対象・不変 |
| FR-5 リグレッションテスト | 新規 `tests/integration/t300-amadeus-mirror-state-read.integration.test.ts`(5ケース、in-process DI 駆動)。t232 unit/integration は新サーフェスへ書換、t265 の mirror seed を legacy field → v1 ブロックへ |
| FR-6 全数 grep | `getField(...,"Mirror Issue")` 読取は正本 core から 0 hit(conductor 再実測 exit 1)。残存 "Mirror Issue" は mirror.ts 冒頭コメント(「legacy フィールドは書かない」旨の正しい記述)のみ |
| FR-7 docs 棚卸し | 下表 — **doc 本文更新なし**(全てミラー Issue の概念記述で v1 権威と矛盾せず)。配布コピーは regen で同期 |

## 逸脱裁定の記録(implementation-deviation の宣言)

**第2の write⇔read 非対称の発見**: 実 Issue 本文は lifecycle の `renderMirrorIssueContent`(presentation.ts:185)が生成する一方、status の drift 比較は mirror.ts 自前 `renderBody` と突き合わせており、FR-1 を字面どおり実装すると create 直後の健全 mirror に `issue-drifted`+`stale-status-line` 偽陽性(exit 1)が必発。builder は実装前に停止して報告 → **ユーザー裁定 B**(2026-07-26T15:15Z 頃、AskUserQuestion): status の期待本文を canonical(renderMirrorIssueContent+renderMirrorMarker)から導出し、renderBody 重複定義を削除。付随の挙動変化: status も repository 解決(entry.repos / origin)を要するようになり、未解決 intent は precondition(exit 2)— canonical 化に内在。findings 語彙・exit code 契約は不変。

## 落ちる実証(conductor 再演、2026-07-26)

pre-fix 面切替(status 経路の mirror.ts+lifecycle.ts のみ origin/main へ checkout、追加ヘルパー codec は維持 — import 縮退赤を回避した挙動面の赤):
- case「real-create → status」: `Expected: 0 / Received: 1`
- case「404 divergence」: `Received: "mirror-missing: record ... has no Mirror Issue field"`(**#1547a の起票文言 verbatim 再現**)
- case「重複 create」: `Received: "... marker identity does not match provenance ..."`(**#1547b の誤診 verbatim 再現**)
- 負の対照 2 ケースは pre-fix でも pass
- 復元後: **5 pass 0 fail**。ツリー clean(status --short 0)

## 検証(conductor 実測、rebase 後 base 2c80d6ead)

| コマンド | exit |
|---|---|
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bash tests/run-tests.sh --ci` | 0(RESULT: PASS、Failed assertions: 0) |
| `bun run coverage:ci` | 0 |
| mirror trio + t265(53 tests) | 0(53 pass 0 fail — `Ran 53 tests across 4 files` 出力転記。reviewer Minor 指摘で 52→53 是正、旧値は pre-rebase 断面の実測) |
| lcov patch 照合(diff 追加行 × lcov DA × allowlist) | **未カバー 0**(orchestrate :314/:3521 は spawn-only 既存クラスとして allowlist 同型前例に従い追記済み) |

注: フル CI の wall-clock drift 1件(t-codex-hooks-migration declared=medium measured=large)は並行負荷起因の既知フレークで自変更外(main でも観測)。

## FR-7 「Mirror Issue」語彙棚卸し表(grep 出力からの転記、record 配下除外)

| ファイル | 出現 | 判定 |
|---|---|---|
| packages/framework/core/tools/amadeus-mirror.ts:5 | 冒頭コメント(v1 単一権威の宣言) | 本変更で是正済み(正しい記述) |
| packages/framework/core/tools/amadeus-orchestrate.ts:329 | ask 文言「no Mirror Issue is recorded」 | ミラー Issue の概念記述 → 変更不要 |
| docs/guide/21-layered-config.{md,ja.md} | auto-mirror 挙動記述 | 概念記述・v1 権威と整合 → 変更不要 |
| docs/reference/19-layered-config.{md,ja.md} | 同上 | 変更不要 |
| dist / self-install コピー | 正本の投影 | regen で同期済み(手編集なし) |

## base 前進と履歴再構成(プロセス記録)

1. builder 初回完了後に origin/main が 5cb1a28fe → e688c9f79 → 2c80d6ead と前進。conductor が rebase(衝突ゼロ)+全ゲート再実行
2. builder が follow-up(lcov 残3行閉包)中に自コミット列を旧 base 上へスカッシュ再構成(reflog に旧断面 f0a369fe7 保全、コード内容は同一+coverage 閉包分)。conductor が内容照合のうえ再度 origin/main へ rebase(衝突ゼロ)し、全ゲート・落ちる実証・lcov 照合を最終 base で再実測(上表)
3. main 側が別 t299 を追加していたため、本 intent の regression テストは t300 へ採番(swarm-test-number-reservation の単独版)
