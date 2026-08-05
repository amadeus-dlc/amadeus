# Units Generation Questions

- **Mode:** Grilling
- **Depth:** Standard
- **Question budget:** 最大8問（主質問と確認を含む）
- **leader 承認:** 2026-08-03T10:38:15Z（Q8 Redo分解計画、audit seq 998）

## Q1. Unit境界と粒度

Application Designの深いモジュールを、次の6つのcapability Unitへまとめますか。Issue境界と所有責務を保ちつつ、各Unitへ実装・配線・テストを同居させられるため、dormant adapterや薄い中間Unitを作らず独立検証できます。

- A. 6つのcapability Unit（推奨）: (1) Workflow Contract / Graph / Loop Monitor、(2) Quality Repair Plugin、(3) Intent Grant / Auto Decision、(4) Coordinator / Audit / Status統合、(5) Harness Registry / Package Projection、(6) 5-harness Contract / Live Completion Verification
- B. 5つの粗いUnit: 統合Unitを増やしてUnit数を減らす
- C. 8つ以上の細かいUnit: contract、monitor、grant、decisionなどをさらに分割する
- X. その他（具体的に指定）

[Answer]: A — 6つのcapability Unit。各Unitへ実装・配線・テストを同居させる。

## Q2. 依存DAGと並行可能性

依存を `U1 → U2 → U3`、`U3 → {U4, U5}`、`{U4, U5} → U6` とし、U4（Coordinator / Audit / Status）とU5（Harness Registry / Package Projection）だけを互いに独立な並行可能集合にしますか。#2095 → #2096 → #2067の契約成立を守りつつ、不要なU4↔U5依存を作らない最小DAGです。

- A. U4とU5を並行可能にする最小DAG（推奨）
- B. 全Unitを直列依存にする: U5もU4へ依存させる
- C. U5をU3より前から並行可能にする: registryを公開contract成立前に先行させる
- X. その他（具体的に指定）

[Answer]: 取下げ — independent reviewでM05→M08、M06→M08の上流依存が確認され、提示した並行DAGは循環を作るため無効。DAGはユーザー選好ではなく上流contractから導出する。

## Q3. Story Mapの追跡単位

User Storiesステージは承認済みscopeでSKIPされているため、`unit-of-work-story-map.md`では架空のユーザーストーリーを作らず、`requirements.md`のFR / NFR / Issue ACを「要求slice」として各Unitへ対応付けますか。これなら上流の正本を変えず、全要件と全Unitの被覆を機械的に確認できます。

- A. FR / NFR / Issue ACを要求sliceとしてmapする（推奨）
- B. 技術ユーザーストーリーをこのstageで新規作成してmapする
- C. Story MapをN/Aとして依存DAGだけを出す
- X. その他（具体的に指定）

[Answer]: A — FR / NFR / Issue ACを要求sliceとして各Unitへmapし、架空のstoryは作らない。

## Q4. Unit規模見積りの前提確認

既存の関連Core / harness / test面は約66,000行、主要Core 5ファイルだけで約16,700行あります。そこから、今回の手書きsource + tests（生成・promote mirrorを除く）を合計9,000〜14,000行、Unit別にU1 1,700〜2,500、U2 1,100〜1,800、U3 2,000〜3,000、U4 1,500〜2,400、U5 1,000〜1,600、U6 1,700〜2,700行と見積もります（確度: medium）。この前提で規模を記録しますか。

- A. この数値範囲を採用する（推奨）
- B. 見積りが違うため、通常の判断質問へ切り替える
- X. その他（具体的な見積りを指定）

[Answer]: 取下げ — 行数見積りはユーザー判断ではなく、Inceptionノルムに基づいてエージェントが根拠・確度付きで成果物へ記録し、stage承認ゲートで全体確認する。

## Q5. 合意内容の確認

Q1〜Q3の決定と、承認済みApplication Designから継承する連携・配布契約を以下の要約で確定しますか。Q4の行数見積りはユーザー判断から除外し、エージェントが根拠・確度付きで成果物へ記録します。

- A. 要約どおり確定する（推奨）
- B. 修正する
- X. その他（修正点を指定）

[Answer]: A — 要約どおり確定する。Stage Protocolを省略せず順番どおり実行する。

## Q6. 分解計画の承認

`units-generation-plan.md`の6 Unit、依存DAG、Unit間契約、配布モデル、要求slice map、数値規模と再利用棚卸しを承認し、3つの正規成果物を生成しますか。

- A. 計画を承認する（推奨）
- B. 計画を修正する
- X. その他（修正点を指定）

[Answer]: A — 分解計画を承認し、3つの正規成果物を生成する。

## Q7. Reviewer上限到達後の方針

2回のindependent review後も、M06/M07 production wiringとM08/M09 harness deliveryを別Unitへ分ける境界が成立せず、未設計extension APIまたは循環依存を必要としています。次の方針を選んでください。

- A. Units Generationをvertical end-to-end sliceでRedoする（推奨）: component owner単位の分割を捨て、各Issue sliceへproduction wiring・audit・harness testを同居させ、Unit数も上流から再導出する
- B. Application Designへ戻る: M08/M09の明示extension contractとowner境界を設計し直してからUnit分割する
- C. 現在のstageを未完了のまま停止する
- X. その他（具体的に指定）

[Answer]: A — Units Generationをvertical end-to-end sliceでRedoする。component owner単位の分割を捨て、Unit数も上流から再導出する。

## Q8. Redo分解計画の承認

`units-generation-plan.md`の5つのvertical end-to-end Unit、behavior依存DAG、module owner維持、production wiring/audit/harness test同居、数値規模を承認し、正規成果物を生成しますか。

- A. Redo計画を承認する（推奨）
- B. Redo計画を修正する
- X. その他（修正点を指定）

[Answer]: A — 5つのvertical end-to-end UnitによるRedo計画を承認し、正規成果物を生成する。
