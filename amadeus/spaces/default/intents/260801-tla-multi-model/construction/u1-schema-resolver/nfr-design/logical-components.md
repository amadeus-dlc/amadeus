# Logical Components — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): tech-stack-decisions(純粋モジュール・既存検証手続き再利用), performance-requirements(単読・線形性), security-requirements(注入シーム・境界), reliability-requirements(複製整合), business-logic-model(§1 C1 スキーマ検証 / §2 C2 モジュール参照解決)

## 1. 適用性の結論

本 Unit は常駐サービス境界・障害ドメイン・ネットワーク境界を持たない単一プロセス内の純粋モジュール群であり、配置すべき論理**インフラ**要素(ロードバランサ・キュー・データストア等)は存在しない。本書が固定するのは、Unit 内の**論理コンポーネント境界**(責務の分割線)と、境界を越えて共有される資源の一覧である。これらは functional-design が C1/C2 として分割済みのものの確認であり、新しい分割を発明しない。

## 2. 論理コンポーネント境界

| コンポーネント | 責務 | 所有ファイル | 境界(持たないもの) |
|---|---|---|---|
| C1: モデルマップ・スキーマ検証 | `auxiliaries` / `vocabulary` の形の検証(§1.2 4形分岐、§1.3 aux path 検証、§1.4 vocabulary 検証)。失敗は既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`)のみ | `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` とその byte-identical 複製 `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` | fs アクセス、モジュールソースの読取、TLA+ 依存解決(全て C2 側または loader 側の責務) |
| C2: TLA+ モジュール参照解決リゾルバ | 行ベース抽出(§2.1)、標準モジュール豁免(§2.2)、visited ワークリスト BFS による推移閉包(§2.3)、解決境界(§2.4)、宣言照合(§2.6)。失敗は型付きエラー3種のみ | 新規 `tla-module-deps.ts`(純粋モジュール、`node:` import なし、型 import のみ) | スキーマ検証(C1 側)、fs アクセス本体(注入 `readModule` = loader 側の責務、BR-R8) |
|  shim(再輸出のみ) | `type ModelVocabulary` の re-export のみ。既存 export の意味を変えない(§1.5) | `tla-model-map.ts` | ロジックを一切持たない |

## 3. 共有資源(境界を越えるもの)

| 共有資源 | 共有の形 | 整合の担保 |
|---|---|---|
| byte-identical 2 複製のスキーマファイル | C1 が2リポジトリ配置で同一 byte を共有 | §1.6 更新手順 + `cmp` exit 0 + dual-copy `describe.each` テスト — reliability-design.md §2(複製整合行)/ security-design.md §3 |
| `ModelLoadErrorCode` 列挙 / `invalid(...)` 経路 | C1・C2 とも新規エラーコードを追加せず既存経路を共有(BR-S8) | 既存テスト据置き + 負例のエラーコード検証 — security-design.md §2(後方互換行) |
| `TLA_STANDARD_MODULES` 豁免リスト | C2 内にコード固定で一元管理(外部設定化禁止) | security-design.md §5 禁止事項 |
| 注入シーム `readModule` | C2 の唯一の I/O 境界。実装は loader(u 系統の呼出側)が所有 | import 一覧検査 + t402 stub 伝播 — security-design.md §2(注入シーム行) |
| 型付きエラー3種(`MODULE_DEP_UNRESOLVED` / `MODULE_DEP_CYCLE` / `MODULE_DEP_OUT_OF_BOUNDS`) | C2 の失敗表現として呼出側(loader / t402)と契約を共有 | t402 境界 red 3種 — reliability-design.md §2(fail-closed 行) |

## 4. ブラスト半径

ブラスト半径は「byte-identical 2 複製の片側のみ更新」一点に集約される。封じ込め設計(§1.6 更新手順 + dual-copy テストで構造的に赤化)は security-design.md §3 に記載済みであり、本書は重複記載しない。
