# Requirements Analysis Questions — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, business-overview.md, architecture.md, code-structure.md, team-practices.md

## 承認系譜(cid:requirements-analysis:approval-lineage-citation)

本 requirements は、以下の裁定系譜を前提とする:
1. scope-document.md In Scope #2「各ステージ memory.md への同フィールド追加(フロントマター相当の箇所)」(scope-definition ステージ承認済み)
2. reverse-engineering(Developer scan)の実測: stage memory.md は `memory-template.md` のバイトコピーのみで YAML フロントマター等の構造を持たず、`tests/unit/t100-memory-template-lifecycle.test.ts` が「見出し正確に4つ」「total=0」を固定 — memory.md への新規H2見出し・YAML化はこのテストを破壊する
3. 上記の技術的制約に基づき、e5 が「state.md 優先、memory.md は非構造的な追記(既存4見出しのいずれかへの1行のみ、新規見出し・YAML化はしない)」への具体化を提案し、cid:implementation-deviation-election に基づき leader へエスカレーション
4. ユーザー承認(2026-07-24T11:53:04Z、leader 経由): 上記方針で進めることを承認

以下の質問はこの承認系譜を前提知識として反映済みであり、新規の価値判断を含まない(cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T11:53:50Z))。

## Q1. state.md への記録フィールドの形状は?

[Answer]: A

- A. `amadeus-state.md` の `## Project Information` ブロック(`amadeus-utility.ts:4094-4103`)へ `- **Harness**: <type>` 形式のフィールドを追加する。書込は intent birth 時(`handleIntentBirthStateBuild()`)のみ。既存の `getField`/`setField`/`setOrInsertField`(`amadeus-lib.ts:4808-4905`)を再利用する
- X. Other

## Q2. 検出方法の優先順位は?

[Answer]: A

- A. 既存の `deriveHarnessDir()`(`amadeus-lib.ts:168-183`)が解決する実行ハーネスの dot-dir(`.claude`/`.codex`/`.cursor`/`.opencode`/`.kiro`)を harness type へマッピングする。`AMADEUS_HARNESS_DIR` env override は既存機構をそのまま尊重する。マッピング不能(未知の dot-dir、フォールバック `.claude` 使用時の不確実性)の場合は `unknown` を記録する
- X. Other

## Q3. stage memory.md への記録は?

[Answer]: A

- A. 承認系譜のとおり、state.md 優先とし、memory.md への記録は非構造的(既存4見出しのいずれか — 例えば実行時の Interpretations 見出し — への通常のエントリ1行として、ハーネス種別を本文に含める)に限定する。新規見出し・YAML フロントマターは追加しない。`ensureStageDiary()` のテンプレートコピー自体は変更しない(コピー後のエントリ追記処理側でハーネス種別を文言に含める)
- X. Other

## Q4. 監査シャードイベントへの付記は?

[Answer]: A

- A. Out of Scope(scope-document.md のとおり比較検討のみに留め、本 intent では実装しない — 既存の `HUMAN_TURN`/`SENSOR_PASSED` 等のイベント種別を拡張する変更は影響範囲が広く、別 Issue へ切り出す)
- X. Other

## Q5. 既存 intent への遡及適用は?

[Answer]: A

- A. Out of Scope(Issue #1452 明記のとおり、既存 record に情報が残っていないため技術的に不可能)
- X. Other
