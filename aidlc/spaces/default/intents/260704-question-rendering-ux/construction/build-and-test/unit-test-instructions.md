# Unit Test Instructions — 260704-question-rendering-ux

Test Strategy は Minimal であり、requirement-driven（R008 の検査観点 = assert 群）とする。
テスト対象は code-generation で拡張した決定論的 wiring 検査である（`../implicit/code-generation/code-summary.md` を参照）。
実装計画との対応は `../implicit/code-generation/code-generation-plan.md` の Step 1 と Step 5 を参照する。

## テストフレームワークと構成

Bun 実行の fixture ベース eval（`dev-scripts/evals/grilling-wiring/check.ts`）に集約する。
vitest / jest は使わない（repo の既存 eval パターンに準拠）。

## 実行コマンド

```sh
# 実 repo に対する wiring 検査（本番相当の検証）
npm run grilling-wiring:check

# fixture eval（正常 1 + 異常系: 既存 5 種 + 新規 2 種（Codex annex 欠落、Display language 節欠落））
npm run test:it:grilling-wiring

# 昇格同期の検証
npm run test:it:promote-skill
```

## カバレッジ期待値

- R008 の新規検査観点（正準 annex の Display language 節と Grill me rendering rules、Codex annex の存在と正準 label 4 個と `request_user_input` と Text fallback と正準 annex 参照、engine-bridge の会話言語文言、Codex annex の昇格同期対象化）のすべてに実 repo 検査があり、代表的な欠落 2 種に fail fixture がある。
- 実 repo に対する check が pass する（annex 契約が壊れると CI で fail する）。

## テストデータ管理

fixture は `mkdtempSync` で一時ディレクトリに生成し、成功時も失敗時も片付ける（既存 `claude-host-wiring` eval と同形）。
