# Questions：Intent Capture & Framing

| # | 確認したいこと | 推奨回答 | 回答 |
|---|---|---|---|
| 1 | この Intent の対象者は誰で、どんな痛みを解消するか | 主対象は Amadeus 本体開発者、副次に将来の利用チーム | 主対象は本体開発者 |
| 2 | 成功は何で観測するか | パリティ検査の機械化 + `npm run test:all` green + この Intent 自身が新エンジン駆動で 1 周完走 | パリティ検査機械化（推奨案を採用） |
| 3 | 本家コピー後も日本語規範（GD001 相当）を維持するか | 記述系成果物は日本語維持、機械可読は英語のまま | スキルは日本語 NG（SKILL.md と TS スクリプトは英語必須。規範側を英語必須へ改定する。記述系成果物と gate 文言の日本語は現状維持） |
| 4 | skill の命名をどうするか | コピー分は aidlc-* のまま | すべて amadeus-* に揃える（推奨と逆の指示で確定。コピーは可だが amadeus-grilling との結線を必須とする） |
| 5 | 完了済み 2 record の扱い | そのまま残す（新 validator では旧形式許容として扱う） | そのまま残す |
| 6 | sensor と validator の体制 | 両方組み合わせ（sensor は stage 即時検査、validator は横断構造検査と CI。必須節定義は共有） | 両方組み合わせ |
| 7 | Operation phase（4.1〜4.7）の位置づけ | 完全採用（CONDITIONAL で組み込み、「Operation は Amadeus 対象外」契約を撤廃） | 完全採用 |

補足として、質問提示の途中で人間から自発的指示が 2 件あった。

- 本家から SKILL.md や TS スクリプトをコピーするのは可だが、amadeus-grilling との結線が必要である（#4 の確定に反映）。
- amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming は削除し、amadeus-grilling、amadeus-domain-modeling、amadeus-validator だけを残す。amadeus-steering は本家に対応 skill がないため 0.1 と 2.2 へ畳み込む（Intake で確定済み）。
