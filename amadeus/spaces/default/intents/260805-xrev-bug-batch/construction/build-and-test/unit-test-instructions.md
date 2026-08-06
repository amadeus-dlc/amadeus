# Unit Test Instructions — 260805-xrev-bug-batch

Test Strategy: **Comprehensive**。ただし本 intent は既存 6 bug の修正であり、新規コンポーネントは無い。
したがって「component あたり 15 件」は上限の目安であって割当ではなく、**要件（FR-1〜FR-6）駆動**で配置した。

## フレームワークと実行

```bash
bun test tests/unit/<file>                 # 単体
bun tests/run-tests.ts --unit              # unit tier 一括
```

`bun:test`（Bun 内蔵）。設定ファイルは追加していない（brownfield の既存スイートをそのまま使用）。

## 要件別の配置

| 要件 | unit 面のテスト |
|---|---|
| FR-1 #2147 reviewer invocation | `t245`（integration 側が主。unit 面は runtime の純関数） |
| FR-2 #1946 ballot 受理時刻 | election 台帳の純関数（受理時刻の刻印と順序） |
| FR-3 #2251 completion 待ち窓 | `t427`（Goal 突合の純関数。`settleable` 分類を新規に固定） |
| FR-4 #2145 verification.md | 文書のみ。テスト無し（docs contract 側で担保） |
| FR-5 #1953 SWARM 世代 | `t402`(unit) の verdict 純関数 |
| FR-6 #2112 cast guard | `t420-unchecked-cast-guard`（連鎖規則と綴りの検出） |

## 期待カバレッジ

絶対値の目標は置かない。本 repo は **patch coverage gate**（追加行のうち LCOV 計測可能な行に未カバーを許さない）と
**coverage registry の ratchet**（被覆済み件数が減らない）で担保する。したがって unit テストの合否基準は
「追加行が測定可能なら被覆されていること」であり、率ではない。

## テストデータ

すべて `mkdtemp` の一時ディレクトリに fixture を作る。実 intent record を読み書きするテストは書かない
（本 intent の全テストがこの規律を守っていることを確認済み）。
