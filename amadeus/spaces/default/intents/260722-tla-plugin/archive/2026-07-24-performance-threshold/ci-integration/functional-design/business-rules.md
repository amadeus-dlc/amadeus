# Business Rules — U4 ci-integration

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-5.1〜5.4)、components、component-methods、services

## ルール一覧

- BR-U4-1(dispatch 限定): formal ジョブは `if: github.event_name == 'workflow_dispatch'` の job レベル条件でのみ実行。push/PR では構造的に走らない(二層検証態勢の既決)
- BR-U4-2(供給元固定): イメージは eclipse-temurin の @sha256 digest 参照のみ、jar は版固定 URL+sha256 検証。digest/チェックサム値は実装時に実測して焼き込む(rev-parse/sha256sum の実出力のみ — 手動展開禁止)
- BR-U4-3(既存経路不変 — iteration 2 ユーザー裁定 A で改訂): 許容される既存ファイル変更は3点のみ — (i) `on.workflow_dispatch` 追加 (ii) `formal-model-check` ジョブ追加 (iii) `changes` ジョブへの「BASE_SHA 空検知 → ci=false」最小分岐(申告済み — FR-5.4 改訂版準拠)。それ以外(残り6ジョブ・トリガー・env)は base と diff ゼロをテスト述語「許容3変更除去後の全文一致」で固定。formal ジョブは changes 非依存・ci-success.needs へ追加しない。push/PR 経路の挙動不変は「BASE_SHA 空は push/PR で発生しない」ことのテスト(既存分岐の回帰)で担保
- BR-U4-4(単一ファイル退役): formal-verification.yml は削除し、置換・改名・条件付き保持をしない(FR-5.3)
- BR-U4-5(エビデンス): formal ジョブは成功・失敗を問わず out/ を artifact upload(if-no-files-found: error — 空成功の防止)
- BR-U4-6(timeout): ジョブ timeout-minutes 30(NFR-2、既存 formal-verification.yml と同値)
- BR-U4-7(U3 Docker受入の必須引継ぎ): workflow_dispatchのformal jobは固定digest Dockerによる実container完全探索を必ず実行する。warm cacheでwarm-up 1回後に5回計測し、全回exit 0、spawn 120秒未満、CLI 180秒未満、terminal manifest/EnvReceipt/digest整合を満たすまでU3 Step 11およびU4を完了扱いにしない。deterministic planner/falling proofはこの実測を代替しない。

## テスト観点(Comprehensive)

- integration(実FS・YAML parse): ci.yml の dispatch トリガー実在、formal ジョブ if 条件 verbatim、既存ジョブ無変更、formal-verification.yml 不在、timeout/artifact 設定値
- 落ちる実証: テスト自体への欠陥注入(if 条件の改変・退役ファイル復活)で赤くなることを確認してから完成扱い
- 実 dispatch 1回(A2 実測)はユーザー承認後に実施し、実行時間・green を記録
- 実dispatchではDocker実containerのwarm-up 1回+計測5回のraw spawn/CLI時間を保存し、BR-U4-7の上限と全回NOT_DETECTEDを検証する
