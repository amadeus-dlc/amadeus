# Build and Test Summary — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md(三重実測の記録)。

## 全体ステータス

- **build-ready**: YES — 決定的ゲート(typecheck / lint / dist:check / promote:self:check)全 exit 0(dist 非関与の1行テスト変更)
- **test-ready**: YES — 落ちる実証(exit 1→0)・drift 0 閉包(filter run+フル coverage の両面)・恒常性7点(31.199〜33.92s 全 ≥30s)
- **deployment-ready**: N/A(デプロイ基盤なし — release.yml 一本)

## テスト戦略(変更面に比例 — build-and-test:c1/c3)

- 中核 = 既存 size ゲート(t-test-size-drift 16 tests)による宣言の妥当性検査+対象テスト自体の green 維持(37 pass)
- リグレッションピン: 宣言行は on-disk drift guard(:122-134)が恒久検査 — small 化・削除はいずれも guard/drift 行で loud(落ちる実証で確認済み)
- performance / security: 根拠付き N/A(各 instructions 参照 — コメント1行、実行コード不変)

## 落ちる実証の台帳

| 実証 | 実測列 | 実施者 |
| --- | --- | --- |
| small 注入 → drift guard 赤 | exit 1(declared<measured violation)→ large 復元 → exit 0 | builder / conductor / reviewer の三重 |
| drift 0 閉包 | `wall-clock drift: 0 file(s)`(filter run+フル coverage) | conductor |

## 既知の残項目

- フル coverage 中の t163-reaper-steal-race 赤は負荷敏感クラス(本 diff 無関係 — #1085 へ unit 1 候補として実文追記済み)
- テスト短縮は Issue #1087(時限判定付き)へ分離済み
