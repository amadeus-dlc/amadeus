# Intent Statement — CG 観測可能区間と帰属不能残余

- **Intent**: `260809-cg-attribution-stats`
- **Scope**: `self-feature`
- **Project**: [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695)
- **Mirror**: [Issue #2722](https://github.com/amadeus-dlc/amadeus/issues/2722)
- **Scope ruling**: Issue #2695 に記載された範囲から縮小せず、本 Intent で完了条件 1〜10 をすべてカバーする。

## Problem Statement

現行の `stage-stats` は、どのステージが重いかを net 時間で示せる。一方、code-generation ウィンドウ内の時間のうち、現行 audit で開始・終端・identity・stage 帰属を決定的に説明できる区間と、説明できない残余を分離できない。

このギャップにより、チームは「現行の観測で何が分かるか」と「どこに追加計装が必要か」を実測で判断できない。観測できない時間を実装・検証・レビュー・PR 収束へ推定配分すると、event が持つ証拠を超えた誤った意思決定につながる。

## Target Customer

主な利用者は、Amadeus を運用・自己開発するチームである。特に次の利用者が恩恵を受ける。

- ステージ時間のボトルネックを調査するメンテナー
- audit 計装への次の投資を判断するプロダクト・アーキテクチャ担当者
- Markdown／CSV／JSON 出力を機械処理する CLI 利用者と自動化ジョブ
- 会計恒等式、除外理由、出力間の一致性を検証する品質担当者

## Success Metrics

| 指標 | 成功条件 |
|---|---|
| 会計完全性 | すべての適格 window で `observableSeconds + unattributableSeconds = netSeconds` が成立し、負値・NaN・Infinity を出さない |
| 比率完全性 | すべての適格 window で `coverage + unattributableRate = 1` が成立する |
| 重複排除 | category 内 union と全 category union により、入れ子・並列・重複秒を二重計上しない |
| fail-closed 診断 | identity、stage、start、terminal、window identity が決定できない候補を推定で補完せず、理由別件数を全出力に示す |
| 出力 parity | Markdown／CSV／JSON が同じ母集団・規則・除外件数・outlier を表す |
| 出力完全性 | 出力追加後の3形式それぞれで 65,536 bytes 超 fixture の producer／consumer が完走し、full capture と pipe の byte digest が一致する |
| 再実行性 | `--stage code-generation --outliers 10` で採用・不採用件数、coverage、帰属不能率、上位10 window を再生できる |
| 後方互換性 | 現行の stage duration、sensor、model、reviewBuckets の意味と既存テストを退行させない |

## Initiative Trigger

[Issue #2405](https://github.com/amadeus-dlc/amadeus/issues/2405) と [PR #2448](https://github.com/amadeus-dlc/amadeus/pull/2448) で `stage-stats` が導入され、対象 corpus の code-generation は `n=109`、net 中央値 `4,721 秒`、net P95 `49,247 秒`と実測された。

その後の独立クロスレビューで、既存 event から「実装・検証・レビュー・PR 収束」の排他的な完全帰属を復元することはできないと判明した。この反証を受け、観測できた区間だけを決定的に集計し、残りを帰属不能として明示する方向へ問題を絞った。

## Initial Scope Signal

`self-feature` として、Issue #2695 の次の契約をすべて実現対象とする。

- 既存 audit event のみから、対象 stage の明示属性と決定的な lifecycle identity が揃う区間だけを採用する
- attribution population、除外理由、category stats、coverage、overlap、outlier、missing instrumentation candidate、methodology を報告する
- `--stage` と `--outliers` の契約、境界値、空母集団を含める
- Markdown／CSV／JSON を同じ semantic model から生成する
- 合成シャードと実 corpus 相当の両方で、完了条件 1〜10 をすべて検証する

Issue 本文の `Out` に記載された新規 audit event、帰属不能残余の推定配分、特定区間の効率化、モデル／ハーネス帰属、window identity 改修だけを範囲外とする。

## Confirmed Dependency Status

[Issue #2700](https://github.com/amadeus-dlc/amadeus/issues/2700) の stdout 終了経路欠陥は [PR #2702](https://github.com/amadeus-dlc/amadeus/pull/2702) で解消済みである。[PR #2706](https://github.com/amadeus-dlc/amadeus/pull/2706) で同根スイープも着地している。両 merge commit が現在の HEAD に含まれること、t487 の 20 pass / 0 fail、source／Codex self-install の JSON pipe 完走を確認済みである。

ただし、#2695 で出力が増えた後の Markdown／CSV／JSON の実サイズ検証は本 Intent の完了条件として維持する。#2700 の解消済み判定は、この検証面を省略する理由にはならない。
