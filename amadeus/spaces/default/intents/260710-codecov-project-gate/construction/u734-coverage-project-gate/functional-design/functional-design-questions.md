# Functional Design — 明確化質問(u734-coverage-project-gate)

> 回答方式: チームノルム(cid:requirements-analysis:election-protocol)に従い、エージェント間選挙で回答を確定する。
> 上流: `../../../inception/requirements-analysis/requirements.md` の §8 未解決事項4点を設計判断として確定する。
> refactor スコープのため unit-of-work / application-design は設計上不在(stage 定義 Step 2 準拠)。既存コード構造(codekb)をデファクト設計として扱う。

## Q1. FR-1 emit JSON のパスとスキーマ

- A. `coverage/coverage-totals.json`、スキーマ `{ "schemaVersion": 1, "hits": <int>, "lines": <int> }` の最小形(%は消費側で導出 — NFR-2 の丸め安全を機構化。coverage-dir 配下の生成物として HTML と同居、コミット対象外)(推奨)
- B. istanbul 互換のフルサマリスキーマ(`coverage/coverage-summary.json`)— 消費者が自前ゲート1つの現状には過剰、将来必要になったら拡張
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q2. FR-2 ベースラインファイルのパスとスキーマ

- A. `tests/.coverage-project-baseline.json`、スキーマ `{ "schemaVersion": 1, "hits": <int>, "lines": <int> }`(既存 `tests/.coverage-ratchet.json` と同じ tests/ 直下ドットファイル慣行。整数保持で%は比較時導出)(推奨)
- B. 既存 `tests/.coverage-ratchet.json` に統合 — 既存 ratchet は「クラス別 covered-unit 件数」で意味・所有ツールが異なり(gen-coverage-registry.ts)、統合は両者の責務を濁す
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q3. FR-3/FR-5 判定+再生成コマンドの実装位置

- A. 新設 `tests/coverage-project-gate.ts` 単体に集約: `--check`(CI 用 — emit JSON+ベースラインを実読して判定、失敗は exit 1)と `--update`(ベースライン再生成)。既存 `gen-coverage-registry.ts` の CLI 契約(--check が CI ガード/引数なし系が再生成)と同型。判定ロジックは export 関数にして in-process 単体テスト可能にする(NFR-1 の seam 要件)(推奨)
- B. `tests/run-tests.ts` にフラグ追加 — run-tests は「テスト実行+emit」の単一責務に保ち、判定・ベースライン管理を混ぜない方が既存構造に整合
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q4. FR-7 ドキュメントの掲載先

- A. `docs/reference/09-testing.md` に新節「Project Coverage Gate」を追加(既存 Test Registry ratchet の記述の隣が文脈的に自然)。`.ja.md` ペアも同一 PR で更新(docs は EN/JA ペア・claude 担当のノルム準拠)(推奨)
- B. 新規ページを docs/reference/ に追加 — 1節で足りる分量にページ新設は過剰
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)
