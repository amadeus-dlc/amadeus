# Requirements — 260802-registry-drift-guard

上流入力(consumes 全数): intent-statement、scope-document、team-practices、codekb `business-overview.md` / `architecture.md` / `code-structure.md`、本ステージ Q&A `requirements-analysis-questions.md`、Issue [#2037](https://github.com/amadeus-dlc/amadeus/issues/2037)。

## Intent analysis

CLI の実行可能 verb と診断メッセージの `Valid:` 一覧、および stage schema の受理フィールドと仕様／reference の registry が、変更時に無検知で乖離する欠陥クラスを閉じる。目的は既知の文書欠落を個別に埋めることではなく、実装を正本とする双方向 drift guard を常設し、次回の追加・削除時に CI を確実に赤くすることである。

本 intent は `self-fix` とする。Issue #2037 の narrative な Field reference 本文の全面バックフィルは分離したまま、ガード成立に必要な機械可読 registry、既知の正本矛盾、テスト、CI 配線だけを同時に同期する(Q1=A)。

## Functional requirements

### FR-1: CLI verb registry の双方向一致

- `packages/framework/core/tools/amadeus-state.ts` の実 dispatch `case` 集合を実行正本とする。
- 不正 verb 時に表示する `Valid:` 一覧との集合差を双方向に検出する。dispatch-only と `Valid:`-only のどちらも失敗とする。
- 重複 verb、dispatch／`Valid:` の空抽出、cardinality 不一致を失敗とする。
- `set-construction-iteration`、`archive`、`unarchive` を含む現行33 verbが一致する状態へ是正する。
- 表示順は公開契約にせず、集合一致だけを必須とする。順序変更だけでは失敗させない。

### FR-2: stage schema の受理フィールド集合を正本化

- `packages/framework/core/tools/amadeus-stage-schema.ts` の既存 `REQUIRED_FIELDS` と `OPTIONAL_FIELDS` から、受理する top-level field の readonly 集合をexportする。25件を別の手書き定数として複製しない。
- schema accepted fields と emitter `FIELD_ORDER`、authoritative stage-definition spec の完全表、英日 Field reference の機械可読完全 registry を比較できるようにする。
- 各投影について双方向の集合差、重複、空抽出、cardinality 不一致を失敗とする。
- narrative な詳細 H3 は判断が必要なフィールドの部分集合でよく、25フィールド全件の H3 化は要求しない。
- 英日referenceはフィールド名集合の一致を必須とするが、説明文の逐語一致は要求しない。

### FR-3: 既知の stage field 矛盾を同期

- authoritative spec の完全表を現行 schema の25フィールドへ同期し、少なくとも欠落中の `number`、`name`、`produces_kinds`、`sensors`、`reviewer`、`reviewer_max_iterations`、`bundle`、`when`、`required_sections` を registry に含める。
- `when` はサポート済みフィールドとして扱い、仕様／英日referenceの reserved 記述と stale test 前提を現行 parser・validator・emitter 契約へ合わせる(Q4=A)。
- Issue #2037 が指摘する個別フィールドの narrative 説明追加は、本ガードに不可欠でない限り行わない。

### FR-4: 再利用可能な drift guard seam

- textから CLI dispatch、`Valid:`、spec／reference registry を抽出する pure helper と、期待集合・実集合を比較する pure comparator を用意する。
- comparator は少なくとも missing、unexpected、duplicate、empty extraction、cardinality mismatch を診断可能にする。
- live repository files に対する contract test と、文字列fixtureを改変する negative tamper testを分離する。
- 最低限、dispatch-only追加、phantom `Valid:`、docs omission、empty extraction、duplicate の各tamperが実際に失敗することを固定する。

### FR-5: docs-only 変更からの CI 到達性

- 英日 `docs/reference/15-stage-definition.md` と authoritative spec を変更した場合に、registry guardを含むテスト経路が実行されるよう `scripts/detect-ci-changes.sh` を配線する。
- docs-only差分でガード対象registryを壊したfixture／検証ケースが、テスト省略ではなく失敗へ到達することを確認する。
- 既存 CI workflow を再利用し、新規 workflow を増設しない。

### FR-6: 配布面の同期

- 正本は `packages/framework/core/` と `docs/` に置き、`dist/` や promoted root face を手編集しない。
- core変更後は既存の packaging／promotion経路で7 distと自己導入面を再生成し、既存 drift checks で同期を確認する。

## Non-functional requirements

- **NFR-1 決定性:** guard はnetwork、時刻、外部サービスに依存せず、同一revisionから常に同じ集合差とexit結果を返す。
- **NFR-2 fail-closed:** 抽出結果0件、marker欠落、重複、片方向だけの差分を成功へ丸めない。診断には対象registryと差分名を含める。
- **NFR-3 単一ソース:** productionの受理field集合は既存required／optional配列から導出し、テストやdocsに新しい非検証の手書き正本を作らない。
- **NFR-4 保守性:** pure extractor／comparatorをin-process unit testから直接実行可能にし、CLI spawnだけに依存しない。
- **NFR-5 後方互換:** 有効なCLI verbの挙動、stage frontmatterのparse／emit意味論、既存narrative H3の責務を変更しない。`when` は現行実装のサポート契約を文書へ反映する。
- **NFR-6 品質ゲート:** 新規focused suite `tests/unit/t416-registry-drift-guard.test.ts`、下記の既存5ファイル、lint、typecheck、package drift check、promote-self drift checkをgreenにする。性能・セキュリティ検査は新しいruntime境界や攻撃面がないため追加しない。t416の採番はConstruction着手時に固定base SHAの`tests/`で再確認し、衝突時は改番と全参照同期を行う。

既存回帰baselineの再現コマンド:

```bash
bun test tests/unit/t209-stop-hook-state-verb-carveout.test.ts tests/unit/t248-stage-contract.test.ts tests/unit/t62.test.ts tests/unit/t250-unit-iteration-and-scope-preview.test.ts tests/unit/t258-lifecycle-transaction.test.ts
```

2026-08-02T18:31:20Zに証拠固定した現worktree実測は **174 pass / 0 fail / 298 expect() calls / 5 files**。Reverse Engineering記録の「164 pass / 316 assertions」は対象suiteの短縮名だけで実行コマンドが固定されていなかったため、以後の合否境界には上記フルパス再実測を用いる。

## Acceptance criteria

1. 現行sourceに対して CLI dispatch集合と `Valid:`集合が33件で一致し、欠落・phantom・重複が0件である。
2. schema accepted top-level field、emitter、authoritative spec、英日 machine registry が25件で一致し、欠落・phantom・重複が0件である。
3. `when` がsupportedとして全registryに現れ、reserved前提が残っていない。
4. 5種のnegative tamperがそれぞれ非zero／test failureを実証する。
5. 対象docs-only変更がCI change detectionでregistry guard実行経路へ分類される。
6. 上記フルパス5ファイルが174 pass / 0 failを維持し、新規 `tests/unit/t416-registry-drift-guard.test.ts` がlive一致、5種negative tamper、docs-only change detection routeをgreenで固定する。
7. `bun scripts/package.ts --check` と `bun run promote:self:check` が生成物driftなしを示す。

## Constraints

- Scopeは`self-fix`、DepthはMinimal、Test StrategyはComprehensive(Q1=A)。変更は上記2 registry対と、そのguard成立に必要な文書／CI／テスト面へ限定する。
- Bun-only TypeScript monorepoの既存toolingを使い、新規dependency、service、database、network I/Oを導入しない。
- 既存dirty worktreeの無関係な変更(`.codex/tools/data/stage-graph.json` とplugin関連未追跡資産)を変更・削除・stageしない。
- `dist/` と promoted root face は生成物であり、正本変更後に既存コマンドから再生成する。

## Assumptions

- `amadeus-state.ts` のswitch dispatch集合が実行可能verbの正本であり、`Valid:`はその利用者可視投影である。
- stage schemaのrequired／optional配列が受理fieldの正本であり、emitter・spec・reference registryはその投影である。
- Field referenceの詳細H3は完全registryではなくjudgement-heavy narrativeという現行責務を維持する。
- 既存 `detect-ci-changes.sh` とCI workflowへ最小path配線を追加すれば、別workflowなしでdocs-only到達性を確保できる。

## Traceability

| 要件 | 根拠 | 検証 |
| --- | --- | --- |
| FR-1 | RE: dispatch 33対`Valid:` 30、Q2=A | live集合一致 + dispatch-only／phantom／empty／duplicate tamper |
| FR-2 | RE: schema 25、spec欠落9、Q3=A | schema・emitter・spec・英日registry双方向比較 |
| FR-3 | RE: parser／validator／emitterは`when`を受理、Q4=A | `when` supported parity + stale reserved前提0件 |
| FR-4 | team-practices P2、same-root inventory | pure unit + live contract + negative proof |
| FR-5 | RE: docs-onlyはfull testへ未到達、team-practices CI/CD | change detector route test |
| FR-6 | architecture／code-structureの生成境界 | package／promote drift checks |

## Out of scope

- Issue #2037 の narrative Field reference 本文を全フィールド分追加する文書バックフィル。
- stage frontmatterの新フィールド追加、`when`の削除または意味論変更。
- CLI verbの表示順固定、help system全体の再設計、他の未調査registry対への横展開。
- 新規CI workflow、外部docs linter、外部dependencyの導入。
- 無関係な既存dead code、フォーマット、plugin資産、stage graph生成物の整理。

## Open questions

- なし。Q1〜Q5はすべて推奨案Aでユーザー承認済み。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T18:30:36Z
- **Iteration:** 1
- **Scope decision:** none

スコープ、Q&A整合、Issue #2037の除外、主要FRの閉包は明確だが、品質ゲートの検証対象が特定できないため着工可能な要件になっていない。

### Findings

- NFR-6／Acceptance criterion 6 の「focused tests」「関連既存suite」「164 pass baseline」は対象テストの具体的なファイルまたはコマンドと164件の根拠が示されておらず、開発者もQAも同じ合否境界を再現できないため、検証対象と期待件数の出典を明記すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T18:32:04Z
- **Iteration:** 2
- **Scope decision:** none

前回指摘は具体的なテストパス、再現コマンド、実測baseline、新規focused suite、採番衝突時の扱いまで明確化され、Q&A・consumes・self-fix境界・Issue #2037除外とも整合しているため着工可能です。

### Findings

- None
