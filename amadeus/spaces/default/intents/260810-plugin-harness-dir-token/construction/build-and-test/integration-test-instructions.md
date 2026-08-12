# 統合テスト手順 — 260810-plugin-harness-dir-token

Test strategy: **Comprehensive** / Depth: Minimal

## 実行

```
bun test ./tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts
bun test ./tests/integration/t416-self-install-plugin-projection.integration.test.ts
bun test ./tests/integration/t-plugin-projection-packaging.test.ts
```

統合テストは実 CLI を spawn し、実ワークスペースを temp に組む。実行時間は 1 ファイルあたり数十秒。
**他のテスト実行と並走させないこと** — 本 intent で、フルスイートの裏で個別実行した結果
負荷起因のタイムアウトが 7 件発生し、退行と誤判定しかけた。

## 本 intent が触れる統合テスト

| ファイル / テスト | 対応 FR | 判定内容 |
|---|---|---|
| `t2790 > compose from an empty staging dir resolves plugin prose to the tree's own harness dir` | FR-3 | staging 不在を先に assert し、codex 面で (i) `.codex/tools/amadeus-sensor.ts` = 1 (ii) 生トークン = 0 (iii) 他 6 harnessDir = 各 0 |
| `t2790 > a re-compose over the seeded staging dir is a no-op, not a perpetual re-seed` | FR-3 / 冪等性 | claude 面で再 compose のバイト一致。`stagingEntryState` の変換越し比較が効いていることの証跡 |
| `t2790 > stagingHarnessDirOf matches only a harness tree's staging landing path` | FR-3 | authoring `plugins/<name>` を非マッチにし、authoring ツリーを中立に保つ |
| `t2790 > seedBytesForHarness transforms prose only, and applies the rules rename` | FR-3 | prose のみ変換、`plugin.json` / `.ts` / null 宛先は逐語 |
| `t416 > plugin prose resolves to each self-install face's own harness dir` | FR-2 | self-install 5 面で (i)(ii)(iii) |
| `t-plugin-projection-packaging > all eight package faces name their own harness dir and no other` | FR-4 | consumer 導入バンドル 8 面で (i)(ii)(iii) |

## 境界とレジストリ

新規統合テストが CLI を spawn する場合、`tests/integration/t-coverage-mechanism-ratchet.test.ts` の
`EXPECTED_NONE_TO_CLI` への**登録が必要**（honesty ratchet — 人手の編集なしに新しい spawner は着地できない）。
本 intent でこの登録漏れを実際に踏んだ。

同様に `tests/integration/t258-boundary-guard.integration.test.ts` は、出荷される core が
`scripts/` を参照することを禁じる。core のコメントであっても `scripts/<path>` と書けば赤になる。

## 既知の制約

- `.pi` / `.kiro` / `.kiro-ide` に self-install 面は存在しない（`SELF_INSTALL_HARNESSES` は 5 面のみ）。
  これらの harnessDir は consumer 導入バンドル 8 面の実測のみが証跡になる
- 兄弟 11 行の consumer 解決可否は本 intent では **DEDUCED のまま**。実 consumer ワークスペースを
  立てての実測は [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810) に送った
