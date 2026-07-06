# Intent Capture — 明確化質問

**Intent**: mattpocock の grilling スキルを Amadeus Grilling として統合する(stage-protocol の対話モード追加+スタンドアロンスキル)
**Stage**: intent-capture (1.1) / **Depth**: Standard / **Scope**: grilling-integration

---

## Q1. この統合が解決する中心的な課題はどれですか?

既存の対話モード(Guide me / I'll edit the file / Chat)に対して、grilling が埋めるギャップの認識を確認します。

A. Guide me の選択式では前提の深掘りができず、想定内の回答を選んで終わりがち — 設計判断が浅くなる
B. 承認ゲートが形骸化しやすい — 成果物を十分に叩かないまま Approve されてしまう
C. Chat モードが非構造的すぎて、決定事項の抽出漏れや議論の脱線が起きる
D. 質問数が多くバッチ提示されると認知負荷が高い — 1問ずつ深く考えたい
E. 上記の複数(組み合わせを回答欄に記載)
X. Other (please specify)

[Answer]: A — 選択式では前提の深掘りができず、設計判断が浅くなる

## Q2. 主要な受益者(顧客)は誰ですか?

A. この repo の開発者自身 — ドッグフーディングでフレームワーク開発の質を上げる
B. Amadeus を導入する外部チーム全般 — 配布物(dist)の標準機能として
C. まず自分たち(A)、検証後に外部(B)へ — 段階的
D. 特定のパイロットユーザー/チームからのフィードバック起点
X. Other (please specify)

[Answer]: X — ドッグフーディング(A)とユーザーの便益(B)の両方。まず自分たちで検証しつつ、配布物の標準機能として外部チームにも価値を届ける

## Q3. 成功をどう測りますか?(select all that apply)

A. 機能完成: ゲート付き全ステージで「Grill me」モードが選択・完走できる
B. 品質シグナル: ゲートでの Request Changes(手戻り)が減る
C. 利用シグナル: 実ワークフローでのモード選択率・スタンドアロンスキルの起動回数
D. 定性評価: ドッグフーディングで「前提の見落としを拾えた」実感が得られる
E. 監査完全性: grilling 経由の決定も既存の質問ファイル+監査ログ契約に完全準拠する
X. Other (please specify)

[Answer]: A, B, D, E — 機能完成 / 手戻り減少 / 定性評価 / 監査完全性

## Q4. このイニシアチブのトリガーは何ですか?

A. 自身の利用体験 — grilling を使って有用性を実感した/しそうだと判断した
B. 既存モードへの具体的な不満が蓄積していた
C. コミュニティ動向 — スキルエコシステムの良いものを取り込む方針
D. Amadeus の差別化 — 対話品質を売りにしたい
X. Other (please specify)

[Answer]: A — 自身の利用体験から有用性を実感

## Q5. スタンドアロンスキル(/amadeus-grilling)の位置づけは?

A. read-only セッションスキル(amadeus-session-cost 同型) — ワークフロー状態を進めず、いつでも起動可
B. ゲート前の成果物レビュー専用 — ステージ成果物を対象にグリルする用途に限定
C. 汎用 — ワークフロー外の任意の計画・設計も対象(元スキルの用途をそのまま提供)
D. A + C のハイブリッド(read-only で汎用)
X. Other (please specify)

[Answer]: D — read-only で汎用。ワークフロー状態を進めない read-only セッションスキル(session-cost 同型の分類)として、ステージ成果物もワークフロー外の計画も対象にできる

## Q6. 展開範囲は?

A. 全4ハーネス(claude / codex / kiro / kiro-ide)同時 — package.ts の配布契約に乗せる
B. Claude Code 先行、他ハーネスは検証後
X. Other (please specify)

[Answer]: A — 全4ハーネス(claude / codex / kiro / kiro-ide)同時。package.ts の配布契約に乗せる

## Q7. 元スキル(MIT)への帰属表示はどうしますか?

A. 取り込むスキルファイルに MIT 帰属コメント+docs にクレジット記載
B. docs のみにクレジット記載
C. リポジトリの NOTICE/THIRD-PARTY ファイルに集約
X. Other (please specify)

[Answer]: A — 取り込むスキルファイルに MIT 帰属コメント+docs にクレジット記載
