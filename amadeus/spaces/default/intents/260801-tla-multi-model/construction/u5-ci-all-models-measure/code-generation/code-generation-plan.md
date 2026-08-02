# コード生成計画 — u5-ci-all-models-measure

上流入力: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-requirements/` 5 成果物、`nfr-design/` 5 成果物、`inception/requirements-analysis/requirements.md`、`inception/units-generation/unit-of-work.md`、`unit-of-work-story-map.md`。user-stories ステージは SKIP のため、FR-4 / FR-5 をストーリー代替の trace 起点とする。

## 実装手順

- [x] **Step 1 — 変更前ベースラインと blast radius の固定 (FR-4 / FR-5 / NFR-1)**: CI 実行系 7 ファイル、workflow 表示、stage doc、関連統合テストを棚卸しし、既存 6 テストファイルの Green を記録する。
- [x] **Step 2 — 全モデル runner/domain/artifact 契約をテスト先行で実装 (FR-4 / FR-5)**: `CiModelTarget`、per-model evidence、`6 × N` の逐次マトリクス、MirrorLifecycle measured run の完全一致統計 pin、失敗時 model 証跡を追加する。
- [x] **Step 3 — frozen / verified-source 二層 port をテスト先行で実装 (FR-4 / FR-5)**: FormalElection の従来 argv を不変に保ち、MirrorLifecycle は loader byte-pin 済みパスを直接 TLC 実行して completion marker と統計を証跡化する。
- [x] **Step 4 — run / verify / diagnostic / skeleton のモデル選択を実装 (FR-4)**: 既定を全登録モデル、`--model` を単一絞り込み、未登録名を明示失敗、skeleton の非 frozen モデルを fail-closed とする。
- [x] **Step 5 — CI 表示と stage doc を実装へ追随 (FR-5 / NFR-3)**: `.github/workflows/ci.yml` はステップ名・サマリだけを変更し、timeout / permissions / workflow_dispatch / コマンド行を不変に保つ。
- [x] **Step 6 — t406 と既存統合テストを完成 (FR-4 / FR-5 / NFR-1〜4)**: 両モデル反復、単一絞り込み、未登録名、per-model 証跡、統計 pin、workflow 不変面、二層 dispatch の happy path とエッジケースを検査する。
- [x] **Step 7 — 実測・生成同期・品質ゲート (FR-5 / NFR-1)**: MirrorLifecycle AsIntended の実測 JSON を record に固定し、関連テスト、`bun run typecheck`、`bun run lint`、`bun scripts/package.ts`、drift guard を実行する。timeout 不整合時は緩和せず再裁定要として停止する。
- [x] **Step 8 — 実績の記録 (FR-4 / FR-5)**: `code-summary.md` に変更ファイル、追加所有、テスト結果、計測値、計画逸脱と残リスクを記録する。

## 非変更面

- `tlc-toolchain.ts`、`fs-tlc-toolchain.ts`、`run-model-check-execution.ts`、`tla-arm.ts` の frozen 層契約は変更しない。
- `.github/workflows/ci.yml` の `timeout-minutes: 30`、`permissions: contents: read`、`workflow_dispatch` 条件、run / verify コマンド行は変更しない。
- 新規外部依存、並列実行、統計 pin の緩和、run マトリクス縮小は導入しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T01:21:09Z
- **Iteration:** 1
- **Scope decision:** none

u5 の設計整合性は概ね良好だが、統合済み u1–u5 として root promotion drift と AC1 の証拠不足が残り、Build and Test へ進めない。

### Findings

- Blocking/Critical: promote:self:check が5ハーネス・10件で失敗。u1 sensor 差分と tla-module-deps.ts 欠落を同期し、package と promote の両 drift guard を green にする。
- Blocking/Major: AC1 の両モデル意味論破壊と注入→red→除去→green往復を、設計どおり実装・記録するか正式再裁定し、t406 の同等証拠を summary に記録する。
- Advisory/Major: created/modified/generated ファイル一覧と追加所有3ファイル・artifacts test を summary に明記する。
- Advisory/Minor: 統合後の検証件数・コマンドを summary に更新し、promotion 修正後の hosted Ubuntu 30分予算確認を残リスクとして扱う。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T01:31:00Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の promotion drift、AC1 mutation round-trip、所有ファイル追跡、検証証拠の鮮度は解消され、code-generation は Build and Test へ進める。

### Findings

- Advisory/Minor: AC1 の実装は generalized support probes ではなく t406 scratch fixture を採用したが、意味論変異・隔離・production runner/port・red/green 往復・bytes 復元の実質要件を満たす。設計のテスト配置表現は将来整合させる。
- Advisory/Minor: 30分予算は macOS Docker でのみ実測済み。最終 CI acceptance 前に hosted Ubuntu workflow_dispatch を1回実行する。
