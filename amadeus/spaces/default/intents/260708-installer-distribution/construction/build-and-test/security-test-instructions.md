# Security Test Instructions — installer-distribution

> ステージ: build-and-test (3.6) / devsecops 支援観点 / 戦略: Standard のため専用 SAST/DAST 層は生成しない(根拠付き宣言 — セキュリティ検証はユニット/統合テストに組み込み済み)

## セキュリティ要件 → テストの対応

- SEC-F01(悪性 tar エントリ拒否): `setup-fetcher.test.ts` — パストラバーサル・絶対パス・symlink/hardlink/device 一律 payload-invalid
- SEC-I01(SafeTargetPath 閉じ込め): `setup-applier.test.ts` — resolveWithin の逸脱拒否(copy/backup 両経路)
- SEC-U01(既存 .bk 退避衝突拒否): `setup-applier.test.ts`(install 経路への安全側副作用込み)
- SEC-I04(文言の reporter 一元化): `setup-reporter.test.ts`+レビューで cli 生文言ゼロを grep 確認済み
- SEC-P02/P03(2FA 前提・provenance 注記): 手順書 `docs/guide/publishing-setup.md` 章1/章5(文書統制 — レビューで章配置を検証済み)
- 認証情報: インストーラは認証を扱わない(ADR-003 認証なし REST)— シークレット漏洩面なし

## 実行方法

通常のテスト実行(`bash tests/run-tests.sh --ci`)に包含
