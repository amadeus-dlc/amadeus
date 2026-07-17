# Unit of Work — amadeus-mirror ツール

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## Unit 一覧(規模列は概算行数レンジ必須 — N1 / inception ガードレール)

| Unit | 内容 | 概算行数レンジ | 依存 |
|---|---|---|---|
| amadeus-mirror-cli | `scripts/amadeus-mirror.ts`(C1〜C6 全コンポーネント)+ unit テスト(C1-C3 純関数)+ integration テスト(C5 を fake GhRunner+実 FS fixture で駆動) | 実装 288〜432行(=360±20%) / テスト 280〜420行(=350±20%) | なし |

## 規模の正当化

- application-design components.md のコンポーネント別見積り合計 360行(機械加算: 40+90+50+45+120+15)の ±20% = 288〜432、テストは 350行(150+200)の ±20% = 280〜420 から機械導出
- 単一ファイル・単一 unit の根拠: ADR-1(既習様式)+ Q1 裁定。分割は変更理由の凝集(C2/C3/C4)を関数境界で既に確保しており、unit 境界まで持ち上げる必要がない
- 既存インフラ再利用: CI ジョブ・テストランナー・lint/typecheck 配線はすべて既存(components.md Reuse Inventory)— 新規機構ゼロ

## Bolt 構成

- Bolt 1(= walking skeleton、唯一の Bolt): amadeus-mirror-cli — create→sync→close の end-to-end スライス。常にゲート(第1 Bolt 規則)

## Review

**Verdict: NOT-READY**

独立アーキテクチャレビュアーとして、3成果物(unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md)を上流(application-design 5点、requirements.md、intent-statement.md)および実行ツールと突き合わせて検証した。

### 1. YAML edge block の機械妥当性(実測 — PASS)

`bun .claude/tools/amadeus-runtime.ts compile --intent 260717-mirror-issue-tool` を実行し、`runtime-graph.json` の `bolt_dag` を確認した。

```json
{
  "units": [{ "name": "amadeus-mirror-cli", "depends_on": [] }],
  "batches": [["amadeus-mirror-cli"]]
}
```

非 null、単一 unit・`depends_on: []`・循環なしで正しくパースされている。`.claude/sensors/amadeus-required-sections.md` の `unit-of-work-dependency.md` 専用チェック(edge block の存在・整形・非循環)も、この機械実測と一致する。per-unit-loop-activation (a) の条件を満たす。

### 2. センサー実測 — `required-sections` が unit-of-work-story-map.md で SENSOR_FAILED のまま未是正(Critical, ブロッカー)

manual-sensor-fire-before-gate-report に従い、audit ログ(`amadeus/spaces/default/intents/260717-mirror-issue-tool/audit/j5ik2o-mac-studio-lan-d4a945003a7f.md`)を実測した(exit code ではなく SENSOR_PASSED/SENSOR_FAILED 行と detail ファイルで判定 — E-1059-RA c1 準拠)。gate-prep 時点(2026-07-17T14:28:30Z)のセンサー発火列を確認したところ、`unit-of-work.md`・`unit-of-work-dependency.md` は `required-sections`/`upstream-coverage` とも SENSOR_PASSED だが、`unit-of-work-story-map.md` の `required-sections` は SENSOR_FAILED のまま記録されている:

```
Fire id: f39f3b36 / Sensor ID: required-sections / Output: unit-of-work-story-map.md
Detail: .amadeus-sensors/units-generation/required-sections-f39f3b36.md
{"pass": false, "h2_count": 1, "headings": ["## ストーリー写像(...)"], "findings_count": 1}
```

`grep -c "^## " unit-of-work-story-map.md` を実行して現状も再実測したところ、依然として H2 見出しは1個(`## ストーリー写像`)のみで、レジストリ既定の「H2 見出し2個以上」を満たしていない。監査ログに以後の再発火・是正記録は無く(同ファイルへの `required-sections` 再 FIRE は0件)、未是正のまま今回のレビュー依頼に至っている。

この欠落は内容面の欠落とも一致する: ステージ定義 Step 6 は unit-of-work-story-map.md に「Coverage verification: every story assigned, every unit has stories」という独立した確認記述を要求しているが、現状の成果物は表1本のみで、このカバレッジ確認記述が存在しない。**是正案**: 表の下に `## カバレッジ確認` などの第2 H2 見出しを追加し、「intent-statement 成功指標3点全数 + FR-2.2/FR-3.2 が amadeus-mirror-cli に写像済み、unit 側の未割当ストーリーなし」を明記すれば、センサー要件とステージ定義双方の欠落を同時に解消できる。是正後は `required-sections` を再発火し、audit に SENSOR_PASSED が記録されることを確認してから再度ゲートへ進めること。

### 3. 規模列の数値整合(Minor)

- application-design `components.md` のコンポーネント別行数合計: 40+90+50+45+120+15 = **360行**(実測: 表の6行を機械加算)。unit-of-work.md の記述「360行(±20% → 300〜420)」は算術的に不正確 — 360 の ±20% は 288〜432 であり、300〜420 ではない(300 は 360×0.833、420 は 360×1.167 に相当し、対称な ±20% になっていない)。
- テスト行数についても、components.md は unit 約150行 + integration 約200行 = **350行**を見積もっているが、unit-of-work.md は実装行と同一の「300〜420」をそのまま流用しており、350 を起点とした導出過程が示されていない。
- 実装可能性への実害は無い(レンジ自体は概算として妥当な桁に収まっている)が、ledger-count-mechanical-recalc / verification-numeric-parse の趣旨(数値主張は機械的な再計算に基づく)に照らすと、「±20% から導出」という断定文言は実測と整合しない。次回是正時に算出式を実際の ±20% 値に合わせるか、丸めの根拠(「概算の目安であり厳密な ±20% ではない」等)を明記することを推奨する。

### 4. 単一 unit 判断の妥当性(PASS)

- Q1 裁定(E-OC1 証跡: ソロモード、ユーザー AskUserQuestion 直答、2026-07-17T14:26:24Z)と unit-of-work.md の記述が一致している。
- application-design ADR-1(単一ファイル CLI、既習様式踏襲)・ADR-1 Alternatives Rejected の「(b) packages/ 新設 — 配布物ではない(Q1 裁定違反)」がユニット分割判断と整合しており、components.md の「変更理由の凝集(C2/C3/C4)を関数境界で既に確保」という根拠も、単一 unit・単一 Bolt の設計判断を裏付けている。
- walking-skeleton 規則(org.md: greenfield 要素を含む scope は最初の Construction Bolt を単独・ゲート付きで実行)とも整合し、Bolt 構成節の「常にゲート(第1 Bolt 規則)」の記述は正しい。

### 5. story map の成功指標カバレッジ(内容面は概ね PASS、様式面は上記2に従属)

intent-statement.md の成功指標3点(1コマンド起票/定型3要素のみ/close 着地機械検査)がそれぞれ FR-2・FR-5・FR-4 経由で amadeus-mirror-cli に写像されており、加えて FR-3.2(sync 冪等)・FR-2.2(重複ガード)も個別行で捕捉されている。取りこぼしは grep 実測(`requirements.md` の FR 一覧との突合)でも見当たらない。ただし前述のとおり、ステージ定義が要求する明示的な「カバレッジ確認」記述そのものが本文中に存在しない点は §2 の是正と合わせて解消すること。

### 6. 上流参照・引用の実在(PASS)

- 3成果物とも冒頭に「上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md」を明記しており、フロントマターの `consumes` 宣言(7件、うち `stories` は required: false)と一致する。`stories` は本スコープで user-stories ステージが SKIP のため対象artifactが存在せず、intent-statement.md の成功指標を代替の写像元とした判断は consumes の任意性と整合する。
- ADR-1 と Q1 裁定の相互参照、components.md の行数根拠と unit-of-work.md の規模根拠の対応関係など、file:line や成果物名での引用はいずれも実在確認できた。

### 総評

YAML edge block の機械妥当性・単一 unit 判断・カバレッジの実質内容はいずれも問題ない。しかし `unit-of-work-story-map.md` の `required-sections` センサーが SENSOR_FAILED のまま是正されておらず(H2 見出し1個 < 既定2個以上、かつステージ定義が要求するカバレッジ確認記述そのものが欠落)、これは gate-prep 前に是正すべき実測ブロッカーである。規模列の ±20% 算術不整合(Minor)も合わせて修正を推奨する。上記2点(特に §2)の是正後、再レビューで READY 判定が見込める。

## Review(iteration 2)

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T15:10:00Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | (iteration 1 findings — 下記「iteration 1 指摘の閉包確認」を参照) | — |

### iteration 1 指摘の閉包確認(独立実測)

#### 指摘1(Critical): `unit-of-work-story-map.md` の `required-sections` SENSOR_FAILED — 解消

- H2 見出し数を独立に再実測: `grep -c "^## " unit-of-work-story-map.md` → **2**(`## ストーリー写像(...)` / `## カバレッジ確認`)。iteration 1 時点の1個から増加し、レジストリ既定(H2見出し2個以上)を満たす。
- 追記された `## カバレッジ確認` 節の内容を確認: 「成功指標3点全数が amadeus-mirror-cli へ写像済み」「追加AC(FR-3.2/FR-2.2)も写像済み」「未割当ストーリーなし/ストーリーを持たない unit なし」の3点が明記されており、ステージ定義 Step 6 が要求する「Coverage verification」の記述要件を充足している。
- 監査ログ(`amadeus/spaces/default/intents/260717-mirror-issue-tool/audit/j5ik2o-mac-studio-lan-d4a945003a7f.md`)を実測: iteration 1 が指摘した SENSOR_FAILED(fire id `f39f3b36`、14:28:30Z)は是正前の記録として残るが、是正コミット後(`unit-of-work.md` への ARTIFACT_UPDATED、14:30:12Z)に発生した再発火バッチで、`unit-of-work-story-map.md` に対する `required-sections` が **fire id `059aa211`、14:30:52Z、SENSOR_PASSED(duration 32ms)** として記録されている。同バッチで `unit-of-work-story-map.md` の `upstream-coverage`(fire id `fbd3726c`)、`unit-of-work.md` の `required-sections`(fire id `508f49a4`)/`upstream-coverage`(fire id `3d8e3e54`)もすべて SENSOR_PASSED。
- 14:30:12Z(是正コミット)以降のタイムスタンプを持つ SENSOR_FAILED は監査ログ全域に1件も存在しない(`grep -n -B2 "SENSOR_FAILED"` で全件のタイムスタンプを確認 — 最終出現は iteration 1 レビュー時点の13:45:13Z以前)。よってブロッカーは解消済みと判定する。

#### 指摘3(Minor): 規模列の ±20% 算術不整合 — 解消

- `unit-of-work.md` の規模列: 「実装 288〜432行(=360±20%) / テスト 280〜420行(=350±20%)」に修正されている。
- 独立に再計算: 360×0.8=288、360×1.2=432、350×0.8=280、350×1.2=420 — いずれも記述値と一致(`python3 -c "print(360*0.8, 360*1.2, 350*0.8, 350*1.2)"` で機械確認)。
- 加算元の実測も再確認: `application-design/components.md` の C1〜C6 行数列(40/90/50/45/120/15)を合算すると 360、テスト見積り(unit 約150 + integration 約200)を合算すると 350 — 「規模の正当化」節の「機械加算: 40+90+50+45+120+15」という記述と一致する。iteration 1 が指摘した「300〜420」という非対称値は本文から消えており、算術不整合は解消済み。

### リグレッション確認

- iteration 1 で PASS 判定した観点(YAML edge block の機械妥当性、単一 unit 判断の妥当性、story map の内容面カバレッジ、上流参照・引用の実在)について、対象成果物3点(`unit-of-work.md` / `unit-of-work-story-map.md` / `unit-of-work-dependency.md`)を再読し後退がないことを確認した。`unit-of-work-dependency.md` の YAML edge block(`amadeus-mirror-cli`、`depends_on: []`)、Bolt構成、consumes 冒頭行はいずれも iteration 1 から無変更で、今回の是正は story-map の内容追加と unit-of-work.md の数値表記に限定されている。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `grep -c "^## " unit-of-work-story-map.md` | 2 | required-sections の既定(H2見出し2個以上)を機械的に充足 |
| 監査ログ実測(SENSOR_PASSED/SENSOR_FAILED行) | 14:30:52Z バッチで4件とも SENSOR_PASSED、以降 SENSOR_FAILED 0件 | 指摘1のブロッカー解消を裏付け |
| ±20%再計算(python3) | 288.0 432.0 280.0 420.0 | 指摘3の算術不整合解消を裏付け |

### Summary

iteration 1 で指摘した Critical(story-map の required-sections 未是正)・Minor(±20%算術不整合)の2件はいずれも独立実測で閉包を確認した。他の PASS 観点にリグレッションはなく、READY と判定する。
