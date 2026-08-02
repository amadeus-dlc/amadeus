# Logical Components — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions(TS-U2-1〜5), business-logic-model(§0 変更の輪郭, §3.1 shim, §6 引き渡し)

## コンポーネント境界(本 Unit の所有面)

| コンポーネント | 責務 | failure domain / blast radius |
|---|---|---|
| `tla-model-loader-internal.ts`(u2 所有) | 全登録モデルの identity 照合・宣言-vs-解決照合・entries 照合、`VerifiedTlaSources` / `selectVerifiedModel` の供給、旧 singular API の互換 shim | 失敗は全て型付きエラー(ModelLoadError / ModuleDepsError の union)として呼出側へ返り、プロセスは短命 CLI のため blast radius は当該検証ジョブの fail のみ。部分結果を返さない(fail-fast)ため中途状態は発生しない |
| `tla-model-loader.ts`(u2 所有) | 無引数 production seam(`import.meta.url` 固定、引数なし・注入なし) | seam 性質はピンで検査。実行時入力による root/fs 差替えは構造的に不可能 |

## 共有リソース(u1 供給、本 Unit は消費者)

- `tla-module-deps.ts` の `resolveAuxiliaryModules` / 宣言照合ヘルパ / `ModuleDepsError`(TS-U2-2: loader 側に複製実装を置かない。u1・u2・u4 が同一比較実装を共有し、集合計算のドリフトを排除)。
- `tla-model-map.ts` 経由のスキーマ型(`ModelMapModel.auxiliaries` 等)。byte-identical 2 複製(plugins / packages/framework/core)の同期は u1 の責務。

## コンポーネント分離戦略

- 新規プロセス・サービス・常駐コンポーネントの追加なし。分離はモジュール(import)境界のみで、error union の欠陥クラス分離(SOURCE_DRIFT vs ModuleDepsError、reliability-design RR-U2-2)が呼出側の唯一の診断インターフェース。
- NFR パターンの適用位置: パス境界検査は `verifyAssetPath` 単一点(security-design SR-U2-1)、fail-closed は loader 内の各検証段(§1.2 の4段)、不変性 pin は統合テスト + u2 AC3 pin。インフラ設計(infrastructure-design)へ橋渡しする新規要件は発生しない(ファイルシステム読取のみ、CI 権限追加なし — SR-U2-4)。
