# RE Scan Notes — 260716-diary-ensure-exists(Issue #1080)

## 上流入力

Issue #1080(クロスレビュー2名成立 — e4 1人目 09:22Z 訂正2点付き+e2 2人目 09:19Z)、E-1080-FIX 裁定(B = engine ensure-exists、4/4)、codekb `code-structure.md` / `architecture.md`(エンジン tools 面)、`business-overview.md`(非交差 — 本 bugfix はエンジン記録層のみ、参照非該当の根拠は本ファイルの走査範囲どおり)。

## Base 選定と到達可能性(rescan-base-ancestry)

- base = `720b0145b`(直前 re-scan `260716-t224-size-large.md` の observed)— `git merge-base --is-ancestor 720b0145b HEAD` exit 0、距離14(候補中最小。a1c79dc12 は距離601)
- observed = `fb1fe079032`(HEAD 実測)
- 区間14コミットは全て record/audit+t224 テストミラー1件 — **diary 機構面(state/orchestrate/jump/utility/conductor.md/memory-template.md/CLAUDE.md)への変更ゼロ**(git log -- <対象> で実測0件)。#1080 レビュー時の実測がそのまま有効

## フォーカススキャン(diary 生成機構の全数列挙)

### 生成コードの不在(#1080 主張の再確認)

- `amadeus-orchestrate.ts:1162` `memory_path: memoryPathFor(...)` — パス文字列を directive に載せるのみ(:591 定義もパス構築のみ)
- tools/hooks 全域 grep で memory.md 生成コード 0 件(runtime.ts:12 は読み取り側コメント)

### テンプレートと conductor 手順(実在 — e4 訂正①)

- `packages/framework/core/knowledge/amadeus-shared/memory-template.md`(+ dist/self-install 各ツリー)— INVARIANT 単一行コメント様式、t100 ガード
- `packages/framework/core/amadeus-common/conductor.md:62-75(見出し :62、copy 手順 :67、never overwrite :69)`「Keeping the diary」— stage start 時 copy・**Idempotent — never overwrite**・approval 後も残置を conductor 手順として明記

### STAGE_STARTED 発火点の全数列挙(enumeration-completeness、5経路)

1. `amadeus-state.ts:1370` — advance(通常遷移)
2. `amadeus-jump.ts:585` — jump 着地
3. `amadeus-utility.ts:2511/2575/2596` — initialization ブートストラップ3ステージ(workspace-scaffold / workspace detection 0.2 / state init 0.3)
4. `amadeus-utility.ts:2806` — intent-birth の first post-init stage
5. `amadeus-orchestrate.ts:2756` — `--single` 合成 run(spawnAuditAppend)

補足: resume / unpark / scope-change 復旧は STAGE_STARTED を再発火しない経路がある(scope-change-checkbox-recovery 参照)— 発火点フックだけでは網羅できない。

### 単一チョークポイントの候補

`amadeus-orchestrate.ts next` の run-stage directive 発行(:1162 近傍)は、advance/jump/birth/resume/--single の**全経路で conductor が必ず通る**単一点(conductor ループは常に next で始まる)。#1080 修正候補2の原文も「run-stage directive 発行時(または gate-start)」を明記 — gate-start はステージ**末尾**の儀式(承認待ち開始)につき「stage start に生成」の意味論に不適合、directive 発行時が正。

### docs 記述(是正対象の整合面)

- `CLAUDE.md:50` / `.claude/CLAUDE.md:41`「auto-created from a template at stage start」— B 実装後は**そのまま真になる**(文言変更不要の見込み、CG で最終判断)
- `conductor.md:62-75(見出し :62、copy 手順 :67、never overwrite :69)` — copy 手順は「engine が生成する。不在時のみ fallback で copy」へ更新要
- `stage-protocol.md:941`「(created at stage start if absent)」— engine 生成後も後方互換的に真(fallback 記述として維持可)

### テンプレート解決の既習様式

sensor の `memoryTemplatesDir()`(amadeus-sensor.ts:425-431)が「rules resolver+packager emit と同一の MEMORY_SEGMENTS から解決」する既習例 — ensure-exists のテンプレート解決はこれと同源(knowledge/amadeus-shared)だが用途が異なる(sensor のそれは required-sections の床、diary は memory-template.md)。実装時に deriveHarnessDir 系の解決関数を実測選定(fix-diff-independent-reverify — 引用は書いた直後に再実測)。

## 実測時間・環境

2026-07-16T09:36-09:40Z、conductor e4 ツリー(HEAD fb1fe079032)。
