# phase skill の人間ゲートと承認 evidence 検査の決定論的契約

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | phase skill の人間ゲート契約と validator の構造検査を強化する技術目標である。 |
| scope | refactor | 既存の phase skill 契約と validator を、確定済みのゲート契約へ強化する Intent である。 |
| labels | phase-gate, grilling, validator, skill-change, self-development | 人間ゲート、grilling 起動、validator 検査、skill 変更、自己開発を表す。 |

## 目的

phase skill の人間ゲート（Task Generation 承認）と grilling 起動を、エージェントの自己判断に依存しない決定論的な契約にし、承認 evidence の実在を validator で機械検査できるようにする。

この Intent は [Issue #306](https://github.com/amadeus-dlc/amadeus/issues/306) と [Issue #307](https://github.com/amadeus-dlc/amadeus/issues/307) を根拠にする。
2 つの Issue は同じ Task Generation Gate 契約の両面（skill 側の契約定義と validator 側の evidence 検査）であるため、1 つの Intent に統合して扱う。

現在の契約には迂回路があり、`taskGeneration.status` が `ready_for_approval` でも実装へ進める。
grilling 起動の auto 判定にも客観基準がなく、ハーネスによって人間承認と grilling の実行有無が変わる。
validator も承認 evidence の対応を検査しないため、承認なしの `passed` が構造検証を通過する。

## 成功条件

- 人間承認なしに実装実行へ進めない契約が、`amadeus-construction-implementation-execution` と `amadeus-construction-bolt-preparation` の両方から読める。
- grilling 起動の決定論的トリガー（前段成果物の未確定事項に「現在 phase で判断する」と記録された項目が残っている場合は `grill_required`）が、ideation、inception、construction の 3 つの phase skill の decision review 記述に定義されている。
- `amadeus-ideation` の auto 判定で scaffold-only を許可する条件が、入力に確定判断の記録（Issue の確定判断、Grilling Decision Trail など）が存在する場合に限定されている。
- `taskGeneration.status` が `passed` の場合に `evidence` へ `kind: approval` の項目が含まれることを validator が検査し、承認 evidence なしの `passed` が fail になる。
- `ready_for_approval` は approval evidence なしで pass する。
- 既存の examples と `.amadeus/intents/**` が validator の pass を維持する。
- validator 変更は、先に失敗する eval を追加してから実装されている。
- skill 変更は source skill と昇格先成果物を promote 手順で同期し、PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 範囲

含めるもの:

- `amadeus-construction-implementation-execution` の前提を「`taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む」に変更する。
- `amadeus-construction-bolt-preparation` に、`ready_for_approval` へ到達したら停止して人間の承認を待ち、承認を得てから `passed` にする行動を肯定形で明記する。
- phase skill（ideation、inception、construction）の decision review への決定論的 grilling トリガーの追加。
- `amadeus-ideation` の auto 判定における scaffold-only 許可条件の限定。
- `amadeus-validator` への `taskGeneration.status: passed` と approval evidence の対応検査の追加と、その eval。
- source skill と昇格先成果物の promote 同期。

含めないもの:

- 承認内容の妥当性判断。人間判断のまま残す。
- approval evidence が指す成果物の内容検査。
- Task Generation 以外の新しい人間ゲートの追加。
- 完了済み Intent 成果物の遡及修正。

## 現在の phase

Ideation を開始する。

Inception では、ゲート契約の要求、受け入れ状態、対象 skill 本文と validator の既存コード分析を具体化する。
