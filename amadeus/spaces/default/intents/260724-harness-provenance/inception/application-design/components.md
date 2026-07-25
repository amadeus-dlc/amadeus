# Components — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

## 設計概要

requirements.md の FR-1〜FR-3(選挙 E-HPFR3 裁定反映)を、architecture.md の RE 実測(`amadeus-lib.ts` の既存ハーネス検出・フィールド操作ヘルパー、`amadeus-utility.ts` の state 生成)に基づき、既存モジュールへの最小限の追加で実現する。新規コンポーネント(クラス・モジュール)は追加せず、既存ファイルへ関数・定数を追加する方針(team-practices.md の Way of Working: `packages/framework/core/` を編集元とする、cid:code-generation:harness-tools-placement で harness 専用ツールの新設を避ける)。

## Component 1: Harness Detector(`amadeus-lib.ts` への追加)

- **配置**: `packages/framework/core/tools/amadeus-lib.ts`(既存 `harnessDir()` `:187-193`・内部 `deriveHarnessDir()` `:168-183`・`KNOWN_HARNESS_DIRS` `:158` と同じ core 中立層)
- **責務**: 実行中の AI ハーネス種別を検出し、判別ユニオン `HarnessType`(7値、`manual` を含む)を返す
- **内部設計**:
  - `HarnessDirResolution = { dir: string; source: "env" | "script-path" | "cwd-probe" | "fallback" }`: dot-dirだけでなく検出元を保持する
  - `resolveHarnessDir(): HarnessDirResolution`: `AMADEUS_HARNESS_DIR`をcall-timeで優先し、既存`deriveHarnessDir()`のscript-path/CWD/fallback ladderをprovenance付きで返す。`source=fallback`と実検出された`.claude`を区別する
- **公開 API**:
  - `HARNESS_DIR_TO_TYPE`(定数): Issue #1452の記録対象を定めるcanonicalなdot-dir → harness typeマッピング(`.claude`→`claude-code`、`.codex`→`codex`、`.cursor`→`cursor`、`.opencode`→`opencode`、`.kiro`→`kiro`)。`KNOWN_HARNESS_DIRS`はCWD probe候補順であり、この型集合のsource of truthにはしない
  - `harnessDir(): string`(既存): 戻り値・env優先・キャッシュ挙動を維持し、内部で`resolveHarnessDir().dir`を返す
  - `detectHarnessType(): HarnessType`(新設): `AMADEUS_HARNESS_TYPE` env override があれば最優先(FR-1 AC-1d、`manual` 含む。不正値は`unknown`)。次に FR-2(`process.env.CLAUDECODE === "1"` → `claude-code`)、次に `resolveHarnessDir()` の `source` を確認し、`fallback`なら`unknown`、それ以外はdot-dirを`HARNESS_DIR_TO_TYPE`へ写像する
- **境界**: 検出のみ。state.md への書込は行わない(Harness Recorder が担う)。stories.md の利用シナリオ「実行中のハーネス種別が自動記録されてほしい」の「検出」部分を担当
- **AC-3d不変条件**: 通常のintent birthは全6 harness manifestが投影する`<dot-dir>/tools/amadeus-utility.ts`から同階層の`amadeus-lib.ts`を読むため、明示env overrideがなければscript-pathで必ず解決する。したがって通常birthはCWD probeへ到達しない(Kiro CLI/Kiro IDEは同じ`.kiro`を共有)

## Component 2: Harness Recorder(`amadeus-utility.ts` への追加)

- **配置**: `packages/framework/core/tools/amadeus-utility.ts` の `handleIntentBirthStateBuild()`(`:3926`、`stateContent` テンプレート `:4092-4144`)
- **責務**: intent birth 時に `detectHarnessType()` の結果を state.md の Project Information ブロックへ埋め込む
- **公開 API**: 既存の `handleIntentBirthStateBuild()` を変更(新規公開関数は追加しない)。`stateContent` テンプレートの Project Information ブロック(`:4094-4103`)へ `- **Harness**: ${detectHarnessType()}` 行を追加
- **境界**: state.md 生成時のみ。component-inventory.md の既存 state 生成フローに沿う。stories.md の「自動記録」部分を担当

## Component 3: Field Reuse(既存ヘルパー、追加なし)

- **配置**: `amadeus-lib.ts` の既存 `getField`/`setField`/`setOrInsertField`(`:4808-4905`)
- **責務**: `Harness` フィールドの読み書き(FR-1 AC-1c)。新規実装は不要 — 既存の scalar フィールドヘルパーをそのまま再利用(team-practices.md の Decided: scalar は `getField`/`setOrInsertField` で十分、新規 Result パーサ不要)
- **境界**: 既存 API の再利用のみ

## Historical Review — Iteration 1 (provenance是正前)

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T12:44:25Z
- **Iteration:** 1
- **Scope decision:** none

依存関係・consumes整合・新設vs再利用判定・循環依存は正しいが、detectHarnessType()の中核仕様に2件のMajor欠陥(AC-3bを満たせない誤file:line引用、HarnessType型定義と本文・FR-1の直接矛盾)があり差し戻す。

### Findings

- [Major] component-methods.md:36/component-dependency.md:15 が deriveHarnessDir() の実装を amadeus-lib.ts:187-193 と引用するが、実際そこは export ラッパー harnessDir()(AMADEUS_HARNESS_DIR を読む)。本物の deriveHarnessDir() は :168-183 で AMADEUS_HARNESS_DIR を読まない。AC-3b(env override 尊重)を満たすには harnessDir() を呼ぶ必要があり、全設計ファイルの関数名・引用を統一すべき。
- [Major] component-methods.md:10-13 の HarnessType 型が manual を含まない6値なのに本文:13は「manualを含める」と矛盾。FR-1(requirements.md:17)は7値(manual含む)。型でmanualを表現できず parse-dont-validate に反する。型にmanualを含めるか、検出結果型とstateフィールド値型を意図的に分離して明示すべき。
- [Minor] 各ADRのAlternatives Rejectedが1件のみ(stage fileの「唯一実行可能案なら省略可」に照らし実質逸脱ではないが、一言明示推奨)。
- [参考] 循環依存の主張・新設vs再利用判定・その他file:line引用は実在・意味論一致で正しい。

## Historical Review — Iteration 2 (provenance是正前)

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T12:48:31Z
- **Iteration:** 2
- **Scope decision:** none

是正後の設計を再検証。(1) harnessDir/deriveHarnessDir取り違えは全設計ファイルで解消し実ファイルと一致。(2) HarnessType型は7値へ拡張されFR-1と1:1一致、detectHarnessTypeの非対称も明記。新たな矛盾なし、キャッシュ意味論もbirth時1回呼出で問題なし。

### Findings

- [解消確認] harnessDir()(:187-193 exportラッパー、env override優先)/deriveHarnessDir()(:168-183 内部)の使い分けを全設計ファイルで統一。
- [解消確認] HarnessType型を7値(manual含む)へ拡張、FR-1と1:1一致、detectHarnessTypeの6値/7値非対称を明記。
- [参考] キャッシュ_harnessDirはenvをキャッシュ判定より先に読むためbirth時1回呼出で問題なし。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T17:35:14Z
- **Iteration:** 1
- **Scope decision:** none

resolver抽出はharnessDir互換性と非循環依存を保ち、AC-3b/3cを実装可能にするが、AC-3dの必須確認を別の緩和策へ無申告で置換している。

### Findings

- [Major] requirements.md:38 のAC-3dは、intent birthの呼出文脈でscript-path解決が常に成立しCWD probeへ到達しないことをdesign段階で確認するよう要求するが、component-methods.md:68はCWD由来を観測可能にしてmanual override可能とするだけで、到達不能性を確認していない。要件どおり呼出文脈を立証するか、CWD probe到達を許容する要件変更を承認系譜付きで明記する必要がある。
- [Minor] component-methods.md:27-36はHARNESS_DIR_TO_TYPEを手書きしているのに「KNOWN_HARNESS_DIRSからcanonicalな1定義として導出」と記述し、architecture.md:39の「KNOWN_HARNESS_DIRSは存在ハーネスのsource of truthではない」という実測注意も未解決である。型で全要素対応を強制する導出方法または別の正準定義を明記しないと、将来の追加時にharnessDirとtype検出がドリフトする。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T17:40:26Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件は解消され、通常intent birthでCWD probeへ到達しない根拠と検証境界が明示され、canonical mappingもKNOWN_HARNESS_DIRSから責務分離されており、harnessDir互換性・上流要件・非循環依存・成果物間整合を満たす。

### Findings

- None
