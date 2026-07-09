# Business Rules — dynamic-size-observation(#699)

> 上流: `../../../inception/requirements-analysis/requirements.md`。各ルールは FR/NFR 番号へ遡れる。

## BR-1: size↔wall-clock 帯(FR-4、選挙 Q3=A)

- `durationSeconds < 1` → floor は `small`
- `1 <= durationSeconds < 30` → floor は `medium`
- `durationSeconds >= 30` → floor は `large`
- 境界値の帰属: 上限は排他・下限は包含(`1.0s` ちょうどは medium、`30.0s` ちょうどは large)。codex-3 実測ルール(#684 comment 4924008283「Small=<1s」「Large=>=30s」)の文言に一致させる。
- 帯定義は `WALL_CLOCK_BANDS` の1箇所のみ。drift 検出と summary の双方が `sizeFloorFromDuration` 経由で消費する(canonical 1定義)。

## BR-2: wall-clock drift の判定(FR-2)

- 実効宣言 `effectiveDeclared = 注釈のdeclared ?? staticSize`(注釈なしファイルは静的分類値が正 — #696 の注釈意味論 `test-size.ts:20-21` と同型)。
- drift 成立条件: `SIZE_ORDER[dynamicFloor] > SIZE_ORDER[effectiveDeclared]`。
- 成立時のみ `{ kind: "wall-clock", declared, measured }` を構築(スマートコンストラクタ経由 — 不成立の drift レコードは表現不能)。
- 静的 drift guard(`tests/unit/t-test-size-drift.test.ts`)の判定・契約には一切触れない。動的 drift は独立の advisory 軸。
- 無効注釈(`invalidValue`)の扱い: 静的 guard が既に CI 赤で検出する領分のため、動的側は `effectiveDeclared = staticSize` として処理し二重報告しない。

## BR-3: 執行姿勢 — advisory(FR-5、選挙 Q2=A)

- 動的 drift は **CI を赤くしない**。レポート(BR-4)と summary 行(BR-5)に出すのみ。
- ゲート昇格(CI 赤化)の判断は後続 Issue(requirements §7)。本ユニットに「赤くするフラグ」等の先回り実装を置かない(speculative flexibility の禁止)。
- advisory でも検出結果は実測 duration から導出する(検証劇場の禁止 — team.md Forbidden)。固定値・自己参照比較を含まないことをレビューで検査する。

## BR-4: レポート永続化(FR-3、選挙 Q1=A)

- 出力先: `tests/logs/test-size-report.json`(gitignore 済み `.gitignore:26`。リポジトリにコミットしない)。
- 書き出しタイミング: 全 tier 集約完了後に1回。部分実行(tier 指定・単一ファイル指定)でも、その実行で実測できたレコードのみで書く(存在しないファイルの行を捏造しない)。
- CI: `ci.yml` のテストジョブで `actions/upload-artifact` により artifact 化(coverage の既存パターン `ci.yml:75-84` を踏襲、`if: always()` + `if-no-files-found: warn`)。
- スキーマ: `TestSizeReport`(domain-entities.md §2.5)。`schemaVersion: 1` を必須とし、消費側(#683 等)がバージョンで防御できるようにする。

## BR-5: summary matrix への反映(FR-3 テスト可能条件)

- 既存 matrix 出力(`printSizeMatrix`、`run-tests.ts:895-948`)の**後**に drift サマリを出す:
  - 常時1行: `wall-clock drift: N file(s)`(N=0 でも表示 — 表示経路自体の検証可能性)
  - N>0 のとき: 各 drift ファイルを `file: declared=<x> measured=<y> (<duration>s)` 形式で列挙
- 既存 matrix の表構造・列・文言は変更しない(#696 観測性出力の安定)。

## BR-6: runner 契約の不可侵(NFR-1)

- exit code == failed-file 数の契約(t112 固定)を変更しない。
- 動的計測・レポート書き出し・matrix 追記の失敗は runner を失敗させない: 既存の best-effort wrap(`run-tests.ts:882-886` の try/catch)と同じ隔離をレポート経路にも適用する。
- `.meta` 削除契約(`run-tests.ts:430`)を変更しない。duration は削除前にメモリ収集(質問 Q3=A)。

## BR-7: 伝播と互換(NFR-2、FR-2 安定契約)

- `tests/run-tests.ts` に新規 static import を加えた場合、t112 の scratch copy リスト(`tests/integration/t112.serial.test.ts:91-94`)へ同一 PR 内で伝播する。本設計では追加 import 先は既存コピー済みの `test-size.ts` のみの見込みだが、実装時に import 差分を必ず照合する。
- `SizeClassification` / `classifyTestSize` / `parseSizeAnnotation` / `SIZE_ORDER` / `SIZE_VALUES` の既存 export のシグネチャ・挙動は不変(追加 export のみ)。静的 drift guard・printSizeMatrix の既存挙動が退行しないことをテストで固定する。

## BR-8: 落ちる実証(team.md Mandated、FR-2 テスト可能条件)

- 赤 fixture: `// size: small` 宣言 + 実測が small 帯上限(1s)以上になる形態(使用バックエンド=wall-clock で検出可能な形態に限定 — engineer-2 留意点)→ drift が検出されレポート/summary に現れることを実証。
- 緑 fixture: pure in-process・帯内実行 → drift が検出されないことを実証。
- 検証は in-process seam(`sizeFloorFromDuration`・drift 判定・レポート構築の関数直接呼び出し)を第一とし、bun --coverage の spawn 盲点(team.md Corrections)を回避する。runner 経由の E2E 実証は落ちる実証の再現記録として PR に添付する。
