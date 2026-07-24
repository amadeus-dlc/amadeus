# Unit of Work — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## U1: Harness Detector

- **スコープ**: `packages/framework/core/tools/amadeus-lib.ts` への追加
- **成果物**:
  - `HarnessType` 型(7値判別ユニオン、component-methods.md 準拠)
  - `HARNESS_DIR_TO_TYPE` 定数(`KNOWN_HARNESS_DIRS` と 1:1、`amadeus-lib.ts:158` から導出)
  - `detectHarnessType(): HarnessType` 関数(FR-1 AC-1d override → FR-2 CLAUDECODE → FR-3 `harnessDir()` dot-dir → unknown)
  - 単体テスト(in-process seam、`tests/unit/` — cid:bun-coverage-spawn-blindspot 回避のため関数直接呼出)
- **推定規模**: 型5行+定数8行+関数15行+テスト40行 ≈ **68行**
- **対応 FR**: FR-1(型)、FR-2、FR-3、FR-1 AC-1d(env override)
- **再利用インベントリ**: 既存 `harnessDir()`(`:187-193`)・`KNOWN_HARNESS_DIRS`(`:158`)・`isHarnessDirName()`(`:164-166`)を再利用。新規機構は検出関数・型・マッピング定数のみ
- **依存**: なし(既存 `amadeus-lib.ts` シンボルのみ)

## U2: Harness Recorder

- **スコープ**: `packages/framework/core/tools/amadeus-utility.ts`(`handleIntentBirthStateBuild()`)への埋込 + docs 反映 + dist 再生成
- **成果物**:
  - `stateContent` テンプレート(`:4092-4144`)の Project Information ブロック(`:4094-4103`)へ `- **Harness**: ${detectHarnessType()}` 行を追加
  - `docs/reference/` の環境変数一覧へ `AMADEUS_HARNESS_TYPE` を追記(ADR-2、ユーザー可視契約)
  - 統合テスト(`tests/integration/` — 実 FS で intent birth し state.md の Harness フィールドを検証。cid:fs-tests-integration-first)
  - `bun scripts/package.ts` + `bun run promote:self` で全 dist/self-install ツリーへ再生成(Mandated)
- **推定規模**: 埋込1行+import1行+docs 10行+統合テスト35行 ≈ **47行**(dist 再生成分は生成物のため除く)
- **対応 FR**: FR-1(state.md 記録)、FR-4(memory.md は非構造的 = テンプレート不変を維持)、ADR-2(docs)
- **再利用インベントリ**: 既存 `handleIntentBirthStateBuild()`・`stateContent` テンプレート・`getField`(検証用、`:4808`)を再利用。新規機構なし(既存テンプレートへの1行追加)
- **依存**: U1(`detectHarnessType()` を呼ぶ)

## サービス層について(services.md 参照)

application-design の services.md は「N/A(独立サービス)— 同一プロセス内の同期呼出のみ」と結論している。したがって本ユニット分割でもマイクロサービス境界・非同期通信を単位とする分割はなく、U1→U2 は同一プロセス内の関数呼出契約(`detectHarnessType()`)で連結される。services.md の唯一の内部呼出関係(`handleIntentBirthStateBuild → detectHarnessType`)がそのまま U2→U1 の依存として本ユニット分割に反映されている。

## 規模合計

U1(68行)+ U2(47行)≈ **115行**(正本分、dist 生成物除く)。decisions.md ADR-4 の「数十行の内部スキーマ拡張」と整合。

## Walking Skeleton 注記

本 intent は既存コードベースへのインクリメンタルな feature 追加(新パッケージ・新配布経路なし)。org.md の Walking Skeleton 規定では greenfield 要素を含まないため、skeleton ceremony の要否は delivery-planning の skeleton-gate 分類で確定する(本ステージでは実装順序・critical path を決めない — stage 2.8 の責務)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T12:57:44Z
- **Iteration:** 1
- **Scope decision:** none

ユニット分割・依存DAG・規模見積り・reuse inventory・2.7/2.8境界遵守は良好だが、consumes の services.md が4成果物すべてで本文未参照の装飾トークンになっており(artifact-upstream-inputs-header 禁止パターン)、story-map の AC-1d 転記漏れもあるため差し戻す。

### Findings

- [Major] 4成果物の上流入力行が services.md を列挙するが本文で0参照(装飾トークン)。本設計にはサービス層が存在しないため、各成果物に「services.md=サービス層N/A」の実参照文を明記する(services.md 自体が既にN/A宣言している内容を引用)。
- [Minor] unit-of-work-story-map.md:11 の U1 検証AC列がAC-1dを欠く(FR列には記載あり)。AC-1dを検証AC列へ追記。
- [参考] ユニット境界・依存DAG・ファイル交差判定・規模見積り・reuse inventory・先行着地禁止遵守は妥当。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T13:00:08Z
- **Iteration:** 2
- **Scope decision:** none

是正版4成果物すべてでservices.mdへの実参照が本文に追加され装飾トークン解消。参照内容はservices.mdの実内容と整合。story-map:11のU1検証AC列にAC-1dも追記済み。新たな矛盾なし。

### Findings

- [解消確認] 4成果物すべてでservices.md実参照(サービス層N/A・唯一の内部呼出関係のU1→U2依存への写像)を追加、装飾トークン解消。
- [解消確認] story-map:11のU1検証AC列にAC-1d追記、requirements.md AC-1dと整合。
