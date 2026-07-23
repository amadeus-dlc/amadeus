# Code Summary — fix-1296-marker-heading-exemption

上流入力(consumes 全数): requirements.md、scan-notes.md、code-generation-plan.md

## 変更一覧

### 正本(`packages/framework/core/`)

| ファイル | 変更 |
|---|---|
| `tools/amadeus-lib.ts` | `isMarkerArtifact(name: string): boolean` を export 追加(`errorStack` 直後)。`-questions` / `-timestamp` suffix 終端判定。モジュールスコープ英語コメント。 |
| `tools/amadeus-graph.ts` | import に `isMarkerArtifact` 追加。`templateEligibleArtifacts` のインライン suffix 二重チェックを `!isMarkerArtifact(a)` 導出へ置換(挙動不変)。 |
| `tools/amadeus-sensor-required-sections.ts` | import に `isMarkerArtifact` 追加。Result 型へ `marker_exempt?: true` 追加。stem 導出直後(template 分岐前)に marker 免除分岐(`pass=true` / `findings_count=0` / `result.marker_exempt=true`)追加。 |
| `sensors/amadeus-required-sections.md` | 「marker keeps the generic floor」記述を免除へ更新。marker 免除の明文段落追加。output_schema へ `marker_exempt: boolean` 追記。「neither override」文を非 marker 限定へ補正。 |

### テスト

| ファイル | 変更 |
|---|---|
| `tests/unit/t155-template-override.test.ts` | SensorResult へ `marker_exempt?: boolean`。新 describe「marker floor exemption」3 テスト。既存 ineligible-marker テスト2件を修正後挙動へ更新。 |
| `tests/unit/t86-sensor-manifest-schema.test.ts` | output_schema が `marker_exempt: boolean` を宣言する raw-frontmatter assert 追加(FR-2 消費配線)。 |

### 生成物同期(FR-5)

`bun scripts/package.ts` + `bun run promote:self` により dist 6 + self-install 4 を再生成。正本1 + dist6 + self-install4 = 11 コピー同期。

### 既存テスト更新の申告(列挙外の変更 — レビュー要確認)

requirements.md は不変の既存 floor テストとして `:251/:267`(prose 名使用)のみを列挙していたが、`tests/unit/t155` の既存テスト2件(`framework default for an ineligible artifact …` / `ineligible artifact: resolved template ignored …`)は **marker 名**(`intent-questions` / `requirements-analysis-questions`)を使い、修正前のバグ挙動(marker を floor で `pass:false`)を固定していた。FR-1 が要求する marker 免除と直接矛盾するため、両テストを修正後挙動(`pass:true` + `marker_exempt:true`)へ更新した。ELIGIBILITY GATE のコード(`template:"ineligible"` + `config_warning`)は不変で、両テストとも `template==="ineligible"` / `config_warning` の assert を保持(FR-3 保持)— 変更したのは floor の pass 値の assert のみ。承認済み要件への適合(stale テストの是正)であり要件からの逸脱ではないと判断したが、列挙外の変更のため明示申告する。

## 検証コマンド表(最終変更後に全再実行 — 数値はコマンド出力転記)

| コマンド | exit code | 要旨 |
|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` 両 tsconfig green |
| `bun run lint` | 0 | Biome エラー0(既存 warning のみ、error 無し) |
| `bun run dist:check` | 0 | all harness trees in sync（11コピードリフト無し) |
| `bun run promote:self:check` | 0 | project-local self install in sync |
| `bun test tests/unit/t155-template-override.test.ts` | 0 | Ran 18 tests / 18 pass 0 fail / 71 expect |
| `bun test tests/unit/t86-sensor-manifest-schema.test.ts` | 0 | Ran 16 tests / 16 pass 0 fail / 54 expect |

## FR-7 閉包(配布コピー `.claude/tools/` で再現コマンド verbatim 再適用)

修正前(scan-notes §6 実測): `{"pass":false,"h2_count":0,"headings":[],"findings_count":2}`

修正後(実測):

- timestamp 面 `--stage practices-discovery --output-path …/practices-discovery-timestamp.md`
  → `{"pass":true,"h2_count":0,"headings":[],"findings_count":0,"marker_exempt":true}` / exit 0
- questions 面 `--stage intent-capture --output-path …/requirements-analysis-questions.md`
  → `{"pass":true,"h2_count":0,"headings":[],"findings_count":0,"marker_exempt":true}` / exit 0

両クラスで `pass:false` → `pass:true`+`marker_exempt:true` へ転じることを実測(#1296 閉包)。

## NFR-1 corpus sweep(cid:corpus-sweep-for-new-guards、scratch で決定的関数直接適用)

canonical 述語 `isMarkerArtifact` を配布コピーから import し `intents/` 配下実 corpus へ全数適用:

- questions markers: 392 件
- timestamp markers: 22 件
- marker total: 414 件 → **marker-not-exempt: 0**(全件免除側)
- 非 marker prose sample(5種別・193 件)→ prose-wrongly-exempt: 0。**是正(reviewer Minor2 → conductor 全数拡大)**: intents/ 配下の非 marker md **全数 3,056 件**+marker 414 件へ isMarkerArtifact を機械適用し wrongFloor 0 / wrongExempt 0 — FULL SWEEP: PASS(conductor 実測 2026-07-23、find+述語直接適用の出力転記)
- 判定: `SWEEP: PASS`(exit 0)

(RE 概算 questions 391 → 実測 392 は RE 以降の corpus 増分1件で想定内。)

## 落ちる実証(cid:falling-proof-injection-one-set / inject-runtime-consumed-lines)

免除の runtime 消費行(`pass = true;` / `findings_count = 0;`)を正本で一時コメントアウト → `bun scripts/package.ts` で dist 再生成(テストが読む面)→ `bun test tests/unit/t155` を実測:

- 注入時: **4 fail / 14 pass**(marker 系4テスト = 免除 assert が赤、非 marker floor 対照は緑 — 正しい弁別)
- 復元 + 再生成後: **18 pass / 0 fail**

注入 → 赤の実測 → 復元 → 緑までを不可分に完遂。head に注入が残らないことを確認済み。
