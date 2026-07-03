# G001：v2 パリティ完成の戦略境界

## 概要

- 状態: completed
- 対象: Intent `260704-v2-parity-completion` の Intent Capture & Framing
- 反映先: [intent-statement.md](intent-capture/intent-statement.md)

Intake（Issue #396 の整理）と Stage 1.1 の質問で、v2 パリティ完成の戦略を確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 基本戦略は本家 `dist/claude/`（MIT-0）からの適応コピーとする。適応点は、skill 名の amadeus-* への改名と、質問提示の amadeus-grilling プロトコルへの結線の 2 つである | active | intent-capture/intent-statement.md の目的 | なし |
| GD002 | SKILL.md と TS スクリプトは英語必須とする（スキルの日本語は NG）。規範側（AMADEUS.md、artifact rules、Skill Language Policy）を「英語化できる」から「英語必須」へ改定する。記述系成果物と gate 文言の日本語は維持する | active | intent-capture/intent-statement.md の成功条件と範囲 | Skill Language Policy の「英語化できる」規定 |
| GD003 | 独自 skill は amadeus-grilling、amadeus-domain-modeling、amadeus-validator の 3 個だけ残す。amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming は削除し、amadeus-steering は 0.1 と 2.2 へ畳み込む | active | intent-capture/intent-statement.md の範囲 | AMADEUS.md の補助入口 6 個の記載 |
| GD004 | 検査体制は本家 sensor と amadeus-validator の併用とする。sensor は stage 完了時の即時検査、validator は横断構造検査と CI を担い、必須節定義は共有する。Issue #393 の sensor 不採用判断は、再検討条件（hook 実行基盤の採用確定）の成立により上書きする | active | intent-capture/intent-statement.md の範囲 | docs/amadeus/aidlc-v2-sensor-learn-mapping.md の不採用判断 |
| GD005 | Operation phase（4.1〜4.7）を完全採用し、「Operation は Amadeus 対象外」契約を撤廃する。実行条件は本家と同じ CONDITIONAL とする | active | intent-capture/intent-statement.md の範囲 | stage catalog と AMADEUS.md の Operation 対象外規定 |
| GD006 | 完了済み 2 record（260703-aidlc-v2-full-compliance、260703-amadeus-skill-english-rollout-plan）は現状のまま残し、新形式へ移行しない | active | intent-capture/intent-statement.md の範囲 | なし |
| GD007 | 成功は、パリティ検査の機械化（名前写像と除外リスト付きの差分ゼロ）、`npm run test:all` green、この Intent 自身の新エンジン駆動での 1 周完走、の 3 点で観測する | active | intent-capture/intent-statement.md の成功条件 | なし |
| GD008 | 主対象は Amadeus 本体開発者とし、副次対象を将来の利用チームとする。設計の優先順位は自己開発の痛み（コンテキスト消費、不安定さ、乖離追跡コスト）の解消に置く | active | intent-capture/intent-statement.md の対象 | なし |

## 質問記録

### Q001

- 確認したいこと: この Intent の対象者は誰で、どんな痛みを解消するか。
- 確認が必要な理由: 成功条件の観測者と、設計の優先順位（自己開発か配布体験か）に効く。
- 推奨回答: 主対象は Amadeus 本体開発者、副次に将来の利用チーム。
- 推奨理由: このリポジトリは自己開発 workspace であり、痛み（コンテキスト消費、不安定さ、乖離追跡コスト）は開発者に生じている。
- ユーザー回答: 主対象は本体開発者。
- 確定判断: GD008

### Q002

- 確認したいこと: 成功は何で観測するか。
- 確認が必要な理由: 受理条件 ①（観測可能な成功基準）を満たす必要がある。
- 推奨回答: パリティ検査の機械化 + `npm run test:all` green + この Intent 自身の新エンジン駆動 1 周完走。
- 推奨理由: 「完全一致」は目視では観測できず、機械検査だけが再現可能な判定を与える。
- ユーザー回答: パリティ検査機械化（推奨案を採用）。
- 確定判断: GD007

### Q003

- 確認したいこと: 本家コピー後も日本語規範を維持するか。
- 確認が必要な理由: 本家 skill は英語であり、コピー戦略と現行規範（英語は例外扱い）が衝突する。
- 推奨回答: 記述系成果物は日本語維持、機械可読は英語のまま。
- 推奨理由: GD001（前 Intent）の二層方針と整合する。
- ユーザー回答: スキルは日本語 NG。規範側に例外設定（英語必須化）が必要。記述系成果物と gate 文言の日本語は現状維持。
- 確定判断: GD002

### Q004

- 確認したいこと: skill の命名をどうするか。
- 確認が必要な理由: コピー戦略の追従コストとパリティ検査の写像設計に効く。
- 推奨回答: コピー分は aidlc-* のまま。
- 推奨理由: パリティ検査と本家追従が単純になる。
- ユーザー回答: すべて amadeus-* に揃える。コピーは可だが amadeus-grilling との結線が必要（推奨と逆の指示で確定）。
- 確定判断: GD001

### Q005

- 確認したいこと: 完了済み 2 record の扱い。
- 確認が必要な理由: 新成果物契約の導入後、旧形式 record が validator の検査対象に残るかに効く。
- 推奨回答: そのまま残す。
- 推奨理由: 完了済み成果物の書き換えは改ざんに近く、履歴は git と record 自身で追跡できる。
- ユーザー回答: そのまま残す。
- 確定判断: GD006

### Q006

- 確認したいこと: 本家 sensor と amadeus-validator の役割分担。
- 確認が必要な理由: 検査責務が重なり、二重管理か穴のどちらかが生じ得る。
- 推奨回答: 両方組み合わせ（sensor は stage 即時検査、validator は横断構造検査と CI、必須節定義は共有）。
- 推奨理由: 検査の軸が違い（局所即時と横断永続）、併用で穴がほぼ消える。重複は必須節検査だけで、定義共有で解消できる。
- ユーザー回答: 両方組み合わせ。
- 確定判断: GD004

### Q007

- 確認したいこと: Operation phase（4.1〜4.7）の位置づけ。
- 確認が必要な理由: 現行契約「Operation は Amadeus 対象外」と対応漏れ 15 skill（Operation 系 7 個を含む）が衝突する。
- 推奨回答: 完全採用。
- 推奨理由: パリティが完全になり、デプロイや監視を扱う Intent もライフサイクルに乗る。条件が偽なら従来どおり SKIP される。
- ユーザー回答: 完全採用。
- 確定判断: GD005
