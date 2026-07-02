# D001: complete ideation

## 背景

Issue #350 は、並行 Intent が増えると、どの Intent がどの phase のどのゲートで承認待ちかを人間が一望できず、承認が律速になったうえに見落としが起きる問題を扱う。
Discovery `20260702-parallel-execution` の候補「ゲート待ちキューの可視化」であり、待機条件「共有インデックスの生成物化の後に扱う」は Issue #334 の cycle 完了で解消している。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、承認待ちと判定する `state.json` の条件、待ち理由の情報源、実行入口の配置先、一覧の出力形式、examples snapshot への影響を具体化する。

## 理由

Issue #350 の目的、対象、対象外、受け入れ条件と、Discovery の候補判断（G001 の GD001〜GD003）から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存コード分析（`list-unfinalized-intents.ts` の横断スキャン方式、ゲート契約、`state.json` 雛形）で扱える。

## 影響

Inception では、承認待ちと判定する `state.json` の条件を最初に確定する。
この条件が一覧の列、待ち理由の情報源、実行入口の契約を決める。
