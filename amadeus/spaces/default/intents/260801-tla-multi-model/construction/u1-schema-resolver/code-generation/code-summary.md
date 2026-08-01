# Code Summary — u1-schema-resolver(code-generation)

**Intent**: 260801-tla-multi-model / **Unit**: u1-schema-resolver(C1+C2) / **Stage**: code-generation

上流入力(consumes 全数): unit-of-work(u1 節・AC1〜4), functional-design(business-logic-model / business-rules / domain-entities), nfr-requirements / nfr-design 全件, requirements(FR-1 / FR-2), components(C1/C2), component-methods(C1/C2), services(S3)

## 変更内容

- `packages/framework/core/tools/amadeus-formal-verif-model-map.ts`(拡張): `ModelMapModel` へ optional `auxiliaries`(非空・path 一意昇順・`specs/tla/<Name>.tla` 境界・自己 aux 禁止・小文字 SHA-256 identity)と optional `vocabulary`(`ModelVocabulary`: namedInvariants / traceStateVariables、非空・TLA 識別子・一意)を追加。モデルの exactObject 許可キー集合を列挙4形(基底 / +auxiliaries / +vocabulary / +両方)へ拡張。新設の内部関数 `parseAuxiliaryIdentities` / `parseModelVocabulary` / `parseVocabularyNames` / `isCanonicalAuxiliaryPath`。失敗は全て既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`)で、`ModelLoadErrorCode` 列挙は不変(BR-S8)。
- `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`: 上記を同一 byte で複写(`cmp` exit 0 実証、BR-S9)。
- `plugins/formal-model-check/tools/tla-model-map.ts`: `type ModelVocabulary` の re-export 追加のみ。
- `plugins/formal-model-check/tools/tla-module-deps.ts`(新規): 純粋モジュール(`node:` import ゼロ、BR-R8)。`extractModuleRefs`(ブロックコメント除去 → 行コメント除去 → 行頭 EXTENDS / INSTANCE / `<id> == INSTANCE X` 代入形の走査、WITH 句不読、`TLA_STANDARD_MODULES` 豁免、異常トークンは明示失敗)、`resolveAuxiliaryModules`(readModule 注入シーム、推移閉包・循環検出・起点除外・ソート重複排除)、`compareModuleDeclarations`(双方向 missing/extra の `ModuleDeclarationDrift`、BR-C1)。エラーは `MODULE_DEP_UNRESOLVED` / `MODULE_DEP_CYCLE` / `MODULE_DEP_OUT_OF_BOUNDS` の3種。
- `tests/unit/t-formal-verif-model-map-v2.test.ts`: aux/vocabulary 正例3件 + 負例(未知キー・空配列・境界外 path 6種・非 canonical identity・重複/非昇順・vocabulary 異形6種)を追加。dual-copy `describe.each` 表にも正例+負例を1件ずつ追加。既存ケースの期待値は一切変更していない(BR-S1)。
- `tests/unit/t402-tla-module-deps.test.ts`(新規): 抽出2書式・コメント/文字列内偽キーワード不採用・標準モジュール豁免・未閉鎖ブロックコメント・異常トークン赤・実ファイル MirrorLifecycle → `["MirrorLifecycleCore"]`・推移閉包・決定性・UNRESOLVED/CYCLE(相互・自己)/OUT_OF_BOUNDS 各赤・注入失敗伝播・宣言照合双方向。
- 生成ツリー追随: `bun scripts/package.ts` 再生成(dist/ 各ハーネス + plugins 配布物に `tla-module-deps.ts` が新規同梱)、`bun run promote:self`(root `.claude/` `.codex/` `.cursor/` `.kimi-code/` `.opencode/` の tools 複製を同期)。

## AC 証跡

- **AC1(schema mismatch red)**: 負例全件が `MODEL_MAP_INVALID` で落ちることを個別ケースで実証(テスト「rejects auxiliaries with unknown keys or an empty array」「rejects auxiliary paths outside the canonical specs/tla boundary」「rejects non-canonical auxiliary identities and unordered or duplicate paths」「rejects malformed vocabulary shapes and members」)。green。
- **AC2(aux 正例 + 省略モデル byte 不変)**: 「parses models carrying auxiliaries, vocabulary, or both」が `toEqual` で入力一致を実証。既存の「parses a multi-model canonical map」(期待値不変のまま green)が省略2モデルのパース結果不変を保証。green。
- **AC3(リゾルバ)**: t402「resolves the real MirrorLifecycle module to MirrorLifecycleCore」(実ファイル、改行跨ぎ WITH 代入形)、「never adopts EXTENDS/INSTANCE-shaped text inside comments or mid-line」(偽陽性)、UNRESOLVED/CYCLE/OUT_OF_BOUNDS の明示失敗。green。
- **AC4(byte-identical + 既存 green)**: `cmp` exit 0、dual-copy 表の両側 green、typecheck / biome / 既存 formal-verif 単体 187 件 green、package/promote の drift guard 両方 exit 0。green。

## 検証コマンドと結果

| コマンド | 結果 |
|---|---|
| `bun test tests/unit/t-formal-verif-model-map-v2.test.ts tests/unit/t402-tla-module-deps.test.ts` | 39 pass / 0 fail、exit 0 |
| `bun run typecheck` | exit 0 |
| `bunx @biomejs/biome check plugins/formal-model-check/tools/ packages/framework/core/tools/amadeus-formal-verif-model-map.ts tests/unit/t402-tla-module-deps.test.ts tests/unit/t-formal-verif-model-map-v2.test.ts` | exit 0(warning は既存ベースライン同様。新規 `tla-module-deps.ts` に complexity warning 2 件 — 後述) |
| `cmp <canonical> <plugin 複製>` | exit 0 |
| `bun test tests/unit/t-formal-verif` | 187 pass / 0 fail、exit 0 |
| `bun scripts/package.ts` / `bun scripts/package.ts --check` | 両方 exit 0 |
| `bun run promote:self:check` | exit 0(初回は root 複製の DIFFERS で失敗 → `bun run promote:self` 適用後に解消) |

## 乖離・留意

- **`models: []` のパーサ挙動(u2 への回答)**: `parseTlaModelMap` は `value.models.length === 0` を `MODEL_MAP_INVALID`("models must be a non-empty array")で**拒否する**(amadeus-formal-verif-model-map.ts の models ガード、および既存テスト「rejects an empty models array」が実証)。つまり **models:[] は受理されない**。u2 の loader 全登録モデル化は「model-map に少なくとも1モデル登録済み」を前提にしてよい。
- `extractModuleRefs` の異常トークン(BR-R7)のエラーコードは設計に個別コード指定がなく、fail-closed の既定として `MODULE_DEP_UNRESOLVED` + detail("malformed module reference …")に乗せた。`ModelLoadErrorCode` ではなく resolver 側3コードの範囲内の判断。
- `resolveAuxiliaryModules` は注入 `readModule` の失敗を原則そのまま伝播するが、起点以外のモジュールで `MODULE_DEP_UNRESOLVED` 以外のコードが返った場合は `relativePath` を当該モジュールへ付け替えて wrap する(起点の注入失敗は byte 同一で伝播 — t402「propagates the injected readModule failure」で実証)。
- `tla-module-deps.ts` に biome の cognitive-complexity **warning** 2 件(extractModuleRefs=25, visit=16)。リポジトリの lint ゲートは warning 許容の exit 0 ベースライン(AGENTS.md 記載どおり)で、既存ファイルにも同種 warning があるため許容とした。エラー化される場合は抽出ループの分割で対処可能。
- `amadeus-state.md` / audit shard の差分は swarm driver の記録であり、本 Unit の実装コミットには含めていない。

## Review
