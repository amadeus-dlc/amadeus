# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、承認待ちキュー一覧契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
待ち理由の文言写像、スクリプトの CLI 契約、行の並び順は Construction で確定する。

## 設計戦略

- 承認待ちの意味を一覧側で発明せず、契約カタログの生成物（`task-generation-contract.ts` の `gateResultByStatus`）と validator の gate 語彙を定義元として判定を導出する。契約変更時に判定がずれる余地を構造的に減らす。
- 横断スキャンは `list-unfinalized-intents.ts` の走査規約（`state.json` 欠落や JSON 解釈不能の扱い、`.amadeus/intents` がない workspace の対象外通知、exit code 契約）を踏襲し、スキャン系スクリプトの規約を揃える。
- 実行入口は `amadeus-validator` に同梱し、`StateScaffold.ts` と `IndexGenerate.ts` と同じ配布と promote の経路に載せる（GD001）。
- 出力は人間のゲート審査官向けに Markdown 表とし、承認待ち 0 件を正常系の表示として扱う（GD002）。
- 検証は examples の snapshot 相当の固定入力による決定論的検証を実装より先に追加する（RED から GREEN）。

## 責務境界

- 所有するもの: 承認待ち判定の導出規約、横断スキャン、Markdown 表と 0 件表示の出力契約、利用者向け文書の手順記載、検証。
- 所有しないもの: 承認の実行と自動化、通知、gate 値や `state.json` の書き換え、validator の検査カテゴリ追加、Discovery gate の扱い。
- 依存してよいもの: `task-generation-contract.ts`、validator の gate 語彙、`list-unfinalized-intents.ts` の走査規約、promote 手順、Bun 実行環境、examples の snapshot。
- 後続で再確認が必要になる条件: ゲート語彙契約が変わった場合、phase gate に `waiting_approval` を設定する運用が始まった場合、新しい phase またはゲートが追加された場合。

## 構成候補

- 走査: 対象 workspace の `.amadeus/intents/*/state.json` の収集を扱う。
- 判定: 契約からの承認待ち導出（phase gate と Task Generation）を扱う。
- 整形: Markdown 表の出力と 0 件時の表示を扱う。
- 手順: 利用者向け文書への実行手順の記載を扱う。
- 検証: 固定入力による決定論的検証を扱う。

## データと契約候補

- 入力候補: 対象 workspace の path、`.amadeus/intents/*/state.json`。
- 出力候補: 承認待ち一覧の Markdown 表（Intent、phase、ゲート、待ち理由の列）、0 件時の表示、実行結果の exit code。
- 状態候補: 承認待ちあり、承認待ち 0 件、対象外 workspace（`.amadeus/intents` なし）。
- 事前条件候補: `state.json` が JSON として解釈できる（解釈不能の扱いは Construction で確定する規約に従う）。
- 事後条件候補: `state.json` を変更しない（読み取り専用）。
- 不変条件候補: 同じ入力からの再実行は出力を変えない。

## 検証観点

- 承認待ちを含む固定入力（`examples/04-construction-design-ready` 相当）で、4 列の Markdown 表が得られる。
- 承認待ち 0 件の固定入力（`examples/02`、`examples/03` 相当）で、その旨の表示が得られる。
- 判定結果を `gateResultByStatus` の定義と突き合わせ、矛盾しないことを確認する。
- 実装前に検証が失敗することを確認する（RED の記録）。
- promote 同期と `npm run test:it:promote-skill` の pass を確認する。

## Bolt 分割方針

- B001 で一覧スクリプトと検証を実装する（判定の導出規約と出力契約の確定、RED から GREEN を含む）。
- B002 で利用者向け文書へ実行手順を記載し、promote で同期する。
- B002 は B001 の完了後に実行する。手順が参照するスクリプトの名前と CLI 契約が前提になるためである。

## Construction への引き継ぎ

- Functional Design で確定する事項: 待ち理由の文言への写像規約、スクリプトの名前と CLI 契約（workspace 引数、exit code）、行の並び順規則、0 件時の表示文言、phase の `status: waiting_approval` の扱い、JSON 解釈不能な `state.json` の扱い。
- 文書変更で確定する事項: 利用者向け文書のどの見出しに手順を置くか。
- 検証時に確定する事項: `skills/amadeus-validator/evals/` の既存構成への追加方法、repo の test chain への組み込み、examples の skill-provenance 更新の要否。
