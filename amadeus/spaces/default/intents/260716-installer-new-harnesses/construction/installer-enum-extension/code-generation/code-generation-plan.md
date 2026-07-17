# Code Generation Plan — U1 installer-enum-extension(Issue #1048 / Bolt 1)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1)、`../functional-design/`(business-logic-model.md F-1〜F-4、business-rules.md BR-1〜6、domain-entities.md、frontend-components.md)、`../nfr-design/`(reliability-design.md の AC-6e テスト設計、performance-design.md、security-design.md)、`../infrastructure-design/`(cicd-pipeline.md 検証列、deployment-architecture.md の embedded 配置)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6)。

## 変更目録(FR-1 の8サイト+runtime 2面+README 3箇所+テスト)

| # | ファイル | 変更 |
|---|---|---|
| 1 | `packages/setup/src/domain/harness.ts` :9 union / :19-24 all | opencode / cursor を追加(6値) |
| 2 | `packages/setup/src/domain/engine-layout.ts` :8-13 | `opencode: ".opencode"` / `cursor: ".cursor"` entry 追加(各固有 dir) |
| 3 | `packages/setup/src/modules/reporter.ts` :24-25 usage / :137 invalid | 6値表記へ(refined-mockups 確定文字列 exact) |
| 4 | `tests/unit/setup-harness.test.ts` :13 ほか | literal 6値化+件数文言("four known harnesses" 等)の same-root grep 全数更新 |
| 5 | `tests/unit/setup-harness-parse.test.ts` :17 ほか | 同上 |
| 6 | `tests/integration/setup-install-flow.test.ts`+fixture | dist/opencode・dist/cursor エントリ追加、opencode/cursor の install→verify 完走+`--harness foo` exit 2 検証 |
| 7 | `packages/framework/core/tools/amadeus-lib.ts` :121 | KNOWN_HARNESS_DIRS へ `.opencode` / `.cursor`(6値化 — rung 2 実挙動、AC-6a) |
| 8 | `packages/framework/core/tools/amadeus-utility.ts` :860 | otherTrees へ opencode / cursor(advisory) |
| 9 | AC-6e 新規テスト | opencode/cursor 名 worktree レイアウトを一時 dir に構築し `resolveProjectDirFromHook` の戻り値を in-process assert(hasWorkspaceMarker は間接検証・新規 export なし) |
| 10 | `README.md` :58-59 / :109 | manual install 注記 → install コマンド、wizard prose 6値化(README.ja.md があれば対訳同期) |
| 11 | regen | `bun scripts/package.ts`+`bun run promote:self`(計8ミラー) |

## 禁止・制約(builder へ焼き込み)

- AC-1e: 上記以外の per-harness 分岐・ロジック追加禁止。逸脱は**実装前停止**(deviation-stop-before-implement)
- AC-6d: migrate(`amadeus-migrate.ts:71`)・self-install(`promote-self.ts:37-41`)非接触
- dist/ 手編集禁止(regen のみ)。後方互換シム・フォールバック禁止
- 落ちる実証(FR-2): 列挙欠落を一時注入し契約テスト赤を実測 → 復元して green を実測

## 検証列(全て同期実行・exit code 記録)

typecheck / lint / dist:check / promote:self:check / `bash tests/run-tests.sh --ci` / push 前ローカル lcov(diff 追加行未カバー 0 — 配線行・catch 行の個別確認込み)/ `npm pack --dry-run`(packages/setup、DECLARED_IN_FILES 列挙確認)/ deslop 後の全検証再実行。

## 実行様式

builder subagent を worktree 隔離でディスパッチ(base = origin/main、c2: 割当 worktree 外の git 状態変更禁止)。完了報告は M2(produces ls 照合)+検証 exit code 一覧を必須とする。
