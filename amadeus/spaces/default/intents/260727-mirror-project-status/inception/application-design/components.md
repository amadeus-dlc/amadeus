# Components — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

新設モジュールはゼロ(ADR-4)。既存 mirror スタック(architecture.md の16モジュール地図、component-inventory の閉じた台帳)のうち**9モジュールを拡張**し、7モジュールは無変更。requirements の FR 群を各コンポーネントへ割り付ける。team-practices の構造境界(gateway 唯一のプロセス境界・closed schema・canonical 1定義)を全行に適用。

## 変更コンポーネント一覧

| モジュール(既存) | 拡張内容 | 担う FR |
|---|---|---|
| amadeus-mirror-types.ts(C0) | `MirrorProjectRef` / `MirrorProjectStatusNames` / `MirrorProjectSyncEntry`(synced/pending/safety-blocked)/ gateway 新メソッド型 / permit の mutation 種別拡張 | FR-2/3/7 の型面 |
| amadeus-mirror-config.ts(C1) | `mirror-projects` キーの closed-schema 拡張(allowlist / MirrorConfig / MirrorConfigIssue / readFailure の4面一般化)。フェーズ語彙 closed set 検証 | FR-5 |
| amadeus-mirror-policy.ts(C2) | `expectedProjectStatus()` 純関数(ADR-5)+ 既定マッピング定数(FR-3a の表を唯一の canonical 定義として保持) | FR-3a/3c/4、FR-9c |
| amadeus-mirror-gateway.ts(C5) | GraphQL argv 族(`graphqlArgv`)+ body `errors` 解釈層 + 4メソッド(listProjectItems / resolveProjectStatusField / addProjectItem / updateProjectItemStatus)。mutation は permit 必須 | FR-1/2/3/6/7d、FR-10a(negative assert 対象面) |
| amadeus-mirror-executor.ts(C6) | create/sync 内部の Project 同期ステップ(ADR-1): 所属検出 → (未所属×対象なら)追加 → Status 解決(exact match)→ 期待 Status 適用 → projectSync 台帳更新。冪等 reconcile | FR-1a/2/3/6/7、FR-8(判定材料の生成) |
| amadeus-mirror-state-codec.ts | `projectSync` サブオブジェクトの keys/validate/render 3面(ADR-3) | FR-7c |
| amadeus-mirror-state-reducer.ts | projectSync 用 transition(upsert-project-entry / mark-project-pending / mark-project-safety-blocked 相当の3種) | FR-7a/7b |
| amadeus-mirror-lifecycle.ts(C3) | repair status の診断項目拡張(Project drift / 選択肢未解決 / 権限不足 / 部分成功)— expectedProjectStatus を共有消費 | FR-9 |
| amadeus-mirror-presentation.ts(C8) | `MIRROR_USER_CONTRACT` への設定・診断面の追記(scopeExclusions 不変)+ docs 契約の Project 節 | FR-10、FR-12b(docs 契約) |

## 無変更コンポーネント

amadeus-mirror-coordinator.ts(C7 — boundary→operation 解決は不変。ADR-1 により operation union 不変)/ -capability.ts(permit WeakSet 機構不変。型の mutation 種別のみ C0 で拡張)/ -provenance.ts / -repair.ts(challenge 機構)/ -runner.ts(既存 profile 流用)/ -state-store.ts(ports 不変)/ amadeus-mirror.ts(legacy CLI 文法不変)。

注: coordinator は「無変更」だが、executor が返す操作 outcome(pending / safety-blocked)の既存集約経路をそのまま通すため、挙動面の回帰テスト対象には含める(FR-12a)。

## UI/UX 面(design-agent 視点)

本機能は UI を持たない CLI/内部機構であり、ユーザー接点は (i) config.json の記述 (ii) prompt モードの ask 文言(既存の操作単位 ask に内包 — 文言に Project 面の要約を追加) (iii) repair status の診断出力(FR-6c: 期待名 vs 実在選択肢一覧+解決手順への誘導) (iv) docs 4文書。診断文言は verdict 別出力+exit code の既習様式(ui-less-mockups-as-output-contract)に従い、実装時にテスト文言として固定する。

## AWS 面(aws-platform 視点)

該当なし — 本プロジェクトはデプロイ基盤を持たず(project.md § Deployment)、外部依存は GitHub GraphQL API のみ。可用性・rate limit は FR-7 の失敗セマンティクスで吸収する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T06:24:19Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の3指摘(FakeGateway 棚卸し4箇所訂正・NFR-3 per-Project 固定化・ADR-5 シグネチャ統一)は全て実測確認済みで有効、新規矛盾なし

### Findings

- None
