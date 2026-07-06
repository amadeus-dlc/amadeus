# AI-DLC v2

この文書は、AI-DLC v2 の技術仕様スライドを amadeus で再参照しやすくするための読み取りメモである。

原典 PDF は [aidlc-v2-ai-coding-lifecycle-ja.pdf](aidlc-v2-ai-coding-lifecycle-ja.pdf) である。

ページ画像は [aidlc-v2-ai-coding-lifecycle-assets](aidlc-v2-ai-coding-lifecycle-assets/) に保存している。

## 読み取り結果

AI-DLC v2 は、AI-DLC の思想を実行可能な開発基盤へ移した仕様である。

v1 は、ルールを各ハーネスへコピーする方式だった。

v2 は、決定論的な進行制御、状態管理、監査ログ、品質センサー、学習ループを持つ。

AI の自律進行を強めるのではなく、AI の進行を制御可能にする点が中核である。

## v1 から v2 への変化

v1 は、LLM の判断に進行管理を委ねていた。

そのため、文脈が揺れ、状態復旧も人間の手作業に寄っていた。

v2 は、決定論的エンジンでステージを制御する。

進捗は状態ファイルに保持し、判断、承認、成果物更新は監査ログに残す。

この構造により、会話だけで進んだ判断を基準にしない。

最終判断は、構造化された成果物へ反映される。

## 5フェーズと32ステージ

AI-DLC v2 は、5つのフェーズで構成される。

```text
Initialization -> Ideation -> Inception -> Construction -> Operation
```

Initialization は、作業場所、文書骨格、状態を初期化する。

Ideation は、Intent、実現可能性、Scope、初期モックを扱う。

Inception は、コード分析、Architecture Design、Unit of Work Plan、Delivery Roadmap を扱う。

Construction は、Bolt Execution、Test Implementation、Security Audit、CI/CD Pipeline を扱う。

Operation は、Deploy Strategy、Observability、Feedback Loop を扱う。

amadeus では、Ideation と Inception が Intent Contract と Unit Traceability に強く対応する。

Construction は、Bolt と Spec の実装、検証へ対応する。

## 状態と監査

v2 は、状態ファイルで全ステージの現在地を保持する。

状態には、完了済み、実行中、承認待ち、未開始が含まれる。

監査ログは追記専用で、ステージ開始、成果物更新、承認待ち、承認、学習ルールの保存を記録する。

この構造は、amadeus の Intent Seal、Intent Status、Validate、Audit に対応する。

会話で決まったことを、Intent Contract や Unit Traceability へ反映せずに進めると、AI-DLC v2 の前提から外れる。

## 承認ゲート

v2 は、各ステージの境界に承認ゲートを置く。

AI は成果物を生成する。

人間は成果物を検証し、次のステージへ進めるか判断する。

承認方法には、案内モード、直接編集モード、会話モードがある。

どの方法を使っても、最終判断は構造化された質問ファイルや成果物へ集約する。

この考え方は、amadeus の seal と相性がよい。

seal は会話の終点ではなく、次工程が参照できる基準を固定する行為である。

## センサー

v2 は、自然言語ルールと決定論的センサーを分ける。

ルールは、AI が読むガードレールである。

センサーは、成果物をコードで検査する決定論的な仕組みである。

スライドでは、必要セクション、上流成果物の反映、静的解析、型検査が例示されている。

amadeus では、`amadeus-validate-intent`、`amadeus-validate-traceability`、`amadeus-validate-spec` がこの考え方に対応する。

検証は助言にとどまる場合でも、監査ログと詳細ファイルへ残す必要がある。

## Boltモデル

Bolt の分割と順序は、Inception の Delivery Planning stage で `bolt-plan.md` として計画する。

Construction フェーズは、計画済みの Bolt を Bolt 単位で実行し、Bolt を計画する stage を持たない。

Bolt には、Walking Skeleton、Feature、Integration のような役割がある。

Walking Skeleton は、最小のエンドツーエンド実装である。

Feature は、垂直スライスとして実装する主要機能である。

Integration は、複数 Bolt を統合し、全体テストへ収束させる単位である。

Bolt の進め方には、ゲート付き実行と自律実行がある。

amadeus では、信頼できる定型作業であっても、Intent Contract と Unit Traceability から外れないことが前提になる。

## amadeus への対応

```text
AI-DLC v2 State -> amadeus Intent State
AI-DLC v2 Gate -> amadeus Intent Seal
AI-DLC v2 Sensor -> amadeus Validate
AI-DLC v2 Audit Log -> amadeus Audit
AI-DLC v2 Bolt Execution -> amadeus Bolt と Spec 実装
```

amadeus は、AI-DLC v2 の全フェーズをそのまま実装するものではない。

amadeus の役割は、Intent Contract を基準にし、Unit、Bolt、Spec の追跡関係を保ったまま cc-sdd の仕様化へ接続することである。

そのため、cc-sdd 由来の Spec 生成コマンドも Intent-aware でなければならない。

Spec が `amadeus/spaces/<space>/intents/*` を参照しない場合、SSoT から漂流する。

## ページ対応

| ページ | 内容 | 画像 |
|---:|---|---|
| 1 | 表紙 | [page-01.png](aidlc-v2-ai-coding-lifecycle-assets/page-01.png) |
| 2 | v1とv2の違い | [page-02.png](aidlc-v2-ai-coding-lifecycle-assets/page-02.png) |
| 3 | アドホックなAIコーディングの限界 | [page-03.png](aidlc-v2-ai-coding-lifecycle-assets/page-03.png) |
| 4 | 5フェーズと32ステージ | [page-04.png](aidlc-v2-ai-coding-lifecycle-assets/page-04.png) |
| 5 | 方法論と実装の分離 | [page-05.png](aidlc-v2-ai-coding-lifecycle-assets/page-05.png) |
| 6 | エージェント体制 | [page-06.png](aidlc-v2-ai-coding-lifecycle-assets/page-06.png) |
| 7 | スコープと分析深度 | [page-07.png](aidlc-v2-ai-coding-lifecycle-assets/page-07.png) |
| 8 | 人間が判断を握る承認ゲート | [page-08.png](aidlc-v2-ai-coding-lifecycle-assets/page-08.png) |
| 9 | 状態管理ファイルと構造化監査ログ | [page-09.png](aidlc-v2-ai-coding-lifecycle-assets/page-09.png) |
| 10 | チーム知識の蓄積と学習ループ | [page-10.png](aidlc-v2-ai-coding-lifecycle-assets/page-10.png) |
| 11 | 決定論的チェックを行うセンサー | [page-11.png](aidlc-v2-ai-coding-lifecycle-assets/page-11.png) |
| 12 | ConstructionフェーズとBoltモデル | [page-12.png](aidlc-v2-ai-coding-lifecycle-assets/page-12.png) |
| 13 | 開発基盤としてのAI-DLC v2 | [page-13.png](aidlc-v2-ai-coding-lifecycle-assets/page-13.png) |
