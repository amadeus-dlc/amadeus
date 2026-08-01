# Build & Test Summary — formal-verif-value-chain

上流入力(consumes 全数): requirements, code-generation(各 unit の code-summary), unit-of-work, nfr-design

## Verdict: **条件付き READY**(bt-c4-conditional-ready 様式)

8 Unit 全ての実装・検証が統合断面で green(build-test-results.md の exit 表)。条件 = 未検証面3点の明示引き継ぎ: (1) S1-f audit イベント(直後の formal-model-check ステージで閉包) (2) MirrorLifecycle の CI 恒常 TLC(#1920 切り出し — ユーザー裁定) (3) GitHub Actions 実 CI(PR 段で確認)。

## 価値到達の証明(#1738 (d) への回答)

- **advisory 価値チェーン**: 実 spec 変更 → CP1/CP2 発火 → directive JSON `advisories` → formal-model-check 実行 → TLC verdict、を実運用レイアウトで e2e 実測(u8)。途中で発見した恒久沈黙欠陥(S4-1 watch root 乖離)は本 intent 内で修正・再証明済み。
- **配布自立(#1829)**: `scripts/formal-verif/` 消滅(I2 exit 1)、plugin 4 面の repo-only 参照 0 件を t377 が恒久保証、compose の tools 配布で配布先自立実行を t379 が実測。
- **モデル供給(#1738/#1510)**: MirrorLifecycle が v2 model-map に登録され drift 監視が実発火。#1838 の欠陥は AsImplemented 変種の反例トレースとして形式的に再現・保存。`--impl-only` で #1510 の詰みを解消(t380)。

## テスト増分

新設テストファイル: t377 / t378 / t379(unit+integration)/ t380 / t381 / t382 / t-formal-verif-model-map-v2 / t-formal-verif-mirror-model-registration。削除: 分類 D 専用テスト 43 件+support 5 件(u2)。母集団: 707 ファイル / 9,612 assertions(全 green)。TDD Red 実文と検証手順は各 unit の code-summary.md および code-generation-plan.md(u1 の B1 統合裁定・u7 の2フェーズ分割・u8 の S1〜S5 手順はそれぞれの plan に固定)を参照。落ちる実証は t377(fixture 恒久化)・drift 注入(u7/S3 補遺)・advisory 注入4種(u5)で実測。

## 発見・処置(bug-zero 運用)

- 起票: #1863(stage-graph drift — 後に #1877 が根治)・#1864(stale pin — 後に main 側修正を継承)・#1920(TLC 複数モデル化)・#1921(Core 未ピン)。
- intent 内修正: S4-1(watch root)・S4-2(verdict 語彙)・S4-5(composed 面の drop→compose 更新)。
