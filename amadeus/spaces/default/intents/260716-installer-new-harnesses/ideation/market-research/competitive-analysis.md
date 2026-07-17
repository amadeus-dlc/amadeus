# Competitive Analysis — installer の新ハーネス追加(installer-new-harnesses)

> ステージ: market-research (Ideation) / 作成: 2026-07-16
> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`(列挙2値追加+ユーザー可視契約の固定)
> 方式: **前 intent 260708-installer-distribution の competitive-analysis(出典付き、2026-07-07 調査・07-08 再確認)の差分再利用** — 市場全体像は不変のため本書は本 intent 固有のデルタ(競合の「対応エージェント追加」の扱い)のみを扱う。全体比較表は前 intent 成果物を正とする(requirements-analysis:c1 の差分更新)。

## デルタ: 競合はエージェント(ハーネス)追加をどう扱っているか

| 観点 | cc-sdd | GitHub spec-kit | Amadeus(本 intent 前) |
|------|--------|-----------------|------------------------|
| 対応エージェントの列挙方式 | CLI 引数の既知リスト(8エージェント、13言語)— リリースごとに拡張 | `--integration <agent>` の既知リスト(Claude Code/Copilot/Gemini/Cursor 等)— リリースごとに拡張 | installer 内の閉じ列挙4値(dist ツリーは open-set と非対称) |
| 追加時の変更面 | パッケージ再リリース(npm @latest) | テンプレート+CLI の同時更新(GitHub Release) | **installer 5ファイルの手動更新**(前 intent RE 台帳で全数確定) |
| 未対応名の UX | エラー+選択肢列挙 | エラー+選択肢列挙 | エラー+選択肢列挙(`Expected one of ...` — 様式は競合と同水準) |

- 両競合とも「対応エージェントの追加 = 既知リストへの明示追加+リリース」であり、**closed-enum 自体は業界標準**。Amadeus の欠陥は closed-enum であることではなく、dist 面(open-set)との**非対称が全数性テストで固定されていない**こと — 本 intent の焦点はここ(intent-statement の成功の姿と一致)。
- 出典: 前 intent competitive-analysis の一次出典([cc-sdd GitHub/npm](https://github.com/gotalab/cc-sdd)、[Spec Kit docs](https://github.github.com/spec-kit/index.html) — 2026-07-07 調査・07-08 再確認)。本デルタは同出典の記載範囲の再読で、新規外部照会なし(確信度: 高 — 列挙方式は両者の CLI 仕様の安定面)。

## 差別化への含意

競合は「追加はリリース作業」で済ませており、追加漏れの機械検出(dist ⇔ installer の全数性テスト)を公開していない。本 intent の「列挙全数性のテスト固定」は保守性面の小さな差別化になる(利用者可視の UX は既に同水準)。
