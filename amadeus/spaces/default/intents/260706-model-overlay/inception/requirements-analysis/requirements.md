# Requirements：260706-model-overlay

## Intent 分析

### 目的

設計系 agent（amadeus-architect-agent、amadeus-design-agent）を高能力モデル（Fable 5）で動かす指定を、昇格・上流同期・インストーラ更新で消えない形で実現する（Issue #554、Maintainer 要望）。達成したい状態は次の 3 点である。

1. overlay 設定に宣言した agent だけが、昇格/生成/再適用のたびに自動で指定モデルへ書き換わる（手作業ゼロ、消えない）。
2. parity:check・test:all・promote-skill eval が pass する（engineFileExceptions の増加ゼロ）。
3. 指定モデル利用不可時の挙動（宣言済み fallback への降格 + 警告 + 発動記録）が実装・文書化されている。

### 上流の位置づけ

- 要求の正は Issue #554 である。intent-statement / scope-document は scope（refactor）により SKIP のため存在せず、Issue とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- 設計 3 論点はピア協議（6 者一致: leader・engineer1・engineer2・engineer4・engineer5・reviewer。engineer1/2/4 は独立実測つき）で確定した（requirements-analysis 宛 DECISION_RECORDED に記録済み）。
- 対象 seam の一次情報は reverse-engineering の直接調査（rename 後の姿 = eng1/issue-526-rename の read-only 参照）である。codekb は据え置き採用。
- チームの働き方（team-practices 相当）は team.md と `.agents/rules/dev-scripts.md`（TDD、skill の実行時依存禁止）を参照した。
- 順序制約: コード変更（Construction）は PR #553（全面 rename）merge 後に、merge 後の origin/main を基点に開始する（state-init 宛 decision）。本書のパス表記は rename 後の姿で書く。

## 機能要求

### FR-1: overlay 設定ファイル

- FR-1.1: `dev-scripts/data/model-overrides.json`（project-local、parity 対象外の置き場）を新設する。宣言内容: 対象 agent → 指定モデル、書き換え前の base 値（逆変換正規化用。適用スクリプトが適用時に記録・検証）、宣言済み fallback（例: fable → opus）、fallback 発動記録（発動時に対象と理由を残す）。JSON 形の詳細は functional-design で確定する。
- FR-1.2: 初期宣言は amadeus-architect-agent = fable、amadeus-design-agent = fable、fallback は fable → opus とする。
- FR-1.3: overlay は本リポジトリの開発用設定であり配布物（インストーラ）に含めない。利用者 workspace には素の modelOverride が届く（#543 との境界）。
- FR-1.4: 宣言と適用の不可分性（bootstrap window の排除）: overlay 設定への宣言（対象 agent と指定モデル）と base 値の記録・実ファイルの書き換えは、適用スクリプトの同一実行内で不可分に行う。base 未記録の宣言（= 宣言だけ書いて apply 未実行の中間状態）を parity-check が見た場合は、正規化せず通常比較を行い、hash 不一致時の fail メッセージで「apply 未実行の宣言がある」ことを明示的に案内する（無言の誤 fail・誤 pass のどちらにもしない）。

### FR-2: 適用スクリプト（単独実行可能を正とする）

- FR-2.1: `dev-scripts/apply-model-overrides.ts` を新設する。engine の agent 定義（`.agents/amadeus/agents/*.md`）の frontmatter `modelOverride:` 行を overlay 宣言値へ書き換える。overlay に無い agent は不変。冪等（再実行で差分なし）。
- FR-2.2: `promote-skill.ts` の最終段から同スクリプト（同一実装）を呼ぶ。skills 側成果物に agent 定義が含まれる場合も同じ適用を受ける。
- FR-2.3: 上流同期（全置換）後の再適用は単独実行（npm script 例: `models:apply`）で行い、再適用手順を運用文書に 1 行残す。Issue 受け入れ条件の「手作業ゼロ」は「modelOverride 行を人間が編集する手作業ゼロ」と解釈する（昇格経路は自動フック、同期経路は 1 コマンドの再適用。同期経路の完全自動化は #552 の build 後段へ適用点を移す際に解消する将来事項として明示的に受容する。この解釈は gate の人間承認で確定する）。
- FR-2.4: 適用は promote / dev 時に閉じ、skill・エンジンの実行時は適用済み成果物だけを読む（dev-scripts を実行時依存にしない）。

### FR-3: parity 整合（逆変換正規化）

- FR-3.1: parity-check は overlay 宣言済みファイルに限り、modelOverride 値を overlay 記録の base 値へ戻した内容で hash を計算して baseline と比較する（parity-check.ts の既存 normalizeContent 機構への追加。#553 の reverse 写像と同型）。engineFileExceptions は増やさない。
- FR-3.2: 上流が modelOverride を変更して overlay の base 値が実際の上流値とずれた場合、parity は正しく fail する（無言の見逃し禁止。eval で固定）。drift の成立時系列を明示する: apply は毎回 base を最新の実値で記録し直すため、drift は「apply と次の apply の間に baseline（上流）側だけが更新された」場合にのみ生じる。eval はこの時系列（baseline 確定 → apply → 上流相当の変更 → baseline 未更新のまま parity 実行）を再現して fail を固定する。
- FR-3.3: 適用 → 逆変換 → base と byte 一致のラウンドトリップを機械検証する（変換が modelOverride 行の単純置換で閉じることの検証。eval で固定）。

### FR-4: fallback（明示フラグ + 記録 + doctor 警告）

- FR-4.1: 適用スクリプトの明示フラグ（例: `--use-fallback`）で、宣言済み fallback へ降格して適用し、警告を出力する。自動検知（API 照会）は行わない。
- FR-4.2: fallback の発動記録（対象 agent と理由）を overlay 設定または適用結果に残し、PR レビュー時に意図した fallback かを判定できるようにする。
- FR-4.3: doctor に「実ファイルの modelOverride が overlay 宣言（fallback 込み）のどれとも一致しない場合の警告」を追加する（乖離の表面化）。doctor 変更は engine ファイル（amadeus-utility.ts）に触れるため、既存ルール（Corrections c3 = engineFileExceptions への宣言と exceptions への理由追記）に従う。これは Q1 の「engineFileExceptions 増加ゼロ」（overlay 対象の agent 定義ファイルについての合意）とは対象が別である。

## 非機能要求

- NFR-1: TDD で進める。先に RED で固定する検証: 「overlay 宣言があるのに生成物に反映されていない状態の検出」（ディスパッチ指示。eval の適用前 fail 検査と FR-4.3 の doctor 警告の両方に対応づける）、FR-3.2 の base ドリフト fail、FR-3.3 のラウンドトリップ（revert(apply(x)) == x の byte 一致）。
- NFR-2: 新規 npm 依存を追加しない。オフラインで全検証が完結する。
- NFR-3: エンジンファイル（doctor = amadeus-utility.ts 等）に触れる場合は parity-map.json の宣言を伴わせる。overlay 機構自体（dev-scripts/）は parity 対象外。
- NFR-4: 適用スクリプトと eval は既存 dev-scripts / evals の慣行（隔離 workspace、実 CLI 駆動、cleanup）に従う。

## 制約

- C-1: コード変更は PR #553 merge 後に、merge 後 origin/main 基点の新 branch（eng3/issue-554-model-overlay 等）で開始する（順序制約）。#553 は agents/ の persona 文書 22 ファイルに触れるが modelOverride 行は不変更（engineer1 実測）のため、適用スクリプトは #553 merge 後の実形を基準にする。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。PR merge は人間が行う。
- C-3: 将来の三層化（#552）実現後は適用点を build 後段へ移す。本 Intent は現行 promote 構造で動く形で実装する（Issue 関連事項）。

## 前提

- A-1: 対象 seam の実測（agent 定義の場所と modelOverride、promote-skill の書き込み経路、parity-baseline の hash-only 構造）は reverse-engineering と 3 名のピア独立実測で確認済み。
- A-2: agent の modelOverride 現状は opus 9 / sonnet 5（上流由来、Issue 記載）。初期宣言 2 agent の base は適用時に実ファイルから記録する（ハードコードしない）。

## スコープ外

- 三層化ビルド（#552）への適用点移設。
- インストーラ（#543）の配布物への overlay 同梱。
- モデル可用性の自動検知（API 照会）。
- 設計系以外の agent のモデル変更（overlay への追加宣言は将来の運用で行う）。

## 未解決事項

- O-1: overlay 設定 JSON の具体形（base 値・fallback 記録のフィールド構造）と適用スクリプトの CLI（フラグ名、出力形式）は functional-design で確定する。
- O-2: doctor 警告の実装位置（amadeus-utility.ts doctor への追加方法）と parity 宣言の要否詳細は functional-design で確定する。
