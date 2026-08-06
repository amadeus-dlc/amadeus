# Build and Test Summary — 260805-xrev-bug-batch

上流入力(consumes 全数): 6 unit の `code-generation-plan.md` / `code-summary.md`

## 全体ステータス

**ビルド可・テスト可・出荷済み**。本 intent の 6 unit はすべて main へ着地しており、
本ステージは「着地後の main を検証し、その結果を記録する」位置づけで実行した。

前提条件: Bun 1.3.13、`bun install --frozen-lockfile`、`bun run build`。外部サービス・秘匿情報は不要。

## 生成した指示書の在庫（Test Strategy = Comprehensive）

| ファイル | 生成 | 根拠 |
|---|---|---|
| `build-instructions.md` | ○ | 常時 |
| `unit-test-instructions.md` | ○ | 常時 |
| `integration-test-instructions.md` | ○ | 患部が engine/tools の境界であり主戦場 |
| `performance-test-instructions.md` | ○（適用外の明示） | 性能 NFR 不在。既存 perf tier のみ記録し新設せず |
| `security-test-instructions.md` | ○（認可・証跡面） | セキュリティ NFR 不在だが患部が認可・証跡に直接触れる |
| `build-test-results.md` | ○ | 実測値 |

E2E・contract・accessibility は本 intent の患部に対応面が無いため生成していない。

## unit ごとのカバレッジ期待

率の目標は置かない。本 repo は **patch coverage gate**（追加行のうち LCOV 計測可能な行に未カバーを許さない）と
**coverage registry の ratchet**（被覆済み件数が減らない）で担保する。6 unit いずれも各 PR の CI で
両ゲートを通過済み。唯一の免除は fix-2147 の `mkdir` アダプタ1行で、理由と失効条件を allowlist に明記した
（spawn 経路のみで走るため LCOV 非計測）。

## 準備状況の評価

- **build-ready**: 可（`bun run build` exit 0、追跡ファイル drift なし）
- **test-ready**: 可（`test:ci` 874 files / 11,651 assertions / 0 failed）
- **deployment-ready**: 本 intent は配布物のバージョン・タグ・リリースノートに触れていない。
  リリースは `release.yml` の workflow_dispatch 一本という既定に従い、本 intent では実施しない

## 既知の限界・申し送り

1. **no-silent-drop が記録ブランチで `BASELINE_INVALID`**。ledger の base 束縛が main の前進で stale になる設計上の
   toll であり、出荷コードは各 PR の CI で `NO_SILENT_DROP_OK` 済み。記録の PR 化時に再束縛が要る
2. **FR-5d の「非0 exit」は文言どおりには満たされない**。engine の `report` は拒否でも exit 0（error directive）で、
   非0 を返すのは state tool 経路。可視性の問題として #2376 に起票。要件文言は state tool 経路を前提としていた
3. **性能の実測なし**。監査シャードが極端に大きい intent での世代フィルタの挙動は未測定
4. 本ステージで新規に起票した Issue: **#2375**（FR-5e の SR-1 = carrier approve の swarm ガード迂回、未実測）、
   **#2376**（report の exit 契約）。前ステージ由来: #2358（engine のゲート再発行の詰み）、#2359（§12a の事後 verdict 経路）
