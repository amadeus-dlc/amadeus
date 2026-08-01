# Business Rules — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): unit-of-work(u5 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — FR-4 / FR-5 の u5 帰属), requirements(FR-4 / FR-5, NFR-1〜4), components(C6 / C9 / C10), decisions(ADR-4 / ADR-8 / ADR-10), u3-vocabulary-supply functional-design(§3.5 / §9.2), u4-mirror-declaration-drift functional-design(D-U4-1), business-logic-model.md(本 Unit 同ステージ、§2〜§9 の各設計面)

各ルールは「落ちる実証」を持つ検査として固定する。fail 条件に合致した時点で設計違反であり、PR を通さない。

## BR-M: 両モデル注入 red(AC1、#1920 AC)

| ID | ルール | fail 条件(= 設計違反) | 根拠 |
|---|---|---|---|
| BR-M1 | 注入は**モデルごとの意味論破壊**とし、注入方法は mutation-probe 一般化版の anchor 適用のみとする。FormalElection は既存4変異(unknown-choice / invalid-timestamp / amend-budget / resolution)から選択、MirrorLifecycle は MirrorLifecycle.tla / MirrorLifecycleCore.tla の invariant を名実ともに壊す専用 anchor(NoDuplicateCreate を実質無効化する重複 Create 許容、または TypeOK 破壊)とする。anchor は spec 実測でソース内一意に出現すること(従来 probe の `replaceOnce` 規約を踏襲) | anchor が一意でない / cfg や harness を壊す注入(モデル意味論以外の破壊で red を取る) / 手編集の一回限り注入 | tla-mutation-probe.ts `replaceOnce` 規約, unit-of-work u5 AC1 |
| BR-M2 | 期待 red surface は層ごとに固定: **FormalElection = frozen 層 exit 1(DETECTED、反例)**、**MirrorLifecycle = verified-source 層「completion marker 不在 + exit ≠ 0」**。この非対称は意図的(D-U5-1)であり、どちらかの層の red をもう一方の surface で取る設計にしない | MirrorLifecycle の red を frozen receipt 経由で取ろうとする(toolchain 侵入) / FormalElection の red が exit 2(HARNESS_ERROR)に化ける(注入が harness を壊している = BR-M1 違反) | BLM §3.2, D-U5-1, ADR-10 |
| BR-M3 | red 実証は**往復**で行う: 注入 → red を assert した後、注入除去 → green(元の証跡: FormalElection は NOT_DETECTED、MirrorLifecycle は completion marker + 基準統計)を assert する。片方向のみの red テストは不採用 | 注入除去後の green assert がない / 除去後に証跡が元に戻らない | unit-of-work u5 AC1, team-practices Testing Posture |
| BR-M4 | 注入は scratch fixture(workspace コピー + 補正済み model-map)上でのみ行い、repo 実体の `specs/tla/` と model-map.json を汚染しない | 実体ファイルへの書込み / テスト後に実体の bytes・identity が変化 | NFR-1, t406 設計(BLM §11.1) |

## BR-E: 実測証跡の記録(AC2、ADR-8)

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-E1 | MirrorLifecycle AsIntended の実測値(completion marker / generatedStates / distinctStates / statesLeftOnQueue / searchDepth / 所要時間)は **intent record の code-generation ステージ証跡ファイル**(`<record>/construction/u5-ci-all-models-measure/code-generation/` 配下の e2e-evidence 形式ファイル)へ実測 JSON として固定する。functional-design には基準値と判定規則のみを残す(本ファイルと BLM §7) | 実測値が PR 説明や会話のみに残る / record 外(個人メモ等)への固定 | ADR-8, FR-5, unit-of-work u5 AC2 |
| BR-E2 | 判定は**基準値完全一致**: generatedStates = 208,628、distinctStates = 89,099、searchDepth = 18、statesLeftOnQueue = 0、completion marker 存在、exit 0、stderr 空。不一致は verify 赤とし、値を黙って更新しない(再計測裁定へ送る) | 下限/範囲での緩和 assert / 不一致時に基準値を実測へ書き換えて通す | BLM §7.3, Assumptions D3 |
| BR-E3 | warm-up run は統計 pin の対象外(completion marker のみ要求)。measured run のみ完全一致 pin の対象 | warm-up に統計 pin を課して偽赤化 / measured の pin 漏れ | BLM §7.3 |
| BR-E4 | 統計の抽出は `run-model-check-diagnostic.ts` の `extractDiagnosticStatistics` を**共有**し、port / artifacts / テストに統計抽出の複製実装を置かない | 抽出 regex の複製 / 複製間の drift | BLM §3.4, ADR-2 の単一実装精神 |

## BR-C: ci.yml 差分最小化(C9、NFR-3)

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-C1 | ci.yml の差分は**ステップ名・サマリ表示のみ**。`permissions: contents: read`(:514-515)、`if: github.event_name == 'workflow_dispatch'`(:511)、`timeout-minutes: 30`(:513)、runs-on、ステップ id、outcome 伝播の shell 構造、upload artifact 設定、U4 マーカーコメント、exit code 判定ロジックは**1行も変更しない**。`run` / `verify` のコマンド行も不変(既定が全モデル化するため引数追加は不要) | 上記不変面に1行でも diff / コマンド行への `--model` 追加 / ジョブ・ステップの増減 | components C9, NFR-3, D-制約 C2, FE Q1=A, BLM §6 |
| BR-C2 | 差分の最小性は `git diff` 目視 + t406 の文字列 pin(timeout / permissions / workflow_dispatch 行の不変ガード)で二重に検査する | pin なしの目視のみ / pin の期待値を変更に合わせて緩める | BLM §11.1 |

## BR-T: timeout エスカレーション(FE Q1=A、ADR-8)

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-T1 | 30 分 timeout との不整合が実測で判明した場合、本 Unit の差分に以下を**含めない**: ci.yml timeout/if/permissions の変更、port の run 予算(190 秒)の緩和、統計 pin の緩和、run マトリクスの暗黙縮小。全て要件側の再裁定(time-box 後続裁定)の結果としてのみ許容する | 「動かすため」に上記のいずれかを本 Unit で変更 / 再裁定なしの time-box 化 | ADR-8, unit-of-work u5 AC2 但し書き, BLM §8 |
| BR-T2 | timeout 兆候の検出時は、実測値(各 run の cliMs/spawnMs/elapsedMs、打ち切り位置)を record へ証跡化し、code-summary に「timeout 超過、再裁定要」と記録して立ち止まる | 証跡なしの引き返し / 緩和して green を取って閉じる | BLM §8 |

## BR-S: skeleton / fail-closed(C6、NFR-2)

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-S1 | skeleton の `--model` は FormalElection 以外を**明示失敗**(exit 1)とする意図的 fail-closed。frozen 生成は FormalElection 語彙のまま不変。「未対応」を黙って成功扱いしない | 非 FormalElection 指定で成功 exit / frozen 生成の一般化(ADR-10 違反) | BLM §5, components C6 留意, ADR-10 |
| BR-S2 | `--model` の未登録名は run / verify / diagnostic / skeleton の全 CLI で**明示失敗**(exit 2)。モデル名の登録判定は loader(`selectVerifiedModel`)経由のみとし、CLI パーサに判定を複製しない | 未登録名で既定モデルへ fallback / パーサ内のハードコード名リスト | NFR-2, BLM §2.1 D-U5-2 |
| BR-S3 | 既定(引数なし)は全登録モデル逐次。モデル反復順は model-map.json の `models` 配列宣言順をそのまま使い、新たな順序裁定を設計に混入しない | 既定が単一モデルのまま / 暗黙の並列化 | SD Q1=A, ADR-4, BLM §2.2 |

## BR-D: stage doc 追随(C10)

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-D1 | stage doc(:12 / :35-36 / :42-43)の更新は**実装確定後**に行い(実装先行・doc 追随)、記述を実装 semantics(全モデル既定・`--model` 絞り込み・frozen 層 / verified-source 層の2層)と一致させる。doc 更新後は ci-workflow 系と同型の文字列ガードで実装との整合を固定する | doc 先行で実装が追随しない記述になる / 単一モデル前提の記述の残存 | components C10, FR-4, unit-of-work u5 AC4, BLM §9 |

## BR-F: 不変性(FR-6、成功 (iii))

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-F1 | frozen 層(FormalElection)の挙動は byte 不変: spawn argv(引数化後も FormalElection に対し同一文字列)、frozen receipt identity、parseTlcOutput174 semantics、exit code マッピング。tlc-toolchain.ts / fs-tlc-toolchain.ts / run-model-check-execution.ts / tla-arm.ts には**本 Unit では触れない** | 上記4ファイルへの diff / FormalElection 分の run evidence 内容(outcome / docker argv / cleanup)の変化 | ADR-10, FR-6, BLM §3.1 / §10 |
| BR-F2 | 既存 CI 契約の不変面: bootstrap supply-receipt、validateDockerReceipt の isolation 引数検査、EnvReceipt 検査行列、acceptance スキーマ名(`amadeus.ci-model-check-acceptance.v1` 据え置き)。変更はモデル次元の追加のみ | isolation 検査・EnvReceipt 行列の緩和 / スキーマ名の変更 | BLM §10, NFR-1 |

## BR-O: 所有・運用

| ID | ルール | fail 条件 | 根拠 |
|---|---|---|---|
| BR-O1 | 追加所有(D-U5-4: ci-model-check-runner / artifacts / domain の3ファイル)と、それに連動する t-formal-verif-ci-model-check-artifacts の改訂は code-summary に記録する | code-summary 未記録の所有拡大 | BLM §2.4, u4 D-U4-1 の運用先例 |
| BR-O2 | 変更行 0-hit 不許容(patch coverage ゲート)。テストは修正と同 PR で運ぶ。`bun run typecheck` / `bun run lint` / 既存テスト green。生成ツリー(dist/ 等)は `bun scripts/package.ts` 再生成で追随(手編集禁止) | 未カバー変更行 / テスト別 PR / dist 手編集 | team-practices Testing Posture, requirements Constraints |
