# Code Generation Plan — U-3 docs-sensors-sync(#3028 / FR-3)

depth Minimal。D-3 (b) の実装。U-2(#3086)着地後の main から分岐(bolt-docs-sensors-sync)、push-first。トレース: 全 step → FR-3。

## Steps

- [x] Step 1: 実在集合の導出述語を確定 — 「core `packages/framework/core/sensors/*.md` + 各 plugin.json が宣言する sensors」の合成集合(件数フリー契約)。U-2 着地後の期待値 14 を実測で確認 → FR-3 (1)
- [x] Step 2: TDD Red — 既存 docs 検証テスト様式に従い、06-sensors(.ja).md の表の行集合が導出集合と一致することを検査するテストを追加し、現状(表10行)で Red を実測 → FR-3 (3)
- [x] Step 3: en/ja 表を同期(4行追加: nfr-budget / question-budget / scope-sizing / git-drift。model-completeness 行は保持しプラグイン由来注記を追加)→ Green。`grep -c '^| \`amadeus-'` = 14 を en/ja 両方で実測 → FR-3 (1)(2)
- [x] Step 4: 落ちる実証 — 表から1行を一時除去 → 検査赤 → revert 残渣ゼロ
- [x] Step 5: coverage-registry regen(必要時)、typecheck / lint / 対象テスト green、コミット
- [x] Step 6: record 配送 PR・report mint・code-summary

## テスト方針(Comprehensive)

件数フリー契約(表 ⊆⊇ 導出集合)により将来のセンサー増減へ自動追随。en/ja 同数もテスト内で検査。
