# Code Generation Plan: workspace-inspection (U06)

> 上流入力(consumes 全数): `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`requirements.md`(FR-3 items 11–12 / NFR-1〜8)、`unit-of-work.md`(U06)。

## 目的と承認境界

本 Unit は既存 Bun CLI の C3 Workspace Inspection へ、FR-3 item 11(depth-1 nested root 検出)と item 12(`.gitmodules`/submodule 検出)を、`packages/framework/core/tools/amadeus-utility.ts` の workspace scanner choke point へ最小追加する。公開 seam は FD が承認した3関数 `inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules` に限定し、E-USSU06FD1 裁定 A の判別union `WorkspaceScanResult`(`classified | inconclusive`)を C3 境界内に閉じる。

- 正本 owner は `packages/framework/core/tools/amadeus-utility.ts` の scanner セクション(domain-entities.md「正本owner」)。新規 module 分割はしない(NFR-7)。
- `dist/` と self-install tree は生成物であり手編集しない。`bun scripts/package.ts` と `bun run promote:self` で同期する。
- 新 service / DB / network / UI / runtime dependency / state field を追加しない(NFR-7/NFR-8、services.md)。

## トレーサビリティ

| 要求 | 実装対象 | 検証対象 |
|---|---|---|
| FR-3.11 / BR-U06-01〜07 | `detectDepthOneProjects` を root 無信号時のみ depth-1 走査へ配線し、単一 hit だけ `nestedRoot`、複数 hit は `nestedCandidates`+advisory・非自動選択。`Nested Root` を audit `WORKSPACE_SCANNED` と `detect --json` へ additive 記録 | empty / top-level signal / 単一 nested / 複数 nested / depth-2-only / manifest-only / excluded-only / symlink / candidate permission failure |
| FR-3.12 / BR-U06-08〜14 | `inspectSubmodules` が root の `.gitmodules` のみ読取、safe relative path を brownfield signal 化、`path/.git` 実在で initialized 判定、未初期化は先頭5件+`(+N more)` advisory。birth stdout / doctor / detect へ additive 表示、init 実行なし | `.gitmodules` なし/malformed/unsafe-only/未初期化/全初期化/6件以上境界/present+parse0 |
| BR-U06-21〜24 / NFR-2 | `WorkspaceScanResult` 判別union、birth/state は exhaustive match し `inconclusive` を全 mutation 前に `refuseWithoutAudit` で拒否。detect/doctor は両 variant を read-only 表示、birth reject 時は audit emit なし | root unreadable / signal metadata unreadable / candidate unreadable / unparseable `.gitmodules` / unsafe entry の negative control で state/plan/graph/audit/workspace bytes 不変 |
| NFR-3 互換 | 観測なし classified 経路は既存 helper(`detectFrameworks`/`detectBuildSystem`/`countLangsInTopDirs`)を再利用し bytes 不変 | greenfield/brownfield 既定 fixture の human output / `detect --json` 全体 / state / audit golden |
| FR-0 / NFR-4〜6 | 既存 Bun/TS/generator/test stack のみ。read-only `ReadOnlyFs` port で failure を in-process 注入(env-gated test mode を新設しない) | targeted、typecheck、lint、dist、promote-self、full CI、local lcov patch |

## 設計上の scoping 判断(reviewer 精査点)

1. **ENOENT root の扱い**: `inspectWorkspace` は root の `readDirectory` が **ENOENT** の場合は「未 scaffold の空 workspace」として空 entries=classified Greenfield とする(既存 `detectWorkspace` の "scaffold first" documented 経路 + NFR-3 互換)。**ENOENT 以外の read error**(EACCES 等、実在 root の読取不能)のみ `inconclusive ROOT_UNREADABLE`。design の「root列挙不能→inconclusive」は実在treeの genuine 読取不能を指すと解釈し、両立させる。
2. **io 経路の scoping**: 分類臨界の read(root listing / 各 top-level entry の `inspectEntry` / candidate listing / `.gitmodules` / `path/.git` probe)を `ReadOnlyFs` port 経由にし failure 注入点とする。manifest **内容** read(package.json/Gemfile/pom.xml/pyproject.toml)は従来どおり直 fs + 例外握り潰し(signal 不在扱い、非 blocking)= 分類は manifest **存在**(listing 由来)で決まるため内容 read 失敗は brownfield/greenfield を変えない。langs deep walk(`countLangsInTopDirs` depth 6)も従来直 fs(NFR-3 byte 保持)。
3. **advisory code union**: domain-entities.md が列挙する code union を verbatim 採用(型語彙)。本 Unit で emit するのは非blocking `MULTIPLE_NESTED_PROJECTS`/`UNINITIALIZED_SUBMODULES`、blocking `ROOT_UNREADABLE`/`SIGNAL_METADATA_UNREADABLE`/`CANDIDATE_UNREADABLE`/`UNPARSEABLE_GITMODULES`。
4. **state 不変**: `nestedRoot`/submodule は state file へ保存しない(BR-U06-16、state contract 不変)。additive 表示は audit/detect/doctor/birth stdout のみ。

## 変更候補

### Authored source

- `packages/framework/core/tools/amadeus-utility.ts`: scanner セクションへ `ReadOnlyFs` port + `Result`、判別union + value 型、pure seam(`parseGitmodules`/`isSafeSubmodulePath`/`inspectSubmodules`/`detectDepthOneProjects`/`inspectWorkspace`)、`nodeReadOnlyFs` adapter、classified 投影 helper を追加。既存 `detectWorkspace` は `inspectWorkspace`(node adapter)の classified 投影 wrapper へ再実装(t20/t211 back-compat)。`handleIntentBirth` は mint 前に `inspectWorkspace` を実行し inconclusive を `refuseWithoutAudit` で拒否、classified を `handleIntentBirthStateBuild` へ渡す。`handleDetect` は両 variant + additive、`handleDoctor` は `.gitmodules` 存在時のみ submodule row を追加。

### Tests and generated evidence

- 新規 `tests/unit/t249-workspace-inspection.test.ts`: pure seam を fake `ReadOnlyFs` で in-process 駆動(gitmodules parse、safe path、submodule 観測、nested 単一/複数/0、fail-closed 全 blocking 分岐、byte 投影)。
- 新規 `tests/integration/t249-workspace-inspection.test.ts`: 実 shipped CLI(intent-birth / detect --json / doctor)を temp workspace で駆動し、nested/submodule additive、inconclusive birth の mutation 0、既定 byte-identical、未初期化 doctor advisory 非 fail を固定。
- 既存回帰: `tests/unit/t211-workspace-scan-generalize.test.ts`、`tests/unit/t20.test.ts`、`tests/integration/t70.test.ts`、`tests/integration/t71-stage-workspace-detection-brownfield.test.ts`。
- generated: `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**` と self-install 4面は `bun scripts/package.ts` / `bun run promote:self` の出力のみ受理。

## 実装計画

1. [x] baseline と Unit 境界を固定する。現行 `detectWorkspace`/birth/detect/doctor の choke point と既存 workspace テスト(t20/t70/t71/t211)の期待を確認する。
2. [x] pure seam の期待を先に RED にする(unit t249): `parseGitmodules`、`isSafeSubmodulePath`、`inspectSubmodules`、`detectDepthOneProjects`、`inspectWorkspace` の正常・境界・全 blocking 分岐を fake fs で固定。seam 不在で失敗する command/count/error を記録。
3. [x] production path を RED にする(integration t249): intent-birth の nested/submodule additive + inconclusive mutation 0、detect --json additive/inconclusive、doctor submodule row、既定 byte-identical を shipped subprocess で固定。
4. [x] `ReadOnlyFs` port + `Result` + 判別union + value 型 + pure seam を最小実装する。fail-closed precedence(unsafe/unparseable gitmodules・read 失敗が root signal/safe submodule/nested hit に優先)を実装。
5. [x] `detectWorkspace` を classified 投影 wrapper へ再実装(byte 投影で t20/t211 維持)。
6. [x] `handleIntentBirth` を mint 前 inspect + inconclusive 拒否へ配線、`handleIntentBirthStateBuild` へ classified を渡す。audit `WORKSPACE_SCANNED` へ `Nested Root`/submodule を additive。
7. [x] `handleDetect`(両 variant + additive)と `handleDoctor`(`.gitmodules` 存在時のみ submodule advisory row、未初期化は pass:true で exit 不変)を配線。
8. [x] targeted RED→GREEN と patch coverage を確定(fake fs で全 blocking 分岐 DA>0)。落ちる実証は fake fs の failure 注入 = 実行時消費行で実施。
9. [x] `bun scripts/package.ts` + `bun run promote:self` で6 package / 4 self-install を正規生成し drift 0 を確認。
10. [x] targeted / typecheck / lint:check / dist:check / promote:self:check / full CI を連続実行し exit code を実測。`code-summary.md` を作成、独立 review と §13 を leader へ付議。

## 完了条件

- 3 canonical seam が pure で、birth/detect/doctor が同一 `WorkspaceScanResult` snapshot を投影する。
- nested 単一 hit だけ `nestedRoot`、複数は非自動選択、submodule は observation のみで init 実行なし。
- inconclusive は全 mutation 前に拒否され state/plan/graph/audit/workspace bytes 不変。
- 観測なし classified 経路の human output / detect JSON / state / audit が変更前と byte-identical。
- source / generated 6面 / self-install 4面 / targeted / typecheck / lint / dist / promote / full CI が同一最終差分で green。

## 非対象

- depth>1 探索、候補の自動選択、submodule 初期化/fetch/checkout、filesystem 修復。
- 新 service/DB/network/UI/runtime dependency/schema/audit event/state field。
- U06 外 Unit、別 stage、既存巨大 file の一般 refactor、`dist/` 手編集、commit/push/PR/merge。
