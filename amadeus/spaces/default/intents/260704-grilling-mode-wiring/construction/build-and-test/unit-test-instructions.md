# Unit Test Instructions — 260704-grilling-mode-wiring

Test Strategy は Minimal であり、requirement-driven（R006 の検査観点 = assert 群）とする。
テスト対象は code-generation で追加した決定論的 wiring 検査である（`../implicit/code-generation/code-summary.md` を参照）。
実装計画との対応は `../implicit/code-generation/code-generation-plan.md` の Step 1 と Step 7 を参照する。

## テストフレームワークと構成

Bun 実行の fixture ベース eval（`dev-scripts/evals/grilling-wiring/check.ts`）に集約する。
vitest / jest は使わない（repo の既存 eval パターンに準拠）。

## 実行コマンド

```sh
# 実 repo に対する wiring 検査（本番相当の検証）
npm run grilling-wiring:check

# fixture eval（正常 1 + 異常系 5: 旧文言残存、annex マーカー欠落、source/昇格先不一致、相対パス切れ ほか）
npm run test:it:grilling-wiring

# 昇格同期の検証
npm run test:it:promote-skill
```

## カバレッジ期待値

- R006 の検査観点 3 つ（annex 定義の存在、29 skill の新文言統一、source/昇格先一致）+ レビューで追加した engine-bridge 参照のパス実解決、の 4 観点すべてに fail fixture がある。
- 実 repo に対する check が pass する（結線が壊れると CI で fail する）。

## テストデータ管理

fixture は `mkdtempSync` で一時ディレクトリに生成し、成功時も失敗時も片付ける（既存 `claude-host-wiring` eval と同形）。
