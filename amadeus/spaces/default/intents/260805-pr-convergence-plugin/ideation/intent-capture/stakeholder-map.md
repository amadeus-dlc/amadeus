# Stakeholder Map: PR 収束 opt-in プラグイン

## Key Stakeholders and Interests

| ステークホルダー | 関心 | 影響 |
|---|---|---|
| 人間承認者(ユーザー) | PR マージ前に全レビュースレッドが収束済みであることの機械保証。マージ承認境界(no-AI-merge)の不変 | install 判断と PR マージ承認の最終決定者 |
| AI conductor(Amadeus 実行セッション) | Bolt 完了条件としての収束レポート生成義務。batch 前進が fail-closed でブロックされる | 収束ループ(0)-(5) の実行主体 |
| 外部 AI レビュアー(CodeRabbit / Bugbot 等) | 指摘が終端処理(修正 / Issue 化 / 却下+resolve)まで到達すること | thread 台帳の一次入力源(`__typename=="Bot"` 判定) |
| Amadeus メンテナー | ガード本体を core 1定義所有のまま保つ(検証劇場を作らない)。compose overlay 拡張の保守性 | プラグイン機構(compose/compile/run 3層 trust)の所有者 |
| 未 install workspace の利用者 | ワークフロー無影響の保証 | 受け入れ基準1の対実証(produces 不変)で保護 |

## Decision-Makers vs. Influencers

- **Decision-maker**: ユーザー(install の opt-in 裁定・PR マージ承認・requirements 決定点3件の裁定)
- **Influencer**: 外部 bot レビュアー(指摘は実弾 — #1958 の全是正コミットが bot スレッド ID に紐づく実測)、#1902 / #1887 の関連 Issue 群(責務分担の相互リンク)

## Communication Requirements

- 収束通知は機械集計値で報告(工程(5))— 記憶・見込み数値の禁止(numbers-from-command-output-only)
- GitHub 不達時の挙動(park か明示 override か)は requirements でユーザーへ諮る(gh-scripts-boundary「恒久停止させない」との調停)
- mirror Issue #2263 が本 intent の状態を一方向共有する
