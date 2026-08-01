# Logical Components — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): performance-requirements, security-requirements, reliability-requirements, scalability-requirements, tech-stack-decisions, business-logic-model(§0 配給経路 / §2 / §3.5 / §4.3 / §5 / §9.1 所有ファイル)

## 論理コンポーネント一覧(NFR 機構の適用位置)

本 Unit は単一 repo 内の Bun/TypeScript ツール群であり、デプロイ境界・サービス境界は存在しない。以下は NFR 機構が適用される論理境界(= ファイル/関数境界)の棚卸しであり、infrastructure-design への橋渡しは本 Intent では CI 実行環境(u5 スコープ)に限定される。

| コンポーネント | 実体 | NFR 機構の適用 | 障害域 / ブラスト半径 |
|---|---|---|---|
| 語彙解決(ビュー) | `namedInvariantsFor`(tla-arm.ts)/ `traceVocabularyFor`(tlc-toolchain.ts) | PERF-1(純粋関数)/ REL-1(fail-closed)/ SEC-5(loader 検証済み入力のみ) | 失敗は Result 型の明示失敗として呼出側 1 経路に限定。副作用なし |
| toolchain 正規化 | `parseTlcOutput174` ほか(tlc-toolchain.ts) | PERF-4(regex 呼出ごと構築)/ SEC-1(escapeRegExp)/ SEC-2(閉集合)/ REL-2(失敗分類不変) | 語彙不一致は `failed("GRAMMAR", …)` で当該解析のみ赤。他モデル解析へ波及しない |
| arm frozen 生成 | `generateFrozenTlaModel` / receipt 系(tla-arm.ts) | REL-3/REL-4(pin 不変)/ REL-7(closed-set) | **FormalElection 語彙固定**(ADR-10)。語彙解決失敗時は frozen 生成も失敗する結線 |
| byte-pin 選択 | `bindRequestedModel` / `loadRunModelCheckSource`(run-model-check-source.ts) | PERF-2/PERF-3(照合 1 回・loader 1 回)/ SEC-3(未登録拒否)/ REL-5 | 未登録・drift は当該要求の非ゼロ終了のみ。`hasFrozenModelOutputBinding` は FormalElection スコープのまま(§3.5) |
| 語彙の宣言源 | `specs/tla/model-map.json` FormalElection エントリ | REL-3(一字一致 pin)/ REL-5(追加のみ変更) | vocabulary は drift pin 照合対象外(ADR-6 の正直な限定)— 保護は t404 pin が担う単一機構 |

## 共有資源と隔離

- **共有資源は model-map.json のみ**で、u3 の変更は FormalElection エントリへの vocabulary 追加のみ。MirrorLifecycle エントリは u4 所有で同時編集は発生しない(business-logic-model §6)。
- **toolchain/arm → map/loader の直接依存は禁止**(component-dependency 規則)。語彙は loader 検証済み `VerifiedModelSource` 経由のみ — これが SEC-5 の構造的隔離境界。
- 外部プロセス・ネットワーク・永続状態を持たないため、コンポーネント間の実行時隔離機構(プロセス分離・タイムアウト・回路遮断)は適用外(scalability/reliability 各設計の非適用根拠どおり)。
