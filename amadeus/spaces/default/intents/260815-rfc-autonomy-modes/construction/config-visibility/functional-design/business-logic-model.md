# Business Logic Model — unit config-visibility(U7 / C7 + C8 / FR-7 + FR-8)

本 unit は2つの独立した処理系を持つ: (A) C7 = config 軸の廃止・改名と loud fail、(B) C8 = `--status`/statusline の実効値可視化。両者は「表示・設定の真実性(UI 真実性の契約)」という同じ上位契約(FR-8)に属するが、処理フローは別物。

## (A) C7: 設定軸の分離・廃止・改名

### 現状(as-is)

`AMADEUS_CONFIG_REGISTRY`(`amadeus-config.ts:583-665`)は3つの関連エントリを持つ:

| path(現行) | legacy alias | 消費者(実測) |
|---|---|---|
| `intent-mirror.github.issue.mode`(:585) | `auto-mirror` | `amadeus-mirror-coordinator.ts:550`, `amadeus-mirror-lifecycle.ts:293`, `amadeus-mirror-presentation.ts:146`(独立参照のみ), `amadeus-orchestrate.ts:654`, `amadeus-state.ts:6311`, `amadeus-workflow-completion.ts:273` — 実測6ファイル(`grep -rn "issue\.mode\b" packages/framework/core/tools/*.ts packages/framework/core/hooks/*.ts` から `amadeus-config.ts` 自身を除いた集計) |
| `solo-election.trigger.mode`(:603) | `auto-solo-election` | `amadeus-election.ts:274`(`resolved.config.soloElection.trigger.mode !== "auto"`)、`amadeus-orchestrate.ts:4139`(同条件) — いずれも owned files 外(functional-design-questions.md Q4) |
| `finding.github.issue.creation.mode`(:615) | `auto-file-findings` | `amadeus-finding.ts:147` |

`resolvedConfig`(:833-882)がこれら3エントリを `AmadeusConfig` の `intentMirror.github.issue.mode` / `soloElection.trigger.mode` / `finding.github.issue.creation.mode` へ写像する。未知キー・レガシーキーは `collectSchemaIssues`(:730-)→`appendUnknownPathIssue`(:701-717)で `LayerIssue` を積み、`parseAmadeusConfigLayers`(:889-926)は1件でも issue があれば `{ kind: "invalid", issues }` を返す(:920) — これが既存の loud fail 経路であり、本 unit はこの経路自体を新設せず、投入するエントリを増やすだけである。

### 処理フロー(to-be)

```
resolveAmadeusConfig(projectDir, ...)
  → readAmadeusConfigLayers(...)               // 変更なし(ファイル読取)
  → parseAmadeusConfigLayers(layers)            // 変更なし(構造)
      → parseLayer(layer)
          → schemaIssues(rawValue)
              → collectSchemaIssues(value, prefix, issues)
                  for each raw key:
                    if key is "solo-election.trigger.mode"
                       OR key is "auto-solo-election"(既存 legacy alias):
                         → appendUnknownPathIssue(...)          // NEW 対象— もはや CONFIG_LEAF_PATHS に無い
                         → issue.expected = "mode(none/semi/full)から自動導出されるため設定不要。このキーは廃止"
                    if key is "intent-mirror.github.issue.mode" (旧名) or "auto-mirror":
                         → appendUnknownPathIssue(...)
                         → issue.expected = "use intent-mirror.github.issue.consent"
                    if key is "finding.github.issue.creation.mode" (旧名) or "auto-file-findings":
                         → appendUnknownPathIssue(...)
                         → issue.expected = "use finding.github.issue.creation.consent"
  → issues.length > 0 なら { kind: "invalid", issues } を返す(既存経路、変更なし)
```

新設する純関数(C7、`amadeus-config.ts` に配置):

```
deriveSoloElectionTrigger(mode: "none" | "semi" | "full"): "manual" | "auto"
  none → "manual"
  semi | "full" → "auto"
```

この関数は config を読まない(引数は Intent Autonomy Mode という **state 由来**の値であり、config leaf ではない)。呼出し元(`amadeus-election.ts:274` 相当・`amadeus-orchestrate.ts:4139` 相当)が `resolved.config.soloElection.trigger.mode !== "auto"` を `deriveSoloElectionTrigger(mode) !== "auto"` へ置き換える改修が必要だが、これらのファイルは本 unit の owned files 外であり本 unit は実装しない(Q4、最終報告で申し送り)。

## (B) C8: `--status`/statusline の実効値可視化

### 現状(as-is)

- `handleStatus`(`amadeus-utility.ts:368-`)は `readStatusAutonomy`(:339-350)→`renderAutonomyStatus`(:352-366)の経路で、`autonomy.autonomyMode`(**宣言**値 — `projectIntentAutonomyStatus` が返す projection 由来)のみを表示する。対話性・mirror/finding の実効 consent は一切表示されない
- statusline(`hooks/amadeus-statusline.ts`)は `autonomySegment(state)`(`amadeus-lib.ts:5172-5175` — state ファイルの `Intent Autonomy Mode` フィールドを生読みするだけ)を `@<mode>` として1トークン追記する(:259-266)のみ

### 処理フロー(to-be)

`statusAutonomyFacet(projectDir)`(C8、新設)を単一の集約点とし、`--status`・statusline の双方がこれを呼ぶ:

```
statusAutonomyFacet(projectDir):
  mode        = readStatusAutonomy(...).autonomyMode        // 既存(宣言 mode の実効投影) — U5/U6 の投影関数由来
  projection  = readStatusAutonomy(...) の Construction Autonomy Mode 相当     // U5/U6
  interactive = resolveSessionInteractivity(projectDir).interactive           // U2 (C3)
  mirrorConsent  = resolveAmadeusConfig(projectDir).config.intentMirror.github.issue.consent   // 本 unit(A)
  findingConsent = resolveAmadeusConfig(projectDir).config.finding.github.issue.creation.consent // 本 unit(A)
  return { mode, projection, interactive, mirrorConsent, findingConsent }
```

- `--status`(`renderAutonomyStatus`)は既存の行群(Autonomy/Grant/…)に加え、`statusAutonomyFacet` の `interactive`/`mirrorConsent`/`findingConsent` を新しい行として追記する
- statusline(`amadeus-statusline.ts`)は既存の `@<mode>` セグメントに変更を加えず、`interactive` が false(非対話)のときのみ判別可能な短い注記(例: 既存の `@<mode>` の直後に非対話マーカー)を追加する — 常時全フィールドを出すと statusline の1行制約と衝突するため、statusline は「非対話であること」(park/waiting へ倒れうる状態)だけを最小限可視化し、consent の詳細は `--status` 側の責務とする

## 統合シーム

- **← U2(presence-detection)**: `statusAutonomyFacet` が `resolveSessionInteractivity` を直接呼ぶ(unit-of-work-dependency.md「U7 depends U2」)。U7 は対話性判定ロジックを再実装しない
- **← U5(semi-authority-projection)**: mode の実効投影(Construction Autonomy Mode)を U5/U6 の投影関数から取得する(「U7 depends U5 — C5/C6 の実効値関数を消費」)。U7 は投影ロジックを再実装しない
- **→ 消費者未確定の申し送り**: `deriveSoloElectionTrigger` の呼出し側改修(`amadeus-election.ts`, `amadeus-orchestrate.ts:4139`)は owned files 外 — 最終報告に契約矛盾として記載する

## エラーパス

| 事象 | 扱い | 根拠 |
|---|---|---|
| 旧キー(`solo-election.trigger.mode`/`auto-solo-election`)を config に書く | `resolveAmadeusConfig` が `{ kind: "invalid", issues }` を返す(loud fail、既存経路の再利用) | FR-7、ADR-8 |
| 旧キー(`.mode` 系2キー・legacy alias)を config に書く | 同上、`expected` に新パス名(`.consent`)を明示 | ADR-8、Q2 |
| `resolveSessionInteractivity`/投影関数が読取失敗 | `statusAutonomyFacet` は例外を伝播させず、`--status` は「unavailable」相当のフォールバック行を出す(既存 `renderAutonomyStatus` の `autonomy === null` 分岐と同じ設計思想) | FR-8(表示乖離を作らない=不明を不明と表示する。偽の値を出さない) |
| statusline がフックのタイムアウト予算内に判定できない | 既存の statusline hook 全体のフォールバック(何も出さない/簡略表示)に従う。C8 固有の新しいタイムアウト処理は追加しない | 既存 statusline hook 設計の踏襲(over-engineering 回避) |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

config-visibility(U7/C7+C8/FR-7+FR-8)は裁定忠実性・境界規律・引用現況性(AMADEUS_CONFIG_REGISTRY:583, LEGACY_KEY_REPLACEMENTS:667, appendUnknownPathIssue:701, amadeus-election.ts:274, amadeus-orchestrate.ts:4139 ほか全数一致)とも優秀で、owned-files 外の消費者を無理に修正せず正しく報告に留めている。

### Findings

- FOLLOW-UP | unit-of-work.md / functional-design-questions.md Q4 / business-rules.md R-8 | `solo-election.trigger.mode` の実消費者2箇所(`amadeus-election.ts:274`、`amadeus-orchestrate.ts:4139`)を改修する owner がどの unit にも割り当てられていない — U7 が config leaf を削除すると `resolved.config.soloElection.trigger.mode` への参照がコンパイル不能/常時 undefined になるが、この是正を担う unit が unit-of-work.md に存在しない。本 unit は正しく実装せず報告に留めているが、delivery-planning 段でこのギャップに owner を割り当てないと code-generation でビルドが壊れる
