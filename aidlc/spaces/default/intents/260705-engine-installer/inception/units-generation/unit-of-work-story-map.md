# Unit of Work Story Map — Engine Installer（260705-engine-installer）

上流入力: [unit-of-work.md](unit-of-work.md)、[stories.md](../user-stories/stories.md)、[requirements.md](../requirements-analysis/requirements.md)

## 対応表

| Unit | ストーリー |
|---|---|
| u001-engine-installer | US-1（導入の成立）、US-2（冪等）、US-3（非対象資産の不変）、US-4（衝突時の安全）、US-5（事前チェック）、US-6（README）、US-7（Codex 検証）、US-8（CI 継続検証）、US-9（AMADEUS.md 品質） |

## カバレッジ検証

- 全 9 ストーリー（stories.md の US-1〜US-9）が単一 Unit に属し、対応漏れはない。MoSCoW 集計（Must 7 / Should 2）は stories.md と一致する。
- 各ストーリーの受け入れ条件は requirements.md の FR-2 系 eval（US-2/3/4/5/7/8/9）または手動確認可能な出力（US-1/6）に対応する（stories.md の対応 FR 列）。

## Unit 内のストーリー実装順序

TDD（NFR-1）の順序で実装する。

1. US-8 の骨格（専用 eval の失敗検証 = RED）を最初に書く。
2. US-1（導入の成立）→ US-5（事前チェック）→ US-4（衝突時の安全）→ US-2（冪等）→ US-3（非対象資産の不変）→ US-9（AMADEUS.md 品質）の順に、対応する eval 項目を GREEN にしながら実装する。
3. US-7（Codex 検証 = .agents/ 完全性検査）は US-1 の配置結果に対する検証追加として組み込む。
4. US-6（README）は挙動確定後に執筆する（REFACTOR 段階）。

この順序は Unit 内の実装手順であり、Bolt の出荷順（economic sequencing）は delivery-planning で確定する。
