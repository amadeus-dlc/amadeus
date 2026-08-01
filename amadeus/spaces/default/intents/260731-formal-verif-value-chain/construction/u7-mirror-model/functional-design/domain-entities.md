# Domain Entities — u7-mirror-model

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: MirrorLifecycle モデル(新規)

`specs/tla/MirrorLifecycle.tla` + `MirrorLifecycle.cfg`。有限ドメインは RE 実測(receipt status 7・終端4 / operation 3 / boundary 6→4 縮約 / effect 3)— components.md C8 の定義域。

## E2: model-map v2(スキーマ改訂)

`{ schemaVersion: 2, models: [...] }`(T5)。所有: amadeus-formal-verif-model-map.ts(検証関数群 :158/:186 系の v2 化)。u1 で複製された plugin 側コピーも同一変更で同期(ADR-2 の drift guard が強制)。

## E3: 正準 impl 集合(ADR-4 — 4ファイルへ改訂)

reducer + types + coordinator + **amadeus-mirror-project-reconciliation-reducer.ts**(reviewer iteration 2 Critical により追加 — T2 の 14 遷移のうち3遷移の status 変更ロジックの実所在。ADR-4 の自身の根拠「モデルが検査する意味論の全所在が監視面に入る」の機械適用 = 執行クラス改訂、decisions.md へ申告付き伝播)の4ファイル(SHA ピン)。監視面 = SOURCE_DRIFT の検出面 = u6 の --impl-only の運用面(services.md の運用ループ)。

## E4: 工程文書(components.md C9)

docs/ 配下の英語文書2面(追従工程・供給工程)+plugin README からの参照。消費者: 後続 intent の実装者(story-map ジャーニー2)。
