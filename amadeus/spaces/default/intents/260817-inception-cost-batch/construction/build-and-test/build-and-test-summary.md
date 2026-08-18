# Build and Test Summary — 260817-inception-cost-batch

上流入力: 両 Unit の `code-generation-plan.md` / `code-summary.md`。結果詳細は `build-test-results.md`。

## ビルド状態と前提

- ビルド: `bun run build` green(conductor tree = main+checkpoint 断面 / 両 bolt worktree)。tracked 不変・投影 untracked の契約維持
- 前提: Bun-only、gh は optional(readiness fail-open を実装・テスト済み)

## テスト種別の棚卸し(Test Strategy = Comprehensive)

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | ✅(t3181 系 3 + t2415 述語) | FR 駆動+エラーパス第一級 |
| integration | ✅(t3181 系 3 + t2415-contract) | 統合境界4面(verb→gateway→書込 / 契約⇔graph / sensor 実配線 / 契約⇔定数 drift) |
| performance | **生成せず**(判定文書のみ) | 適用可能な数値 NFR 不在 — `performance-test-instructions.md` に判定・根拠・覆す条件を明記(検証劇場の禁止) |
| security | **別枠スイート生成せず**(継承検証の棚卸しのみ) | 独立セキュリティ NFR 不在。信頼境界の既存規律(redaction・permit 非対象・入力検証)は実装テスト内で被覆 |
| E2E / 形式検証 | 追加なし | 並行プロトコル spec 非接触(formal-model-check は advisory run-now で全2モデル NOT_DETECTED を別途実測済み) |

## Unit 別カバレッジ期待

- U1: 追加 302 行中 covered 275 + allowlist 3(dispatch-case)— Patch gate green 実測。新規 6 テストファイル(1,065 行+是正追加)
- U2: 追加 ~500 行(契約 md 中心)。述語・帰属・drift の4観点+負のコントロール。PR CI で最終実測中

## Readiness 評価

- **build-ready**: YES(実測)
- **test-ready**: YES(実測 — ローカル targeted + U1 は merge group フル CI 通過)
- **deployment-ready**: 本プロジェクトはデプロイ基盤なし(npm/Release はスコープ外)。**delivery-ready** としては U1 着地済み・U2 は PR #3191 の収束待ち(pr-convergence ステージで閉包)

## 既知の残項目

1. U2 の required CI green + converged 実測 + queue 着地(pr-convergence ステージ)
2. U1 §12a FOLLOW-UP は record 追補済み。U2 code-summary の 523/525 転記差は次の record 訂正で numstat 逐語に再固定(reviewer FOLLOW-UP)
3. 効果測定(FR-MEAS-1 の N=5 再実測)は後続 intent の観測 — 本 intent は baseline・目標・測定手法の固定と機構導入まで(requirements 前提節どおり)
