# phase 遷移の state.json 雛形生成

## 概要

phase 遷移の state.json 雛形を skill 同梱スクリプトで生成する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-phase-gate-approval-contract | Issue #311 の雛形に含める approval evidence の形式は、ゲート契約の Intent で確定した Task Generation Gate の契約を前提にするため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | phase 遷移時の `state.json` 更新を、手書きから同梱スクリプトによる雛形生成へ置き換える技術目標である。 |
| scope | refactor | 既存の phase skill の state 更新手順を、決定論的な生成手段へ強化する Intent である。 |
| labels | state-json, scaffolding, bundled-script, skill-change, self-development | state.json、雛形生成、同梱スクリプト、skill 変更、自己開発を表す。 |

## 目的

phase 遷移時の `state.json` 更新を、skill 同梱スクリプトによる雛形生成にして、手書き起因の構造 fail と修正往復をなくす。

この Intent は [Issue #311](https://github.com/amadeus-dlc/amadeus/issues/311) を根拠にする。

`state.json` の構造は validator が要求する契約であり、決定論的に生成できる。
現在はエージェントが先例を読み手書きで再現しているため、遅くて揺れやすい。
直近の Intent `20260702-phase-gate-approval-contract` の cycle でも、中間状態の必須配列の不足で validator の指摘と補修往復が発生した。

## 成功条件

- 各 phase 遷移（Intent Capture、Inception 開始と完了、Construction 開始、Functional Design、Bolt 準備、finalization）の直後に、validator が `state.json` の構造 fail を出さない。
- 雛形を生成、更新する同梱スクリプトが `skills/amadeus-*/scripts/**` に置かれ、promote で昇格し、配布先ユーザー環境（repo root の開発用スクリプトなし）で動作する。
- skill 本文の該当手順から、スクリプトの利用が参照されている。
- スクリプトは、先に失敗する eval または検証を追加してから実装されている。
- skill 変更は promote 手順で同期され、PR がレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 範囲

含めるもの:

- phase 遷移ごとの valid な `state.json` 雛形の生成、更新を行う同梱スクリプトの追加。
- skill 本文の該当手順からのスクリプト利用の参照。
- eval または決定論的検証の先行追加。
- source skill と昇格先成果物の promote 同期。

含めないもの:

- repo root の dev-scripts への配置。skill の実行時参照にできないため。
- 成果物 Markdown の自動生成。テンプレートと内部 skill の責務のまま残す。
- validator の要求構造そのものの変更。

## 現在の phase

Ideation を開始する。

Inception では、対象遷移ごとの雛形の入出力契約、スクリプトの配置先 skill、既存 state 実データの分析を具体化する。
