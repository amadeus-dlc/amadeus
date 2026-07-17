# Requirements — amadeus-mirror ツール(scripts/amadeus-mirror.ts)

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

## Intent Analysis(なぜ作るか)

intent-first 起票運用(team.md cid:intent-first-mirror-issue、PR #1159)は、ミラー Issue の作成・同期・クローズが手作業だと守られなくなる(#1157 で Issue 本文の影の仕様書化を実測)。本ツールは定型3要素の規律を構造化し、起票〜クローズを1コマンド化することで運用ドリフトを防ぐ(intent-statement.md の Problem Statement / 成功指標3点)。

## FR-1 CLI 契約(共通)

- FR-1.1: `bun scripts/amadeus-mirror.ts <create|sync|close> [flags]` のサブコマンド形。サブコマンドなし・未知サブコマンドは USAGE を表示して exit 2(既習様式: scripts/metrics-timeseries.ts:188 の `main(argv): number`、:236 の `import.meta.main` 起動。サブコマンド分岐は amadeus-orchestrate.ts:3140-3149 の switch idiom)
- FR-1.2: 対象 intent はアクティブ intent cursor から解決(明示指定 `--intent <dirName>` で上書き可)
- FR-1.3: gh CLI 不在・未認証は検出時に loud エラー(exit 1、標準エラーへ理由)。認証は gh keyring へ委譲(practices Q1、discovered-rules.md)
- FR-1.4: 状態は決定的ソースのみから読む: intents.json(`readIntentRegistry`(amadeus-lib.ts:1615)相当の読み)/ amadeus-state.md(getField seam、amadeus-lib.ts:3588-3599。approved/total は同ファイル Stage Progress のチェックボックス集計 — ADR-3a 裁定 2026-07-17)。LLM 側集計・推測値を用いない
- FR-1.5: 本ツールは read-only 消費+ gh 書き込み+ state.md の Mirror Issue フィールド書き込み(FR-2.3)のみ。intents.json へは書かない(WORKSPACE lock 契約回避、RE 重点2)

## FR-2 create

- FR-2.1: アクティブ intent のミラー Issue を `gh issue create` で起票する。タイトル = intent 名、ラベル = `intent-mirror` + `enhancement`(2ラベルの根拠 = team.md cid:auto-label-triage『起票時に種別ラベルを必ず付ける』のツール起票への適用、Q4=B 裁定・#1161 先行実績)、本文 = 定型3要素テンプレート(FR-5)のみ
- FR-2.2: **重複ガード(Q1=A)**: state.md に Mirror Issue フィールドが既に存在する場合、既存番号を表示して exit 1(二重起票の構造的防止。作り直しは人間が Issue を閉じ、フィールドを外してから)
- FR-2.3: 起票成功時、Issue 番号を amadeus-state.md の `## Project Information` 節へ `- **Mirror Issue**: #<n>` として書き込む(Q3=A。getField で機械可読)
- FR-2.4: 受け入れ基準(成功指標1): birth 済み intent に対し create 1コマンドで Issue 起票+番号記録が完了する

## FR-3 sync

- FR-3.1: Mirror Issue フィールドの番号に対し `gh issue edit --body` で本文全体を定型3要素テンプレート(FR-5)から再生成して書き換える(record → Issue の一方向)
- FR-3.2: 冪等 — 状態不変なら再実行しても本文は同一(受け入れ基準: 連続2回実行で2回目の diff がゼロ)
- FR-3.3: Mirror Issue フィールド不在は exit 1(create 未実行の loud 検出)

## FR-4 close

- FR-4.1: **着地機械検査(Q2=A、成功指標3)**: (a) intents.json 当該行 `status == "complete"` **かつ** (b) state.md `getField(state,"Status") == "Completed"` の AND 成立時のみ `gh issue close` を実行。いずれか不成立は理由を表示して exit 1(fail-closed。完了2シグナルは単一トランザクション書き込み — amadeus-state.ts:1652-1667)
- FR-4.2: close 実行前に最終 sync(本文へ完了状態を反映)を行ってから閉じる
- FR-4.3: 呼び出しの可否は人間確認後という運用契約(intent-capture Q2 裁定)— ツール内に対話プロンプトは持たない

## FR-5 定型3要素テンプレート

- FR-5.1: 本文はテンプレート内蔵の3セクションのみ: `## 概要`(3〜5行、intent の Project フィールドから要約)/ `## Record(正本)`(record dir パス+intent birth PR 参照があればリンク)/ `## 状態`(1行: フェーズ・ステージ位置と approved 集計は state.md(Current Status 節+Stage Progress チェックボックス集計 — ADR-3a)から、park は state.md `Parked` フィールド非空判定 — RE 重点3)。設計詳細を書く場所を構造的に持たない(成功指標2)
- FR-5.2: 日本語で生成(issues-in-japanese)。コード識別子・パスは原文保持
- FR-5.3: intent 名・record dir は intents.json の当該エントリ(slug/dirName)から取得する(状態集計と情報源を分離 — ADR-3a 後は summary --json を参照しない)

## NFR

- NFR-1: 依存は bun 標準+node:fs/path+gh CLI 呼び出し(Bun.spawnSync)のみ。gh は scripts/ 限定境界(project.md cid:practices-discovery:gh-scripts-boundary)
- NFR-2: 全 gh 呼び出しは exit code を自己捕捉し(no-exit-capture-through-pipe)、失敗時は stderr 内容を透過して exit 1
- NFR-3: lint(Biome)/typecheck(tsc)は既存配線(biome.json:41、tsconfig.json:19)に自動収容 — 追加配線不要(RE 重点5)
- NFR-4: テストはコードと並行して作成。実 FS を使う検証は integration 層へ(fs-tests-integration-first)。gh 呼び出しはテストで実 GitHub に触れない(spawn 境界を seam 化し、fake は テスト側ヘルパー — construction ガードレール準拠)

## スコープ外(再掲、scope-document.md より)

フック自動発火 / framework 出荷 / 逆方向同期 / 既存 Issue の一括ミラー化 / bug Issue 経路の変更

## Constraints(制約)

- C-R1: gh 依存は scripts/ 限定境界(project.md cid:practices-discovery:gh-scripts-boundary)— 配布フレームワークへ持ち込まない
- C-R2: intents.json へは書かない(WORKSPACE lock 契約の回避、FR-1.5)
- C-R3: 同期は record → Issue の一方向。Issue 側の編集は正本に影響しない(team.md cid:intent-first-mirror-issue)
- C-R4: ideation の constraint-register C1-C8 を継承

## Assumptions(前提)

- A-R1: gh CLI が存在し認証済み(feasibility raid-log A1。不成立時は FR-1.3 の loud エラーで検出)
- A-R2: 対象リポジトリは単一リモート(amadeus-dlc/amadeus。raid-log A2)
- A-R3: intents.json / state.md の様式は RE observed HEAD 3d89916e6 時点の契約(scan-notes.md)。様式変更時は repo ローカルツールとして同一 PR で追随(raid-log D2)

## Open Questions(design 段へ)

- O-R1: 状態行の正確なフォーマット(by_phase 集計の表示形)— design 段のテンプレート設計で確定
- O-R2: gh spawn の実装様式(Bun.spawnSync の引数形・env 継承 bun-spawn-env-snapshot 対応)— design 段で確定

## Review History

- iteration 1(product-lead): NOT-READY — Critical 3件(readIntegistry 誤記 / enhancement ラベル無申告 / 4区分欠落)。全件是正済み: 誤記修正、Q4=B 裁定でラベル根拠明記、Intent Analysis・Constraints・Assumptions・Open Questions を追加

## Review(iteration 2, product-lead)

**Verdict: READY**

iteration 1 の Critical 3件について、独立実測で閉包を確認した。

1. **readIntentRegistry 誤記(是正確認)** — FR-1.4 の引用 `readIntentRegistry(amadeus-lib.ts:1615)` を実行検証。`packages/framework/core/tools/amadeus-lib.ts:1615` は `export function readIntentRegistry(projectDir: string, space?: string): IntentRegistryEntry[] {` で、関数名・行番号ともに一致。誤記(readIntegistry)は解消。同 FR-1.4 の `getField seam、amadeus-lib.ts:3588-3599` も実測 — `:3588` は `export function getField(content: string, field: string): string | null {` で一致。

2. **enhancement ラベル無申告(是正確認)** — questions ファイルに Q4 が新設され、[Answer]: B(intent-mirror + enhancement の2ラベル正式化、根拠 = `team.md cid:auto-label-triage` + `#1161` 先行実績)がタイムスタンプ 2026-07-17T14:01:26Z で記録されている(Q1-Q3 は 13:53:26Z — Q4 が後続の是正ラウンドであることと整合)。`grep -n "auto-label-triage" amadeus/spaces/default/memory/team.md` で該当 cid の実在(team.md:106、「起票時に種別ラベルを必ず付ける」)を確認し、FR-2.1 の根拠記載(`Q4=B 裁定・#1161 先行実績`)と一致することを検証した。無申告のスコープ追加は解消 — 根拠が明記された正式要件になっている。

3. **4区分欠落(是正確認)** — `## Intent Analysis`(:5、intent-first 運用ドリフトの問題提起+成功指標への接続)、`## Constraints`(:53、C-R1〜C-R4、うち C-R4 は ideation constraint-register への traceability)、`## Assumptions`(:60、A-R1〜A-R3、feasibility raid-log A1/A2 および RE scan-notes への出典明記)、`## Open Questions`(:66、design 段送りの O-R1/O-R2)が追加されている。いずれも空の見出しではなく、上流成果物への具体的な参照を伴う実質的な記述であることを確認した。

**新規引用の独立再実測(fix-diff-independent-reverify)** — 是正で新たに入った file:line・cid 引用を全数再確認した:
- `scripts/metrics-timeseries.ts:188`(`export function main(argv: string[]): number {`)/ `:236`(`if (import.meta.main) process.exit(main(process.argv.slice(2)));`)— FR-1.1 の既習様式引用、一致
- `amadeus-orchestrate.ts:3140-3149` の switch idiom — `switch (subcommand) { case "next": ... case "report": ... case "park": ...`、一致
- `amadeus-state.ts:1652-1667`(FR-4.1 の「完了2シグナルは単一トランザクション書き込み」)— `:1652` `writeStateFile(pd, content)` から `:1660` `updateIntentStatus(pd, completedIntentDir, "complete")` まで、state.md 書き込みと intents.json 更新が同一関数内で連続実行されることを確認。裁定文の主張と整合
- `biome.json:41`(`"includes": [..., "scripts/**"]`)/ `tsconfig.json:19`(`"include": [..., "scripts/*.ts"]`)— NFR-3 の既存配線主張、一致
- `project.md cid:practices-discovery:gh-scripts-boundary`、`team.md cid:requirements-analysis:intent-first-mirror-issue`、`cid:code-generation:no-exit-capture-through-pipe`、`cid:code-generation:fs-tests-integration-first`、`cid:code-generation:bun-spawn-env-snapshot` — 全 cid の実在を grep で確認、参照文脈も本文の主張と整合

**リグレッション確認** — iteration 1 で問題視されなかった FR-1〜FR-5・NFR・スコープ外節の内容は変更されておらず、既存の testability(exit code 契約、冪等性の受け入れ基準など)・traceability(scope-document・raid-log への出典)は維持されている。

以上により、readIntegistry 誤記・ラベル無申告・4区分欠落の Critical 3件はすべて閉包し、是正過程で新たに導入された引用にも誤りは見つからなかった。次工程(design)へ進行可。

