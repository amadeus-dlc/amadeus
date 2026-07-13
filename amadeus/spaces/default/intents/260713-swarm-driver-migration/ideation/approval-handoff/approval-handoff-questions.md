# 承認とハンドオフの質問

- **モード:** Guide me
- **深度:** Standard

## Q1. Ideation のgo / no-go判断

現在の成果物はscopeと完了条件を確定している一方、Agent TeamsとCodex Ultraのnative証跡はRG-01として未検証である。Inceptionへ進み、RG-01を実装着手前のstop conditionとして扱うか。

A. **条件付きGO（推奨）** — Inceptionへ進み、RG-01が成立しなければ影響driverの実装前にscopeへ戻る
B. **HOLD** — Inceptionへ進む前に、Agent TeamsとCodex Ultraのlive probeを先に完了する
C. **NO-GO** — Initiativeをparkまたは終了し、別の問題設定へ戻る
X. **Other (please specify)**

[Answer]: A — 条件付きGO（ユーザー回答: 1）

## Q2. RG-01不成立時の扱い

Agent TeamsまたはCodex Ultraで、native実起動・委譲を機械判定できない場合にどうするか。

A. **scopeへ戻して停止（推奨）** — 証明できないdriverを出荷せず、利用可能なsurfaceまたはscopeを再承認する
B. **失敗driverを外して続行** — 成功したdriverだけで縮小scopeを再承認する
C. **既存floorで代替** — native証跡がなくても同じdriver名で既存subagent / exec floorを使う
X. **Other (please specify)**

[Answer]: A — scopeへ戻して停止（ユーザー回答: 1）

## Q3. live検証の資源コミット

非機密fixtureを使うopt-in live suiteで、認証済みClaude Code、Codex、Kiroとprovider token / networkを利用してよいか。

A. **現在のローカル環境を利用可能（推奨）** — 非機密fixtureに限って認証済みCLIとproviderを利用し、新しいCI credentialは作らない
B. **利用承認は後で確定** — Inceptionは進めるが、live suite実行前の外部dependencyとして残す
C. **live利用不可** — providerを使うlive証明をscopeから外す
X. **Other (please specify)**

[Answer]: A — 現在のローカル環境を利用可能（ユーザー回答: 1）

## Q4. 意思決定とdelivery ownership

今回のscope、risk、資源に対する最終意思決定者と、実行体制をどう置くか。

A. **ユーザーがsponsor / decision owner（推奨）** — Amadeus agentsが実行し、ユーザーが各approval gateとlive利用を承認する。追加のteam-formationは不要
B. **Construction前に追加human review** — Inceptionは進めるが、Construction開始前に別の技術reviewer承認を必須にする
C. **team-formationを追加** — SKIP済みのTeam Formationへ戻り、人員・役割・scheduleを定義する
X. **Other (please specify)**

[Answer]: A — ユーザーがsponsor / decision owner（ユーザー回答: 1）

## Q5. 回答の統合確認

ここまでの回答を、次のhandoff条件として解釈する。

1. Initiativeは条件付きGOとし、Inceptionへ進む。
2. RG-01でAgent TeamsまたはCodex Ultraのnative証跡を確立できない場合はscopeへ戻り、floor代替で成功扱いしない。
3. 非機密fixtureに限って現在の認証済みClaude Code、Codex、Kiroとprovider token / networkをlive検証に利用できる。新しいCI credentialは作らない。
4. ユーザーがsponsor / decision ownerとなり、Amadeus agentsが実行する。追加のTeam FormationとConstruction前の別human gateは設けない。

A. **この内容で確定（推奨）** — initiative briefとdecision logを生成する
B. **回答を修正** — 修正する質問番号と内容を指定する
X. **Other (please specify)**

[Answer]: A — この内容で確定（ユーザー回答: 1）
