# Code Generation Plan — model-overlay

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 対象ファイル

| ファイル | 変更種別 | 責務 |
|---|---|---|
| `dev-scripts/data/model-overrides.json` | 新規 | overlay 宣言（agent → model、base、fallbacks、fallbackApplied） |
| `dev-scripts/apply-model-overrides.ts` | 新規 | 適用 / `--check` / `--use-fallback --reason` / `--accept-upstream-base` |
| `dev-scripts/parity-check.ts` | 変更 | `checkEngineFiles` へ overlay 逆変換正規化を追加 |
| `dev-scripts/promote-skill.ts` | 変更 | 最終段（`!options.dryRun` ガード）で `applyModelOverrides` を呼ぶ前方互換フック |
| `.agents/amadeus/tools/amadeus-utility.ts` | 変更 | `handleDoctor` に overlay 乖離検査を追加（fail-open） |
| `dev-scripts/data/parity-map.json` | 変更 | `exceptions` に本変更の理由を追記（`engineFileExceptions` は既存宣言を流用） |
| `dev-scripts/evals/model-overlay/check.ts` | 新規 | RED→GREEN の検証本体（9 系列 + 回帰 1 件） |
| `package.json` | 変更 | `models:apply` / `models:check` / `test:it:model-overlay` を追加、`test:it:all` へ連鎖 |
| `AGENTS.md` | 変更 | 「運用注意」に上流同期後の手順順序を追記（BR-6） |

## TDD 順序

1. `dev-scripts/evals/model-overlay/check.ts` を先に書き、`apply-model-overrides.ts` 不在によるモジュール解決エラーで RED を確認する。
2. `dev-scripts/apply-model-overrides.ts` を実装し、(a)〜(c)・(f)・(h) を GREEN にする（parity・doctor 側はまだ未実装のため (d)(e)(g)(i) は fail のまま）。
3. `dev-scripts/parity-check.ts` へ overlay 逆変換正規化を追加し、(d)(e)(i) を GREEN にする。
4. `.agents/amadeus/tools/amadeus-utility.ts` の `handleDoctor` へ overlay 乖離検査を追加し、(g) を GREEN にする。
5. `dev-scripts/promote-skill.ts` への配線、`dev-scripts/data/model-overrides.json` の新設、`package.json` の scripts 追加、`dev-scripts/data/parity-map.json` の `exceptions` 追記、`AGENTS.md` の運用注意追記。
6. 初回 `models:apply` を実施し、`parity:check` / `test:all` の pass を確認する。

## eval 9 系列 + 回帰 1 件の対応表

| 系列 | 検証内容 | 対応 FR/BR | 実装箇所 |
|---|---|---|---|
| (a) | `--check` が宣言未反映（apply 未実行）を非ゼロ終了で検出する | FR-2.1 の `--check`、NFR-1 | `apply-model-overrides.ts`（checkOnly 分岐） |
| (b) | 適用の冪等性（2 回 apply で byte 同一） | FR-2.1 | `apply-model-overrides.ts`（planAgent の drift 判定） |
| (b regression) | bootstrap 時に実値が偶然 fallback 先と同値でも base を記録する（実リポジトリの base=opus=fallback 先の一致を pin） | FR-1.1、FR-1.4 | `apply-model-overrides.ts`（bootstrap 分岐、実装中に発見した回帰） |
| (c) | revert(apply(x)) == x の byte 一致ラウンドトリップ | FR-3.3 | `apply-model-overrides.ts` の `setModelOverrideLine` / `readModelOverrideLine` |
| (d) | base drift（上流が modelOverride を変更）時に parity が fail する | FR-3.2 | `parity-check.ts`（`normalizeModelOverlay`） |
| (e) | bootstrap window（base 未記録）は正規化せず通常比較 + ヒント | FR-1.4 | `parity-check.ts`（`normalizeModelOverlay` の hint 分岐） |
| (f) | `--use-fallback --reason` の適用と `fallbackApplied` 記録 | FR-4.1、FR-4.2 | `apply-model-overrides.ts`（fallback 分岐） |
| (g) | doctor: 乖離時警告 / overlay 不在時 no-op / 読み取り失敗時「overlay state unknown」 | FR-4.3、BR-7 | `amadeus-utility.ts`（`handleDoctor`） |
| (h) | 管理外実値に対する apply の非ゼロ拒否 + base 不変（`--accept-upstream-base` でのみ更新） | BR-10、BR-12 | `apply-model-overrides.ts`（drift 拒否分岐） |
| (i) | 管理値集合に一致しない手編集値が parity で fail する（トークン一致置換の負ケース） | BR-9 | `parity-check.ts`（`normalizeModelOverlay` の managed 判定） |

## 検証コマンド

```sh
bun run dev-scripts/evals/model-overlay/check.ts
npm run models:apply
npm run parity:check
npm run test:all
```
