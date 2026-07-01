# R003 decision review と Skill Contract の配置

## 要求

stage 前提確認を `amadeus-decision-review` の判断ノードまたは Skill Contract の入力証拠へ接続できる。

## 背景

decision review は phase skill 起動時の分岐判断を扱う。

Skill Contract は、skill の事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、feedback 条件を表す。

stage 前提確認は、実行順序としては decision review に近く、契約境界としては Skill Contract に近い。

## 受け入れ条件

- `amadeus-decision-review` に、stage 前提確認の判断ノードまたは同等の確認順序がある。
- Skill Contract に、skill 供給元と stage 前提を入力証拠として扱う説明がある。
- phase skill は、起動時の判断材料として stage 前提確認を参照できる。
- validator や evaluator の結果を、stage0 採用判断そのものとして扱わない。

## 依存

- R001
- R002

## 対応する対象境界

- SC-IN-004

## 未確認事項

- stage 前提確認を decision review と Skill Contract のどちらに主として置くかは、Functional Design で確定する。
