# Unit of Work — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md — Unit 分割は components.md の改修目録を FR 系列で凝集し、見積規模は component-methods.md の API 面数から按分、依存は decisions.md の ADR(ADR-1/2 の resource 前提)と component-dependency.md の依存グラフから導出した。「新 store なし・常駐なし」の境界は services.md に依拠し、Unit に運用系作業を含めない。

## Unit 一覧(各 Unit は単独 deployable な Bolt = 1 PR)

| Unit | 内容 | 対応 FR | 見積 |
|---|---|---|---|
| **U1 resource-core** | `otel/resource.ts`+`resource-suppliers.ts` 新設、bootstrap 一元組み立て、3プロバイダ+local-span-exporter の resource 搬送/redaction、hooks からの session/model 供給、vcs/CI/host 解決 | FR-RES-1〜4 | 実装 ~350行+テスト ~330行 |
| **U2 span-attrs** | span attribute resolver(intent/space/stage/phase+agent.type/id env arm)、stage memo+リセットシーム | FR-SPAN-1〜2 / FR-SUB-4(resolver 契約のみ — **供給経路は【FD 段の未決事項】**、components.md:20 の申告を維持) | 実装 ~50行+テスト ~130行 |
| **U3 exception** | registry へ exception.type/stacktrace 追加、recordException 拡張、redactStacktrace 新設 | FR-EXC-1〜3 | 実装 ~95行+テスト ~150行 |
| **U4 subagent-started** | SUBAGENT_STARTED canonical 追加(78→79 pin 6箇所)、PreToolUse hook 新設、settings 配線、lifetime 読取合成 | FR-SUB-1〜3 | 実装 ~195行+テスト ~230行 |
| **U5 metrics** | meter arm bootstrap 配線、metrics-instruments 定数、計器5つの計測点配線、token 供給 seam | FR-MET-1〜4 | 実装 ~150行+テスト ~200行 |
| **U6 docs** | docs/reference telemetry スキーマ章 | FR-DOC-1 | ~200行 |

無改変 FR(FR-SPAN-3 / FR-EXC-4)は U2/U3 の characterization 維持で担う。

**按分方法(components.md 行 → Unit、全行が過不足なく1 Unit へ帰属)**:
- U1(=350): resource.ts 120+suppliers 80+tracer resource 部 15+span-exporter 20+logger 系 30+meter resource 載せ 10+bootstrap resource 部 25+session hooks 50
- U2(=50): tracer resolver 部 35+resolver arm 行 15
- U3(=95): tracer recordException 部 20+redaction 60+event-registry exception 部 15
- U4(=195): subagent-start hook 100+event-registry SUBAGENT_STARTED+pin 部 15+lifetime 80
- U5(=150): metrics-instruments 60+meter arm 20+bootstrap meter 部 15+計測点配線 55
- テスト(=1,040): U1 330(resource 180+suppliers 120+改修面 30)/ U2 130 / U3 150 / U4 230(hook 130+lifetime 100)/ U5 200(instruments 80+配線ほか 120)— components.md の「改修面の追加テスト ~430」行を U 別へ分解(30+130+150+0+120=430)+新設モジュールテスト 610

**合計 = 実装 ~840行+テスト ~1,040行+docs ~200行**(components.md の行機械合算と同一 — 双方向照合済み)。

**全 Unit 共通の実装制約(NFR-4)**: U1〜U5 はいずれも packages/framework/core を触るため、各 Bolt PR で `bun scripts/package.ts`+`bun run promote:self` を同一変更で回し、dist:check / promote:self:check を green にしてから push する。

## 依存エッジ(実行可能性の制約)

正準の YAML edge block は unit-of-work-dependency.md に置く(parseBoltDag 消費、per-unit-loop-activation 準拠)。エッジの根拠は下記のとおり:

- metrics → resource-core: 計器 record が resource bag を要する(ADR-1)
- docs → 全 Unit: 実属性の対応表は実装確定後
- **実ファイル交差(YAML エッジへ符号化済み)**: tracer-provider.ts は U1(resource 部)/U2(resolver 部)/U3(recordException 部)の3者交差 — U2/U3 は U1 の `currentResource()` 導入後の同領域に積むため `depends_on: [resource-core]`。event-registry.ts は U3/U4 交差 — U4 を `depends_on: [exception]` で直列化(c6 準拠。並行化したい場合は着手前に実 diff で非交差を実証してからエッジを外す)

## deployable 検証(units-generation:c1)

各 Unit は単独で main 相当へ着地可能(additive・fail-open・機能フラグ不要)。U4 のみ canonical pin 6箇所連動があるが単一 PR 内で閉じる。
