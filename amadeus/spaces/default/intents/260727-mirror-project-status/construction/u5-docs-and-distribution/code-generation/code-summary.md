# Code Summary — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

## 実装概要

U5 = docs 整備+配布同期+テスト完備検収で intent を完結(FR-10b, FR-12 — 受入条件 15/16/17)。Bolt ブランチ `bolt/u5-docs-and-distribution`(bolt/u4 fd1b8a657 に stacked)、コミット: 45a09c9a0(19ファイル)。builder サブエージェント実装、conductor 検分済み。新規コードロジックなし。

## 変更ファイル(測定 ref = bolt/u5 HEAD 45a09c9a0)

- `packages/framework/core/tools/amadeus-mirror-presentation.ts` — `MIRROR_USER_CONTRACT` へ projectConfig / projectAuth / projectDiagnostics 追加(C8)。scopeExclusions(:127 = pull-request/release/deploy/daemon/polling)不変(BR-U5-5)
- `scripts/mirror-docs-contract.ts` — TOPICS 台帳へ projects / auth / diagnostics 追加、expected 写像を contract から導出、完了メッセージ count-free 化
- `tests/integration/t287-mirror-docs-contract.integration.test.ts` — テスト名の固定件数を count-free 表現へ
- docs 4文書(en/ja 対訳同一変更・新文書なし — BR-U5-1): guide/22-intent-mirror.md(+.ja)= mirror-projects 設定・`project` scope 認証・診断の利用者向け3節 / reference/20-intent-mirror.md(+.ja)= 同3面の契約水準(parse 拒否規則・層解決・診断行全フィールド・ledger 3状態)。記述は config/lifecycle/types 実装の実文と突き合わせ済み
- 生成物: dist 7面+self-install 5ツリー(package.ts / promote:self 再生成のみ)

## 検収結果

- **台帳不変(BR-U5-4)**: MIRROR_TOOL_FILES(projections.ts)16件不変(git diff --exit-code = 0)、t285 件数 assert 未変更 green — 設計逸脱シグナルなし
- **テスト完備(BR-U5-6、代作なし)**: U1〜U4 分 7ファイル(t343〜t349)160 pass / 0 fail、台帳・parity 分(t285/t291/t287/t292)15 pass / 0 fail — 欠落なし
- **落ちる実証(FR-12c)**: reference ja の diagnostics contract へ mutatesRemote false→true 注入 → contract mismatch exit 1 実測 → 即 revert → exit 0 復帰(注入残存なしを diff で確認)。正当データ側は 4文書×11 topics 全数 PASS

## 検証(実測 exit code)

typecheck=0 / lint=0(warnings は既存ベースライン)/ dist:check=0 / promote:self:check=0 / complexity-gate --check=0 / mirror-docs-contract=0(OK 4 documents, 44 topics)/ run-tests --ci=1(617 files / 8528 assertions、赤は t132 のみ = #1594 既存赤 — assertion 実文 :141 DOC_TOTAL_WORD undefined / :158 NaN、hooks docs 由来で本 diff 非交差)

## トレーサビリティ

FR-10b, FR-12 — 受入条件 15, 16, 17。バージョン・バッジ・リリースノート不変(BR-U5-7)。逸脱・欠落なし。
