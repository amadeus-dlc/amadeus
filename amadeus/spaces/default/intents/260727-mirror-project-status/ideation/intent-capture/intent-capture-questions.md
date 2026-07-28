# Intent Capture 質問ファイル — 260727-mirror-project-status

**モード**: Grill me(1問ずつ動的生成・推奨回答付き)
**入力**: GitHub Issue #1560「Intent Mirrorで所属GitHub ProjectのStatusをIntent状態と同期する」(https://github.com/amadeus-dlc/amadeus/issues/1560)
**方針**: Issue が状態マッピング・失敗セマンティクス・受入条件・非対象を詳細に規定済みのため、質問は未決の判断事項のみに絞る(cid:intent-capture:c1)。

---

## Q1. 対象顧客の確認(推定確認)

自己調査に基づく推定: 本機能の対象顧客は「Amadeus の Intent Mirror を有効にし、GitHub Projects ボードで複数 intent の進捗を俯瞰する運用者」であり、当面の一次ユーザーはこのリポジトリの運用者自身(ソロ運用)。将来的には Amadeus 配布先のチーム利用者にも及ぶ。(確信度: high)

A. はい、その推定で進める(推奨)
B. いいえ、違う(通常の判断質問に降格して議論する)
X. Other (please specify)

[Answer]: A (2026-07-27, Grill me モード)

## Q2. 成功指標の主軸

Issue は受入条件15項目を列挙するが、intent としての「成功の一言」(success metric の主軸)は未規定。何を主軸に置くか。

A. 収束性: mirror 対象 intent のライフサイクル節目後、所属全 Project の Status が手動編集ゼロで期待値に収束する(drift 0)。安全性(Done 未達成時の close 阻止)と診断可能性(repair status での drift 検出)はその支持条件(推奨)
B. 安全性最優先: 「Status 同期が未完了なら close しない」保証を主指標とし、収束の速さ・手動編集ゼロは副次
C. 診断可能性最優先: repair status で drift・権限不足・部分成功が常に見えることを主指標とする
X. Other (please specify)

[Answer]: A (2026-07-27, Grill me モード)

## Q3. スコープ境界の確認 — Issue 全体を本 intent で扱うか

Issue #1560 の受入条件は15項目(既存挙動の不変・複数 Project・parked マッピング・safety-blocked・pending 収束・repair status 拡張・認証ドキュメント・テスト・dist 再生成)。本 intent の初期スコープシグナルとして、この全条件を一度に扱うか、段階分割するか。

A. Issue 全体を本 intent で扱う。受入条件15項目が bounded で、部分実装(例: 同期だけ入れて診断なし)は close 阻止や部分成功の扱いが宙に浮くため分割点が不自然(推奨)
B. コア同期(create/sync/close 統合+状態マッピング)を先行し、repair status 拡張と Status 名上書き設定は後続 intent に分割する
C. さらに小さく、単一 Project・既定マッピングのみの walking skeleton 相当を本 intent とし、複数 Project・上書き・parked マッピングを後続へ
X. Other (please specify)

[Answer]: A (2026-07-27, Grill me モード)

## Q4. イニシアチブのトリガー確認(推定確認)

自己調査に基づく推定: トリガーは「Intent Mirror が直近の intent 群(mirror-productization、mirror-auto-modes、mirror-state-split 等)で実運用段階に入り、Issue 本文の同期は自動化された一方、GitHub Projects ボード上の Status 更新だけが手動作業として残った運用ギャップの解消」。市場圧力や規制ではなく、自プロダクトの運用完成度向上が動機。(確信度: high)

A. はい、その推定で進める(推奨)
B. いいえ、違う(通常の判断質問に降格して議論する)
X. Other (please specify)

[Answer]: A (2026-07-27, Grill me モード)

## 裁定の記録

- 全4問を Grill me モードで実施し、合意サマリー(Q1 顧客 / Q2 成功指標=収束性 / Q3 スコープ=Issue 全体 / Q4 トリガー=運用ギャップ解消)をユーザーが確認・確定した。
- ユーザー承認: 2026-07-27T03:54:50Z(合意サマリー確認「はい、確定」)
