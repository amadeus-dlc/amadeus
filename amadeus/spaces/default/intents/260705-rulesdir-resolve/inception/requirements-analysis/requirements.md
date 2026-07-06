# Requirements — rulesDir の誤解決修正（260705-rulesdir-resolve）

対象 Issue: [#491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 意図分析

`amadeus-graph.ts` の `rulesDir()` は「ツール位置から 2 つ上 = workspace root」を仮定するが、これは旧レイアウト（`.claude/tools` = 1 階層）でのみ正しい。
現行の実体パス（`.agents/amadeus/tools` = 2 階層）から compile すると `.agents/aidlc/...` を探して空になり、**全 32 stage の rules_in_context が無音で空配列の stage-graph.json が生成される**（PR #489 で実発生、Bugbot が検出）。

## 機能要求

- R101: `rulesDir()` の既定解決を walk-up 方式へ変更する（questions Q1 = A）: ツール位置から親方向へ `aidlc/spaces` を含むディレクトリを探し、見つかった root の memory パスを返す。`AIDLC_RULES_DIR` は最優先のまま。
- R102: 実体パス（`.agents/amadeus/tools/amadeus-graph.ts`）からの compile で rules_in_context が正しく解決される（旧 1 階層レイアウトも同じ walk-up で吸収される）。
- R103: fail-loud ガード（questions Q2 = A）: 解決した memory ディレクトリが実在するのに rule 候補 0 件なら、stage-graph.json を書かずにエラー終了する。memory ディレクトリ不在は従来どおり []。
- R104: 出力契約は不変（正常時の stage-graph.json の内容は現行 commit 済みの正しい状態と同一。compile の stdout / exit code の正常系も不変）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI（実体パスの amadeus-graph.ts compile）を駆動する。RED 先行（修正前は rules_in_context が空で生成されることを確認する）。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: parity: `tools/aidlc-graph.ts` を engineFileExceptions へ宣言する（未宣言の場合）。

## 受け入れ条件（Issue と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | 実体パスからの compile で rules_in_context が正しく解決される | R101 / R102 |
| 2 | rules が解決できない環境（memory 実在 + 0 件）での compile が無音で成功しない | R103 |
| 3 | memory 不在の workspace では従来どおり成功する（互換） | R103 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

amadeus-runtime.ts 側の path 解決（#457/#458 で修正済みの別経路）、インストーラ設計（#451）、本 repo の stage-graph.json の再生成（#489 で復元済み。本修正後の compile が同一出力になることは eval で担保）。
