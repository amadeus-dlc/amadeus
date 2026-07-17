# re-scan 記録 — 260717-mirror-issue-tool

## 実行メタデータ

- Date: 2026-07-17
- Observed at: HEAD `3d89916e6eb70f5d34683f8a7141ce1afe33d4b4`(`git rev-parse HEAD` 実測、scan-notes 参照)
- Intent: `260717-mirror-issue-tool`(`scripts/amadeus-mirror.ts` — intent を GitHub Issue へミラーする create / sync / close ツール)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a HEAD` exit 0 実測、dist=107)。最新3件の非祖先 observed(`8e8cc9b1` / `5761e65c` / `6a23b0ec`)は squash マージで feature tip が非祖先のため E-L63 に従い base 候補から除外。次点祖先 `60f5e1edf`(dist=223)は大きく劣後。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- 測定 ref: 件数・行番号はすべて observed HEAD `3d89916e6` の実ファイル直読(measurement-ref-in-artifacts)
- Per-intent 真実源: 本ファイルおよび `inception/reverse-engineering/scan-notes.md`
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## スキャン結論の要約

amadeus-mirror ツール(create / sync / close)が消費する seam の現行実装。canonical の関心面(runtime summary 出力契約 / intents registry 読み書き / park の機械可読表現 / state parser / scripts CLI 様式 / gh CLI 前例 / 完了2シグナル)は区間 `6495e03a..HEAD`(107コミット)で **実質無変更**。dist 差分は新ハーネスコピー(cursor / opencode)のみで canonical に及ばない。

- **重点1 runtime summary**: `amadeus-runtime.ts summary --json` は集計カウントのみ(`RuntimeSummary` :916-941)で、intent slug / record パス / ミラー Issue 番号を一切含まない。状態行に intent 名・record リンクを載せるには intents.json と record ディレクトリ名から別途取得が要る。ソースは `summarize()`(:964)が gitignore 対象の `runtime-graph.json` を読む(:966-967)。
- **重点2 intents registry**: `IntentRegistryEntry`(:1548-1567)は `{uuid, slug, dirName?, scope?, repos?, status, docsOnly?}`、`status` は string。読み `readIntentRegistry`(:1615-、absent/malformed 寛容)、追記 `appendIntentToRegistry`(:1585-1601、writeFileAtomic)、status 更新 `updateIntentStatus`(:1930-1954、`recordDirMatches` で行結合)。全 mutation は WORKSPACE lock 契約(:1546)。mirror は read-only 消費のため lock 不要。実 intents.json の status 語彙は `complete` / `in-flight` / `closed`。
- **重点3 park の機械可読表現(raid-log R1 確定)**: park は intents.json の status を変えない(in-flight のまま)。実体は amadeus-state.md `## Runtime State` 節の `- **Parked**:` と `- **Parked At Stage**:` の2フィールド(`handlePark` :607-636、書き込み :630-631)。機械判定 = `getField(state, "Parked")` の非空。intents.json だけでは park を検知不能。
- **重点4 state parser**: `getField`(:3588-3599)が `- **<Field>**: <value>` 行を正規表現 `^- \*\*<field>\*\*:[ \t]*(.*)$`(m フラグ)でマッチ・trim。state.md 全フィールド読み取りの唯一の seam。`## Current Status` に Lifecycle Phase / Current Stage / Next Stage / Status / Last Updated。Status 語彙の主値は Running / Completed。
- **重点5 兄弟 CLI 様式**: 雛形は `scripts/metrics-timeseries.ts`。shebang なし(`bun scripts/<name>.ts` 前提)、`export function main(argv: string[]): number`(:188、exit 0/1/2)、`if (import.meta.main) process.exit(main(process.argv.slice(2)))`(:236)、判別ユニオン Result(parse-don't-validate)、依存は `node:fs`/`node:path`/`node:url` のみ。サブコマンド分岐は `amadeus-orchestrate.ts:3140-3149` の `switch (subcommand)` idiom を参照。lint/typecheck 配線は biome.json:41(`scripts/**`)+ tsconfig.json:19(`scripts/*.ts`)で自動収容 — 新規 `scripts/amadeus-mirror.ts` は追加のみで CI 収容、配線追加不要。
- **重点6 gh CLI 前例**: repo 内に gh CLI 呼び出しは不在。mirror は gh 呼び出しの新規導入者となり、`Bun.spawnSync`/`node:child_process` で実装し gh 認証前提・未認証時の loud エラーを自前実装する必要がある。
- **close の機械検査(成功指標3)**: 完了は単一トランザクションで2シグナルを同時に書く(`amadeus-state.ts:1652-1667`)— 権威A = intents.json 行 `status == complete`(:1660)、権威B = state.md `getField(state,"Status") == Completed`。この完了書き込みは human-confirmed complete-workflow 経由のみ(:1653-1656 コメント「never an automatic inference from state」)。

## 再照合の結果(Architect 独立検証)

scan-notes の最重要7点を observed HEAD `3d89916e6` の実ファイルで verbatim 再照合。**7点全一致・訂正なし**。

| # | 主張(file:line) | 検証結果 |
|---|---|---|
| 1 | `RuntimeSummary` `amadeus-runtime.ts:916-941` | 一致(トップキー9個・stages/by_phase 同形の集計形も一致) |
| 2 | `updateIntentStatus` `amadeus-lib.ts:1930-1954` | 一致(`status: string`・`recordDirMatches`・`writeFileAtomic`) |
| 3 | `handlePark` の Parked 2フィールド `amadeus-state.ts:607-636` | 一致(Parked :630 / Parked At Stage :631、autonomous/Completed 拒否) |
| 4 | `getField` `amadeus-lib.ts:3588-3599` | 一致(正規表現・m フラグ・trim・空値 "") |
| 5 | metrics-timeseries `main` :188 / `import.meta.main` :236 | 一致(`main(argv): number`・process.exit 起動様式) |
| 6 | biome.json:41 + tsconfig.json:19 の scripts 配線 | 一致(`scripts/**` includes / `scripts/*.ts`) |
| 7 | complete-workflow の2シグナル `amadeus-state.ts:1652-1667` | 一致(writeStateFile :1652 / updateIntentStatus(...,"complete") :1660 / console.log :1661) |

## codekb 本文への反映判断

codekb 本文9ファイル(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / … )は、本 intent の関心 seam(runtime summary / intents registry / park / state parser / scripts CLI 様式)の canonical が区間 `6495e03a..HEAD` で実質無変更であり、再照合でも codekb 本文と現状の矛盾を検出しなかったため **全点温存(churn 回避、cid:reverse-engineering:c1)**。更新は本 re-scan エントリと `reverse-engineering-timestamp.md`(鮮度ポインタ + 旧「最新: 260716-teamup-resume-size-drift」→履歴ラベル降格)のみ。
