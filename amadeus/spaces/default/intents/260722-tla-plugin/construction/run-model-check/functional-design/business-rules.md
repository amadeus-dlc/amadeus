# Business Rules — U3 run-model-check

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-3.3〜3.6)、components、component-methods、services

## ルール一覧

- BR-U3-1(fail-closed 終局): NOT_DETECTED を主張できるのは exploration COMPLETE + completion marker + state 統計が揃う場合のみ。部分探索・timeout・統計欠損・drift はすべて HARNESS_ERROR(既存 normalize :77-79 の判定を無改変再利用 — finite-exploration-not-detected-proof)
- BR-U3-2(exit 契約): 0 = NOT_DETECTED / 1 = DETECTED / 2+ = HARNESS_ERROR。テストは3系すべての実測を含む
- BR-U3-3(planner 非依存): normalize・issue 検証・SOURCE_DRIFT 照合は planner 選択に依存しない同一コードパス。planner の責務は buildArgv / snapshotEnvironment(prepare時)/ verifyEnvironment(run時 spawn 直前再検証)の3つに限定
- BR-U3-4(Darwin byte-equivalent): C-3b 委譲リファクタ後、Darwin 経路の argv・検証内容・順序・**呼出し位置(prepare=初回スナップショット、run=spawn直前再検証の2段 — TOCTOU 防止保持)**は既存と同一(既存 skeleton テスト・実験資産が無改変 green)。テストは「run() 直前の再検証が発火すること」を drift 注入で固定する
- BR-U3-5(Docker 検証): イメージは digest 固定参照のみ受理(タグ参照は設定エラー)。jar は sha256 検証後にのみ classpath へ。--network=none 必須。docker CLI 不在は HARNESS_ERROR
- BR-U3-6(宣言的非適用): Docker 経路で sandbox receipt / ホスト JDK snapshot 検証を適用しないことを EnvReceipt に理由付きで記録(無言スキップ禁止 — 検証劇場 Forbidden の予防)
- BR-U3-7(落ちる実証): 両 planner 経路で「赤くなる」実証(Darwin: 既知欠陥 D4 注入 / Docker: digest 不一致・jar チェックサム不一致の注入)+ 正当系 green の両側実測(注入は実行時消費行へ — inject-runtime-consumed-lines)。注: U3 の D4 注入の目的は「CLI/planner 配線が exit 1(DETECTED)を正しく返すこと」の実証であり、U1 側 BR-U1-6(モデル同一性の検出連続性 — build-and-test 委譲)とはフィクスチャ共有・目的別個(重複実施ではない)
- BR-U3-8(canonical 消費): TlaModelSource / ModelLoadError は U1 定義を import。独立再定義しない

## テスト観点(Comprehensive)

- unit: 引数 parse(正常/不足/不正 provider)、verdict 写像(3系)、planner buildArgv の純関数検証(両実装)
- integration(実FS): Darwin 経路の実 TLC 完全探索1回(walking skeleton 受け入れ基準2)、エラー系(モデル不在)、EnvReceipt 記録の実在。Docker 経路はローカル docker 可用時のみ実測(CI 実測は U4)— 不可用環境では planner 単体の注入テストで代替し、その旨を diary に記録
