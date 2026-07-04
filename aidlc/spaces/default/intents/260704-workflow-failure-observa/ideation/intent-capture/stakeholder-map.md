# Stakeholder Map

## Key Stakeholders

| Stakeholder | Interest | Pain | Required outcome |
|---|---|---|---|
| Amadeus maintainer | 失敗の証拠、設計判断、PR 検証結果を追跡できること。 | workflow 失敗が会話ログだけに残ると、原因分析と merge 判断が難しい。 | audit、doctor、test、Intent 成果物から失敗根拠を確認できる。 |
| AI-DLC agent runner | workflow を再開し、失敗時に次の行動を判断できること。 | error directive、hook drop、subagent 失敗が見えないと再開判断が曖昧になる。 | 失敗の発生箇所と severity が見える。 |
| PR reviewer | PR の目的、変更範囲、検証結果を短時間で確認できること。 | 個別 Issue の修正が横断的で、PR の妥当性を判断しにくい。 | Issue と Intent 成果物の traceability がある。 |
| CI 監視担当者 | 失敗が CI 由来か workflow 由来かを切り分けられること。 | audit 欠落や hook drop の見落としが CI 対応を遅らせる。 | doctor と deterministic test で再現可能な証拠がある。 |
| Contributor | どの Issue がどの設計判断と実装単位に対応するかを理解できること。 | 失敗可観測性の論点が複数 Issue に分散している。 | Intent、Issue、PR の関係が明示される。 |

## Decision-Makers

最終判断者は Amadeus maintainer である。

maintainer は次を承認する。

- この Intent の scope と対象 Issue。
- parity lock 対象への変更経路。
- taxonomy 変更の有無。
- PR の粒度。
- merge 可否。

ユーザーは、AI-DLC gate で各ステージの approve または request changes を判断する。

## Influencers

AI-DLC product agent は、対象 Issue を顧客価値と成功指標に接続する。

AI-DLC architect agent は、失敗検出の信号源、audit 境界、hook 境界、parity lock の技術制約を整理する。

PR reviewer は、変更が Issue と Intent の範囲に収まっているかを確認する。

CI と validator は、成果物構造と実装結果の検証証拠として判断に影響する。

## Communication Requirements

各 phase の成果物は日本語で記録する。
機械可読ラベル、イベント名、ファイル名、コマンド名は英語のまま使う。

Issue への言及では、対象 Issue の番号とリンクを残す。
PR に言及する場合は、必ず PR リンクを添える。

parity lock に関係する判断は、Feasibility 以降で対象ファイル、選択肢、採用理由、分割判断を記録する。

PR 前には、対象 Intent の validator と標準検証の結果を記録する。
標準検証を省略する場合は、理由と後続確認先を成果物または PR 説明に残す。

## Escalation Paths

parity lock 対象への変更が避けられない場合は、maintainer の明示承認を求める。

subagent 成功失敗の判別が hook 入力から信頼できない場合は、推測実装を避け、区別不能である調査結果を記録する。

conductor 逸脱の検出シグナルが過検出になりそうな場合は、実装を急がず、検出範囲と対応方針を分割 Issue に落とす。

PR review で本 Intent の範囲外だが有効な指摘を受けた場合は、後続 Issue 候補として扱う。
