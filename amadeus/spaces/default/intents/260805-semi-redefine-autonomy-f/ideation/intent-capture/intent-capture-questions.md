# Intent Capture — 明確化質問

> **E-OC1 判定(選挙不要判定の証跡)**: 本 intent は Issue #2253(クロスレビュー2名成立、収束 ESTABLISHED_WITH_REFINEMENTS)とユーザー裁定(2026-08-05 の会話: full grant 許可 / PR はユーザーがレビュー・マージ / 後方互換なし / semi=full−節目 / walking skeleton は semi で人間裁定)で事前確定済み。以下の質問はすべて FR-DEC-002 経路④(agent recommendation)として full grant(intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7)下で自動裁定し、`unreviewed` queue へ積んだ(帰宅後検収可能)。
> 承認: full grant による自動裁定(GRANT_EXERCISED)、grant 発行のユーザー確認発話「full grantをあなたに許可します」2026-08-05T04:27:00Z 頃(会話 verbatim)、裁定記録 2026-08-05T05:10:00Z
> 裁定 ID(AUTO_DECIDED・unreviewed): Q1=auto-decision-b4b29a76fbb8c478439446f132271be1 / Q2=auto-decision-362ee9f3809377de0447ef03e7747017 / Q3=auto-decision-9a9db3356f6a62d95d41dd58b2337a57 / Q4=auto-decision-251acd198ef6a6394d7c64c3b127413f(いずれも decider=agent-recommendation、solo-election は native capability 不在の loud degradation 記録付き)

## Q1. どのビジネス課題を解決するか？

- A. headless(claude -p・夜間・CI)で自律走行を開始する決定的な入口が無く、semi の走行単位が質問発生に依存して不定形である(#2253 の背景そのまま)
- B. full grant の発行 UX が重い
- C. エンジンの性能問題
- D. ドキュメントの不足
- E. その他の運用課題
- X. Other

[Answer]: A — #2253 背景節からの機械導出。旧 #2067 の第一目的(非対話実行での完全自律走行)の起動側の欠片(「発行/起動時に明示」の grilling 置換での脱落)と、semi 質問 park の不定形走行の2点。decision: agent recommendation(unreviewed queue)

## Q2. 顧客は誰か(内部/外部)?どんな痛みか？

- A. Amadeus を headless / スケジュール実行で運用する開発者(内部 = 本リポジトリのユーザー自身が第一顧客)。痛み: 起動宣言がプロンプト文依存で再現性が無い・semi が質問で park して朝まで止まる
- B. 外部の Amadeus 利用チーム全般
- C. フレームワーク開発者のみ
- D. CI 基盤の管理者
- E. その他
- X. Other

[Answer]: A — #2253 エレベーターピッチ「Amadeus を headless / スケジュール実行で運用する開発者 向けの」からの機械導出。decision: agent recommendation(unreviewed queue)

## Q3. 成功はどう測るか？

- A. #2253 完了条件の全数達成: semi の質問が4段で無人解決(方針なしは3段縮退)・walking skeleton/phase 境界は人間のまま・`--autonomy semi|full` の起動宣言が動作・grant 不在 full 起動の fail-closed 停止を落ちる実証で固定・旧仕様ピン(テスト/docs 11ファイル)の明示改訂
- B. 起動フラグの追加のみ
- C. semi の質問自動化のみ
- D. ドキュメント更新のみ
- E. その他
- X. Other

[Answer]: A — #2253「期待結果・完了条件」節からの機械導出(クロスレビュー反映済みの版)。decision: agent recommendation(unreviewed queue)

## Q4. このイニシアチブのトリガーは何か？

- A. intent 260803-intent-autonomy 完了直後の運用ギャップ発見 — `claude -p` での起動詰まりの指摘(ユーザー)と、#2067 旧本文の「発行/起動時に明示」が grilling 置換(2026-08-03T03:01Z)で脱落していた事実の確認、および「semi=full−節目」というモード軸の一貫化裁定(2026-08-05)
- B. 市場圧力
- C. 規制対応
- D. 技術的負債の解消
- E. その他
- X. Other

[Answer]: A — 本セッションの実測経緯(userContentEdits 実測・ユーザー裁定)からの機械導出。decision: agent recommendation(unreviewed queue)
