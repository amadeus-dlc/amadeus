# Requirements — #2352 resolveProjectDir worktree marker 段の追加

上流入力(consumes 全数): business-overview、architecture、code-structure

測定 ref: observed = worktree HEAD `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（origin/main 系譜）。行番号はすべてこの断面。クロスレビュー target SHA `75a1c198d` からの患部区間シフトはゼロ（RE scan の cmp 実測、re-scans/260807-projectdir-worktree-fix.md）。

## Intent analysis

worktree セッションが engine CLI を main 側の絶対パスで起動した場合（またはケース C+env）、`resolveProjectDir()` が本線 checkout を返し、**worktree の作業が本線 record（state・audit・intents.json）へ無音で書かれる**（codekb business-overview「worktree セッションの record 汚染」節）。目標は「セッションがいる workspace が record の書込先になる」という隔離の約束を CLI 側の解決梯子でも成立させること。hook 側（`resolveProjectDirFromHook`、amadeus-lib.ts:310-347）は #641/#1482 で既に marker 段を持ち、非対称だけが残っている（codekb architecture「project-dir 解決の2梯子非対称」節）。

裁定系譜: Issue #2352（クロスレビュー2名成立、ESTABLISHED_WITH_REFINEMENTS）→ 本ステージ Q1-Q4（questions ファイル、full グラント decide-question、auto-decision 4件）。

## Functional requirements

### FR-1: workspace-marker 段の追加（Q1 = A、段順位は E-PWF-CGDEV2 裁定で改訂: 2-0）

`packages/framework/core/tools/amadeus-lib.ts` の `resolveProjectDir()`（:226-250）に workspace-marker 段を追加する。

- 位置（**E-PWF-CGDEV2 改訂**）: env 段（:231 `if (process.env.CLAUDE_PROJECT_DIR) …`）の**直後**、script-path 段の**上** — 段順は explicit → env → **cwd-marker** → script-path → cwd-harness。
- 改訂理由（実測2件）: (a) 当初の「env より上」実装で、`CLAUDE_PROJECT_DIR=<temp fixture>` を設定し cwd=repo で state ツールを spawn する既存テスト群の隔離 seam が破れ、テスト書込が実 record・memory 層へ流れる実害インシデントが発生（audit の ERROR_LOGGED/PRACTICES_AFFIRMED 群・team.md/project.md 汚染 — conductor が前進修復済み）。env は例外ユースケースでなく**既存資産が広く依存する現行契約**。 (b) 当初前提「hook は marker が env に勝つ」は誤り — hook 梯子で env より上にあるのは harness が payload で渡す一次情報（payload cwd、marker ガード付き、:317）のみで、hook 自身の `process.cwd()` marker 段（:329-330）は env の**下**。よって本段順は非対称の導入ではなく **hook 段2-5 との構造的パリティの回復**である。
- 述語: 既存 canonical の `findWorkspaceMarkerAncestor(process.cwd())` を再利用する（hook :329-330 と同一関数）。marker 述語の重複定義・再実装は禁止（canonical 1定義原則。`hasWorkspaceMarker` は :283-286）。
- 意味論: cwd またはその祖先が workspace marker（`amadeus/` + `<harness>/tools/` の2ディレクトリ）を持てばそのディレクトリを返す。
- 実装コメント: 新段順に整合する説明へ書き直す（旧段順（env より上）を説明するコメントを残さない — 次の実装者が反転を再導入しないため。E-PWF-CGDEV2 subagent-2 留保）。一時スタブ（TEMP-ATTRIBUTION-PROBE 等）は必ず実段へ置換する。

受け入れ基準（検証は FR-2 のテスト ID に束ねる — 静的 AC を含む全 AC に検証手段を明示）:

- AC-1a（ケース B）: cwd = worktree（marker 保有）× main 側絶対パスの lib 読込・env UNSET で、`resolveProjectDir()` が worktree root を返す（現行は main を返す欠陥 — RE 5ケース再現表。**検証面の注記（E-PWF-CGDEV 裁定 案C、2-0）**: in-process 直 import では正本配置（`packages/framework/core/tools/` — 親セグメント `core` が `isHarnessDirName` を満たさない）により rung 3 が構造的に到達不能のため、逐語形の Red は取れない。in-process 検証（FR-2a）はケース B を祖先形（marker-less 子 dir → worktree root）で読み、逐語形の回帰 pin は FR-2b の t144 更新（dist 読み subprocess — rung 3 が実際に発火する shipped layout）が担う。本注記は検証面の記述であり、実質要件の文言・射程は不変）。
- AC-1b（**E-PWF-CGDEV2 改訂**）: ケース C+env（cwd = worktree・`CLAUDE_PROJECT_DIR`=main）は **env が勝ち main を返すことを明示的に pin する**（意図された現行契約の保存 — FR-2a のテストで固定）。C+env で worktree を選ばせる経路は (a) 本 intent のスコープ外 (b) 受け皿は `--project-dir` 明示（A-1、18ツール実装済み） (c) 恒久解は #1287 の解決順再設計へ委譲。なお C+env が開いている境界は現行 hook 梯子（env が cwd-marker 段より上）でも同一であり、本 intent が新設する退行ではない。本 intent では C+env に loud ガードを入れない — env 契約への広範な既存依存が根拠（この判断と根拠を code-summary にも記録する）。
- AC-1c（ケース A / C）: 従来どおりの解決値（回帰なし）。
- AC-1d（後方互換）: cwd（と全祖先）が marker を持たない場合、既存4段（explicit → env → script-path → cwd harness dir）の解決値・順序は不変。
- AC-1e（hook 側不変）: `resolveProjectDirFromHook()` の挙動・段順は無変更。既存 t202 / t296 / t230 が無改変で green を維持する。
- AC-1f（explicit 最優先の保存）: `--project-dir` 明示引数は引き続き最上位（受け口は 18 ツールに実装済み — codekb code-structure「呼び出し分布」節）。

### FR-2: 回帰テスト（Q3 = A）

- FR-2a: 新規 unit テストを追加する — 正本 `packages/framework/core/tools/amadeus-lib.ts` を in-process 直 import し、repo 外 temp fixture でケース A / B / C / C+env / marker なしの5系を固定する（hook 側 t202 の既習形と対称。build 非依存・lcov 有効）。TDD: 実装前に本テストのケース B / C+env で Red を実測してから FR-1 を実装する（team.md tdd-default-with-narrow-exceptions）。
- FR-2b: `tests/integration/t144-harness-seam.cli.test.ts` を新しい段順（explicit → cwd-marker → env → script-path → cwd harness dir）の pin へ更新する。既存 test 5（`.codex` marker と題する段4テスト、:134-146 — `amadeus/` を作らないため workspace marker ではない）の題名・アサーションを新段構成と矛盾しない形へ整合させる。t144 は dist を読む（:37-38）ため `bun run build` 後に実行する。
- FR-2c: テスト番号（tNNN）は PR 発行前の再接地時に固定 base SHA の tests/ 実測で衝突を再確認する（cid:code-generation:c1-tnnn-collision-on-regrounding）。

### FR-3: stale comment の是正（Q4 = A）

`amadeus-lib.ts:6673` のコメント `// matches AMADEUS_PROJECT_DIR in resolveProjectDir() above.` を、実装が実際に読む `CLAUDE_PROJECT_DIR` を指す正しい記述へ1行 reword する（検証: FR-2a のテストファイルとは独立に、`grep -n "AMADEUS_PROJECT_DIR" packages/framework/core/tools/amadeus-lib.ts` が 0 件になることを build-and-test の検証記録に含める。`amadeus-sensor-self-scope-consistency.ts:371` の別ファイル出現はスコープ外で残存してよい）。

## Non-functional requirements

- NFR-1: 挙動変更の範囲を「cwd（または祖先）が workspace marker を持つ場合」に限定する。marker を持たない全ての既存呼び出し（実 call site 96 — amadeus-lib.ts 除く 15 ツール 95 + otel/relay.ts:777 1、codekb code-structure の observed 再計数）で解決値が変わらないこと。
- NFR-2: 全ブロッキングゲート green — `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / Project Coverage Gate（絶対 AND 相対）/ Patch Coverage Gate / complexity / 隔離2回ビルド再現性 / `bun run source-only:check` / グラフ不変量 / plugin-conformance-e2e。
- NFR-3: 新規行は patch coverage 対象 — FR-2a の in-process テストが新段の全行を駆動する（spawn 盲点を作らない。bun-coverage-spawn-blindspot）。
- NFR-4: 正本編集は `packages/framework/core/` のみ。`bun run build` で dist/self-install を再生成し、tracked ファイル不変を確認する（Mandated）。

## Constraints

- self-fix スコープ（Minimal depth / Comprehensive test strategy）。設計ステージは SKIP のため、本 requirements が機構選択まで確定する（Q1-Q4 裁定）。
- intent autonomy full グラント（intent-grant-cd4640053e8a2e0f8b0b8d9e97d10b29）の prohibitedEffects: scope-out — 本文書の Out of scope を無言に拡大・縮小しない。
- 逸脱時は実装前停止（deviation-stop-before-implement）。ケース B/C+env の閉包は修正適用後に元症状の非再現まで実測する（ruling-premise-closure-verification）。
- worktree 隔離: 実装は本 worktree（2352-project-dir-fix、base 4a3da7d62）内で行い、他ツリーの git 状態に触れない。

## Assumptions

- A-1: 「env を明示設定して cwd と別の tree を意図的に指す」正当ユースケースの受け皿は明示引数 `--project-dir`（18 ツールで実装済み）である。env 段はこの用途の正規手段ではない — hook 側が同じ判断を #1482 で既に確定している（:306-309）。
- A-2: fresh worktree（`bun run build` 前）は marker 後半（`<harness>/tools/`）を満たさず新段は不発 — この場合は従来梯子へ落ちる。これは AC-1d の後方互換に含まれ、loud 化は Out of scope（Q4）。
- A-3: 併走変更なし — open PR 0 件、base→observed 12 commits は resolver 領域を触っていない（RE scan §9 交差判定）。

## Out of scope

- 完了条件1（settings allowlist `Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)` の改訂、`packages/framework/harness/claude/settings.json.example:10` + `.claude/settings.json:39`）と完了条件2（`stage-protocol.md:511` CWD drift warning の改訂）— クロスレビューが両条件の前提を反証済み（allowlist はケース B の原因でない: env UNSET では bun cwd fallback でケース C、env-set では段2が勝ち呼び出し形非依存。規律は「不在」でなく :511 が実在）。FR-1 採用後は絶対形起動でも marker 段が勝つため両文書の誤誘導は実害を失う（Q2 裁定。文書改訂の要否は後続の独立判断へ残す）。
- #1492 系の allowlist フォールバック化（`${CLAUDE_PROJECT_DIR:-.}`）— bun cwd fallback への依存という独立リスクの評価が要る（Q4。issue-first-capture で扱う）。
- fresh worktree marker 不成立の loud 検出（A-2）。
- #1287（解決順の再設計 enhancement）— FR-1 は #1287 と両立する点修正であり、梯子全体の再設計は同 Issue の射程のまま。
- `AMADEUS_PROJECT_DIR` の別ファイル出現（`amadeus-sensor-self-scope-consistency.ts:371`）。

## Open questions

- なし（材料となる未決は Q1-Q4 で確定済み）。実装時に前提不成立（例: marker 段追加で想定外の既存テスト赤）を検知した場合は deviation-stop-before-implement に従い停止して裁定に回す。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T10:58:46Z
- **Iteration:** 1
- **Scope decision:** none

要件は上流3成果物の該当節を正確に引用し、Q1-Q4 裁定と FR/Out of scope に矛盾・無申告逸脱なし。Step 10 必須7節は実質を伴い、全 AC に検証手段バインドあり。指摘は traceability/引用精度の FOLLOW-UP 4件のみ（うち sensor-self-scope-consistency.ts:371 の引用実在は conductor が grep で実測確認済み）。

### Findings

- FOLLOW-UP | requirements.md Out of scope 1件目に business-overview 期待成果3への名指し参照を足すと traceability が明確化する
- FOLLOW-UP | requirements.md の code-structure 節参照2箇所は実見出し「project-dir 解決の呼び出し分布」の逐語が望ましい
- FOLLOW-UP | FR-2a の tNNN は再接地時確定 — build-and-test 段で AC 対応の追跡を要する
- FOLLOW-UP | sensor-self-scope-consistency.ts:371 引用はレビュー許可外 — conductor 実測で実在確認済み（grep で 371 行に AMADEUS_PROJECT_DIR 実在）
