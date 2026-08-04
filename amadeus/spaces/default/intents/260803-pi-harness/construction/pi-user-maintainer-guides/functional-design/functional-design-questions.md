# Pi 利用者・保守者ガイド — Functional Design Questions

## 回答方針

Issue #2130 と承認済みの `requirements`、`unit-of-work`、`unit-of-work-story-map`、`components`、`component-methods`、`services` に記録済みの決定は再質問しない。以下は、その決定を実装可能な文書契約へ落とすための確認事項であり、すべて上流成果物と Pi Coding Agent 0.83.0 のローカル CLI / 同梱文書から確定できる。

## Questions and Answers

### Q1. 利用者向け文書と保守者向け文書をどこへ置くか

[Answer]: 既存の二言語構造へ合わせ、利用者向けは `docs/guide/harnesses/pi-coding-agent.md` と `docs/guide/harnesses/pi-coding-agent.ja.md`、保守者向けは `docs/harness-engineering/10-pi-coding-agent.md` と `docs/harness-engineering/10-pi-coding-agent.ja.md` に置く。対応する英日 index も同じ変更で更新する。

### Q2. 日英の「同期」を何で判定するか

[Answer]: 行数や見出し翻訳の一致ではなく、正準 `PiGuideContractSpec` が定義する section ID、claim ID、command ID、link ID の集合と順序を両言語から抽出して比較する。互換性、trust、supply-chain、pin など極性を誤ると危険な claim は、正準 `PiGuideFactCatalog` の predicate / polarity / typed value から locale renderer が可視文を決定的生成し、両言語へ同じ canonical fact payload と digest を埋め込む。各文書は同じ contract version を宣言し、同一 ID をちょうど一度含む。片方だけの変更、未知 ID、欠落、重複、順序差、version / fact digest 差は失敗とする。

### Q3. 保守者チェックリストの正本は文書か、実装か

[Answer]: 実装側の machine catalog が正本である。文書は `PiPortingCatalogProjection` の ID を参照する投影にすぎず、registration point、event mapping、driver capability、test inventory、generated inventory の各集合を machine catalog と双方向比較する。文書の固定件数や自己申告だけでは合格しない。

### Q4. Supply-chain 警告はどこまで具体化するか

[Answer]: Pi Package の extension は任意コードをホスト権限で実行し、skill もモデルへ任意操作を指示できること、Pi の project trust は sandbox ではないことを、導入手順より前に明示する。source のレビュー、git ref の pin、更新前の差分確認、`pi update`、`pi remove` / `pi uninstall`、setup CLI 経路の update / uninstall を説明する。

### Q5. 実装途中の未確認事項を文書でどう扱うか

[Answer]: `PiGuideContractSpec` が要求する claim は、実装 catalog または対応する実行証拠への参照を持つ場合だけ出荷可能とする。予定、固定件数、live green の推測は記載しない。正式 green evidence は `pi-conformance-evidence` の所有物であり、ガイドは証拠の参照方法だけを説明する。

## 曖昧性分析

- 回答に「未定」「場合による」などの material ambiguity はない。
- `requirements` の FR-VAL-003 / FR-VAL-004、NFR-SEC-003 と矛盾しない。
- 実際の resource path、event、driver、test の列挙は各所有 Unit の machine catalog から取得するため、この Unit が未実装の値を先取りしない。
