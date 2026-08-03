# Scope Definition 質問記録 — 260801-silent-drop-gate

回答モード: Guide me

上流入力: `ideation/intent-capture/intent-statement.md`、`ideation/feasibility/feasibility-assessment.md`、`ideation/feasibility/constraint-register.md`

既決事項（走査対象、免除契約、15秒以内、偽陽性率5%以下、fixture 100%、fail-closed、#1963 の回帰検証化）は質問せず、そのままスコープ制約へ引き継ぐ。

## Q1. 初期ベースラインをどの水準で確定するか？

A. （推奨）全検出を分類し、#1878・#1874 は本 intent で修正して除去し、それ以外の真陽性だけを理由付きベースラインへ登録する
B. 既存の真陽性をすべて修正し、ゼロ件になるまでゲートを導入しない
C. 初回検出を分類せず、すべてベースラインへ登録する
D. ベースラインを使わず、新規・既存を問わず常に全件を CI fail にする
E. #1878・#1874 も修正せず、既存違反としてベースラインへ登録する
X. Other（具体的に記載）

[Answer]: A

## Q2. Must-have と Nice-to-have の境界をどう置くか？

A. （推奨）Must = 3形態の検出、固定 ast-grep、理由付き単一ノード免除、ベースライン・免除の shrink-only、fail-closed 診断、CI 接続、#1878・#1874 修正、#1963 回帰検証、配布再生成・包括テスト。Nice = なし
B. Must = 静的ゲートのみ。関連バグ修正と回帰検証は後続 intent
C. Must = 関連バグ修正のみ。静的ゲートは後続 intent
D. Must = 検出とローカル CLI のみ。CI 接続は Nice-to-have
E. Must = bare catch 検出のみ。戻り値破棄・偽成功は Nice-to-have
X. Other（具体的に記載）

[Answer]: A

## Q3. capability 間の依存関係と実装順をどう固定するか？

A. （推奨）最新 main・[PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 統合確認 → 検出ルールと fixture → 実リポジトリ census・分類 → ベースライン確定 → #1878・#1874 修正と #1963 回帰検証 → ratchet・CI 接続 → 配布再生成・全体検証
B. #1878・#1874 の修正を先行し、その後に修正前ベースラインを推定してゲートを作る
C. CI 接続を最初に行い、ルール・fixture・ベースラインは後から整える
D. 配布再生成を最初に行い、正本の実装を後から追従させる
E. 明示的な依存順を置かず、すべて並行で進める
X. Other（具体的に記載）

[Answer]: A

## Q4. 変更をどの単位でレビュー可能にまとめるか？

A. （推奨）[1つの統合 PR](https://github.com/amadeus-dlc/amadeus/pulls) にまとめ、検出基盤 → census・baseline → ランタイム修正 → CI・配布・検証の順にレビュー可能なコミットへ分ける
B. 静的ゲートと各関連 Issue を別々の [PR](https://github.com/amadeus-dlc/amadeus/pulls) に分け、最後に統合する
C. 関連バグ修正だけを先に別 [PR](https://github.com/amadeus-dlc/amadeus/pulls) とし、静的ゲートは後続 intent に送る
D. すべてを1コミットへまとめる
E. [PR](https://github.com/amadeus-dlc/amadeus/pulls) 単位は後続の Delivery Planning まで未決とする
X. Other（具体的に記載）

[Answer]: A

## Q5. 本 intent 固有のハードデッドラインを置くか？

A. （推奨）置かない。日付ではなく、合否基準 F-01〜F-08 と全 drift guard の達成を完了条件にする
B. 次回リリースまでに全 Must-have を完了する
C. 静的ゲートだけを次回リリースまでに完了し、ランタイム修正は後続にする
D. 24時間以内に完了し、未達項目は Nice-to-have へ落とす
E. 期限は存在するが、現時点では未確定の blocking dependency とする
X. Other（具体的に記載）

[Answer]: A

## 回答記録

- 2026-08-02T01:19:33Z — Guide me 一括回答: 「すべて推奨」
- 解決結果: Q1=A、Q2=A、Q3=A、Q4=A、Q5=A
- 2026-08-02T01:20:08Z — 統合要約を確認し、選択肢1「Looks correct」で成果物生成を承認
- 2026-08-02T01:26:20Z — Approval & Handoff の規範整合確認により Q4 を補正。「単一の統合 [PR](https://github.com/amadeus-dlc/amadeus/pulls)」ではなく「単一 initiative、Construction は Bolt ごとの独立 [PR](https://github.com/amadeus-dlc/amadeus/pulls)」を正とする
