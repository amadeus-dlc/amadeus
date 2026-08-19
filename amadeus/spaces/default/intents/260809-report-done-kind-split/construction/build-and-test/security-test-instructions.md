# Security Test Instructions — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md`(Step 8 の検証集合)と `code-summary.md`(FR-1 / FR-4 の着地面実測)、および `inception/requirements-analysis/requirements.md` の Non-functional requirements 節。

## 判定: 適用可能なセキュリティ NFR は存在しない(N/A)

Test Strategy は `Comprehensive` だが、**本 intent には合否を決めるセキュリティ要件が宣言されていない**ため、SAST/DAST・認証・インジェクション等のテスト実体を作らない。

## 根拠

- `requirements.md` の Non-functional requirements 節はビルド drift・CI ブロッキング集合・coverage の3点のみで、セキュリティ要件を含まない
- 本 unit の変更面は engine 内部の directive 語彙(`committed` kind の新設と emit サイトの分類)であり、認証・認可・秘密情報・外部入力の解釈・信頼境界のいずれにも触れない。ユーザー入力を新たに受け付ける面も、権限判定を行う面も増えていない
- 隣接する信頼境界(Stop hook の停止許可)は**改修していない**ことを FR-4 で実測済み(`amadeus-stop.ts` に `committed` 分岐 0 hit、`runEngineNextKind()` は `next` の kind のみを読む)。むしろ「非終端 ack が停止許可へ到達しない」ことが型で保証される方向へ動いており、退行方向の変更ではない

## 常時適用の検査(本 intent でも実行済み)

セキュリティ専用の実体は作らないが、リポジトリ常設のガードは通している(結果は `build-test-results.md`):

- `bun run lint`(Biome)
- `bun run source-only:check`(配布境界の越境検出)
- `bun run no-silent-drop -- --base-revision <merge-base>`(無音ドロップの台帳ゲート)

## この判定を覆す条件

- `requirements.md` または NFR 成果物に、認証・認可・秘密情報・入力検証についての要件が追加される
- `committed` / `done` の判別が、権限判定や停止許可の**入力**として使われるよう変更される(現状 Stop hook は `next` の kind のみを読む)
- directive が信頼境界を越えて外部から供給されうる構成が導入される
