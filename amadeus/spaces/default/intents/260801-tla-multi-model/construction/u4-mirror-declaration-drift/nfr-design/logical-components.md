# Logical Components — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): performance-requirements, security-requirements, reliability-requirements, scalability-requirements, tech-stack-decisions(D-U4-1), business-logic-model(§1 リゾルバ配置 / §2 check 経路 / §3 update 経路 / §4 宣言 / §9.1 所有ファイル), business-rules(BR-SC 系 / BR-SU 系 / BR-IO 系)

## 論理コンポーネント一覧(NFR 機構の適用位置)

本 Unit は単一 repo 内の Bun/TypeScript ツール群であり、デプロイ境界・サービス境界は存在しない。以下は NFR 機構が適用される論理境界(= ファイル/関数境界)の棚卸しである。

| コンポーネント | 実体 | NFR 機構の適用 | 障害域 / ブラスト半径 |
|---|---|---|---|
| 宣言照合(第2検出点・報告側) | sensor `amadeus-sensor-model-completeness.ts` の evaluateAssets 拡張 + 宣言-vs-解決照合ステップ(§2.1/§2.2) | PERF-U4-1(deadline・totalBytes 予算)/ PERF-U4-2(線形集合比較)/ SEC-U4-1(safeReadFile 経由)/ REL-U4-1(declaration-unresolved fail-closed) | 失敗は findings(declaration-drift / declaration-unresolved)として当該モデルのみ赤。verdict 組立ては不変で他モデル判定へ波及しない |
| 宣言補正(第2検出点・補正側) | canonicalRecord 拡張 + performModelMapUpdate flagless 経路(§3.1/§3.2) | REL-U4-2(冪等)/ REL-U4-3(決定性: path 昇順・canonical identity)/ SEC-U4-3(publish 単一性) | 補正は解決集合への置換のみ。リゾルバ失敗は UPDATE_FAILED で publish 前に停止し半更新を出さない |
| --impl-only ラッチ | assetsUnchanged 拡張 + performImplOnlyUpdate(§3.3) | REL-U4-4(entries-only 純粋性)/ REL-U4-5(detail 文言据え置き) | aux 変化・宣言不一致下は INVALID_ARGUMENT で拒否。latch 通過時は model/cfg/aux identity・宣言・vocabulary が byte 同値で保持される |
| リゾルバ(共有実装) | `packages/framework/core/tools/tla-module-deps.ts`(canonical home)+ `plugins/formal-model-check/tools/tla-module-deps.ts`(GENERATED_PLUGIN_SOURCES 複製、D-U4-1) | PERF-U4-2(O(V+E) 推移解決)/ SEC-U4-2(境界外・循環の型付き失敗)/ SEC-U4-5(新規外部依存なし) | 実装は1ファイル、複製は generator の byte 保証付き — `bun scripts/package.ts --check` が drift を赤にする。手編集はどちら側も dist:check 赤 |
| 宣言源 | `specs/tla/model-map.json` MirrorLifecycle エントリ(§4: auxiliaries + vocabulary 追記) | REL-U4-3(宣言 identity = updateModelMap 計算値 = loader 照合値の三者一致)/ REL-U4-5(FormalElection エントリ・entries・既存 identity 不変) | vocabulary は drift pin 照合対象外(ADR-6)。aux identity は宣言値 pin により loader(u2)・sensor(u4)の双検出点で照合される |

## 共有資源と隔離

- **共有資源は model-map.json のみ**。u4 の編集は MirrorLifecycle エントリへの追記(auxiliaries は cfg の後・entries の前、vocabulary は entries の後)に限定し、u3 の FormalElection vocabulary 追記を前提に別エントリへ追記するため同時編集競合は発生しない(unit-of-work 共通契約「u4 は u3 の map 変更を前提に追記」)。
- **実装の単一性**: 宣言照合の集合計算・リゾルバ実装は u1 由来の単一ファイル(D-U4-1 の byte-identical 配置)であり、sensor 側に別実装を作らない(ADR-2 却下案 (c) の回避)。loader(u2)との semantics 一致は同じアルゴリズムを共有することで構造的に保証される(ADR-1 / S3)。
- **MirrorLifecycle entries の impl-only 更新は u4 単独の所有**(unit-of-work)。他 Unit は触らない。通常の u4 実装では entries 対象ファイルを触る経路が存在せず entries drift は発生しない(business-logic-model §3.4)。
- 外部プロセス・ネットワーク・永続状態を持たないため、コンポーネント間の実行時隔離機構(プロセス分離・回路遮断)は適用外 — scalability-design / reliability-design 各書の非適用根拠どおり。
