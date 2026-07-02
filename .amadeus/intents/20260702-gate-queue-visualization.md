# インテント：ゲート待ちキューの可視化

## 概要

複数 Intent の state.json を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を一覧できるようにする。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-shared-index-generation | Discovery 候補の待機条件「並行 Intent が走り始めてから効果が出るため、共有インデックスの生成物化の後に扱う」が、この Intent（Issue #334）の cycle 完了で解消したため。 |
| 20260702-phase-gate-approval-contract | 横断スキャンが読み取る `state.json` のゲート語彙と approval evidence は、この Intent で確定した契約に従うため。 |
| 20260702-state-json-scaffolding | 横断スキャンの対象になる `state.json` の構造安定は、雛形生成の Intent が前提になるため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 複数 Intent の `state.json` を横断スキャンし、承認待ちを一覧する手段を追加する技術目標である。 |
| scope | feature | 承認待ちキューの一覧という新しい手段を追加する Intent である。 |
| labels | gate-queue, phase-gate, parallel-execution, state-json, self-development | ゲート待ちキュー、人間ゲート、並行実行、state.json、自己開発を表す。 |

## 目的

複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を一覧できるようにして、並行 Intent 運用での承認の見落としと詰まりをなくす。

この Intent は [Issue #350](https://github.com/amadeus-dlc/amadeus/issues/350) と Discovery [20260702-parallel-execution](../discoveries/20260702-parallel-execution.md) の候補「ゲート待ちキューの可視化」を根拠にする。

並行 Intent が増えると、どの Intent がどの phase のどのゲート（Ideation gate、Inception gate、Task Generation Gate の `ready_for_approval` など）で承認待ちかを人間が一望できず、承認が律速になったうえに見落としが起きる。
フェーズパイプラインでは人間の役割がゲート審査官へ寄るため、承認待ちキューの一望が前提になる。

## 成功条件

- 複数 Intent が並行する workspace で、承認待ちの Intent、phase、ゲート、待ち理由を 1 回の実行で一覧できる。
- 承認待ちが 0 件の場合もその旨が分かる。
- 配布先ユーザー環境（repo root の開発用スクリプトなし）で実行できる。

## 範囲

含めるもの:

- 複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を一覧する手段。
- 一覧を配布先ユーザー環境で実行できる形にすること。

含めないもの:

- 承認そのものの自動化。
- 通知基盤。
- 並行実行の他候補（並行運用ポリシー、Bolt の依存 wave 並行実行）。

## 現在の phase

Ideation を開始する。

Inception では、承認待ち判定の条件、スキャン対象の `state.json` 契約の範囲、一覧の出力形式、実行入口の配置先を具体化する。
