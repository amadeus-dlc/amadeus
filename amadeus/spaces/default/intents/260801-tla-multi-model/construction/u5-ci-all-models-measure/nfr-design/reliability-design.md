# Reliability Design — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): reliability-requirements(RR-1〜RR-5), performance-requirements(PR-1 — timeout エスカレーションと表裏), security-requirements(SR-2 — fail-closed 入力検証と表裏), scalability-requirements, tech-stack-decisions(現行スタック据え置き), business-logic-model(u5 functional-design §2.2 / §3 / §7.3 / §8 / §10 / §11 — 短絡 semantics・二層検証・pin 強度・エスカレーション・不変性・テスト計画)

本 Unit は可用性 SLA を持たない CI 検証ツールであり、信頼性設計の対象は **fail-closed(偽緑の禁止)**・**決定性**・**後方互換の不変性**・**非縮退**の4点である。circuit breaker・retry・failover 等のサービス系 resilience 機構は対象外(N/A 節参照)。機構は全て functional-design が指定済みのものの写像であり、新規機構は導入しない。

## RD-1: fail-closed 設計(RR-1 / NFR-2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| RR-1(異常の明示失敗) | **層ごとの red surface 固定**(BLM §3.2): frozen 層 = exit 1 DETECTED(反例 identity 付き)、verified-source 層 = 「completion marker 不在 or exit ≠ 0 or stderr 非空」(BR-M2 の意図的層非対称)。反例を含む TLC 非 0 終了が成功に化けない | t406 AC1: FormalElection 注入 → exit 1 DETECTED、MirrorLifecycle 注入 → marker 不在 + exit ≠ 0 の両モデル赤化実証 |
| RR-1(短絡 semantics) | **run 失敗時短絡の不変**(BLM §2.2): いずれかの run 失敗で `run-failure.json` + `verification.json`(pass:false)を書き exit 2。failure レコードへの `model` フィールド追加のみ(どのモデルで落ちたかの証跡化) | ci-model-check-runner 統合テストの短絡・失敗分類ケース(期待値不変 + モデル次元追加の同型拡張) |
| RR-1(検査の空洞化防止) | **往復 assert**(BLM §11.1、BR-M3): 注入 → red → 除去 → green の往復。片方向のみの red は不採用 | t406 AC1 の往復 assert 自体 |

## RD-2: 決定性設計(RR-2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| RR-2(統計 pin) | **基準値完全一致 pin**(BLM §7.3、D-U5-3): MirrorLifecycle measured run の統計 4 値(208,628 / 89,099 / depth 18 / queue 0)+ completion marker を完全一致で要求。TLC は固定 jar・workers 1・同一 cfg で決定的(tech-stack-decisions の据え置き)。不一致は verify 赤、値を黙って更新しない。warm-up は marker のみ(BR-E3) | t406 AC2 の統計一致 assert。pin 緩和(exact → 下限等)は BLM §8 の禁止事項(BR-T1)として設計に存在しない |
| RR-2(実装の単一化) | **抽出器の共有**(BLM §3.4 / §4、BR-E4): 統計抽出は diagnostic の `extractDiagnosticStatistics` を共有し、port 側に複製実装を置かない。2実装の乖離による flaky を設計から排除 | diagnostic 統合テストの FormalElection 分抽出期待値不変 + code-generation の差分レビュー(複製なし) |

## RD-3: 後方互換・不変性設計(RR-3 / NFR-1, FR-6)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| RR-3(frozen 層 byte 不変) | **二層検証による保護**(BLM §3.2 / §10): FormalElection は従来経路(run-model-check.ts 正規化 + frozen receipt/binding ゲート)のまま。spawn argv は引数化後も同一文字列を生成し、frozen receipt identity・parseTlcOutput174 semantics・exit code マッピングに触れない。toolchain 4 ファイルは所有外(BR-F1) | 既存テスト期待値不変原則(BLM §11.2): node-ci-port 統合テストで「引数化後も同一 argv」assert、frozen receipt / binding 系は維持仕分けで据え置き |
| RR-3(既存 CI 契約) | **不変面の列挙固定**(BLM §10): bootstrap supply-receipt・validateDockerReceipt・EnvReceipt 検査行列・acceptance スキーマ名(`amadeus.ci-model-check-acceptance.v1`)は不変。変更は「モデル次元の追加」のみ(BR-F2) | 維持仕分けテスト群の green + ci-workflow 統合テストの契約期待値不変 |

## RD-4: 非縮退設計(RR-4)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| RR-4(graceful degradation 非提供) | **エスカレーション経路の事前固定**(BLM §8、D-U5-6): timeout 超過・統計不一致・部分的成功のいずれも、緩めて green を取らず実測値を証跡化して要件再裁定へ送る。本 Unit で timeout・run 予算・pin・マトリクスを緩めない(BR-T1/T2) | code-summary への「timeout 超過、再裁定要」記録 + §8.4 禁止事項の差分非含有を PR レビューで確認。部分成功時も同経路(BLM §8.5) |

## RD-5: patch coverage 設計(RR-5 / BR-O2)

| NFR | 設計機構(functional-design の参照) | 検証方法 |
|---|---|---|
| RR-5(変更行 0-hit 不許容) | **テスト計画の一体化**(BLM §11): 新規 t406 + 統合5ファイル改訂 + support 3ファイル一般化 + artifacts 系追随を修正と同 PR で運ぶ | patch coverage ゲート(変更行 0-hit 不許容)+ `bun run typecheck` / `bun run lint` / 既存テスト green(u5 AC4) |

## N/A 判定(reliability-requirements の段落を踏襲)

- 可用性目標(SLA/SLO/稼働率): **N/A** — 手動起動の CI ジョブでありサービスとしての稼働率概念を持たない。成功基準は run 単位の verdict であり RD-1/RD-2 でカバー(reliability-requirements N/A 節へ前方参照)。
- バックアップ / 災害復旧 / データ耐久性: **N/A** — 永続データを持たない(evidence は CI artifact、record への証跡固定は git 管理ドキュメント)(reliability-requirements N/A 節へ前方参照)。
- サービス系 resilience(circuit breaker / retry / failover / health check): **N/A** — 常駐サービスを持たない CI バッチであり、失敗は即 red surface 化して人の裁定へ送るのが本 Unit の信頼性モデル(RD-1/RD-4)。stage ファイルの produces_kinds 上も reliability-design は [service] ゲートだが、reliability-requirements が実質的な適用要件(RR-1〜RR-5)を持つため本書を比例生成した。

## logical-components.md について

logical-components(kind ゲート [service, ui, library])は当初独立 artifact として生成しない判断としていたが、engine の produces 要件に従い生成済みである(logical-components.md §LC-1〜§LC-4。結論は本節どおり新規境界なし)。本 Unit の変更は単一ディレクトリ `plugins/formal-model-check/tools/` 内の既存コンポーネント(C6 port/runner/domain/artifacts)の引数化・反復拡張 + ci.yml 表示層 + doc 追随であり、新規のサービス境界・failure domain・共有リソースは発生しない(BLM §0 / §12.1)。blast radius は BR-F1/BR-F2 の不変面(toolchain 4 ファイル非接触・docker isolation 不変)で既に固定されており、infrastructure-design へ橋渡しすべき新規要素はない。
