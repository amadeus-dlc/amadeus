# Code Summary — plugin-settings-core

上流入力: `code-generation-plan.md`、builder 最終報告(swarm batch 1、branch `bolt-plugin-settings-core`、16 コミット)。PR: https://github.com/amadeus-dlc/amadeus/pull/3052

## 実装(ファイルごと)

- **新規** `packages/framework/core/tools/amadeus-plugin-settings.ts`(274 行、import なしの leaf): `SETTINGS_KEY_RE` / `SECRET_KEY_RE` / `parseSettingsDeclaration` / `collectSettingsMisspellings`(既知キー集合 + Levenshtein ≤2)/ `valueMatchesType` / `resolvePluginSettings` — 宣言 parse・config 字句検証・解決の 3 面が共有する単一定義
- `amadeus-plugin-compose.ts`: `parsePluginManifest` へ optional `settings` parse + 綴り誤り loud 化。既存 3 プラグイン manifest は byte-identical。SCOPE コメント改訂(ADR-3 の明記)
- `amadeus-config.ts`: `"plugin.settings"` union/registry 追加(layers = project/space/intent)。`merge` を `"replace" | "plugin-settings"` へ拡張し per-plugin per-key 後勝ち浅マージ
- `amadeus-sensor.ts` + `amadeus-plugin-runtime.ts`: `pluginOwningSensor` → `readStagedPluginManifest` → `resolvePluginSettingsForSensor`。解決失敗は spawn せず SENSOR_FAILED(無音デフォルト禁止)。成功時のみ `--settings-json` 1 引数付与。宣言なしは従前どおり(挙動不変)
- docs: guide/reference en+ja 4 面へ `plugin.settings` 行(t432 準拠)
- CI 是正(レビュー後追加): `amadeus-sensor.ts` 配線の in-process カバレッジテスト(`6bc5fad88` — Patch Coverage Gate の spawn 経由 lcov 不載への対処)

## TDD 証跡

7 slice すべて red コミット → green コミットの対で記録(例: `bd9c50d8f`(red)→ `13458d178`(green))。落ちる実証 (i)〜(v) 成立、(iv) は注入 → 赤 → revert 残渣ゼロの 1 セット実測。

## 実測(builder 報告からの転記 + conductor referee)

| 検証 | 結果 |
|---|---|
| typecheck / lint / complexity / build(追跡不変)| すべて exit 0 |
| フルスイート(builder ローカル 1 回)| 999 files / 0 fail / PASS |
| referee `check`(typecheck+lint 再実行・改竄検査)| converged / tampered=false |
| リモート CI(正)| PR #3052 で実行中 — Patch Coverage Gate 赤 → in-process テスト追加で是正 push 済み、再実行中 |

## 申し送り

- settings 宣言を持たないプラグインへの config override は解決を行わず黙って無視(設計の明示分岐 — 宣言があれば未知キーは fail-closed)。本 Unit 唯一の意図的 silent 面
- env 宣言スキーマは未実装(ADR-3 先送り確定 — 実消費者不在)
