# Intent Capture 質問(260814-plugins-rename-drift)

> 対象: Issue #2996(pr-convergence → github-pr-convergence 改名)+ Issue #2997(git-drift プラグイン新設 + plugin.settings 設定機構)。
> 両 Issue はクロスレビュー2名成立済みで決定事項が多いため、質問は intent 境界を確定する2問に絞る(予算8問中2問使用)。
> Issue・承認済み成果物にある決定は再質問しない(project.md ノルム cid:requirements-analysis:c5)。
> ユーザー承認: 2026-08-14T07:18:17Z — guided モードで Q1=A / Q2=A を本人回答(QUESTION_ANSWERED 監査イベントのタイムスタンプから転記)。

## Q1. スコープ境界の確認

本 intent のスコープは「#2996 の改名(ステージ slug・センサー id・スキル名・ツールファイル名は不変)+ #2997 の git-drift プラグインと plugin.settings 設定機構」とし、残り2プラグイン(coverage-patch-quick / formal-model-check)への命名規約適用は Issue 記載どおり対象外、とする理解でよいですか?

A. はい — 両 Issue の記載スコープのみ(推奨)
B. いいえ — coverage-patch-quick / formal-model-check の規約適用可否の裁定も本 intent に含める
C. いいえ — その他のスコープ調整がある
X. Other (please specify)

[Answer]: A. はい — 両 Issue の記載スコープのみ(2026-08-14, Mode: guided)

## Q2. 成功指標(intent 完了条件)の確認

成功指標を「#2996 → #2997 の順で、各 Bolt の PR が人間承認を経てマージされ、両 Issue の完了条件(AC)がすべて実測で満たされること(build 再現・plugin-conformance-e2e・既存スイート・coverage/complexity ゲート green、残存参照検査 0 件、落ちる実証の完了を含む)」とする理解でよいですか?

A. はい — 両 Issue の AC + 全ブロッキングゲート green + PR マージ(人間承認)で完了(推奨)
B. いいえ — 追加の成功指標がある
X. Other (please specify)

[Answer]: A. はい — 両 Issue の AC + 全ブロッキングゲート green + PR マージ(人間承認)で完了(2026-08-14, Mode: guided)
