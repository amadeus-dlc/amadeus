# Requirements Analysis 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 各問ユーザー本人の HUMAN_TURN 直接回答 — Grill me)。合意サマリのユーザー承認タイムスタンプ: 2026-07-22T12:19:37Z(「はい、確定」)
> モード: Grill me(質問は1問ずつ動的に追記)
> 上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure、team-practices(すべて読了)
> 既決(質問対象外): 供給形態=plugins/バンドル、モデル=FormalElection 1本、CI=Linux+既成Dockerイメージdigest固定・workflow_dispatch、fail-closed探索契約、opt-in依存の文書化

## Q1. 【P0】plugin compose 済みステージの engine 配線方式

事実(RE実測): graph compile の walk は amadeus-common/stages/<phase>/*.md のみ(amadeus-graph.ts:1690-1694)。plugins 配下は不可視。t254 の verify はスタブで engine 解決は未証明。候補: (a) compile の walk を compose 先(plugins/*/stages/)へ拡張 (b) compose の投影先を amadeus-common/stages/<phase>/ へ phase-nested 化 (c) formal-model-check をコアステージ化し plugin は seam 寄与のみ。

- A. (a) walk 拡張(推奨): compile が plugins/*/stages/ も走査する汎用 plugin-stage 発見機構を追加。plugin の namespace 素性(コアと構造的に素)を保ったまま、任意の将来 plugin ステージにも効く。ステージの drop 可逆性も自然に成立
- B. (b) 投影先 phase-nested 化: compose がコアステージ領域へ書き込む — plugin 名前空間の素性(no-clobber 保証の基盤)を壊すリスク
- C. (c) コアステージ化: intent-capture Q3 裁定(plugins/ バンドル供給)と矛盾するため再裁定が必要
- X. Other (please specify)

[Answer]: A — graph compile の walk 拡張(plugins/*/stages/ も走査する汎用 plugin-stage 発見機構)(2026-07-22, Grill me)

## Q2. .tla モデルファイルの配置場所

事実(RE実測): モデルは選挙プロトコル(scripts/amadeus-election.ts)の形式仕様であり、検証対象はリポジトリのコード。完備性 sensor はモデル⇔実装の対応ドリフトを検出する(spec 変更時にモデル未更新を検出)。plugin バンドルは compose/drop で出入りする可逆な存在。

- A. リポジトリ所有の specs 配置(推奨): `specs/tla/FormalElection.tla`(+.cfg)等、検証対象コードと同じリポジトリ所有領域に置く。モデルは対象実装と运命を共にすべきで、plugin を drop してもモデル(仕様資産)は残る。sensor の対応追跡も repo 内で完結
- B. plugin バンドル内配置: plugins/<name>/models/ に同梱 — drop でモデルも消える(仕様資産の喪失リスク)
- X. Other (please specify)

[Answer]: A — リポジトリ所有の specs 配置(specs/tla/FormalElection.tla + .cfg。plugin drop でも仕様資産は残る)(2026-07-22, Grill me)

## Q3. 完備性 sensor の供給経路

事実(RE実測): plugin の sensors シームはホストステージ frontmatter へ id 文字列を追加するだけで、manifest(.claude/sensors/amadeus-<id>.md)と実装(.ts)は運ばれない。graph compile は未知 sensor id を loud reject する(amadeus-graph.ts:719)。plugin の stages 貢献は「新規ファイルのコピー」なので、manifest/実装ファイルも stages と同様に plugin バンドルの追加ファイルとして運ぶ配線を作ることは可能だが、sensor 発見経路(.claude/sensors/)への着地は新規実装になる。

- A. コア sensor として供給(推奨): manifest+実装をコア框架(通常の3手順)で追加し、formal-model-check ステージ(plugin側)の frontmatter だけが参照する。RE 指摘どおり低リスクで、sensor は plugin 不在でも単独で有意義(spec ドリフト検出)
- B. plugin 同梱+発見経路拡張: sensor ファイル群も plugin で運び、sensor 発見の walk 拡張も本intentで実装(スコープ増)
- X. Other (please specify)

[Answer]: A — コア sensor として供給(通常の3手順。plugin ステージの frontmatter が参照)(2026-07-22, Grill me)

## Q4. ci.yml 統合ジョブの形態

事実(RE実測): ci.yml は push+pull_request トリガーで全ジョブ ubuntu-latest。既決: 形式検証ジョブは workflow_dispatch 専用(二層検証態勢)・Linux+既成 Docker イメージ digest 固定。ci.yml に workflow_dispatch トリガーを追加すると手動発火が可能になるが、その発火では既存ジョブ(check/coverage)も走る(条件分岐で制御可能)。

- A. ci.yml に dispatch 専用ジョブ追加(推奨): ci.yml へ `workflow_dispatch`(input: formal=true 等)を追加し、formal-model-check ジョブは `if: github.event_name == 'workflow_dispatch'` でのみ実行。push/PR では絶対に走らない。formal-verification.yml は削除。「CI 統合=1ファイル管理」と「二層態勢=日常CIに乗せない」を両立
- B. 別ファイル維持で改名・更新: formal-verification.yml を formal-model-check.yml として作り直す(intent の「ci.yml へ統合」と不整合 — 再裁定が必要)
- X. Other (please specify)

[Answer]: A — ci.yml に workflow_dispatch 専用ジョブ追加(formal ジョブは dispatch 時のみ、push/PR では不実行。formal-verification.yml は削除)(2026-07-22, Grill me)

## 回答分析(contradiction analysis)

全4問回答済み・空欄0。矛盾なし: Q1(walk拡張)は intent-capture Q3(plugins/供給)と整合、Q2(repo所有specs)は完備性sensorの repo 内対応追跡(intent-capture Q4)と整合、Q3(コアsensor)は plugin シーム制約の実測と整合、Q4(dispatch専用ジョブ)は二層検証態勢(既決)と intent 記述(ci.yml統合)を両立。run-model-check.ts は新規ファイル(実験資材 run-skeleton-ci.ts は保持 — intent-capture Q2 裁定から導出、質問不要の執行事項)。
