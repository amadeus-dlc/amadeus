# 単体テスト手順

全 Unit の `code-generation-plan.md` / `code-summary.md` にあるスキーマ、依存解決、複数モデル loader、モデル別語彙、CI domain の fail-closed 契約を Comprehensive 戦略で検証する。

## 対象と実行方法

```bash
bun test --timeout 120000 \
  tests/unit/t-formal-verif-model-map-v2.test.ts \
  tests/unit/t404-tla-vocabulary-supply.test.ts \
  tests/unit/t-formal-verif-tla-model-loader.test.ts \
  tests/unit/t-formal-verif-ci-model-check-domain.test.ts
```

検査対象は、auxiliary/vocabulary の exact schema、コメント除去と推移依存解決、循環・境界外参照、全モデル identity、未登録モデル拒否、語彙閉集合、6×N evidence 行列である。

## 合格基準とテストデータ

- 全テスト pass、fail 0。既存ケースの期待値を緩和しない。
- pure fixture と注入 seam を使い、リポジトリ実体や共有状態へ書き込まない。実 filesystem を扱う t402 / t403 は integration 層で実行する。
- loader/sensor の変更行に0-hitを残さず、重要分岐は happy path、missing/extra、drift、cycle、unknown model を含める。
- line coverage の数値だけでなく、FR-1〜FR-6 と NFR-1〜NFR-4 の各失敗面が明示エラーに到達することを重視する。
