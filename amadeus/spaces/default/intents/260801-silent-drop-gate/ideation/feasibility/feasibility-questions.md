# Feasibility — Questions

**Intent:** 260801-silent-drop-gate
**Mode:** Grill me（1問ずつ・推奨回答つき）
**Stage:** feasibility (ideation)
**Upstream:** `ideation/intent-capture/intent-statement.md`

<!-- E-OC1 判定証跡:
各質問はユーザー判断を要する制約のみを扱い、コード・Issue・既存成果物から確定できる事実は質問しない。
ユーザーによる合意サマリ承認: 2026-08-02T00:36:30Z（「1」= Yes, confirmed）
[Answer] は各 HUMAN_TURN 受領後にのみ記入する。
-->

## Q1. 別作業で修正済みになった Issue #1963 を、この Intent でどう扱うか？

調査時点で Issue #1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) により修正・クローズ済みですが、この worktree の基点にはまだ取り込まれていません。推奨は、最新 `main` の変更を統合して #1963 を「実装修正」から「統合後の回帰検証」へ変更し、重複実装を避けることです。その場合、ベースライン単調減の intent 内実測対象は #1878 / #1874 の2件になります。

- A. 外部修正を採用し、#1963 は統合後の回帰検証だけ行う（推奨）
- B. 3件修正という成功指標を保つため、別の OPEN な無音化 Issue を代替で追加する
- C. #1963 を引き続き実装修正対象として扱う（重複実装を許容する）
- X. Other (please specify)

[Answer]: A（外部修正を採用し、#1963 は統合後の回帰検証のみ行う）

## Q2. `no-silent-drop` が走査するソース境界はどこまでにするか？

既存 `callsite-guard` は `packages/framework/core/` と `scripts/` を走査し、生成物とテストを除外しています。推奨は、これに手書きのハーネス正本 `packages/framework/harness/` を加え、生成物（`dist/`、ルートの各ハーネス投影）とテスト fixture は除外することです。これなら配布元の全手書き実装を守りつつ、投影コピーの重複検出と意図的な違反 fixture の誤検出を避けられます。

- A. 手書き正本を走査する: `packages/framework/core/` + `packages/framework/harness/` + `scripts/`（推奨）
- B. 既存 `callsite-guard` と同じ `packages/framework/core/` + `scripts/` のみにする
- C. テスト・生成物を含む全 TypeScript を走査する
- X. Other (please specify)

[Answer]: A（手書き正本 `packages/framework/core/` + `packages/framework/harness/` + `scripts/` を走査する）

## Q3. `intentional-drop` 免除をどの程度厳しく統制するか？

Issue #1979 は理由付き `// intentional-drop: <理由>` のみを免除として認めています。ただし、単にマーカーを置けば新規違反を無制限に回避できる設計では、ゲートが別名の allowlist に変わります。推奨は、非空理由・直近1ノードだけへの適用・免除件数の shrink-only ratchet をすべて要求し、新しい免除追加も CI で fail させることです。

- A. 理由必須・1ノード限定・免除件数も shrink-only ratchet する（推奨）
- B. 理由付きマーカーだけを要求し、免除件数は ratchet しない
- C. インライン免除を禁止し、すべてベースライン JSON で管理する
- X. Other (please specify)

[Answer]: A（理由必須・1ノード限定・免除件数も shrink-only ratchet する）

## Q4. `no-silent-drop` が lint ジョブへ追加する実行時間の上限は？

現在の lint ジョブは10分タイムアウト内で Biome、callsite guard、deletion gate、complexity gate を順に実行しています。ast-grep は手書き正本3領域だけを走査するため、推奨目標は CI 上の単独ステップで15秒以内です。これを超えた場合は走査・ルール構成を最適化し、既存 lint ジョブ全体の待ち時間を肥大させない制約にします。

- A. CI 単独ステップ15秒以内を必須制約にする（推奨）
- B. 60秒以内を許容する
- C. 明示的な時間上限を設けず、検出精度を優先する
- X. Other (please specify)

[Answer]: A（CI 単独ステップ15秒以内を必須制約にする）

## Q5. 初期導入時に許容する偽陽性率は？

Issue #1979 は偽陽性率の実測を受け入れ基準にしていますが、合否閾値は未定です。推奨は、手書き正本の初期検出を人手分類した母集団に対して偽陽性率5%以下を必須とし、加えて3形態それぞれの positive / negative fixture を100%正しく分類することです。閾値を超えた場合は、ベースラインへ押し込むのではなくルールを改善します。

- A. 実リポジトリ偽陽性率5%以下 + fixture分類100%を必須にする（推奨）
- B. 実リポジトリ偽陽性率10%以下 + fixture分類100%を必須にする
- C. 数値閾値は設けず、全検出結果に理由を記録すれば許容する
- X. Other (please specify)

[Answer]: A（実リポジトリ偽陽性率5%以下 + fixture分類100%を必須にする）

## Q6. 検出器・ベースライン・走査自体が壊れた場合、CI をどう扱うか？

無音化防止ゲート自身が「走査できなかったのに成功」を返すと、目的と正反対になります。推奨は、ast-grep 実行不能、ルール解析失敗、ベースライン欠落・不正、対象ファイル0件、部分走査エラーのすべてを fail-closed にし、分類可能なエラーコードと診断を出すことです。

- A. すべて fail-closed にし、型付き診断を必須にする（推奨）
- B. ツール・ベースライン障害は fail、対象0件や部分走査は warning にする
- C. 初回リリースは advisory とし、安定後に fail-closed へ切り替える
- X. Other (please specify)

[Answer]: A（すべて fail-closed にし、型付き診断を必須にする）

## 継続確認

Standard 深度の目安内で6問を完了し、スコープ変化、走査境界、免除統制、CI時間、検出精度、内部障害時の挙動を決定した。追加で掘り下げるか、合意サマリへ進むか。

- A. 合意サマリへ進む（推奨）
- B. さらに掘り下げる
- X. Other (please specify)

[Answer]: A（合意サマリへ進む）

## 合意サマリ確認

全判断の要約を確認し、Feasibility 成果物の生成へ進めてよいか。

- A. 確認済み、成果物生成へ進む（推奨）
- B. 修正したい項目がある
- X. Other (please specify)

[Answer]: A（確認済み、成果物生成へ進む）

## 学習候補選択

- A. 走査は手書き正本3領域へ拡張し、生成物とテスト fixture を除外
- B. 免除にも shrink-only ratchet を適用
- C. #1963 は外部修正の統合依存へ再分類
- D. Skip all
- X. Other (please specify)

[Answer]: A, B（候補 c2 / c3 を project 規則として保存）

## 次回に向けた自由記述

候補以外に追加で記録する学びや観察事項はあるか。

- A. Nothing to add
- B. Add a note
- X. Other (please specify)

[Answer]: A（Nothing to add）
