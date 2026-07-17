# Unit of Work — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../application-design/components.md`(C1〜C7)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(実装順序)、`../application-design/decisions.md`(ADR-1〜4)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US・MoSCoW)。

## U1: installer-enum-extension(規模 S — 単一 unit)

- **範囲**: C1〜C7 の全変更面(installer 8サイト+contract テスト2本+install-flow fixture+advisory 2面(計8ミラー regen 込み)+README 3箇所)
- **検証列**: typecheck / lint / dist:check / promote:self:check / --ci / coverage+patch gate / npm pack --dry-run / fixture 完走(US-1.1/1.2)/ 落ちる実証(列挙欠落注入→契約テスト赤)
- **規模の正当化**: 全変更が同一検証列・同一ファイル群に閉じ、分割は交差(c6)を生むだけ(mob-composition 既決)。既存インフラ(契約テスト2本・install-flow テスト・fixture ビルダー・t149)を全面再利用し新規機構ゼロ(reuse inventory = AD 非変更節)
- **Bolt 対応**: Bolt 1 = U1(1:1)。walking-skeleton は feature スコープの既定に従い delivery-planning で確定
- **デプロイモデル**: embedded — installer 面(C1〜C5)は既存 npm パッケージ `packages/setup` へ、C6(framework core 2ツール)は既存 dist 6ツリー+self-install 2ツリーの配布経路へ、いずれも埋め込み。新規デプロイ単位・standalone/shared 資産は作らない

## 分割しない判断の根拠

B-1〜B-4(backlog)は同一 PR に束ねても walking-skeleton ゲート・人間レビューの実効性を損なわない規模(diff 見込み: 実装约20行+テスト+docs)— Bolt 単位 PR 原則と両立。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-16T14:20:00Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `unit-of-work.md:5-10` | ステージ定義(units-generation.md:100-106)が unit-of-work.md の必須節として明示する「Deployment model per unit (standalone, shared, embedded)」が完全に欠落している。U1 は installer(`packages/setup/`)と framework core(`packages/framework/core/`)の2面にまたがる変更(C1〜C5 vs C6)であり、"standalone/shared/embedded" のどれに該当するかは自明ではない — 明示なしでは実装者が配置判断を推測することになる | 「installer 面は既存 npm パッケージに embedded、C6(framework core)は既存の dist/self-install 配布経路に embedded、新規デプロイ単位なし」等、1〜2文で明示する |
| 2 | Minor | `memory.md:1-13` | ステージ定義(units-generation.md:158-166)は Interpretations/Deviations/Tradeoffs/Open questions への都度記録を必須とするが、本 intent の memory.md はテンプレートのコメント例のみで実エントリがゼロ。実際には複数の解釈的判断が下されている(単一 unit への集約、plan/questions ファイルの非生成、story 実装順序を story-map でなく dependency.md の component 順で代替 — 後述 #4)。これらは undeclared だが読み手には合理的な選択として再構成可能であり、architecture 上のブロッカーではない | 少なくとも上記3点を Interpretations として memory.md に事後記録する |
| 3 | Minor | `unit-of-work-dependency.md:5-11` | ステージ定義(units-generation.md:107-110)が dependency artifact の必須内容として列挙する「Integration points between units」「Parallel development opportunities」の節が存在しない。単一 unit のため実質 N/A だが、「該当なし(単一 unit)」の明示がなく、必須節が単に省略されているように読める | 各 1 行で「単一 unit のため該当なし」と明記する |
| 4 | Minor | `unit-of-work-story-map.md:5-17` | ステージ定義(units-generation.md:128)が要求する「Story implementation order within each unit」が story-map 自体には存在しない。実装順序は `unit-of-work-dependency.md:13` の component 順(C1→C2→C3→C4→C5 / C6 / C7)で代替されているが、story 粒度の順序ではなく、story-map からの参照リンクもない | story-map に「実装順序は dependency.md の component 順に従う(story 単位の追加順序制約なし)」の一文を足すか、C→US 対応から story 順を導出して明記する |
| 5 | Minor(process, 現状は解消済み) | `.amadeus-sensors/units-generation/*.md`(2026-07-16T13:40:12Z) / 修正コミット `26b7fc5b8`(2026-07-16T22:40:50 JST) | 3ファイルとも required-sections・upstream-coverage が FAILED(5件)だった後、同一コミットで内容修正されているが、修正後に sensor を再発火して PASS を確認した記録がゲート報告前に存在しない(`project.md` の `manual-sensor-fire-before-gate-report` 違反、団team.md P2 の「検証は実行結果のみを根拠にする」に抵触)。本レビューで `bun .claude/tools/amadeus-sensor.ts fire` を実際に再実行し、3ファイル×2センサー全6件が現状 PASS であることを実測確認済み(audit: `j5ik2o-mac-studio-lan-1812bda145e7.md:6580-6600` 付近、fire id 例 `806c9d6b`、2026-07-16T14:17:20Z)。結果は健全だが、手順としては「fire→FAILED→手直し→未検証のまま完了報告」の型であり、次回以降は修正直後の再fireを徹底する | 今後、内容修正後は同一ターン内で sensor を再fireし、PASS のエビデンス(audit event または detail ファイル不在の確認)をゲート報告に添付する運用を徹底する |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `amadeus-sensor.ts fire required-sections` (unit-of-work.md) | PASS (exit 0, no detail file) | 見出し数 ≥2 を満たす(既存2見出し) |
| `amadeus-sensor.ts fire required-sections` (unit-of-work-dependency.md) | PASS (exit 0, no detail file, 再実行で確認) | 修正コミット `26b7fc5b8` で追加された「## 機械検証」見出しにより h2_count が 1→2 へ回復、fenced yaml edge block も `edge_block: ok` | 
| `amadeus-sensor.ts fire required-sections` (unit-of-work-story-map.md) | PASS (exit 0, no detail file、再実行で確認) | 同上、「## 視点の充足」見出し追加で回復 |
| `amadeus-sensor.ts fire upstream-coverage` (3ファイルとも) | PASS (exit 0, no detail file、再実行で確認) | 修正コミットで上流参照行に component-methods/services/decisions が追記され、consumes 全7件の言及が揃った |
| C1〜C7 の実在照合(grep) | PASS | `packages/setup/src/domain/harness.ts` 等 C1〜C7 の実体パスは全て実在。reuse inventory(契約テスト2本・install-flow・fixture・t149)も `find` で実在確認済み |
| YAML edge block 整合(`units: installer-enum-extension, depends_on: []`) | PASS | 単一 unit・自己参照なし・宣言済みunit名のみ・非循環 |
| US→Unit orphan チェック(手動突合) | PASS | stories.md の全8 US(US-1.1〜1.4, 2.1〜2.3, 3.1)が story-map で U1 に写像済み、orphan なし |
| C1〜C7 → U1 内包チェック(手動突合) | PASS | components.md の C1〜C7 全件が unit-of-work.md の「範囲」に列挙されている |

### Summary

規模 S・単一 unit という decomposition 自体は reuse inventory・実在テスト・YAML edge block・全 US/全 C の写像がすべて実測で裏付けられており、アーキテクチャ上の欠陥(循環依存、orphan、未内包コンポーネント)はない。唯一の Major は unit-of-work.md に「デプロイモデル」節が完全欠落している点で、installer 面と framework core 面(C6)にまたがる本 unit では実装者への手掛かりとして書いておくべきだが、内容は自明(両面とも既存配布経路への embedded)であり実装を止めるほどの曖昧さではない。センサーは現時点で全て PASS(本レビューで再実測済み)。Minor 4件は次回反映で十分。
