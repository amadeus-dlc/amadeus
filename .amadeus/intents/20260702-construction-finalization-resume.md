# merge 後の Construction finalization の再開と検出

## 概要

merge 後の Construction finalization を決定論的に再開、検出できるようにする。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-skill-change-review-contract | Issue #309 の skill 変更 PR は、同 Intent で確定したレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）の適用対象であるため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Construction finalization の再開規則と検出手段を skill 契約へ追加する技術目標である。 |
| scope | refactor | 既存の Construction phase skill の auto 判定と同梱資産を、確定済みの再開契約へ強化する Intent である。 |
| labels | construction, finalization, skill-change, self-development | Construction、finalization、skill 変更、自己開発を表す。 |

## 目的

実装 PR の merge 後に行う Construction finalization を、セッションをまたいでも決定論的に再開、検出できるようにする。

この Intent は [Issue #309](https://github.com/amadeus-dlc/amadeus/issues/309) を根拠にする。

finalization は merge というセッション外のイベントの後に実行するため、merge イベントを監視できないハーネスでは人間の記憶頼みになり、ハーネスによって完了品質が変わる。

## 成功条件

- `amadeus-construction` の auto 判定に、決定論的な再開規則（対象 Bolt が実装済みかつ検証済みで、実装 PR が merge 済みであるにもかかわらず `construction.gate` が `passed` でない場合は finalization を選ぶ）が定義されている。
- 未 finalize の Intent を機械的に列挙できる同梱スクリプトが `skills/amadeus-construction/scripts/` にあり、配布先ユーザー環境（repo root の開発用スクリプトなし）でも動作する。
- skill 本文の auto 判定から、同梱スクリプトの検出結果を入力証拠として参照できる。
- 同梱スクリプトは、先に失敗する eval または検証を追加してから実装されている。
- skill 変更 PR が、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 範囲

含めるもの:

- `amadeus-construction` の auto 判定への再開規則の追加。
- 未 finalize 検出の同梱スクリプト（`skills/amadeus-construction/scripts/**`）と、その eval または検証。
- skill 本文からの検出結果の参照。
- source skill と昇格先成果物の promote 同期。

含めないもの:

- repo root の dev-scripts への検出スクリプト配置。
- merge イベントの自動監視や webhook などハーネス側の仕組み。
- finalization そのものの自動 merge。
- 完了済み Intent 成果物の遡及修正。

## 現在の phase

Ideation を開始する。

Inception では、再開規則の要求、受け入れ状態、検出スクリプトの入出力契約、既存 skill 本文の分析を具体化する。
