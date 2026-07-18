# Business Logic Model — fix-1172-skip-denominator(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 中核ロジック(FR-2 の写像)

`countStageProgress`(scripts/amadeus-mirror.ts:87-105)の分母判定へ scope-SKIP 除外を追加する(components.md C3、services.md 相互作用2)。

```
for line in Stage Progress 節:
  m = /^- \[(x|X| |-|\?|R|S)\] / にマッチしなければ skip     # 既存
  if m[1] === "S": continue                                  # 既存 — jump-skip 除外(維持)
  if / — SKIP\s*$/.test(line): continue                      # 追加 — scope-skip 除外(FR-2a)
  total++                                                    # 既存
  if m[1] が x/X: approved++                                 # 既存
```

- `setStageSuffix`(amadeus-lib.ts:3805-3814)は bare `EXECUTE`/`SKIP` のみを書き込み、reason 付き SKIP(`SKIP: reason` 形)の書き手は存在しない(全コーパス `— SKIP\S` grep 0件 — reviewer Minor 1 の明示化)。`/ — SKIP\s*$/` はこの実様式に対して健全
- checkbox(実行状態)と行末サフィックス(計画)は直交2フィールド(RE 実測: setCheckbox :3785 と setStageSuffix :3805 の分掌)— 分母の意味は「EXECUTE 計画ステージ」であり、両除外条件の併用が計画と実行の両語彙を被覆する
- 旧挙動([S] のみ除外)は置き換え — 互換分岐なし

## 判定マトリクス(実様式 — RE の format-currency-grep 実測に基づく)

| 行様式 | 実コーパス件数(observed 591b6a2a) | total | approved |
|---|---|---|---|
| `- [x] X — EXECUTE` | 414 | +1 | +1 |
| `- [ ] X — EXECUTE` | 70 | +1 | 0 |
| `- [-] X — EXECUTE` / `- [?] X — EXECUTE` | 14 / 1 | +1 | 0 |
| `- [ ] X — SKIP`(scope-skip 実様式) | 717 | **0(追加除外)** | 0 |
| `- [S] X — EXECUTE`(jump-skip、コーパス0件だが将来ありうる) | 0 | 0(既存除外) | 0 |

## エラー処理

純関数のため入力異常は既存の行 match 不成立(スキップ)を維持 — 新規例外経路なし(services.md エラーハンドリング節と同一)。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-18T00:25:09Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md:13, business-rules.md | 設計は `/ — SKIP\s*$/` の正規表現で SKIP 分母除外を行うが、`amadeus-lib.ts:3747` の `CheckboxLine.suffix` インターフェースコメントが示唆する「`SKIP: reason`」形(行末に SKIP でないテキストが続く形)への言及・反証が成果物中にない。実測では該当ケースは無害(下記参照)だが、レビュー観点として明示要求された論点への成果物内での言及が欠落している | 1文で足りる: 「setStageSuffix(:3805-3814)は `\b` 境界で bare `EXECUTE`/`SKIP` のみを書き込み、`SKIP: reason` 形の書き手は存在しない(grep 実測)。CheckboxLine.suffix のコメント例示は本経路に非該当」を business-logic-model.md へ追記 |

### Independent Verification(reviewer 自身の実測)

- **疑似コードの位置**: `scripts/amadeus-mirror.ts:87-105` の現行実装を直接読み、`m[1] === "S"` 除外(:100)の直後・`total++`(:101)の直前に新規条件を挿すという設計の記述は現行コードと1:1で一致(:98-102)。意味論上も正しい — SKIP サフィックス行を `total` に加算する前に弾く位置。
- **正規表現の妥当性**: `setStageSuffix`(amadeus-lib.ts:3805-3814)は `` `${prefix}—\s*)(EXECUTE|SKIP)\b` `` で書き込み、常に bare `EXECUTE`/`SKIP` のみを生成(reason 付与なし)。この関数が Stage Progress サフィックスの唯一の書き手であることを `grep -rn "— SKIP\|— EXECUTE" packages/framework/core/tools/*.ts` で確認(setStageSuffix 以外に書き手なし)。さらに全 `amadeus-state.md` コーパス(intents 配下)を `grep -rnP '— SKIP\S'` で走査し、SKIP 直後に非空白文字が続く行は0件。設計の `/ — SKIP\s*$/` 正規表現は実コーパス・実装の両方に対して健全。
- **判定マトリクスの数値**: `observed 591b6a2a` 時点の全 `amadeus-state.md` を `git show 591b6a2a2:<path>` で復元し独立集計 — `[x] — EXECUTE` 414 / `[ ] — EXECUTE` 70 / `[-] — EXECUTE` 14 / `[?] — EXECUTE` 1 / `[ ] — SKIP` 717 / `[S]` 0。設計の判定マトリクスと完全一致。
- **BR-1〜5 とテスト可能性**: 各ルールに具体的な入力・期待値・テスト形が付いており実装可能。FR-2a→BR-1/2/5、FR-2b→BR-3、FR-2c→BR-4、FR-4c→落ちる実証節、の全数対応を requirements.md(:26-28, :38-39)で確認 — 欠落なし。
- **BR-3 の fixture 数値**: RE 記録(`codekb/amadeus/re-scans/260717-state-mirror-fixes.md:48`)の「EXECUTE 18 / SKIP 14 / 全32行」「期待 18/18」と一致。260717-mirror-issue-tool の現 live state は nfr-requirements が `[-]`(進行中)のため今日時点は 17/18 だが、これは RE スキャン後に intent が前進した結果であり、fixture が意図するのは「全 EXECUTE 完了時」の合成シナリオ(BR-3 文言「相当」がそれを明示)。設計の記述と齟齬なし。
- **BR-4 fixture 是正方針**: `tests/unit/t232-amadeus-mirror.test.ts:72` を実読 — `"- [S] market-research — SKIP"` という `[S]` checkbox + `— SKIP` サフィックスの捏造合成(実コーパスに `[S]` 0件、`— SKIP` は必ず `[ ]` と共起)を確認。BR-4 の是正方針(`[S]`+`— EXECUTE` と `[ ]`+`— SKIP` の両実様式を fixture に含める)は正確にこの欠陥を修復する。
- **無申告逸脱・互換分岐**: business-logic-model.md:19「旧挙動([S] のみ除外)は置き換え — 互換分岐なし」を確認。実装差分は3-5行の単一 if 追加のみで、フォールバック・移行シムの類は設計に現れない。org.md Forbidden(無許可の互換レイヤー禁止)に抵触なし。
- **落ちる実証設計**: 新設条件の実行行(`if (/ — SKIP\s*$/.test(line)) continue;`)への注入 — 分岐を恒偽化すれば SKIP 行が誤って `total` に混入し BR-1/BR-3 の 18/18 assert が 18/32 等へ崩れて赤くなることは、現行コード構造から機械的に導出でき、健全な落ちる実証設計(team.md inject-runtime-consumed-lines 準拠 — 実行時消費行への注入)。
- **エンティティ/フロントエンド成果物**: domain-entities.md は新規型ゼロを明示し、戻り値契約 `{approved <= total}` の不変条件(除外追加は total を減らす方向のみ)を正しく記述。frontend-components.md の N/A 宣言は ui-less-mockups-as-output-contract に沿った反証可能根拠(repo ローカル CLI の純関数修正のみ)を持つ。

### Validation Tool Results

本ステージ定義に検証ツールの明示指定なし(functional-design の frontmatter に validation tools 未宣言) — 上記は reviewer による直接実測(grep/git show)で代替。

### Summary

疑似コード・正規表現は現行実装 `scripts/amadeus-mirror.ts:87-105` に対して意味論的に正しく、判定マトリクスの数値は observed コミット `591b6a2a2` に対する独立再集計で完全一致した。BR-1〜5 は FR-2a〜2c/FR-4b/4c への全数トレースが成立し、BR-4 の fixture 是正方針は t232:72 の実欠陥を正確に修復する。唯一の指摘(#1、Minor)はレビュー観点で明示要求された「suffix 付き SKIP がありうるか」への成果物内言及の欠落だが、reviewer 自身の実測(唯一の書き手 `setStageSuffix` の出力形・全コーパス走査)でリスクは実質ゼロと確認済みであり、実装をブロックしない。開発者はこの成果物のみで逸脱なく実装できる。
