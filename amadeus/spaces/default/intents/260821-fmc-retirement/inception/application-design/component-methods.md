# Component Methods — 260821-fmc-retirement

上流入力: `requirements.md`(FR-TEST-2/3/6 の受け入れ基準)、`components.md`、re-scan 記録 §2.4/§2.5/§4.2(A2/B1/O-5 の全数表)。

## 1. A2 = 8 件の個別判定(FR-TEST-2 の n+m=8 全数表)

判定基準: 被検 subject が「コア advisory 機構(温存)」か「plugin-activation.ts 固有の挙動(プラグインと共に消滅)」か。設計時分類であり、**実装時に builder が各ファイルの被検 assertion を実読して確定する**(食い違えば code-generation-plan で申告のうえ本表を訂正)。

| # | ファイル | 判定 | 根拠(設計時) |
|---|---|---|---|
| 1 | `tests/harness/formal-model-fixture.ts` | **温存・改修**(合成 fixture 供給ヘルパへ改名・書換) | テスト本体でなく fixture 供給ヘルパ — 供給源を合成プラグインへ差し替え |
| 2 | `tests/integration/t2967-advisory-handoff-directive.integration.test.ts` | **温存**(fixture 再配線) | 被検は engine の execute-advisory-handoff directive(コア) |
| 3 | `tests/integration/t320-activation-spec-hash.integration.test.ts` | **A1 再分類・削除** | 被検は plugin-activation の spec-hash 永続化(プラグイン固有) |
| 4 | `tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts` | **A1 再分類・削除** | 被検は plugin-activation の lifecycle(プラグイン固有) |
| 5 | `tests/integration/t378-advisories-directive-field.integration.test.ts` | **温存**(fixture 再配線) | 被検は directive の advisories フィールド(コア) |
| 6 | `tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` | **温存**(fixture 再配線) | 被検はコア advisory latch。**O-5 の `function:advisoryLatchDir` の唯一の被覆源 — 温存により被覆維持** |
| 7 | `tests/integration/t382-activation-real-layout-spec-root.integration.test.ts` | **A1 再分類・削除** | 被検は plugin-activation の実レイアウト解決(プラグイン固有) |
| 8 | `tests/unit/t319-activation-judgment.test.ts` | **A1 再分類・削除** | 被検は plugin-activation の判定関数(プラグイン固有) |

**集計: 温存 n=4 / 再分類削除 m=4(n+m=8)**。温存 4 件の受け入れは FR-TEST-2 (b)(c) のとおり(`bun test` exit 0 + `plugins/formal-model-check` 参照 0 hit)。

## 2. 合成 test-fixture プラグインの形状(FR-TEST-3 (c))

配置: `tests/fixtures/conformance-fixture-plugin/`(本番 `plugins/` の外 — construction.md「fixture はテスト側」の適用)。名称は `conformance-fixture`。

| 要素 | 形状 | 満たす契約面 |
|---|---|---|
| `plugin.json` | name / version / stages[1] / sensors[1] / tools[1] / **advisories[1]**(スキーマ適合) | plugin.json スキーマ検査、t3078(tools 宣言)、advisories 供給(A2 温存 4 件と共用) |
| `stages/conformance-fixture-stage.md` | stage frontmatter スキーマ適合の最小ステージ(scopes: []、mode inline、produces []) | stages ≥1、graph compile 通過、runner-gen 対象 |
| `sensors/amadeus-conformance-fixture.md` | 最小 sensor manifest | sensor 投影検査 |
| `tools/conformance-fixture-tool.ts` | 数行の no-op CLI(exit 0) | tools 投影・実行検査 |
| advisories 宣言 | plugin-activation 相当の最小 advisory 1 本(handoff_stages は自 stage) | t2967/t378/t381 の advisory 供給、engine の advisory 経路検査 |

**設計制約**: t341 は fixture を read-only コピーして install/compose/drop を通すジャーニー — 合成プラグインは compile・projection・conformance の全検査を素通しできる完全形であること(部分 stub 不可)。形状の最終確定は t341 の assertion 群(弱体化ゼロ制約)への追随で行う。

## 3. O-5 代替テスト 2 本(FR-TEST-6)

| unit | 旧被覆源(削除される) | 代替設計 |
|---|---|---|
| `function:PluginStageError` | t-formal-verif-plugin-stage-discovery(A1) | plugin stage discovery のエラーパスを合成 fixture(壊れた stage frontmatter 変種)で発火させる unit/integration テスト 1 本(TDD: Red→Green、公開 seam 経由) |
| `amadeus-log advisory-decision` | t-advisory-human-choice-boundaries(A1) | `amadeus-log.ts advisory-decision` サブコマンドを合成 advisory instance で実行する integration テスト 1 本(TDD: Red→Green、公開 seam 経由) |
| `function:advisoryLatchDir` | t381(A2) | **代替不要** — t381 温存(§1 #6)で被覆継続 |

受け入れ: regen 後の coverage-registry で 3 unit の coveredBy が非空 + Project Coverage Gate(絶対 AND 相対)green。

## 4. B1 = 16 件の差し替え方式(FR-TEST-3)

全 16 件で `join(REPO_ROOT, "plugins", "formal-model-check")` → `join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin")` の束縛差し替え + 形状差(stages 数・dist パス名)への期待値追随のみ。assertion の削除 0(diff 実読で確認 — FR-TEST-3 (b))。t341 の `dist/plugins/.../INSTALL.md` 読取は合成プラグインの投影産物へ追随。
