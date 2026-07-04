# Unit Test Instructions — 260704-engine-namespace

Test Strategy は Minimal であり、requirement-driven とする。
テスト対象は code-generation で拡張した parity 対応表機構と改名の完全性である（`../implicit/code-generation/code-summary.md` を参照）。
実装計画との対応は `../implicit/code-generation/code-generation-plan.md` の Step 1〜2・Step 8 を参照する。

## テストフレームワークと構成

Bun 実行の fixture ベース eval（`dev-scripts/evals/parity/check.ts`）に集約する。
kind 別 mapping fixture（engine-dir / tool / hook / common-dir / shared-dir / rules-file / scope-file / sensor-file / sub-agent）、逆方向衝突ガード、bare-token・セグメント境界の disambiguation ガードを含む。

## 実行コマンド

```sh
# 上流 parity（対応表駆動の path 解決 + 内容正規化、engineFileExceptions 空）
npm run parity:check

# parity 機構の fixture eval
npm run test:it:parity

# 改名済み skill / symlink / 結線の回帰検知
npm run claude-wiring:check
npm run grilling-wiring:check
npm run test:it:promote-skill
```

## カバレッジ期待値

- 対応表 57 行の各 kind に mapping fixture がある。
- disambiguation（拡張子込み完全一致、`.agents/` 込み path 接頭辞、セグメント境界）の fail fixture がある。
- N005 の残存 grep（例外 5 箇所）が 0 件を返す。

## テストデータ管理

fixture は一時ディレクトリに生成し、成功時も失敗時も片付ける（既存 eval と同形）。
