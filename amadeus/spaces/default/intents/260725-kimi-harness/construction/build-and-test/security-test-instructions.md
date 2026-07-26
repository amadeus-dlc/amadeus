上流入力(consumes 全数): code-generation-plan, code-summary

# Security Test Instructions — 260725-kimi-harness

Test Strategy: **Comprehensive**。NFR の security 要件(各 unit の nfr-requirements/security-requirements.md)に対応する検証手順。

## 対象と実行

- **config 保護の境界**(B3): `bun test tests/unit/setup-kimi-hooks-domain.test.ts tests/integration/t-kimi-hooks-merge.test.ts`
  - ブロック外バイト保持・重複 loud fail・TOML 不正 loud fail・マーカー欠落の replace・atomic 書込み・バックアップ byte 一致
- **adapter の入力処理**(B2): `bun test tests/integration/t-kimi-adapter.test.ts`
  - 不正 stdin・未知フィールド・fail-open 経路(parse-only・eval なし)
- **doctor の読み取り専用性**(B4): `bun test tests/integration/t-kimi-doctor-arm.test.ts`
  - doctor が config を変更しない・固定引数の spawn
- **隔離**(B6): `bun test tests/unit/t-kimi-print-drive.test.ts`
  - KIMI_CODE_HOME 差替・認証の symlink 供給(OAuth バイト非コピー)・実環境への非接触

## 依存の衛生

```sh
bun audit || true   # 依存追加なしのため情報のみ(既存 High advisory は本 intent の対象外 — project.md の conditional readiness 既定)
```

## カバレッジ期待(Comprehensive)

- 上記4領域の失敗経路(重複・不正・混入・非隔離)が全てテストで固定されていること(実施済み・build-test-results.md で確認)
