# Code Summary: workspace-inspection (U06)

> 上流入力(consumes 全数): `functional-design/{business-logic-model,business-rules,domain-entities}.md`、`nfr-design/{performance-design,security-design}.md`、`requirements.md`(FR-3 items 11–12 / NFR-1〜8)、`unit-of-work.md`(U06)。
> 測定 ref: worktree HEAD `a04962cd8`(ブランチ `resume-usync-230-takeover`)。数値はすべて集計コマンド出力からの転記。iteration 2(reviewer 差し戻し是正)の file:line は未コミット作業ツリー(`packages/framework/core/tools/amadeus-utility.ts`)で実測。

## 実装した契約

FR-3 item 11(nested-root-detection)と item 12(submodule-detection)を、既存 C3 Workspace Inspection の choke point(`packages/framework/core/tools/amadeus-utility.ts` の scanner)へ、E-USSU06FD1 裁定 A の判別union `WorkspaceScanResult`(`classified | inconclusive`)で実装した。

- **公開 seam(3)**: `inspectWorkspace(root, io)`、`detectDepthOneProjects(root, rootEntries, io)`、`inspectSubmodules(root, io)`(いずれも `export`)。補助 pure: `parseGitmodules`、`isSafeSubmodulePath` を `export`。
- **fail-closed 分類(BR-U06-21〜24)**: read 失敗(ROOT/SIGNAL_METADATA/CANDIDATE_UNREADABLE)と unsafe/parse0 の `.gitmodules`(UNPARSEABLE_GITMODULES)は root signal・safe submodule・nested hit に優先して `inconclusive` を確定。birth は mint 前に `scanWorkspaceOrRefuse` で `inconclusive` を `refuseWithoutAudit`(stderr+exit 1、audit 非発火)で拒否 → state/plan/graph/audit/workspace mutation 0。
- **depth-1 nested(item 11 / BR-U06-01〜07)**: root 無信号時のみ直下を canonical sort で走査、hidden/harness/build/known-source/docs系/symlink を除外、単一 hit だけ `nestedRoot`、複数 hit は `nestedCandidates`+`MULTIPLE_NESTED_PROJECTS` advisory で非自動選択。`Nested Root` を audit `WORKSPACE_SCANNED` と `detect --json` に additive 記録。
- **submodule(item 12 / BR-U06-08〜14)**: root の `.gitmodules` のみ読取、safe relative path を brownfield signal 化、`root/path/.git` 実在で initialized 判定(Git 実行なし)、未初期化は先頭5件+`(+N more)` の advisory を birth stdout / doctor / detect に表示。init/fetch/checkout は実行しない。
- **read-only port**: `ReadOnlyFs`(`readDirectory`/`readTextFile`/`inspectEntry`)を分類臨界の read に使い、production は `nodeReadOnlyFs`、テストは fake fs で failure を in-process 注入(env-gated test mode を新設せず)。
- **NFR-3 互換**: nested/submodule/read 失敗のいずれもない classified 既定経路は既存 helper(`detectFrameworks`/`detectBuildSystem`/`countLangsInTopDirs`)を再利用し human output / `detect --json` 全体 / state / audit を byte-identical に保持(additive field は観測時のみ）。`detectWorkspace` は classified 投影 wrapper として維持(t20/t211 back-compat）。

## 変更ファイル(実測: `git status --short`)

- 正本: `packages/framework/core/tools/amadeus-utility.ts`
- 生成物(6 harness dist): `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/amadeus-utility.ts`
- 生成物(4 self-install): `.claude/`、`.codex/`、`.cursor/`、`.opencode/` の `tools/amadeus-utility.ts`
- 新規テスト: `tests/unit/t249-workspace-inspection.test.ts`(25 pass、fake-fs pure seam。iteration 2 で「root 直下ソースが候補ディレクトリ併存時も own-signal で勝つ」ガードを追加)、`tests/integration/t249-workspace-inspection.test.ts`(21 pass、real-fs handler 駆動 + shipped CLI 1件。iteration 2 で FR-3 item 11 の実ソース入り単一 nested → `nestedRoot` を detectWorkspace / handleDetect の2ケースで追加)
- 生成台帳(`bun tests/gen-coverage-registry.ts` 再生成 = integration-registry-regen): `tests/.coverage-registry.json`、`tests/.coverage-ratchet.json`(function covered 120→122)。← t249 の登録に加え、既に main にある兄弟 unit 由来関数(`normalizeUnitKind`/`requiredArtifactsForUnit`/`UNIT_KINDS` = FR-2 unit-kind-pruning、`consumeMigration*` = runtime-recovery)が未登録だった分を統合時に取り込んだ(`amadeus-lib.ts` は無改変 — `git diff --stat` 空で確認）。
- `tests/.complexity-baseline.json`: 1行のみ(amadeus-utility の `(anonymous)` ordinal 62→88)。U06 の新規 arrow 追加で既存 `handleRecompose` callback(CCN 16、無改変)の ordinal がシフトした偽 NEW_VIOLATION の是正(complexity-baseline-ordinal に該当)。CCN は不変。

## 検証コマンドと実測 exit code

| コマンド | exit |
|---|---|
| `bun test`（t249 unit+integration + 回帰 t20/t70/t71-brownfield/t211-workspace-scan + t103）= 96 pass / 0 fail / 7 files（iteration 2 conductor 再実測 2026-07-22、`Ran 96 tests across 7 files`） | 0 |
| `bun test`（回帰 t83/t103/t198 doctor・detect / t165/t171/t172 birth・migration）= 78 pass / 0 fail / 6 files | 0 |
| 回帰（t83/t103/t198 doctor・detect / t165/t171/t172 birth・migration / t221）= 88 pass / 0 fail | 0 |
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |

- **落ちる実証**: fake fs の failure 注入(実行時消費行)で全 blocking 分岐(ROOT/SIGNAL_METADATA/CANDIDATE_UNREADABLE、UNPARSEABLE_GITMODULES）を赤くできることを確認。inconclusive birth は mint 前拒否を intents 実数の before/after 比較で実証(mutation 0）。
- **patch coverage(NFR-6、local lcov 実測)**: 追加行の未カバー 0。DA:0 で残るのは既存関数 `gitRmFlatTree`(本 diff 非該当、`git diff` で 0 hit 確認）のみ。spawn 盲点回避のため birth/detect/doctor を exported production entry として in-process 駆動(`handleDetect` は本 unit で `export` 化）、read-only port の3 catch を単一 `fsResult` に集約、`EntryKind` の到達不能 fallback を除去して全分岐を in-process 到達可能にした。

## 設計上の判断(reviewer 精査点)

1. **ENOENT root は Greenfield**: 実在 root の genuine 読取不能のみ `inconclusive ROOT_UNREADABLE`。ENOENT(未 scaffold）は既存 "scaffold first" documented 経路+NFR-3 として空 classified Greenfield とし、design の「root列挙不能→inconclusive」と両立させた。
2. **io 経路の scoping**: root listing / top-level entry の inspectEntry / candidate listing / `.gitmodules` / `path/.git` probe を port 経由(failure 注入点）。manifest 内容 read(package.json 等）と langs deep walk(`countLangsInTopDirs` depth 6）は従来直 fs(分類は manifest 存在で決まり内容 read 失敗は brownfield/greenfield を変えない）。
3. **nested 発火条件(reviewer 差し戻しにより是正)**: iteration 1 は「言語信号を持つ nested は root の深さ6 walk が数えて root brownfield になるため attribution 対象外」とし、`nestedRoot` は nested が非言語信号(manifest/deps/framework/source-dir 名)のときだけ発火する解釈で実装した。reviewer はこれを FR-3 item 11 未達(実ソース入り単一 nested で `nestedRoot` が出ない)として差し戻した — BR-U06-02 の「root signal」は root 自身が第一級で持つシグナル(root 直下ファイル/manifest、または非候補ディレクトリ内のソース)であり、nested 候補の中身を再帰で飲み込んだ副作用は root signal ではない。是正: `evaluateSignals` の brownfield 判定を「自身の第一級ソース」と分離し、root 評価では depth-1 候補ディレクトリ(`candidateEligibleDirNames`、`packages/framework/core/tools/amadeus-utility.ts:2901`)の deep ソースを own-signal から除外する(`accumulateDeepLangs` の `excludeSourceDirs`、`:2801`; 除外集合の受け渡しは `:3028`)。除外は判定のみで、報告用 `langCounts` は全ディレクトリを walk したまま(NFR-3 の言語出力 byte-identical と #840 を保持)、`scripts/`・`docs/` 等 NESTED_EXCLUDE の非候補ディレクトリ内ソースは従来どおり root の own-signal に数える。結果、root 無信号+実ソース入り単一 nested → depth-1 fallback → `nestedRoot` 発火(`hasSourceFiles = top.hasDirectSource || deepOwnSource`、`:2865`)。t249 unit/integration に実ソース入り単一 nested ケースを追加し、fixture の「対象外」コメントを実態へ修正した。
4. **lizard パーサ対応(complexity gate 用）**: `type Result<T,E> = {...} | {...}` の1行 union-of-object-types と多行 template literal が lizard(C系トークナイザ）の brace 追跡を壊し後続関数を巨大 merge していたため、Result を named arm(`ResultOk`/`ResultErr`）へ分割し、`.gitmodules` parser を regex 非依存の文字列処理へ、additive template を単一行 precompute へ書き換えた(挙動不変、機械的等価）。

## 既知の制約 / スコープ外

- state file schema は不変(`nestedRoot`/submodule は state へ保存せず audit/detect/doctor/birth stdout のみ additive — BR-U06-16）。
- depth>1 探索、候補の自動選択、submodule 初期化/fetch/checkout、filesystem 修復は非対象。
- 新 service/DB/network/UI/runtime dependency/audit event/state field なし(NFR-7/NFR-8）。
- `dist/`・self-install は手編集せず `bun scripts/package.ts` / `bun run promote:self` の生成物。commit/push/PR/merge は conductor が実施。
