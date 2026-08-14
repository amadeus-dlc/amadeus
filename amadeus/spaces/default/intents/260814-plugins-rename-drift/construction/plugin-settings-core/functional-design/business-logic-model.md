# Business Logic Model — plugin-settings-core

上流入力: `unit-of-work.md` U2、`unit-of-work-story-map.md`(FR-SET-1〜5 → U2)、`requirements.md` FR-SET 群、`components.md` C2/C3/C4、`component-methods.md`(契約)、`services.md` F2(発火フロー)。

## ワークフロー 1: 宣言 parse(compose 時 — C2)

```
plugin.json bytes → parsePluginManifest(:345-351 の並び)
 1. raw.settings 不在 → 宣言 = {}(従前動作、byte-identical)
 2. raw.settings あり → parseSettings(raw.settings, errors):
    a. 非オブジェクト → error "settings must be an object mapping keys to declarations"
    b. 各 [key, decl] について順に:
       - キー名検査: SETTINGS_KEY_RE(^[a-z][a-z0-9-]*$、64 文字以内)
       - 機密パターン検査: SECRET_KEY_RE(token|password|secret|credential|apikey|api-key)に部分一致 → error
       - decl.type ∈ {"string","number","boolean","enum"} でなければ error
       - decl.default の JS 型が decl.type と一致(enum は string かつ decl.values に含まれる)でなければ error
       - type=enum で decl.values が非空 string 配列でなければ error
       - decl.description が非空 string でなければ error
 3. 綴り誤り検査(settings キー実在検査 — ADR-3 範囲限定): raw のトップレベルキーのうち
    既知集合 {name,stages,seams,fragments,tools,sensors,advisories,settings} に無く、
    かつ小文字化が "settings" との Levenshtein 距離 ≤ 2 のもの → error "did you mean \"settings\"?"
    (advisories は別パーサ所有の既知キーとして許容リストに含める — 既存 manifest を壊さない)
 4. errors 非空 → {manifest:null}(既存 :350 の fail-closed に相乗り)
```

## ワークフロー 2: config parse(全 config 読取時 — C3)

```
amadeus/config.json (+ space/intent 層) → registry 駆動 parse
 1. "plugin.settings" registry エントリ(layers=[project,space,intent])→ parsePluginSettings(value):
    a. 非 plain object → invalid(expected: "object mapping plugin names to setting key/value records")
    b. 各 [plugin, kvs]: PLUGIN_NAME_RE 不適合 or 非 object → invalid
    c. 各 [key, v]: SETTINGS_KEY_RE 不適合 or SECRET_KEY_RE 一致 → invalid;
       v が string/number/boolean 以外(null/配列/オブジェクト)→ invalid
 2. issue 1 件でも全体 invalid(部分適用なし — 既存 :836-841 の挙動に相乗り)
 3. 層マージ: per-plugin per-key の浅マージ、後勝ち(project ← space ← intent)
```

注: config parse 時点では宣言スキーマへアクセスしない(compose 前の config 読取もあるため)。型・閉語彙の突合は解決時(ワークフロー 3)。

## ワークフロー 3: 解決・受け渡し(センサー発火時 — C4)

```
amadeus-sensor.ts fire <id> --stage <slug> --output-path <p>
 1. composition record からセンサー id → 所有プラグイン名と manifest(settings 宣言)を引く
 2. プラグインが settings 宣言を持たない → 従前どおり引数なしで spawn(終了)
 3. resolvePluginSettingsForSensor:
    a. 基底 = 宣言の default 群
    b. resolveAmadeusConfig の plugin.settings[<plugin>] を層順に適用:
       - 宣言に無いキーの override → SettingsError("unknown setting key")
       - 値の型が宣言 type と不一致 → SettingsError("type mismatch")
       - enum で values 外 → SettingsError("not in declared values")
    c. SettingsError → センサー実行を中止し、audit へ loud 記録(SENSOR_FAILED 系の既存経路)。
       デフォルトでの続行はしない(無音デフォルト化の禁止 — ADR-3)
 4. 成功 → spawn argv 末尾に --settings-json '<JSON>' を付与
```

## データ変換

- 宣言(manifest)→ `PluginSettingsDeclaration`(frozen)
- config 3 層 → `PluginSettingsOverrides`(per-plugin per-key)
- 両者 → `ResolvedSettings`(スカラー値のみの flat record)→ JSON 文字列 1 引数

## 処理順序の不変量

- parse(宣言・config)は純関数で副作用なし。解決はセンサー発火時に毎回実行(キャッシュしない — config の層変更を即反映)。
- 検証は 3 点で fail-closed: manifest parse(compose 失敗)/ config parse(config invalid)/ 解決(センサー中止)。どの点でも「黙って既定値」へ落ちない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:45:12Z
- **Iteration:** 1
- **Scope decision:** none

FR-SET-1〜5とC2〜C4契約がbusiness-logic-model/business-rules/domain-entitiesへ整合して写像され、fail-closedと逸脱禁止の一貫性も保たれておりBLOCKERなし。

### Findings

- FOLLOW-UP | component-methods.md C3の契約 Result<PluginSettingsOverrides, ConfigTypeIssue> に対し、domain-entities.mdは ConfigTypeIssue 型もResultラッパーも定義していない(C4のSettingsResolutionは完全定義済みとの非対称)。既存 parsePluginScopeBindings と同型の再利用型と推測できるが、その旨の明記がなく実装者が独力で判断する必要がある。
- FOLLOW-UP | business-logic-model.md ワークフロー3 step3cが引く「SENSOR_FAILED系の既存経路」によるaudit記録は、本レビューの読取許可範囲では実在を確認できない未検証の既存機構参照。code-generation段での実装可能性確認を推奨。
