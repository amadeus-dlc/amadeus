# Business Rules — `launch-autonomy-flag`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` 領域 E(FR-CLI-1〜5 — 全規則の trace 先)、`components.md` ADR-8(適用の所在)、`component-methods.md` §C12 / §C13(文言・判定順の逐語)、`services.md` §S5(engine)、`unit-of-work.md` §`launch-autonomy-flag` 実装上の制約(ADR-12 / ADR-13 / C-3 / C-6)、`unit-of-work-story-map.md` §`launch-autonomy-flag`(落ちる実証の対象)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **値域 3 値**: `--autonomy` は `none` / `semi` / `full` のみ受理。値域は `AutonomyMode`(`amadeus-intent-autonomy.ts:9`)と一致させ、独自値を作らない | FR-CLI-1 |
| R2 | **値の consume**: 値は必ず consume し、intent 自由文へ漏らさない | FR-CLI-1(`:1068-1069` の `--report` コメントと同根) |
| R3 | **loud の全数化**: 値域外・値省略・active intent 不在(Q1 裁定)はいずれも loud エラー(対話プロンプトへフォールバックしない・黙って落とさない) | FR-CLI-2 (3) / Q1 裁定 A |
| R4 | **fail-closed**: projection 読取不能は拒否側へ倒す(`catch → false` の保守側読み替えを採らない — 意図的相違) | ADR-12 / NFR-6 (1) |
| R5 | **宣言判別子は provenance**: 「宣言済み」= `modeProvenance.kind === "human-command"`。state フィールドの有無・値を判別に使わない | ADR-13 / FR-CLI-3 |
| R6 | **再宣言の意味論**: 未宣言 → 初回宣言を受理 / 宣言済み同値 → no-op(監査イベントを増やさない)/ 宣言済み異値 → loud + `set-autonomy` 案内。人間が決めた mode を起動フラグが無言で書き換えない | FR-CLI-3 (0)(1)(2) |
| R7 | **grant 保護**: active grant がある Intent への `--autonomy none` は loud 停止(revoke は `amadeus-bolt set-autonomy --mode none` の明示操作のみ)。判定順により `revoke-full` 経路は起動フラグから到達不能 | FR-CLI-2 (2) / FR-CLI-3 (3) |
| R8 | **full の fail-closed**: grant 不在の `--autonomy full` は preview 表示+非 0 exit で停止(FR-GRT-006 を緩めない) | FR-CLI-4 |
| R9 | **provenance の出所**: フラグ自体を provenance にしない。書込は既存の HUMAN_TURN 要求(`PROVENANCE_REQUIRED`)を通る | FR-CLI-5 |
| R10 | **書込経路は 1 本**: mode 書込は既存 `applyProductionAutonomyMode` のみ(第 2 の書込経路を作らない)。engine が持つのは判定と委譲だけ | ADR-8 |
| R11 | **directive 非搬送**: `directive.intent_autonomy_mode` へ書き込まない(`amadeus-directive.ts:97` / `:606` は diff に現れない) | C-3 |
| R12 | **READ_ONLY_FLAGS へ追加しない**(autonomy は監査済みの状態変更)。検証手段: t450 に in-process アサーション `expect(READ_ONLY_FLAGS.has("--autonomy")).toBe(false)` を置く — `READ_ONLY_FLAGS` は export 済みの `ReadonlySet<string>`(実測: `amadeus-lib.ts:437` verbatim `export const READ_ONLY_FLAGS: ReadonlySet<string> = new Set([`)であり import で直接検査できる。落ちる実証: Set へ `"--autonomy"` を注入するとこのアサーションが赤になる(ケース H9) | C-6 / FR-CLI-5 受け入れ基準 |
| R13 | **エラー描画は既存 `errorDirective`**(新 directive 種別・新表示語彙を作らない) | `component-methods.md` §C13 末尾 |

## エラー文言(C13 判定表からの逐語固定)

| 判定 | 文言(趣旨) |
| --- | --- |
| 1 | `--autonomy` requires a value: none, semi, or full. |
| 2 | Invalid --autonomy "<v>". Valid values: none, semi, full. |
| 5(異値) | Intent autonomy is already <cur>. Use `amadeus-bolt set-autonomy --mode <v>` to change it. |
| 6 | Intent has an active grant. Use `amadeus-bolt set-autonomy --mode none` to revoke it explicitly. |
| 0(Q1) | active intent 不在の案内 — birth を先に行い、その後 `/amadeus --autonomy <mode>` または `amadeus-bolt set-autonomy` で宣言する(最終文言は実装時に既存 errorDirective 文体へ揃える — 判定 1・2 の英語文体と同調) |

## バリデーション論理

- 値域判定は R1 の 3 値集合への帰属のみ(大文字・別綴りは判定 2 で loud)。
- 判定は先に落ちるものから順に評価し、後段判定の副作用(projection 読取)は判定 0〜2 の通過後にのみ発生する(不正入力で I/O を起こさない)。
- projection 読取は 1 回に閉じ、判定 3〜7 は同一 snapshot(`LaunchAutonomyContext`)を共有する(TOCTOU 窓の最小化 — 読取と書込の間の変化は判定 8 の `applyProductionAutonomyMode` 側の既存検証が守る)。

## テスト固定(受け入れ基準 → ケース対応)

| ケース群 | 対象 | 期待 |
| --- | --- | --- |
| P1〜P3(t449) | `--autonomy none/semi/full <自由文>` の parse | 値が `flags.intent` に混入しない(FR-CLI-1) |
| P4(t449) | 値なし `--autonomy` | `autonomyMissingValue === true` |
| H0(t450) | active intent 不在 + `--autonomy semi` | loud error(Q1 裁定) |
| H1(t450) | birth 直後(system-default)+ `--autonomy semi` | 0 exit で mode=semi(FR-CLI-3 (0)) |
| H2(t450) | human-command 由来 semi + `--autonomy semi` | 監査イベント増なしで continue(FR-CLI-3 (1)) |
| H3(t450) | 同 + `--autonomy full` | loud + 案内、grant 無傷(FR-CLI-3 (2)(3)) |
| H4(t450) | grant 不在 + `--autonomy none` | 0 exit で mode=none(FR-CLI-2 (1)) |
| H5(t450) | grant 実在 + `--autonomy none` | loud + 案内、grant revoke されない(FR-CLI-2 (2)) |
| H6(t450) | `--autonomy bogus` / 値なし | 非 0 exit + stderr 理由(FR-CLI-2 (3)) |
| H7(t450) | grant 不在 + `--autonomy full` | 非 0 exit + preview(FR-CLI-4) |
| H8(t450) | HUMAN_TURN 不在 + `--autonomy semi` | `PROVENANCE_REQUIRED` 停止(FR-CLI-5) |
| H9(t450) | `READ_ONLY_FLAGS`(`amadeus-lib.ts:437`、export 済み)の in-process 検査 | `READ_ONLY_FLAGS.has("--autonomy") === false`(FR-CLI-5 後半 / R12。落ちる実証: Set へ `"--autonomy"` を注入すると赤) |
| 落ちる実証 | consume 分岐除去 / grant 判定無条件化 / declared 無条件化 / fail-closed 反転 | それぞれ P1〜P3 / H5 / H1 / H7 が赤(注入 → 赤 → 復元 → 残渣ゼロの 1 セット — NFR-1) |

## 本 Unit が守らない(守る必要がない)規則の明示

- semi の裁定梯子・質問解決(FR-AUTH / FR-LAD 系)には触れない — C13 は既存 `applyProductionAutonomyMode` へ委譲するだけで、semi の認可基体に依存しない(`unit-of-work.md` §依存しない理由)。
- statusline / `--status` の表示(FR-DISP 系)は他 Unit の検収。
