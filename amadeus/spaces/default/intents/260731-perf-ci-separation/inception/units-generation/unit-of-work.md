# Unit of Work — 260731-perf-ci-separation

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md、stories(N/A — user-stories は self-feature の EXECUTE 集合で SKIP。application-design 各成果物と同判断)

設計コンポーネント C-1〜C-7(components.md)を、各 Unit が単独で deployable な Bolt(= 1 PR)になるよう編成する(cid:units-generation:c1)。C-1/C-2/C-5/C-6 は「tier なしの移設は実行不能・移設なしの tier は空実行・coverage 再生成は移設と同一 PR 必須(FR-5b)」の相互拘束があるため、片側だけでは green に着地できず単一 Unit へ統合する。

## U1: perf-tier-and-migration(C-1 + C-2 + C-5 + C-6)

- **内容**: run-tests.ts への perf tier 追加(`--perf`、Level 拡張、main フロー分岐)、perf テストの分割移設(components.md C-2 表の6ファイル)、t258 timeout 250_000 是正(decisions.md ADR-3 の導出式コメント込み)、coverage 整合(TEST_TIERS 追加・registry 再生成・baseline 再カット・allowlist remap)
- **充足 FR**: FR-1(AC-1)、FR-4(AC-4)、FR-5(AC-5)、NFR-1 決定的層、NFR-3(TDD — 新 unit テストの Red→Green 先行)
- **deployable 根拠**: この Unit 単独で「PR CI から perf 偽赤経路が消える」というユーザー価値が出荷される(#1830 経路A/#1835 の blocking 面解消)。ci.yml は無変更のまま green(--ci が perf を自然除外、coverage 3 gate 同一 PR 内整合)
- **規模**: 約 +195 行(C-1 60-90、C-2 120、C-5 10、C-6 5)+ データ再生成
- **検証**: AC-1 実測、AC-5 の全コマンド exit 0、t05 既存契約 green

## U2: perf-workflow(C-3)

- **内容**: `.github/workflows/perf.yml` 新設(cron 47 17 * * * + workflow_dispatch、jobs 3 面、timeout 25/5/5(component-methods.md C-3 表の実測導出)、STEP_SUMMARY、test-size-report artifact、CI-residency 意味論のヘッダ文書化)
- **充足 FR**: FR-2(AC-2)、NFR-2
- **deployable 根拠**: 単独で「daily 性能監視の稼働」という価値が出荷される。ci.yml とは独立(追加のみ)
- **依存**: U1(`--perf` が実体を持つこと)
- **規模**: 約 +120〜150 行
- **検証**: workflow_dispatch 手動実行 green(AC-2 — マージ後の実測。PR 段では yml lint / job 構成の静的検証+ push 後 dispatch)

## U3: ci-slim(C-4)

- **内容**: ci.yml から distribution-benchmark / aggregate / release-gate の3 job 削除(FR-3d 対照表 V-1〜V-8 を照合面とする)
- **充足 FR**: FR-3(AC-3)
- **deployable 根拠**: 単独で「PR あたり 4 job のランナー消費削減」が出荷される
- **依存**: U2(受け皿が main に存在してから外す — component-dependency.md の順序リスク制御)
- **規模**: 約 −70 行
- **検証**: AC-3 grep(対象面 = ci.yml 限定)、ci-success needs 不変の実読、PR CI green

## U4: docs-sync(C-7)

- **内容**: components.md C-7 棚卸し表の ✅ 10ファイル+コード内文書面の更新(Bolt 冒頭で同一キー grep の鮮度再確認)
- **充足 FR**: FR-6(AC-6)、NFR-1 非退行層の実測記録もここで確定
- **依存**: U3(最終形の CI 構成を記述するため)
- **規模**: 約 +30〜60 行(文書)
- **検証**: 対訳同期・参照整合、AC-6 の同一 Bolt 群内更新

## Unit 横断の制約

各 Unit の実行面(トリガー・blocking 区分)は services.md の実行面表に従う。

- 全 Unit で blocking gate(typecheck / lint / dist:check / promote:self:check / test:ci / coverage 3 gate)green を維持(AC-5 は U1 で最重、以後の Unit でも再実行)
- packages/framework/core は無接触(tests/ と .github/ と docs/ のみ)→ dist 再生成は不要見込みだが、drift check は毎 Unit 実行して実測確認する
- 1 Unit = 1 Bolt = 1 PR(org.md Way of Working)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:33:36Z
- **Iteration:** 1
- **Scope decision:** none

4 Unit は C-1〜C-7・FR/NFR を全数カバーし deployable 根拠明記。yaml edge block は parseBoltDag 契約適合・直列非巡回・隠れ依存なし。軽微指摘2件(consumes ヘッダの装飾化・stories N/A 欠落)は conductor が同 iteration 内に是正済み(本文への名指し引用追加+N/A 追記、センサー再発火 PASS)。

### Findings

- [Minor] unit-of-work.md:3 ほか: consumes ヘッダの services/component-methods/decisions が本文で名指し引用されず装飾トークン化(→是正: 本文へ名指し引用を追加)
- [Minor] units-generation 3成果物: stories の N/A 明記が欠落(→是正: N/A 追記)
