# Business Rules — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`、`../../../inception/units-generation/unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6)、`../../../inception/application-design/components.md`、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`。

## 不変条件(business invariants)

| # | ルール | 検証機構 |
|---|---|---|
| BR-1 | HarnessName の値集合は正確に 6 値(claude / codex / kiro / kiro-ide / opencode / cursor)— union 型と `all` frozen 配列は常に同一集合 | 契約テスト2本の literal 固定(`tests/unit/setup-harness.test.ts:13` / `tests/unit/setup-harness-parse.test.ts:17` — 現行 4値 literal `["claude", "codex", "kiro", "kiro-ide"].sort()` を6値へ更新。FR-2 AC-2a — dist 動的導出は共変偽 green のため禁止) |
| BR-2 | エンジン dir は全ハーネスで固有(共有しない)— opencode=`.opencode`、cursor=`.cursor` | ENGINE_DIR_BY_HARNESS 全域 map+未知キー fail-fast(ADR-2) |
| BR-3 | 未知ハーネス名は parse で必ず拒否され exit 2+6値列挙 — 部分一致・大文字小文字の寛容化はしない(挙動保存) | FR-3 AC-3c(fixture テストで実測) |
| BR-4 | installer に per-harness 分岐を追加しない — 汎用機構(wizard/verifier/plan/payload)への変更は逸脱 | FR-1 AC-1e+deviation-stop-before-implement |
| BR-5 | runtime 2面は新たな fail 経路を作らない — otherTrees は表示のみ、KNOWN_HARNESS_DIRS は hook project-dir 解決(rung 2)への実挙動変更を含むが失敗経路は増やさない(E-1048-FD-Q1 = A 裁定) | FR-6 AC-6c+AC-6e(worktree 解決テスト1本) |
| BR-6 | migrate / self-install は非接触 | FR-6 AC-6d(触れる必要が生じたら実装前停止) |

## バリデーション

入力バリデーションは既存 `HarnessName.parse` の membership 判定に閉じる(parse-don't-validate 既適用 — brand 型で検証済み証明を運ぶ)。新規バリデーション・サニタイズは追加しない。

## ポリシー

README・usage 文言は refined-mockups の確定文字列と exact 一致(AC-1c / FR-5)。「four known harnesses」等の件数文言は same-root grep で全数更新(AC-1d)。
