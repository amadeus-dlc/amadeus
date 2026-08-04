# Units Generation: Unit 依存 DAG

`unit-of-work.md` の 6 unit 間の依存 topology を記述する。本書は **topology のみ**を扱い、実装順序の推奨・critical path の特定は行わない（それは Stage 2.8 Delivery Planning の経済判断）。根拠は `inception/application-design/component-dependency.md` の依存マトリクスと `components.md` / `component-methods.md` / `services.md` / `decisions.md` の契約、および `inception/requirements-analysis/requirements.md` の受け入れ境界である。`stories.md` は user-stories SKIP により存在しない（対応は story-map 側で FR/AC 単位）。

## 依存 DAG（機械可読）

```yaml
units:
  - name: tla-evidence-foundation
    kind: library
    depends_on: []
  - name: applicability-hold
    kind: library
    depends_on: [tla-evidence-foundation]
  - name: authoring-referees
    kind: library
    depends_on: [tla-evidence-foundation]
  - name: registration-committer
    kind: library
    depends_on: [tla-evidence-foundation, authoring-referees]
  - name: authoring-stage-e2e
    kind: spec
    depends_on: [applicability-hold, authoring-referees, registration-committer]
  - name: import-closure-guard
    kind: packaging
    depends_on: []
```

テキスト代替: tla-evidence-foundation と import-closure-guard が根（依存なし）。applicability-hold と authoring-referees は tla-evidence-foundation に依存。registration-committer は tla-evidence-foundation と authoring-referees に依存。authoring-stage-e2e は applicability-hold・authoring-referees・registration-committer の 3 つに依存する。循環はない。

## 依存の根拠

| 辺 | 根拠 |
|---|---|
| applicability-hold → tla-evidence-foundation | C1 の receipt 永続化は C4（terminal route receipt）へ委譲、C9 の evidence 読取は C4 の verify/read 契約（component-methods.md § C1/C9） |
| authoring-referees → tla-evidence-foundation | C3/C5 の入力 identity 型（StableId、AggregateDigest）と proof/trace receipt の schema は U1 が所有（components.md § C2/C4） |
| registration-committer → tla-evidence-foundation | C6 は VerifiedBundle（C4 verify の出力）を前提に atomic replace する（decisions.md ADR-3） |
| registration-committer → authoring-referees | C6 の前提検査は CoverageProof / ProofEvidence 型（U3 所有）を消費する（component-methods.md § C6） |
| authoring-stage-e2e → 上記 3 unit | C7 stage は C1〜C6 の全 CLI を束ね、E2E は全経路（判定→authoring→proof→登録→既存 executor）を実測する（FR-012） |
| import-closure-guard → （なし） | C8 は build 基盤のみで実行時 value chain から独立（component-dependency.md「C8 の独立性」） |

## 統合点と契約

- **CLI 契約**: 全 unit 間の実行時統合は `tla-authoring.ts` のサブコマンド（identity / bundle / applicability / hold / trace / proof / commit）の JSON stdout + exit code 契約に集約する（services.md § 通信契約）。
- **ファイル契約**: evidence store（`specs/tla-evidence/`、書き手 U1=C4 のみ）、`model-map.json`（書き手 U4=C6 のみ）、plugin.json manifest（U2 の advisory code 宣言 + U6 の修復が同一ファイルに触れる — 唯一のファイル重複。加算的な別セクションであり衝突しない）。
- **engine 契約**: U2 の advisory 結線は既存 checkpoint 機構（stage-protocol §11a）への供給のみで、engine 側の変更を要しない（decisions.md ADR-6。前提の実読確認は U2 functional-design 冒頭）。
- **既存 executor 契約**: U3 → 既存 TLC toolchain は child process、U4 → 既存 `formal-model-check` stage へは model-map 経由の handoff のみ（FR-013 の保護境界に変更辺なし）。

## 並行開発の機会

依存のない unit 集合（複数の妥当な topological order が存在する。順序の選択は 2.8 が行う）:

- `import-closure-guard` は全 unit と独立 — 任意の時点で並行可能。
- `tla-evidence-foundation` 完了後、`applicability-hold` と `authoring-referees` は相互独立 — 並行可能。
- `registration-committer` は `authoring-referees` 完了を要するが `applicability-hold` とは独立 — 並行可能。

（Q2 の人間回答「A. 許容する」に基づき並行機会を明記。Construction の swarm 並行実装は team.md の parallel-bolts 既定に委ねる。）

## 上流トレーサビリティ

- `inception/application-design/component-dependency.md`（component 間依存の正本）、`components.md`、`component-methods.md`、`services.md`、`decisions.md`
- `inception/requirements-analysis/requirements.md`
- `inception/units-generation/units-generation-questions.md`（Q1、Q2）
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`
