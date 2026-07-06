# Business Rules — guide-ops

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 執筆の規則

- BR-1: 本文は実体（`.agents/amadeus/agents/`、`amadeus-common/protocols/stage-protocol.md`、`skills/amadeus/references/question-rendering.md`、`amadeus-utility.ts help` の実出力）から書き起こす。上流 docs/guide の対応章は開かない（NFR-2）。
- BR-2: コマンド出力は隔離 workspace の実行結果のみ（省略「…」と `<workspace>` 置換は明記）。protocol 文書の引用は要旨で書き、転載しない。
- BR-3: 契約の詳細（stage ごとの lead/support 対応、gate 状態機械）はガイドに複製せず、lifecycle 契約 / stage-catalog へリンクで委ねる。
- BR-4: 英語 `*.md` = 正、`*.ja.md` 併置、Cross-linking rules。日本語は japanese-tech-writing 規範（字面重複語を避ける）。
- BR-5: 07 章は利用者が見る render 層の 4 択を正とし、protocol 契約層との関係は 1 文の補足に留める（requirements の粒度判断）。

## 変更範囲の規則

- BR-6: 変更対象は新設 6 ファイル + index 対の該当 3 行ずつ（C-1）。skills/ 配下パスの引用は #572 で変わりうることを意識する（C-2）。
- BR-7: コミットは章対単位（06 対 / 07 対 / 12 対 / index 対）。
- BR-8: 対象外文書の乖離は修正せず leader へ Issue 候補として報告する。
