# FR-2 是正台帳 — RE 確定転位 18 件

上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

対象は `codekb/amadeus/re-scans/260811-allowlist-semantic-audit.md` の T1〜T18 表
(`grep -c "^| T"` = 20 行 = ヘッダ 2 + 18 件)。裁定 Q2=C により、`reason` が説明する真の対象が
**免除に値するならセレクタをそれへ張り直し、値しないならエントリを削除**した。

## 「免除に値する」の判定基準(実測ベース)

免除は「計測不能な行を patch gate から外す」統制上の例外である。したがって真の対象が
**現に被覆されている(lcov の DA が正のヒット数を持つ)なら、その行に免除は要らない**。
判定は `coverage/lcov.info`(`bun run coverage:ci` の生成物)の DA レコードの実測で行い、
散文による説明を合否の根拠にしていない。

- 真の対象が **DA:0**(計測対象だが未被覆) → 免除に値する → **張り直し**
- 真の対象が **DA > 0**(実際に走っている) → 免除に値しない → **削除**

この判定により、当初「防御的 catch だから免除」と読めた T1 など 5 件が、実測では被覆済みと
判明して削除側へ移った。実測なしに散文だけで判断していれば誤って免除を残していた。

## エントリ単位の判断

| ID | ファイル | 真の対象 | 実測 | 採用 | 根拠 |
|---|---|---|---|---|---|
| T1 | `amadeus-election.ts` | `:424` views ディレクトリ mkdir の防御 catch | `424:10` | 削除 | catch arm は実際に 10 回実行されている。防御分岐は被覆済みで免除不要 |
| T2 | `amadeus-state.ts` | `:938` `initProcessObservability` の telemetry 配線 | `938:0` | 張り直し | 未被覆。reason(Phase 2 telemetry wiring)が指す行そのもの |
| T3 | `amadeus-state.ts` | `:970-975` `enforceCallerAuthorization` の否認経路 | `970:78 971:51 972:21 973:71 975:17` | 削除 | 全行が被覆済み。t365 が実際に in-process で到達しており免除不要 |
| T4 | `amadeus-state.ts` | `:1011-1012` `set-construction-iteration` の dispatch case | `1011:0 1012:0` | 張り直し | 未被覆。`class: "dispatch-case"` を付与 |
| T5 | `amadeus-state.ts` | `:1099` default case の unknown-subcommand メッセージ | `1099:0` | 張り直し | 未被覆。`class: "dispatch-case"` を付与 |
| T6 | `amadeus-state.ts` | `:5834` invalid-token の mutation-before-reject `error()` | `5834:0` | 張り直し | 未被覆 |
| T7 | `amadeus-state.ts` | `:5826-5827` missing-argument の usage error | `5826:0 5827:0`(`5828` は DA なし) | 張り直し | 未被覆。DA を持たない `5828` はレンジから外した(stale 判定は DA 実在を要求する) |
| T8 | `amadeus-orchestrate.ts` | `:1738` inode race guard の throw | `1738:0` | 張り直し | 未被覆。lstat と O_NOFOLLOW open の間の競合は注入手段がない |
| T9 | `amadeus-orchestrate.ts` | `:6262-6263` `handlePark` の project-dir 束縛と Kimi caller guard | `6262:0 6263:0` | 張り直し | 未被覆 |
| T10 | `amadeus-orchestrate.ts` | `:6654` telemetry seam | `6654:321` | 削除 | 被覆済み。解決先(コメント + `TOOLS_DIR` 定義)も telemetry ではなく、免除の対象が存在しない |
| T11 | `amadeus-runtime.ts` | `:917-918` `MEMORY_EMPTY` 再発行 dedup | `917:139 918:40` | 削除 | 被覆済み。t351 が in-process で駆動している |
| T12 | `amadeus-learnings.ts` | `:911` telemetry 配線 | `911:0` | 張り直し | 未被覆 |
| T13 | `amadeus-graph.ts` | `:1768-1769` `stageGraphDrift` の `opts?` 多行型 | `1768:0 1769:0` | 張り直し | 未被覆の runtime-erased 行。`class: "type-only"` を付与 |
| T14 | `amadeus-graph.ts` | 同上(T13 と同一 `reason`) | — | 削除 | 真の対象は T13 が張り直した範囲と同一。2 本目の免除に固有の対象がない |
| T15 | `amadeus-utility.ts` | `:862-863` `inspectHookHeartbeats` の `Pick` 多行型 | `862:0 863:0` | 張り直し | 未被覆。`class: "type-only"` を付与。`:861`(`options: Pick<`)は識別子 `options` が型ノード外のため type-only 述語が偽になる — レンジから外した |
| T16 | `tla-arm.ts` | `:204` `assertTlaElectionAction` の防御 TypeError throw | `204:55` | 削除 | 被覆済み。reason の「CI-run tests submit well-formed actions」は現状と合わない |
| T17 | `amadeus-mirror-executor.ts` | `:1683-1687` `latestProjectReconciliationReceiptKey` の fail-closed 分岐 | `1683:0 … 1687:0`(`1688` は DA なし) | 張り直し | 未被覆。DA を持たない `1688` はレンジから外した |
| T18 | `amadeus-mirror-executor.ts` | 同上(T17 と同一 `reason`) | — | 削除 | 真の対象は T17 が張り直した範囲と同一。2 本目の免除に固有の対象がない |

**内訳**: 張り直し 11 件 / 削除 7 件。台帳のエントリ数は 623 → 616。

## `selector.class` の付与(opt-in ラチェット)

AST で判定可能な 3 クラス(`type-only` / `catch-arm` / `dispatch-case`)に当てはまるものだけに
付与した。張り直し 11 件のうち 4 件が該当する(T4 / T5 = `dispatch-case`、T13 / T15 = `type-only`)。
残る 7 件の対象は `try` ブロック内・`if` ブロック内・関数本体であり、いずれも 3 クラスに
当てはまらないため宣言していない。**当てはまらないものへ無理に宣言を付けると、
検査できない宣言が増えるだけでゲートの担保は 1 ミリも増えない。**

付与時は `matchesSyntaxClass` で宣言とコードの一致を機械確認してから書き込んでいる
(適用ログの `T4 class=dispatch-case matches=true actual=dispatch-case` ほか)。

## FR-2 受け入れ (2) の実測

`attribute-diff.ts` の実出力からの転記:

```
exempt lines before: 3452
exempt lines after:  3400
added:   13
removed: 65
unattributed added:   0
unattributed removed: 0
FR-2 acceptance (2) OK: every changed line belongs to a recorded remediation
```

増加 13 行はすべて張り直し先(T4 / T6 / T7 / T8 / T13 / T17)の行であり、
減少 65 行はすべて張り直しの旧解決先または削除エントリの解決先である。
**どのエントリにも帰属しない増加行は 0 件。**

張り直し 11 件の新解決先は延べ 20 行だが、増加は 13 行にとどまる。差の 7 行は
**別のエントリによって既に免除されていた**行である。是正前の免除行集合への実測:

```
$ grep -E "(amadeus-state\.ts:(938|1099|5834)|amadeus-orchestrate\.ts:626[23]|amadeus-learnings\.ts:911|amadeus-utility\.ts:86[23])$" before.txt
packages/framework/core/tools/amadeus-learnings.ts:911
packages/framework/core/tools/amadeus-orchestrate.ts:6262
packages/framework/core/tools/amadeus-orchestrate.ts:6263
packages/framework/core/tools/amadeus-state.ts:1099
packages/framework/core/tools/amadeus-state.ts:938
packages/framework/core/tools/amadeus-utility.ts:862
packages/framework/core/tools/amadeus-utility.ts:863
```

`amadeus-state.ts:5834` は同じ述語で 0 件、すなわち新規の免除であり、増加 13 行の側に現れている。
差し引き、是正は免除範囲を 52 行分**狭めている**(3452 → 3400)。
