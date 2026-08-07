# Domain Entities — Unit tla-specs-relocation

上流: `inception/requirements-analysis/requirements.md`(FR-1〜FR-9)。本書は移設に関わるドメイン实体とその責務を定義する。実装は code-generation(3.5)で行う。

## E-1: SpecRootResolver(新設 — FR-2 の中核)

spec 層の正準ルートを解決する**単一経路**。現行3系統(activation の `specRootForHost` / sensor の `MODEL_MAP_RELATIVE_PATH` 基準解決 / loader の `findRepositoryRoot` walk-up)をこの1実装へ収斂させる。

- 責務: workspace root と active-space カーソルから `amadeus/spaces/<activeSpace>/specs/` を導く
- 配置: `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` に正本を置く(このファイルは `scripts/package.ts:820-826` の verbatim byte copy により plugin 側 `plugins/formal-model-check/tools/` へ byte-identical 鏡像される既存経路があり、core / plugin 双方が同一実装を共有できる。guard: t-package-generated-plugin-sources)
- **seam(§12a iteration 1 の BLOCKER 解消 — 設計判断)**: Resolver は `./amadeus-lib.ts` を import **しない**。plugin tools は plugin 外を一切 import しない規則(実測: `plugins/formal-model-check/tools/**` で `from "../` 0件)があり、インストール後レイアウトでも plugin tools(`.kimi-code/plugins/formal-model-check/tools/`)と framework tools(`.kimi-code/tools/`)は分離するため、鏡像が `./amadeus-lib.ts` を import すると source plugin 複製・installed plugin の双方で解決不能になる。したがって active-space の取得は **`amadeus/active-space` カーソルファイルの直接読取**(node:fs のみ、不在・不読時は `default` へフォールバック・throw しない)として鏡像内に実装する。これは `activeSpace()`(`amadeus-lib.ts:1119-1133`)が読むのと同じカーソルファイル契約の共有であり、新機構の発明ではない(FR-2 との整合。in-tree 先例: `activeSpaceLocal`、`amadeus-subagent-stats.ts:388-400` が同じ node:fs 単独・非 throw・default フォールバックの直接読取)。カーソル値をパスセグメントに使う前に safe-name 検証(`isSafeWorkspaceEntryName`、`amadeus-lib.ts:1128`。先例 SAFE_NAME: `amadeus-subagent-stats.ts:388-393`)を複製し、不正値は default へ落とす(§12a iteration 2 FOLLOW-UP の反映)。core 側消費者もこの Resolver 経由に統一し、activeSpace の直接呼出しを新たに増やさない(BR-1)
- 派生値: spec dir(`<root>/tla`)、model-map(`<root>/tla/model-map.json`)、evidence store root(`<root>/tla-evidence`)
- 属性: `workspaceRoot`(検出済み)、`space`(カーソル読取)、`specsRoot`(導出)、`legacySpecsRoot`(`<workspaceRoot>/specs` — 検出専用)

## E-2: CanonicalSpecPaths(既存改修 — FR-5)

model-map v2 の正準パス語彙。`parseAssetIdentity`(`amadeus-formal-verif-model-map.ts:171`)が `:335`/`:337` で `tlaModelPath` / `tlaCfgPath` 生成値へピンし、auxiliaries は `:247`/:250/:272 が検査する。

- 変更: 正準パス生成の基底を `specs/tla/...` から `amadeus/spaces/<space>/specs/tla/...` へ。`<space>` 要素は map の path 値に現れる(repo 相対、例: `amadeus/spaces/default/specs/tla/FormalElection.tla`)
- 不変: `identity` はコンテンツ base の canonical ハッシュ(`:33-43`)であり、パス移動では変わらない

## E-3: WatchDeclaration(既存改修 — FR-3)

spec-hash watch の宣言。基底と glob の対。

- 現行: 基底 `specRootForHost(hostRoot) = dirname(hostRoot)`(`amadeus-plugin-activation.ts:100-102`)、glob `specs/tla/**`(`:42` ACTIVATION_WATCH_GLOBS)
- 新規: 基底 = E-1 の導く `amadeus/spaces/<activeSpace>/specs/`(所有ルートで明示宣言 — cid:code-generation:cg-watch-root-separation)、glob = `tla/**`
- センサー matches glob(`packages/framework/core/sensors/amadeus-model-completeness.md:8`)の新形状は **固定深度形** `**/{amadeus/spaces/*/specs/tla/**,<既存の実装側エントリ群>}` とする(§12a iteration 1 FOLLOW-UP。dispatcher の bespoke globToRegex(`amadeus-sensor-fire.ts:217-219`)が受理する形の制約があるため、入れ子 `**` 形 `amadeus/spaces/**/specs/tla/**` は採らない。採用形は code-generation で両エンジン(Bun.Glob + globToRegex)実測で検証する)

## E-4: LegacySpecDetection(新設 — FR-6)

旧配置の検出と fail-closed 停止。

- トリガ: E-1 の解決時に `<workspaceRoot>/specs/tla/` に spec(`.tla` / `model-map.json`)を検出
- 振る舞い: 新パスへの移設手順(`git mv specs/tla amadeus/spaces/<space>/specs/tla` と参照更新の案内)を含むエラーで停止。旧・新の両方に spec がある場合も曖昧性として停止(無音の二重読みを構造的に排除)
- 例外: spec を持たない空の `specs/` ディレクトリ残骸は検出対象外とするかどうかは実装段で決める(空 dir は git 追跡されないため通常発生しない)

## E-5: EvidenceStoreRoot(既存改修 — FR-4)

TLC 実行証跡の store root。

- 現行: `DEFAULT_STORE_ROOT = "specs/tla-evidence"`(`tla-evidence.ts:434` の静的文字列)、fallback 使用側は `tla-authoring.ts:189`(`return raw ?? DEFAULT_STORE_ROOT;`)
- 新規: E-1 の Resolver 経由で `amadeus/spaces/<activeSpace>/specs/tla-evidence/` を導く。fallback サイトを含め Resolver 呼出しに置き換える(留保1)
- 不変: watch 除外(260804-tla-authoring ADR)を新 root 基準で維持 — evidence は WatchDeclaration の glob `tla/**` に含まれない

## E-6: AdvisoryTarget(文言更新 — FR-7)

spec hash drift advisory のターゲット表示。現行「spec hash CHANGED (specs/tla)」(`amadeus-plugin-activation.ts:229` ほか :231/:233/:304-305、`amadeus-advisory-choice.ts:894-895`)。

- 変更: ターゲット表記を新正準パスへ。verdict 語彙(CHANGED 等)は不変(NFR-1)
- 歴史 audit の旧文言は過去の事実として残す(書換禁止 — Constraints)

## 实体間の関係

```
SpecRootResolver(E-1) ──導出──> CanonicalSpecPaths(E-2) の基底
                  ──導出──> WatchDeclaration(E-3) の基底
                  ──導出──> EvidenceStoreRoot(E-5)
                  ──検出──> LegacySpecDetection(E-4) のトリガ条件
AdvisoryTarget(E-6) は WatchDeclaration(E-3) の drift イベント表示面
```
