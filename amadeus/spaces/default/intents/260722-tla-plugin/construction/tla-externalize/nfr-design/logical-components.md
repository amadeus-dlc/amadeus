# Logical Components — U1 tla-externalize

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## コンポーネント境界

| Component / owner | Responsibility | Synchronous contract |
|---|---|---|
| `TlaAssetLocator` / `tla-model-loader-internal.ts` | production wrapperが渡す`import.meta.url`からrepo rootと固定assetを解決 | internal module URL → Result&lt;VerifiedAssetPaths, ModelLoadError&gt; |
| `TlaModelLoader` / `tla-model-loader-internal.ts` | bytes読込、空・読取障害の分類 | VerifiedAssetPaths → Result&lt;RawTlaSource, ModelLoadError&gt; |
| `ModelMapParser` / `tla-model-map.ts` | canonical schema、implementation相対path境界、SHA-256形式を検証 | map bytes → Result&lt;ModelMap, ModelLoadError&gt; |
| `TlaIdentityVerifier` / `tla-model-loader-internal.ts` | canonical identityと実装hashを照合 | RawTlaSource + VerifiedModelEntries → Result&lt;VerifiedTlaSource, SourceDriftError&gt; |
| production loader API / `tla-model-loader.ts` | 固定`import.meta.url`をinternal pipelineへ渡す唯一のruntime entry | 引数なし → Result&lt;VerifiedTlaSource, TlaModelPipelineError&gt; |
| U1 adapter / `tla-arm.ts` | pipeline Resultを内部で分岐し、error写像または既存生成処理を呼ぶ | 引数なし → 既存公開結果またはHARNESS_ERROR |

## 隔離とblast radius

- 依存方向は`tla-arm.ts` adapter → production `tla-model-loader.ts` wrapper → `tla-model-loader-internal.ts` pipeline → `tla-model-map.ts`とし、逆参照を禁止する。parserはloaderや`tla-arm.ts`をimportしない。
- pipeline内でlocator → loader/parser → verifierを同期Resultで接続し、adapterが戻り値をfoldする。success分岐だけが`VerifiedTlaSource`をgeneratorへ渡し、failure分岐だけがerror mapperを呼ぶ。
- production exportは引数なしの`loadVerifiedTlaSource()`だけとする。module URLとfilesystemを注入できるseamは`tla-model-loader-internal.ts`へ隔離し、root barrelおよびproduction loaderから再exportしない。既存の公開generator/receipt関数シグネチャは変更せず、Resultを引数へ露出させない。
- loader障害はU1 invocationだけを失敗させ、通常CIの他job、network、外部serviceへ波及しない。
- 共有資源はread-onlyなGit管理assetと既存identity関数だけであり、mutable cacheやprocess-global状態を持たない。
- U1は新しいAWS資源やインフラ境界を必要としない。Infrastructure Designへの引継ぎ対象はない。
