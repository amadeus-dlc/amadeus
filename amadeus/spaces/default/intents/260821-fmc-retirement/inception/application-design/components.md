# Components — 260821-fmc-retirement(削除アーキテクチャ)

上流入力: `inception/requirements-analysis/requirements.md`(FR-DEL/TEST/CI/DOC/NORM/ISS、NFR-1〜4)、codekb `architecture.md`・`component-inventory.md` の 260821 節(census 一次記録 = `re-scans/260821-fmc-retirement.md`)。

## 変更マップ(3 区分)

### 1. 削除コンポーネント(実測規模)

| コンポーネント | ファイル/行 | 対応 FR |
|---|---|---|
| `plugins/formal-model-check/` 全体(tools 3 群 + stages 2 + sensor + docs + plugin.json) | 43 / 16,881 | FR-DEL-1 |
| `specs/tla/`(14)+ `specs/tla-evidence/`(7) | 21 / 1,686 | FR-DEL-2 |
| テスト class A1(FMC 本体が subject。`tests/formal-verif/` 16 件含む) | 92 / 約 24,000 | FR-TEST-1 |
| テスト A2 のうち activation 固有 4 件(§component-methods の個別判定表) | 4 | FR-TEST-2 |
| ci.yml FMC job(`:765-870` + needs `:905` + require_result `:989`) | 約 108 行 | FR-CI-1 |
| mise.toml JDK ピン + 説明コメント | 約 12 行 | FR-CI-3 |
| docs 全面削除 4(reference/21・22 の対訳ペア) | 4 | FR-DOC-1 |

### 2. 新設コンポーネント(実装+配線を同一 intent で完結 — 先行着地禁止 N3 適合)

| コンポーネント | 見積(行) | 目的 | 対応 FR |
|---|---|---|---|
| 合成 test-fixture プラグイン `tests/fixtures/conformance-fixture-plugin/` | 120〜180(plugin.json 40 + stage 1 本 50 + sensor manifest 20 + tool 1 本 20 + advisories 宣言 15) | t341/B1 16 件と A2 温存 4 件の fixture 供給(FMC 実ディレクトリの代替) | FR-TEST-2/3 |
| 代替 targeted テスト 2 本(`function:PluginStageError` / `amadeus-log advisory-decision` — O-5 の被覆回復) | 120〜200 | Project Coverage Gate 維持。3 unit 目 `function:advisoryLatchDir` は温存 t381 が引き続き覆う(代替不要 — §component-methods) | FR-TEST-6 |
| docs 休眠明記 1 文(中立表現 — リテラル禁止語彙不使用) | 3〜5 | advisory 機構の休眠事実の記録 | FR-DOC-2 |

**reuse inventory**: 既存 CI ジョブ・テストランナー・packager(discover ベース)・runner-gen・coverage regen ツールをそのまま使う。新規機構・新規 CI ジョブは導入しない(合成 fixture はデータであり機構ではない)。

### 3. 変更コンポーネント

| コンポーネント | 変更内容 | 対応 FR |
|---|---|---|
| `amadeus/config.json` | activation.names 1 要素 + scope-bindings 1 ブロック除去 | FR-DEL-3 |
| テスト B1 = 16 件 | fixture パスを合成プラグインへ差し替え(assertion 削除 0) | FR-TEST-3 |
| テスト B2 = 45 件(編集不要 1 件 = t-formal-model-plugin-boundary を除く 44 件) | 文字列・パス・fixture セルの除去/張り替え | FR-TEST-4 |
| `scripts/detect-ci-changes.sh` | risk 3 パターン中 FMC 由来 2 除去 | FR-CI-2 |
| `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md:139-140` + `amadeus-lib.ts:1548` コメント + t2415 ×2(pin テスト) | specs/tla 非除外宣言の削除(正本+テスト同一変更 — 同意述語ドリフト防止) | FR-DOC-3 / FR-TEST-4 |
| docs 部分除去 16 + 索引 4 | FMC 記述除去・張り替え | FR-DOC-1 |
| 生成台帳: coverage-registry regen / patch-allowlist 該当エントリ除去 / runner-gen write | build 後に再生成 | FR-TEST-5 / FR-DEL-4 |

## 非接触(明示)

`plugins/github-pr-convergence/`(#3382 別エージェント — RE 実測で逆参照 0)/ コア advisory 機構(`amadeus-advisory-choice.ts` / `amadeus-advisory-declaration.ts` — O-1 裁定で温存)/ `specs/rfc/` 4 件 / エンジン(`amadeus-orchestrate.ts` 等 — ハードコード 0 件実測済みのため削除起因の変更なし)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T04:13:16Z
- **Iteration:** 1
- **Scope decision:** none

READY: 孤児 FR 0・設計間矛盾なし・危険逆順の見落としなし。FOLLOW-UP 3(FR-NORM-1 の設計非対称 / 166 vs 161 の照合 / ADR-5・6 の様式)+ NIT 2 は後段で閉包

### Findings

- FOLLOW-UP | FR-NORM-1 の専用設計記述が services.md に不在(実装可能だが FR-ISS-1 と非対称)— code-generation 成果物で閉包
- FOLLOW-UP | 166 パス総数と A1+A2+B1+B2=161 の差 5 件(台帳 5 と推定)の reconciliation を code-generation 着手時に実測で確定
- FOLLOW-UP | ADR-5/ADR-6 の Alternatives Rejected が各 1 件 — component-dependency の禁止逆順から転記して様式整合
- NIT | O-5 代替テスト 2 本の TDD 適用可否(被覆源付け替え = 振る舞い不変)を code-generation で明確化
- NIT | cid:pr-convergence:c2-multi-member-single-pr-interim の実在確認を code-generation で実施
