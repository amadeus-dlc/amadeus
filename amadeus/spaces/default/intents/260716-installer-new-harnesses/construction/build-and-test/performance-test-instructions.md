# Performance Test Instructions — Issue #1048

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-generation-plan.md`(変更目録)、`../installer-enum-extension/code-generation/code-summary.md`(検証実測)。

## 選定(build-and-test:c1/c3 — 比例選定)

専用性能テストは選定しない — PR-1(新規性能面なし: membership 判定+map 参照のみ)により検査対象が不存在。戦略名だけでの機械追加はしない(c1)。

## 既存強制メカニズム(代替面)

テストサイズ宣言+wall-clock バンド(tests/lib/test-size.ts:89 WALL_CLOCK_BANDS)が回帰上限を強制 — --ci 実測で wall-clock drift 0 files。
