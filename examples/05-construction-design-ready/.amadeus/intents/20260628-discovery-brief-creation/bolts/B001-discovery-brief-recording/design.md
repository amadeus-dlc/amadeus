# Construction Design

## 概要

- B001 Discovery Brief の基本記録を実装へ進められる粒度で設計しました。
- Unit Design Brief、Bolt、Task を照合し、B001/T001 と B001/T002 を実装へ進められる状態と判断しました。
- Design Gate の evidence は、この Construction Design です。

## Domain Design

- 対象 Task: B001/T001, B001/T002。
- Discovery Brief は、入力テーマ、確認した前提、判定、判定理由、推奨次アクションを一つの判断記録として扱います。
- Discovery 状態は `state.json`、一覧表示は `discoveries.md`、判断本文は `brief.md` が担います。
- `brief.md` の判定と `state.json.decision` は同じ値でなければなりません。

## Logical Design

- 対象 Task: B001/T001, B001/T002。
- `brief.md` には、Discovery の必須見出しを固定順で置きます。
- `state.json` には `phase: discovery`、`status`、`gate`、`decision` を置きます。
- `discoveries.md` の状態、判定、詳細リンクは、`state.json` と `brief.md` の内容を反映します。
- 既存コード調査は例示用 greenfield のため行いません。

## 実装設計

- 対象 Task: B001/T001, B001/T002。
- `brief.md` の基本見出しを作成し、判定本文を `multi_intent` として記録します。
- `state.json.decision` を `multi_intent` にし、`discoveries.md` の判定列と一致させます。
- 詳細リンクは `discoveries/20260628-amadeus-theme-decomposition/brief.md` を指す相対リンクにします。

## 検証設計

- 対象 Task: B001/T001, B001/T002。
- Amadeus Validator で Discovery Brief の必須見出し、`state.json.decision`、`discoveries.md` の対応を確認します。
- B001 の実装後は、B001/T001 と B001/T002 の証拠を `test-results.md` に記録します。

## 設計変更記録

- 2026-06-28: B001 の Design Gate ready 用に初期作成しました。
