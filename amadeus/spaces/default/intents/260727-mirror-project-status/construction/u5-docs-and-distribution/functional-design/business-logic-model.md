# Business Logic Model — u5-docs-and-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U5 は unit-of-work の定義どおり、ドキュメント整備(FR-10b/FR-12b)・配布同期(FR-12b)・テスト完備の検収(FR-12a/12c)で intent を完結させる。story-map ジャーニー5(「配布先の別チームでも、ドキュメントを読めば同じ運用を再現できる」)を成立させる。コードの新規ロジックは持たず、components の C8(amadeus-mirror-presentation.ts — docs 契約面)と閉じた台帳群の同期が対象。文言・契約の正本は component-methods の C8 記載、認証・プロセス境界の記述内容は services を正とする。

## ドキュメント更新フロー(FR-10b — 受入条件15)

1. 既存 mirror docs 4文書体系(実測: docs/guide/22-intent-mirror.md + .ja.md、docs/reference/20-intent-mirror.md + .ja.md — en/ja 対訳ペア×2)へ、本 intent の Project 同期面を追記する:
   - **設定節**: `mirror-projects` の記述(U4 完全形 — 配列・`status-names` 上書き・層全置換の利用者向け説明)。
   - **認証節**: ProjectV2 の読取・更新に必要な `project` scope(services の認証節を正とし、token は gh credential store 委譲・自動 scope 変更なしの旨を含む)。
   - **運用・診断節**: repair status の Project 診断項目(drift / field-missing / option-missing+実在選択肢一覧 / permission-denied / 部分成功 — component-methods C3 の resolution 4値全数+台帳面)と解決手順への誘導、gh サブプロセス境界・障害時挙動(services のプロセス境界・外部依存表を反映)。
2. en/ja は対訳同期で同一変更に含める(docs-language-ownership — 片側だけの更新を残さない)。
3. docs contract の parity(t291-mirror-docs-parity.integration.test.ts — 実測実在)と TOPICS 台帳を文書追記と同一変更で同期する(FR-12b の閉じた台帳規約)。

## 配布同期フロー(FR-12b — 受入条件17)

1. 正本(packages/framework/core)の全変更(U1〜U4 の実装+C8 追記)を `bun scripts/package.ts` で dist 7ハーネス全面(claude, codex, cursor, opencode, kimi, kiro, kiro-ide — bt-dist-regen-seven-harnesses)へ再生成し、`bun run promote:self` でセルフインストールツリーへ反映する。
2. drift guard(`bun run dist:check` / `bun run promote:self:check`)の green を機械確認する。
3. 閉じた台帳の同期検収: ADR-4 により新設モジュールはゼロ(components の「9モジュール拡張・新設なし」)のため `MIRROR_TOOL_FILES`(実装直読: packages/framework/harness/projections.ts:22)と t285 件数(t285-mirror-projection-registry.test.ts — 実測実在)は**不変であることを確認**する(変化があれば設計逸脱のシグナル)。`MIRROR_USER_CONTRACT`(実装直読: amadeus-mirror-presentation.ts:16)は設定キー・診断項目の追記面のみ変化し、`scopeExclusions`(:127 = pull-request/release/deploy/daemon/polling)は不変を parity テストで維持する(FR-10a の negative assert 面)。

## 検収フロー(FR-12a/12c — 受入条件16)

1. 各 Unit で並行作成済みのテスト(gateway=fake runner+実 gh envelope の od -c golden / executor・coordinator=FakeGateway 4箇所 t279/t282/t284/t300+t280 手動確認 / lifecycle=runtime 注入 — requirements FR-12a の既習様式)の**完備確認**を行う。U5 での後追い作成ではない(unit-of-work の分割不変条件)。
2. 全体検証: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / coverage ゲート(local-lcov-pre-push)を実行し exit code を記録する。
3. 新設ガード・検査(該当分)は「落ちる実証」+「正当データで赤くならない」の両側実測を完成条件とする(FR-12c — org.md Mandated)。

<!-- Text fallback: U5 は docs 4文書(en/ja×2)への設定・認証・診断節の追記 → TOPICS/t291 parity 同期 → dist 7面再生成+drift guard → 台帳不変の検収(MIRROR_TOOL_FILES/t285)と USER_CONTRACT 追記 → 全テスト・coverage の検収、の直線フロー。 -->

## エラー・エッジケース

- drift guard 赤: 正本と生成物の不整合 — 正本を修正して再生成(dist 手編集の禁止 — project.md Forbidden)。
- parity テスト赤: docs と契約台帳の不一致 — 文書・台帳を同一コミットで揃える(shared-ledger 系の定型)。
- 受入検収で他 Unit のテスト欠落を発見: U5 で代作せず、当該 Unit の欠落として可視化し conductor へ報告する(検収の責務分離)。

## 検証面

- 受入条件15: 認証節が4文書すべてに存在し docs contract(t291 parity)を通過。
- 受入条件16: 検証コマンド群の exit code 0 を実測記録(numbers-from-command-output-only — 見込み記載禁止)。
- 受入条件17: dist:check / promote:self:check green、7ハーネス全面の再生成を対象に含める。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:30:08Z
- **Iteration:** 1
- **Scope decision:** none

FR-10b/FR-12a/12b/12c・受入条件15/16/17 は U5 定義へ全数写像、U1〜U4 責務との重複なし、file:line 引用は全実測一致。Minor 2件(診断項目列の field-missing 欠落・閉じた台帳4項目中 docs TOPICS の行欠落)は conductor が受理前に是正しセンサー再 PASSED。

### Findings

- [Minor] business-logic-model.md 運用・診断節の診断項目列に resolution 4値のうち field-missing が欠落(FR-9a (iii) の docs 反映ギャップ — 是正済み: 4値全数へ追記)
- [Minor] domain-entities.md の契約構造テーブルに FR-12b 閉じた台帳4項目のうち docs TOPICS の独立行が欠落(内部不整合 — 是正済み: TOPICS 行を追加)
