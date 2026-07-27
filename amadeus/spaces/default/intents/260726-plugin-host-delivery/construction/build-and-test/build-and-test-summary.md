# Build and Test Summary — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 全8ユニットの code-generation-plan.md と code-summary.md からテスト種別の棚卸しと検証宣言を集約し、統合ツリーでの再実測(build-test-results.md)と対で構成した。

## ビルド状態

- 前提: Bun + `bun install`(build-instructions.md)
- 正本 → dist 7ハーネス → self-install の3面同期: drift ガード実測 green(dist:check / promote:self:check とも exit 0)

## テスト種別インベントリ(Comprehensive 戦略)

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | ✅ unit-test-instructions.md | 全ユニットの純関数層(t300〜t337 の 10 本) |
| integration | ✅ integration-test-instructions.md | 実 FS/CLI 境界(t299〜t338 の 15 本)+ 統合交差検査 |
| performance | ✅ performance-test-instructions.md | 承認済み NFR(NFR-2 no-op 高速路ほか)へ trace する範囲のみ |
| security | ✅ security-test-instructions.md | 承認済み NFR(fail-closed / 安全契約 / OutDirRefusal / advisory 限定)へ trace する範囲のみ |
| conformance | ✅(U7 成果物 tests/conformance/ + t335-t338) | FR-8/FR-10(上流 t188 32 ケース追跡) |
| E2E / contract / accessibility | 生成せず | trace 可能な承認済み要件なし(bt-proportional-selection — 根拠のない検査を機械追加しない) |

## ユニット別カバレッジ期待と実績

- patch(diff 追加行)DA:0 = 0 を統合ツリーで機械照合済み(build-test-results.md)
- プロジェクト全体 85.28%(相対 ratchet は coverage registry --check green — U2 code-summary 転記+統合 --ci 内で再検証)

## 準備状況評価

- **build-ready**: ✅(全ビルド検証 exit 0)
- **test-ready**: ✅(--ci PASS、580 ファイル 0 FAIL)
- **deployment-ready**: 本プロジェクトはデプロイ基盤なし(npm 配布は release.yml の人間起動のみ — project.md)。PR マージ準備は CI green 確認後にユーザー承認で行う

## 既知の制限・残件

- GitHub Actions(Linux)での CI green と codecov patch gate は push 後に確定(未検証面の明示 — build-test-results.md)
- t177 flake は是正済み+#1565 で追跡(本 intent 外由来のテストハーネス問題)
- ミラー sync は #1548 のため phase 境界で skip 運用継続
