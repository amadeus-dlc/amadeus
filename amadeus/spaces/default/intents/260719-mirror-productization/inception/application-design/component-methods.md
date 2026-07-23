# Component Methods — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

> スタイル: functional-domain-modeling-ts(判別ユニオン Result、type+コンパニオン、テストシームは引数注入)。既存 mirror.ts の `ArgsOutcome`/`SnapshotOutcome`/`GhResult` を維持。

## C1: amadeus-mirror ツール

| メソッド/シンボル | 変更 | 契約 |
|---|---|---|
| `parseArgs` | 変更 | verb 集合へ `status` を追加(`--intent <dirName>` は全 verb 共通のまま)。未知 verb/フラグは usage exit 2(不変) |
| `main` | 変更 | `status` 分岐を追加。既存3分岐は不変 |
| `buildSnapshot` | 不変 | 決定的状態源(intents.json + amadeus-state.md)— status も同スナップショットを読む |
| `runStatus`(新規) | 新規 | 乖離3クラス判定の判別ユニオン `StatusOutcome = { kind: "clean" } \| { kind: "diverged"; findings: Finding[] } \| { kind: "precondition"; reason: string }` を返す純関数+gh read(`issue view --json`)を `GhRunner` シーム経由で実行。exit 写像: clean→0 / diverged→1 / precondition→2(E-MPRRA3) |
| `spawnGh` / `ensureGhReady` / `fail` / `writeMirrorIssueField` | 不変 | 挙動不変(W-04)。status は `writeMirrorIssueField` を呼ばない(書込ゼロ) |

乖離3クラスの判定源(すべて決定的比較):
1. **状態行 stale**: record 側の節目状態(state の Status/Lifecycle)と Issue 本文の状態行の不一致
2. **ミラー未作成**: state に `Mirror Issue` フィールド不在、または番号が示す Issue が gh view で取得不能
3. **Issue 手動変更**: Issue 本文が直近 sync が生成した本文(create/sync と同一のレンダラで現 record から再生成した期待本文)と不一致

## C2: /amadeus-mirror SKILL(メソッドなし — 手順のみ)

Step 1: `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts status` を実行し診断を表示 → Step 2: 診断結果に応じ create(未作成)/ sync(stale・手動変更)/ close(complete 済み intent)を**人間の指示を得て**実行(auto 実行しない — SKILL は診断と案内が主、C-05 の ask 原則を SKILL 側でも維持)。

## C3: 3層 config リゾルバ

| メソッド | 契約 |
|---|---|
| `parse(text)` | fail-closed: 未知キー・型不整合を invalid 収集(amadeus-settings.ts:43-47 の error 様式踏襲)。合法キーは `auto-mirror`(boolean)のみ |
| `resolve(projectDir, space?, intentDir?)` | Global→Space→Intent の順に読み、**下位優先**(Intent > Space > Global — C-06)でマージ。全層不在・キー不在は default(`auto-mirror: false`)。invalid 層は loud エラー(exit 1 相当の Result)— 無視して先へ進まない |
| ファイル名・形式 | JSON 3面: `amadeus/config.json` / `amadeus/spaces/<space>/config.json` / `<record>/config.json`(ADR-4 裁定 A)。実装モジュール = `amadeus-mirror-config.ts` |

## C4: phase 境界ミラー分岐(amadeus-orchestrate.ts)

| 挿入点 | 契約 |
|---|---|
| phase boundary 判定後・次 phase 進行前の next 経路 | `PHASE_CHECK_REQUIRED_PHASES` と同集合の3境界で発火(E-MPRRA1)。C3 `resolve` の結果で分岐: off/未設定→ask(create 選択肢はミラー未作成時のみ込み)/ on+作成済み→sync print(run-then-continue)/ on+未作成→ask 降格(E-MPRRA2)。ask への回答は次 report の --user-input 経由(既存 ask 契約)。「今後この intent では聞かない」は IntentConfig への書込を**しない**(設定書込は人間の手編集 — 書込機構は W-01 範囲外の新設をしない) |
| stdout/stderr | directive JSON は stdout、注記は stderr(C-08)。既存 next 消費者(tests)への影響は実装時に consumer grep 棚卸し(stderr-addition-consumer-grep) |

## C5: ノルム改定(コードなし)

改定文言は decisions.md ADR-7 に記載。norm PR の受け入れは FR-7 基準。
