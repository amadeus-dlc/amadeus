# Scope Definition 質問票 — 260802-record-roundtrip-pbt

> 上流入力(consumes 全数): intent-statement.md — 各問の背景（無検査キャストの実測・walking skeleton 制約・射程内候補2件）は intent-statement.md の Problem Statement / Initial Scope Signal から導出。
>
> E-OC1 証跡: スコープ境界（Must=state/election、Could=mirror property 化、深掘り=workflow_dispatch 最小形、非対象=射程外バグ族の分担）は intent-capture のユーザー裁定3件（2026-08-02T16:11:16Z）と #1980 改稿本文で既決。本票は未決の2判断（実装順序 / AC-2 候補の優先）のみを問う。回答モード: Guide me（ユーザー選択、監査ログ記録済み）。

## Q1. 2つの必須境界（election / state）の実装順序の方針

背景: election は無検査キャスト（`JSON.parse as T`）が現行露出しており fail-closed 化の実害インパクトが最大。一方 state は seam ペア（serialize/parse receipts、setField/getField）が整っておりテスト着手が最も素直。self-feature スコープでは最初の Bolt に walking-skeleton ゲートがあり、最初のスライスは小さい end-to-end であるべき。

- A. リスク先行 — election を Bolt 1（walking skeleton）に置く。無検査キャストの fail-closed 化＋最小プロパティ1本を最初の end-to-end スライスとする
- B. 着手容易性先行 — state を Bolt 1 に置き、election は Bolt 2 で腰を据えて一本化する
- C. 並行 — 依存が無いことを確認のうえ Bolt 1 完了後に並行 fan-out（walking skeleton は election）
- X. その他（自由記述）

[Answer]: A — リスク先行。election を Bolt 1（walking skeleton）に置き、無検査キャストの fail-closed 化＋最小プロパティ1本を最初の end-to-end スライスとする（ユーザー裁定）

## Q2. AC-2（既知バグの PBT 再現・shrink 固定）の第一候補

背景: 射程内候補は2件。#1459 は読み戻し経路の無検査キャストが現行露出しているため pre-fix 面切替なしで再現可能（実装コスト小・確実）。#1547 は CLOSED のため pre-fix 面切替（falling-proof-no-stash 準拠）が必要（コスト中・mirror 側の証拠になる）。

- A. #1459 を第一候補（election 読み戻しの fail-closed プロパティで再現）。#1547 は余力があれば追加
- B. #1547 を第一候補（pre-fix 切替で mirror の表現分裂を再現）。#1459 は fail-closed 化の副産物として扱う
- C. 両方を必須にする
- X. その他（自由記述）

[Answer]: A — #1459 を第一候補。election 読み戻しの fail-closed プロパティで再現（pre-fix 切替不要・確実）。#1547 は余力があれば追加（ユーザー裁定）

## 裁定の記録

Q1=A / Q2=A — AskUserQuestion によるユーザー直接裁定（推奨案どおり）。選挙不要判定: ソロモード・裁定主体はユーザー本人。
ユーザー承認: 2026-08-02T16:15:58Z
