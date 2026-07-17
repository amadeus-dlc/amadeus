# Requirements — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`([Issue #626](https://github.com/amadeus-dlc/amadeus/issues/626))
上流入力: `../../ideation/intent-capture/intent-statement.md`(Success Metrics)、`../../ideation/scope-definition/scope-document.md`(In/Out 境界)、codekb の business-overview.md / architecture.md / code-structure.md(RE 2026-07-16 diff-refresh、「harness port 開放性の観測面」節)、`../practices-discovery/team-practices.md`(5領域変更なし)。

> 設計判断の出典: 選挙 E-OC7(Q1=B / Q2=A / Q3=A、2026-07-15T17:14:59Z 開票、3問とも全会一致)。裁定・GoA・留保の一次記録は requirements-analysis-questions.md([Answer] に転記済み — git で検証可能)。開票タイムスタンプは agmsg 出典(evidence-split)。

## FR-1: opencode harness surface(manifest 駆動 port)

`packages/framework/harness/opencode/manifest.ts`(+必要なら `emit.ts`)を追加し、`bun scripts/package.ts` が **編集ゼロの自動発見**(`scripts/package.ts:68-73` discoverHarnessNames)で `dist/opencode/` を生成する。

- AC-1a: `bun scripts/package.ts` 実行後に `dist/opencode/` が生成され、`bun run dist:check` が exit 0(byte 差分ガード通過)
- AC-1b: manifest は `HarnessManifest` 型(`scripts/manifest-types.ts`)に適合し、core の写像は既存4 harness の様式(coreDirs / harnessFiles / rulesRename 等)に倣う。**倣う際は、引用元 manifest/emit のエラー分岐・例外方針(例: emit の失敗を throw するか黙って続行するか)が本 intent の要件と一致するかを設計成果物で明文照合し、意図的に異なる場合はその相違を設計に明記する**(照合しない字面引用は禁止。この検査手法のノルム化はノルム PR #1018 で審議中 — マージ後は cid 参照へ差し替え可)
- AC-1c: `dist/opencode/` は opencode の受け取り単位(feasibility 実測: `.opencode/{agents,commands,skills,plugins}` + `opencode.json` + AGENTS.md)に配置される。具体的写像(どの core 資産をどの単位へ)は application-design で確定
- AC-1d: 新 harness ツリーは runtime のハーネス解決(`amadeus-lib.ts:143` harnessDir / `:191` rulesSubdir が読む per-tree `tools/data/harness.json`)へ自ツリーの harness.json を同梱して応答する

## FR-2: opencode 起動導線(walking skeleton の到達ライン)

opencode セッションから Amadeus workflow を開始できる最小導線を提供する。

- AC-2a: `dist/opencode/` を配置したプロジェクトで、opencode から `--version` 相当(`amadeus-utility.ts:243-245` handleVersion — harness 非依存を RE 実測済み)と `--doctor` 相当が実行でき、exit code が既存 harness と同一契約(doctor: `failed > 0 ? 1 : 0`)
- AC-2b: `$amadeus` 相当の command/skill から orchestrator(`amadeus-orchestrate.ts next`)を起動でき、intent birth → intent-capture の run-stage directive 受領まで到達する(basic workflow start)
- AC-2c: doctor の `.claude` 専用ブロック(`amadeus-utility.ts:676,:696` の `harness === ".claude"` 分岐、`:857` otherTrees)は advisory 劣化として動作する(fail しない)— 劣化内容を README / harness guide に記載

## FR-3: Cursor harness surface

`packages/framework/harness/cursor/manifest.ts`(+emit.ts)を追加し、`dist/cursor/` を生成する。受け取り単位(feasibility 実測: `.cursor/rules/*.mdc` + AGENTS.md + `.cursor/mcp.json` + headless CLI `agent -p`)への写像は application-design で確定。

- AC-3a: `bun scripts/package.ts` 後に `dist/cursor/` が生成され `dist:check` exit 0
- AC-3b: FR-2 と同一の到達ライン(--version / --doctor / basic workflow start)を Cursor で満たす
- AC-3c: hook seam が不在/不安定と確定した場合は**機能差として文書化して受け入れる**(E-OC7 Q3=A、全会一致)。**留保(E-OC7 Q3)**: (i) 「不在/不安定の確定」は AC-3d の外部実測記録を前提条件とし、確定前に文書化を先行させない (ii) 文書化は「何が動き何が動かないか」の**機能単位の表**を受け入れ基準に含める(FR-7 AC-7a の記載様式)。スコープ縮小(C 案)へ転じる場合は正準リスト(4)によりユーザーエスカレーション経由
- AC-3d: application-design 前に Cursor の hook 機構の有無を外部実測(公式 docs 照会+可能なら実機)で反証確認し、結果を設計成果物に記録する(absence-claim-grep-verify の外部仕様適用)。この記録が AC-3c の「確定」の前提条件

## FR-4: 既存 harness の無回帰

- AC-4a: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` がすべて exit 0(project.md の CI 基準)
- AC-4b: 既存4 harness の dist ツリーに byte 差分を生じない(dist:check が保証 — 新ツリー追加のみ)
- AC-4c: promote:self(managedDirs `scripts/promote-self.ts:37-41`)は**対象外**とする(E-OC7 Q2=A、全票 GoA 1・留保なし)。非対応(dogfood しない)を FR-7 のドキュメントに明記し、managedDirs と promote:self:check の宇宙は不変
- AC-4d: **core の harness-neutrality の検証**(Issue 受け入れ条件5のテスト可能化): code-generation の各 PR で、reviewer が `git diff` の `packages/framework/core/` 配下に `opencode` / `cursor` の文字列リテラル・条件分岐が追加されていないことを `git diff <base>..<head> -- packages/framework/core/ | grep -iE "opencode|cursor"` の実測(期待: ヒット 0 件、または harness.json 等 manifest 経由データの正当な参照のみ)で確認し、レビュー verdict に実行コマンドと結果を記載する

## FR-5: 検証(smoke / drift の宇宙への編入)

- AC-5a: dist/opencode/ と dist/cursor/ は package.ts の `--check` 対象に自動編入される(open-set の帰結 — 実測で確認しテストで固定)
- AC-5b: 新 harness の最小 smoke test を追加する(dist ツリーの主要ファイル実在+manifest 経由生成の検証)。テスト層は既存 tests/run-tests.sh の4層に従い、in-process seam を実装時点で設計する(bun-coverage-spawn-blindspot / local-lcov-pre-push)
- AC-5c: ハーネス名を閉じた列挙で持つテスト・fixture(RE 台帳: `tests/unit/setup-harness.test.ts:13`・`tests/unit/setup-harness-parse.test.ts:17` 等 **9ファイル**(installer 5 + runtime 2(amadeus-utility.ts / amadeus-lib.ts)+ migrate 1 + promote-self 1)— reviewer 指摘で parse テスト追補・件数を実測再計算、台帳の正本は codekb code-structure.md)への伝播は、着手前に repo 全域 grep で棚卸しして影響ファイル目録を design に添付する(fixture-propagation-grep / enumeration-reverify-at-implementation)。非破壊の列挙(`tests/unit/t156-memory-relocation.test.ts:149`・`tests/unit/t199-grilling-distribution.test.ts:33-40` — 新ハーネスを検査しないだけで壊れない)は目録に「非破壊・検査対象化は任意」と分類する

## FR-6: installer(packages/setup)の扱い

- AC-6a: installer 閉じ列挙 **5ファイル**(`packages/setup/src/domain/harness.ts:9,19-24` / `packages/setup/src/domain/engine-layout.ts:8-12` / `packages/setup/src/modules/reporter.ts:24-25,137` / `tests/unit/setup-harness.test.ts:13` / `tests/unit/setup-harness-parse.test.ts:17` — reviewer 指摘で parse 契約テストを追補し、旧「5ファイル」の harness.ts 2行参照の二重計上を訂正。実ファイル数はこの5個で全数、packages/setup/src に他の閉じ列挙なし(iteration 2 で grep 実測))の更新は**本 intent に含めず、別 Issue として起票する**(E-OC7 Q1=B、全会一致)。**留保(E-OC7 Q1)**: (i) 別 Issue には RE scan-notes の台帳(追補・再計算済み: installer 5ファイル)を verbatim 添付 (ii) 「install --harness opencode が弾かれる」再現実測を必須で含める (iii) 本 requirements には dist 生成→手動配置での検証手順を受け入れ条件充足の証跡として明記する → AC-6b
- AC-6b: 到達ライン検証は「`bun scripts/package.ts` で dist/opencode/・dist/cursor/ を生成 → 検証用プロジェクトへ手動配置(installer 非経由) → --version / --doctor / basic workflow start を実測」の手順で行い、その実測記録(コマンドと exit code)を build-and-test 成果物に含める — installer 非対応でも Issue 受け入れ条件を充足する証跡(E-OC7 Q1 留保 iii)

## FR-7: ドキュメント

- AC-7a: README / harness guide(docs/)に opencode / Cursor の対応状況・制限(機能差・権限モデル差: opencode の既定全許可 vs Claude の pre-approve)・promote:self の対象/非対象を記載する。対象文書の特定は design で行い、更新は code-generation に含める
- AC-7b: 両ハーネスの実行モデルと制約の文書化(Issue 受け入れ条件1)は codekb でなくユーザー向け文書(docs/)として恒久化する

## NFR チェックリスト(requirements-analysis:c4)

- **規模増**: ハーネス数 4→6。package.ts の discoverHarnessNames は readdirSync 走査で件数に線形 — 上限機構なし(問題なし、実測)。dist リポジトリサイズ増は既存4 harness の実績(各 5-8MB 級)から許容
- **クラッシュ耐性**: package.ts はビルド生成のみ(アトミック性は dist:check の byte 照合で担保)。新規の永続化パスなし
- **別 OS**: 新 harness surface は既存と同じ TS/Bun のみ(実行ビット不要・パス結合は node:path)。Bun 実装差の既知パターン(readFileSync EISDIR/空文字、spawn env)は実装時に既存ノルム適用
- **消費側棚卸し**: dist ツリーの消費側 = installer(FR-6 裁定に従う)・promote:self(FR-4c 裁定に従う)・ドキュメント(FR-7)・drift ガード(FR-5)— 全消費側を FR に割当済み

## Out(要件外 — scope-document の Out を継承)

全 stage/swarm/reviewer loop の完全互換、core への harness 分岐直書き、機能差の隠蔽、TAKT executor 互換、hook 相当の高度統合(E-OC7 Q3=A により代替実装は要件化しない)、installer 閉じ列挙の更新(E-OC7 Q1=B により別 Issue)、promote:self の対象化(E-OC7 Q2=A)。
