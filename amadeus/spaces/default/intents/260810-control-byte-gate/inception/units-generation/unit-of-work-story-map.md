# Unit of Work Story Map — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(Intent analysis のユーザー価値 = 検証規律の保全)、components.md(価値を運ぶコンポーネント構成)、component-methods.md(診断出力 = コミッターの一次 UX)、services.md(exit code 契約 = CI の UX)、component-dependency.md(データフロー = 検出体験の経路)、decisions.md(ADR-1 = 「どの PR でも守られる」という体験の根拠)

## ジャーニー: コミッター(人間・エージェント)

| ステップ | 体験 | 担う Unit/FR |
|---|---|---|
| 混入発生(エディタ事故・貼り込み・起草時逐語引用) | 気づけない(不可視) | — (欠陥クラスの前提) |
| PR 作成 | CI の control-byte-gate ジョブが常時起動 | U1 / FR-CBG-7,8 |
| 検出 | `<path>: control byte 0xNN at offset N` で該当箇所を名指しされる | U1 / FR-CBG-6、NFR-2 |
| 修正 | エスケープ表記へ直して再 push → green | U1 / FR-CBG-4 |
| 正常系 | 何も意識しない(偽陽性ゼロ・数十秒のジョブ) | U1 / FR-CBG-10,14 |

## ジャーニー: 検証規律の運用(grep 依存の全数列挙・不在主張)

混入が PR 段で遮断されるため、tracked コーパスの「grep が全ファイルを見えている」前提が恒久保全される(requirements.md Intent analysis)。

## ストーリー割付

全ストーリーが単一 Unit U1 に割付(unit-of-work.md)。分割しない根拠は units-generation-questions.md Q1 裁定。
