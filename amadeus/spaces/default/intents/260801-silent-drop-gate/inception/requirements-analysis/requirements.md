# Requirements — no-silent-drop

## Intent 分析

本 intent は、失敗を成功に見せる「無音化」を個別修正の反復から静的・実行時の予防契約へ移す self-feature である。直接利用者は Amadeus のフレームワーク開発者、最終受益者は state／audit の信頼性に依存する Amadeus ユーザーである。完了は、3形態の新規違反を blocking CI で拒否し、#1878／#1874 の修正で既存債務を減らし、内部障害でも偽成功や未回収の部分更新を発生させないことを再現可能に実証した時点とする。

要求の明確性は高く、変更種別は新規静的ゲートと同族 runtime bugfix を組み合わせた self-feature、範囲は contributor-side CLI・core runtime・CI・配布に跨る複数 component、複雑度は Standard と評価する。常駐 service、HTTP、DB、AWS 資源、アプリケーション配備環境は存在せず、可用性・水平スケール・アクセシビリティは非適用である。

## 上流入力と承認系譜

- `intent-statement.md`: 無音化3形態、2層の受益者、検出実証と残債単調減を定義する。
- `scope-document.md`: 3 authored roots、baseline／exemption、#1878／#1874／#1963、CI・配布・合否 S-01〜S-08 を承認済み境界として固定する。
- `business-overview.md`: observed `d72f60b5a` における利用者価値、対象・除外、移行契約、15秒・精度・fail-closed 境界を確認する。
- `architecture.md`: 既存 gate の pure verdict／adapter 分離、lint job、#1878 の `StateResult` 破棄、#1874 の bare `String.replace`、#1963 の修正済み境界を確認する。
- `code-structure.md`: contributor-side CLI、authored source と生成投影、pure domain と I/O handler、既存テスト seam の配置を確認する。
- `team-practices.md`: self-feature の最初の Bolt を最大リスクの end-to-end walking skeleton とし、人間 gate 後に拡張する。
- `requirements-analysis-questions.md`: Q1〜Q7 をすべて A、合意サマリを確認OKとして 2026-08-02 にユーザーが確定した。Q6 は commit 前の byte invariance と commit 後の transactional outbox 収束を区別し、Q7 は修正前 candidate baseline と修正後 committed baseline の時系列を裁定する。

Ideation では `constraint-register.md` C-01〜C-16 と `initiative-brief.md` の GO が承認済みである。[PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) は observed `d72f60b5a` の祖先に含まれ、#1963 は再実装せず既存 loud-failure 契約を回帰固定する。

## Functional Requirements

### FR-01 固定ツールチェーン

システムは ast-grep を再現可能な固定バージョンで導入し、Bun 1.3.13 の frozen install と両立させなければならない。ツール不在または解決不能を「違反0件」と解釈してはならず、型付き診断と非0終了にしなければならない。

### FR-02 catch の無音化検出

システムは、空の catch と、ログ呼出を除いた後に失敗を表す terminal action がない catch を `NSD001 catch-silence` として検出しなければならない。許可する terminal action は、(1) `throw`、(2) 呼出元の宣言済み discriminated union に含まれる非 success variant の直接 `return`、(3) 正準カタログ内の failure-state transition を呼び、その Result を同じ catch 内で検査して非 success variant を返す、の3形態だけとする。

明示的 best-effort は、宣言済み戻り値 union が `kind: "best-effort-skipped"` と非空 reason を持ち、catch がその variant を直接返す形だけとする。コメント、関数名、ログ level、metric／audit の emit だけでは best-effort 契約にならない。上記3形態以外の log-only catch は常に違反とし、FR-08 により `NSD001` へ exemption は適用できない。各許可形態と、空／log-only／success variant return／未検査 transition を positive／negative fixture で一意に分類する。

### FR-03 emit／Result 戻り値破棄の検出

システムは、成否を表す emit 系／Result 系呼び出しの戻り値が未検査のまま破棄された場合に `NSD002 discarded-status-result` として検出しなければならない。対象 API／戻り値型はレビュー済みの正準カタログで明示し、命名ヒューリスティック単独で違反を確定してはならない。初回リリースの閉じた違反確定カタログは次の1項目だけとする。

| API／結果境界 | 修正前の正例 | 負例／修正後契約 | Issue 対応 |
|---|---|---|---|
| `applyTransition(...): StateResult` | `persistBlocked` が結果を破棄する | `kind` を検査し failure を伝播する | #1878、`NSD002` |

初期 census 成果物は、authored roots 内の「判別可能な success／failure union を返す関数」と「成功通知に先立つ必須 write」の全候補を列挙し、各候補を `included` または `excluded` と根拠付きで分類する。この分類は候補集合の網羅性を証明するが、初回の違反確定集合を上表から暗黙に増やしてはならない。カタログ追加には明示的な要件変更、同一変更内の positive／negative fixture、更新後の全候補 census 証跡を要求する。

`setCheckbox`／`setStageSuffix` の修正前 shape は Result 破棄ではなく、bare `String.replace` が対象不存在でも同じ string を返し、caller が成功を通知する `NSD003` である。#1874 を `NSD002` または修正前 Result API として baseline に数えてはならない。

### FR-04 偽成功の検出

システムは、必須 write の成立を確認せず対応する success outcome を返す経路を `NSD003 false-success` として検出しなければならない。必須対応は次のとおりとする。

| 経路 | 必須 write／postcondition | 許可する success outcome |
|---|---|---|
| `persistBlocked` | `applyTransition` が `kind: "ok"` | `safety-blocked` |
| `setCheckbox`／`setStageSuffix` mutation | 対象 identity が found で、期待する変更後値を再読できる | mutation success |
| #1963 compose resync | section が recognized で、write 後の再 parse が期待値を返す | resync success |

すべての分岐で必須 write が success outcome より先に成立しなければならない。write 前の早期 return、write failure、not-found、postcondition 不一致は success を返してはならない。#1963 の unknown section は `section-unrecognized` かつ bytes 不変の negative／回帰 fixture とし、再実装対象にはしない。一般化できない構造は明示カタログと個別 fixture で正準化し、曖昧な文字列一致で補ってはならない。

### FR-05 authored-root 完全走査

システムは `packages/framework/core/`、`packages/framework/harness/`、`scripts/` 配下の regular file で拡張子が `.ts`、`.tsx`、`.mts`、`.cts` の手書き正本を全て走査しなければならない。symlink は追跡せず、対象集合内に現れた symlink は `scan-invalid-symlink` として拒否する。`dist/`、`fixtures/`、`__fixtures__/`、`*.fixture.*`、生成物として設定に列挙された path は本番 census から除外する。

走査前に、正規化 repository-relative path と SHA-256 からなる期待 manifest を決定的順序で生成する。scanner の receipt 集合は期待 path 集合と完全一致しなければならず、欠落・余剰・重複、root 欠落、読取不能、0件を拒否する。走査後に全対象を再 hash し、走査前 manifest と異なる場合は `source-changed-during-scan` として拒否する。この manifest equality を partial-scan の機械的 oracle とする。

### FR-06 決定的 census

システムは各 finding の identity を `ruleId + normalized repository-relative path + AST fingerprint` とし、fingerprint は node kind、正規化 token stream、必要な親 context から算出し、行番号だけに依存してはならない。同一 revision・同一設定の反復走査は、順序を含め byte-identical な census を生成しなければならない。

### FR-07 baseline 統治

修正前の完全走査を `C_pre`、その TP identity 集合を evidence-only 候補 `B_pre` とする。`B_pre` はまだ CI の正本 baseline ではない。#1878／#1874 修正後の完全走査を `C_post` とし、その TP identity 集合を初回の committed baseline `B0` とする。`B0 ⊂ B_pre`、`B_pre - B0` が対象 Issue の identity と一致し、`B0 - B_pre = ∅` でなければならない。

以後の正常な baseline `B_next` は `B_next ⊆ B_current` を満たさなければならない。`B_next - B_current` が1件でもあれば、削除で件数が相殺されても `ratchet-replacement` として拒否する。追加が必要な場合は、理由・影響・代替案を示す scope change と人間再承認を台帳変更より先に要求する。

### FR-08 intentional-drop exemption

exemption marker の唯一の文法を `// intentional-drop: <trim 後に非空の理由>` とする。marker は、空行と空白だけを trivia として許し、その直後の AST `ExpressionStatement` が正準カタログ内の `NSD002` 呼出をちょうど1つ含む場合に、その node だけを免除する。別コメント、別 marker、宣言、制御構文、複数呼出が間にある場合、連続 marker、対象 node 不在、理由空、未使用・陳腐化 marker は `exemption-invalid` とする。`NSD001` と `NSD003` は免除できない。

exemption identity も FR-06 と同じ正規化原則を使い、正常な次集合は現集合の subset でなければならない。同数置換を含む新規 identity は `ratchet-replacement` として拒否し、増加には FR-07 と同じ scope change／人間再承認を要求する。

### FR-09 型付き診断と終了コード

CLI の stdout は schema version 1 の次の閉じた discriminated union からなる単一 JSON object、stderr は人間向け要約とする。

```text
Pass = { schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", message: string, findings: [], scan: ScanSummary }
Violations = { schemaVersion: 1, status: "violations", code: "POLICY_VIOLATIONS", message: string, findings: Finding[1..], scan: ScanSummary }
Error = { schemaVersion: 1, status: "error", code: InfraCode, message: string, findings: [], scan: ScanSummary | null }
Finding = { code: FindingCode, ruleId: string | null, path: string | null, line: number | null, column: number | null, identity: string, message: string }
ScanSummary = { expectedCount: number, scannedCount: number, manifestDigest: string, missing: string[], extra: string[] }
```

`FindingCode` は `NSD001`、`NSD002`、`NSD003`、`BASELINE_NEW_IDENTITY`、`EXEMPTION_INVALID`、`RATCHET_REPLACEMENT` の閉集合とする。source finding の ruleId／path／line／column は非 null、台帳 finding で source location が存在しない場合だけ null とする。複数違反時の top-level code は常に `POLICY_VIOLATIONS` とし、各違反は identity 順の `findings[]` に固有 code を持つ。

`InfraCode` は `TOOL_MISSING`、`RULE_INVALID`、`BASELINE_MISSING`、`BASELINE_INVALID`、`SCAN_ROOT_MISSING`、`SCAN_ZERO`、`SCAN_PARTIAL`、`SCAN_INVALID_SYMLINK`、`SOURCE_CHANGED_DURING_SCAN`、`SOURCE_UNREADABLE`、`INTERNAL_ERROR` の閉集合とする。infrastructure error は findings を空とし、走査開始前は scan を null、manifest 作成後は取得済み ScanSummary を返す。終了コードは `Pass=0`、`Violations=1`、`Error=2` とし、stderr 文字列の解析を機械判定に使用してはならない。

### FR-10 #1878 永続化失敗の伝播

`persistBlocked` 相当は `applyTransition` の既存 `StateResult` を必ず検査し、失敗を既存の判別可能な Result／exit-code 境界で全 callsite へ伝播しなければならない。新しい全域 Result 型は導入しない。失敗境界は Q6 に従い次のとおりとする。

| 失敗注入点 | 呼出結果 | state／audit／outbox 契約 |
|---|---|---|
| lock、read、parse、conflict、render、temp create／write／close／lstat、state rename 前 | failure、`safety-blocked` 禁止 | state／audit／outbox bytes は呼出前と同一 |
| state rename 後の directory fsync | `durability-unknown`、success 禁止 | old／new のいずれもあり得るため byte invariance を主張せず、次回 read／recovery で整合確認 |
| state commit 後の audit append | business state は committed、audit pending | commit 済み state と transactional outbox を維持し、後続 drain で audit へ収束 |
| audit append 後の outbox clear | business state／audit は committed | stale outbox を許容し、冪等 drain で clear へ収束 |

診断は stderr／返却 Result に出してよいが、commit 前の failure で新しい workflow audit event を append してはならない。commit 後の outbox pending を「状態更新が失われた成功」に偽装してはならず、再実行で同じ audit を重複させてはならない。

### FR-11 #1874 対象不存在の loud failure

`setCheckbox`／`setStageSuffix` と全 callsite は、対象行の存在と mutation 成立を明示的に検査しなければならない。対象 slug／suffix が存在しない場合は入力 bytes を変更せず typed not-found failure を返さなければならない。現行 callsite の契約を次に固定する。

| 所有ファイル／経路 | helper | not-found outcome | 再同期／再試行上限 |
|---|---|---|---|
| `amadeus-jump.ts` の skip／reset／target start | `setCheckbox` | jump 全体を write 前に typed failure | 0回 |
| `amadeus-utility.ts` の compose scope suffix flip | `setStageSuffix` | recompose 全体を write 前に typed failure | 0回 |
| `amadeus-utility.ts` の set-status | `setCheckbox` | status update を write 前に typed failure | 0回 |
| `amadeus-state.ts` の bulk checkbox change、advance、phase/final completion、gate start/approve/reject/revise、skip | `setCheckbox` | transaction を write 前に typed failure | 0回 |
| `amadeus-state.ts` の Bolt fragment merge | `setCheckbox` | merge を write 前に typed failure | 0回 |

現在、暗黙の再同期または再試行を認可された callsite はない。将来これを許可する変更は本 intent の scope change とし、警告付き success にしてはならない。

### FR-12 #1963 回帰契約

[PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の既存実装を正本とし、未知 section が `section-unrecognized` となり、decoy checkbox／malformed section／invalid graph が loud failure となり、失敗時に state bytes が変化しない契約を回帰テストで維持しなければならない。本 intent で同じ修正を再実装してはならない。

### FR-13 blocking CI

no-silent-drop CLI は既存 GitHub Actions の lint job に独立した blocking step として接続しなければならない。違反、baseline 増加、exemption 増加、設定・ツール・走査異常のいずれも CI Success を失敗させなければならず、warning 化または `continue-on-error` を使用してはならない。

### FR-14 配布と drift

core／harness 正本の変更は packager から全ハーネス投影へ再生成し、生成物を直接編集してはならない。`bun scripts/package.ts --check` と `bun run promote:self:check` を含む既存 drift guard を通過しなければならない。

### FR-15 完了証跡

成果物は、少なくとも (1) 各 shape の落ちる実証、(2) 修正後の green、(3) 初期 finding の TP／FP 分類と計算値、(4) `C_pre`／`B_pre` と `C_post`／`B0` の identity 集合差分、(5) #1963 回帰 green、(6) zero／partial scan と欠落・不正入力の非0終了、(7) cold／warm 実行時間、(8) package／promotion drift green を、revision とコマンドが再現できる形で記録しなければならない。

## Non-Functional Requirements

| ID | 属性 | 要求と測定方法 |
|---|---|---|
| NFR-01 | 性能 | GitHub Actions `ubuntu-latest`、Bun 1.3.13、`bun install --frozen-lockfile` 完了後に `bun run no-silent-drop` を測る。独立した5つの fresh workspace で gate 自身の process cache がない最初の実行を cold、その直後の同一 workspace での再実行を warm とし、各群5値の最大値が15秒以内。超過時は精度・fail-closed を緩和しない |
| NFR-02 | 精度 | 3 shape の positive／negative fixture を100%分類する。実 corpus の探索時品質は finding 単位で `FP ÷ (TP + FP) × 100 ≤ 5%` とし、分母0は完全走査と fixture 100%を満たす場合だけ0.0%と定義する。ただし baseline promotion に使う承認済み pre／post evidence は **FP=0件** を必須とし、FPが1件でもあれば classifier／catalog／fixtureを修正して raw censusから再実行する。FPをTP、baseline、intentional-dropへ移してはならない。分類台帳は identity、ruleId、path、line、TP/FP、根拠、reviewer、manifest digest、総数を必須とし、Build & Test の quality review と人間 gate で承認する |
| NFR-03 | 信頼性 | tool／rule／baseline／exemption／走査完全性の異常は fail-closed。runtime failure は FR-10 の commit 境界別不変条件と transactional outbox の最終収束を証明する |
| NFR-04 | 再現性 | tool version、lockfile、rules、roots、normalization を固定し、同一 revision の census と診断を byte-deterministic にする |
| NFR-05 | 保守性 | pure verdict／parser／scanner／ratchet と filesystem／CLI adapter を分離し、TypeScript discriminated union で成功・違反・内部異常を表す。単一用途を越える新規 framework は作らない |
| NFR-06 | テスト容易性 | 実行可能な各 vertical slice は strict TDD。pure unit、filesystem／CLI integration、repository corpus、runtime failure injection、distribution regression を使い分け、新規 gate は実際に赤くなる falling proof を残す |
| NFR-07 | coverage | 既存 repository coverage gate を回帰 guard として green に保つ。本 intent は新しい coverage threshold や semantic registry 基準を導入しない |
| NFR-08 | supply chain | ast-grep と全依存を manifest／lockfile で固定し、frozen install を通す。新規外部サービス、資格情報、規制対象データを導入しない |
| NFR-09 | 互換性 | 対象 bugfix と gate 以外の runtime 公開挙動を変更しない。生成投影は正本からのみ更新し、既存 harness 間の byte parity を維持する |

## User／Developer Scenarios

### SC-01 新規違反を PR で拒否

Given フレームワーク開発者が authored root に3 shape のいずれかを追加したとき、When lint job が no-silent-drop を実行すると、Then rule ID と source location を含む型付き診断を出して非0終了し、CI Success を失敗させる。

### SC-02 正常な失敗処理を許可

Given catch が rethrow／Result 返却を行う、または戻り値が明示検査される正常コード、When gate を実行すると、Then finding を生成せず成功する。

### SC-03 既存債務を単調減少

Given 修正前の `C_pre`／`B_pre` が記録済み、When #1878／#1874 を修正して `C_post` を得ると、Then 対象 identity の削除だけを含む `B0` を初回 committed baseline として登録する。以後の変更で既存 identity を削除して新規 identity を同数追加しても、subset 違反として拒否する。

### SC-04 不正な免除を拒否

Given 空理由、対象不在、複数 node へ及ぶ marker、または新規 exemption 増加があるとき、When gate を実行すると、Then exemption-invalid または ratchet-growth で非0終了する。

### SC-05 #1878 の永続化失敗

Given `applyTransition` の永続化を失敗注入したとき、When `persistBlocked` 経路を実行すると、Then commit 前の失敗は呼び出し元へ伝播して state／audit／outbox bytes が実行前と一致する。directory fsync は `durability-unknown` となり、commit 後の audit／clear 失敗は commit 済み state と outbox から重複なしで最終収束する。いずれも偽の `safety-blocked` success を返さない。

### SC-06 #1874 の対象 slug 不在

Given mutation 対象 slug が state に存在しないとき、When `setCheckbox`／`setStageSuffix` の経路を実行すると、Then typed not-found failure を返し、入力 bytes は不変である。

### SC-07 走査基盤の内部異常

Given ast-grep、rule、baseline の欠落・不正、root 欠落、zero scan、partial scan のいずれかを注入したとき、When CLI を実行すると、Then 対応する型付き診断と非0 exit を返し、green にならない。

## Constraints

- Bun-only TypeScript／ESM monorepo とし、標準実行は Bun 1.3.13、strict `tsc --noEmit`、Biome lint に従う。
- formatter と import organizer は有効化せず、近傍スタイルを維持する。
- `dist/` と promoted root suffix は直接編集しない。正本を変更して package／promote する。
- baseline と exemption は別の意味を持つ別台帳とし、統合しない。
- #1878／#1874 以外の既存真陽性を本 intent で一括修正しない。
- 外部サービス、AWS 資源、常駐 daemon、DB、監視・配備基盤を追加しない。
- Construction は最初の Bolt を最大リスクの end-to-end walking skeleton とし、Bolt ごとの独立した [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls) と人間 gate を維持する。

## Assumptions

| ID | 仮定 | 根拠・確認方法 | 状態 |
|---|---|---|---|
| A-01 | [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の #1963 修正は implementation base に存在する | observed `d72f60b5a` の祖先確認、t407／t411 回帰 | Confirmed |
| A-02 | ast-grep の固定版は Bun frozen install と CI runner 上で利用できる | lockfile clean install と CLI probe | Application Design／Construction で確認 |
| A-03 | 3 authored roots の期待集合は本 intent 中に変更されない | scope-document と scanner config の一致検査 | Binding |
| A-04 | 初期 TP／FP 分類は人間レビュー可能な finding 数に収まる | 初回 census と5%計算 | Construction で確認 |
| A-05 | `NSD002` の初回違反確定カタログは `applyTransition(...): StateResult` の1境界だけである。#1874 は `NSD003` とする | 現行 source scan、型／戻り値契約、#1878／#1874 の evidence | Confirmed。Application Design では実現方式だけを具体化 |

## Out of Scope

- #1906 の並行ロック競合
- #1878／#1874 以外の既存真陽性の一括修正
- #1963 修正の再実装
- Biome 全般または汎用 TypeScript 静的解析基盤への拡張
- no-silent-drop と無関係な runtime API 再設計・大規模 refactor
- `dist/`、ルート生成投影、test fixture の本番 census への包含
- baseline／exemption、性能、精度、fail-closed の基準緩和
- 新規 AWS、deployment、observability、incident response、DAST、autoscaling

## Traceability Matrix

| Requirement | 主な上流 | 検証先 |
|---|---|---|
| FR-01〜FR-05 | intent-statement、scope-document、business-overview、questions Q1 | rule catalog closure、positive／negative fixtures、scanner manifest integration、failure injection |
| FR-06〜FR-09 | scope-document、architecture、code-structure、questions Q4／Q5／Q7 | census determinism、baseline／exemption parser・ratchet、CLI exit contract |
| FR-10 | scope-document、architecture、questions Q3／Q6、C-13 | #1878 unit／integration、commit 前 byte invariance、durability-unknown、outbox drain |
| FR-11 | scope-document、architecture、questions Q2、C-13 | #1874 callsite 表、not-found regression、retry 0、byte invariance |
| FR-12 | scope-document、business-overview、architecture、C-01 | t407／t411 と repository integration |
| FR-13〜FR-15 | scope-document、code-structure、team-practices、initiative-brief | CI workflow contract、timing、package／promotion drift、evidence report |
| NFR-01〜NFR-09 | constraint-register C-02〜C-16、scope-document S-02／S-04／S-08 | focused tests、lint、typecheck、test:ci、既存 coverage gate、drift guards |

## Completion Criteria

1. FR-01〜FR-15 と NFR-01〜NFR-09 の検証が全て green である。
2. 3 shape の fixture 分類が100%、実 corpus の探索時偽陽性率が5%以下であり、baseline promotionに使う最終承認済みpre／post evidenceのFPが0件である。
3. #1878／#1874 修正前後で `B0 ⊂ B_pre` となり、削除 identity は対象 Issue に一致し、新規 identity と同数置換がない。
4. #1963 の既存回帰契約が green である。
5. NFR-01 の各5試行で cold／warm の最大値が双方15秒以内である。
6. package／promotion drift、Comprehensive test、blocking CI が green である。
7. 全証跡に revision、コマンド、母集団、実測値が記録されている。

## Open Questions

ユーザー判断を要する未解決事項はない。A-02 と A-04 は承認済み要件を変えない技術確認であり、Application Design／Construction で実測する。baseline／exemption の増加、5%・15秒・fail-closed の緩和、Out of Scope の取込みが必要になった場合だけ、scope change と人間再承認へ戻る。

## Functional Design Revision 2 — 精度要件の裁定

2026-08-02 の Functional Design Request Changes で、ユーザーは「承認済みFPを0件にする」を選択した。NFR-02の5%はraw censusを使う探索時のclassifier品質上限として維持し、baseline promotion／blocking CIを有効化する最終承認済みevidenceにはFP=0を要求する。第三のFP suppression台帳は導入しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T02:37:24Z
- **Iteration:** 1
- **Scope decision:** none

検出対象、台帳の単調減少判定、診断・性能・障害時不変条件に実装および機械判定を阻む未確定事項がある。

### Findings

- FR-03／FR-04 は明示カタログ方式を要求する一方、初期 API・戻り値型・偽成功構造の集合を A-05 で後工程へ先送りしているため、開発者も QA も検出網羅性を判定できない。初期カタログと各 rule ID、positive／negative fixture、#1878／#1874 の修正前 finding への対応を要件として固定すること。
- FR-04 の「永続化を必要とする成功通知」「対応する write」「実態のない成功結果」「既知構造」は判定可能な定義になっていない。成功通知と必須 write の対応表、許容順序、分岐・早期 return 時の扱いを明記すること。
- FR-07／FR-08 は件数の非増加しか要求しておらず、SC-03 と Completion Criteria 3 が禁止する既存項目の削除と新規項目の追加による同数置換を防げない。件数比較ではなく正規化 identity 集合の包含関係で shrink-only を定義し、置換ケースを拒否する受入条件を追加すること。
- FR-08 は intentional-drop marker の具体的な構文、理由の符号化、コメントと対象 node 間の trivia、連続 marker、適用可能 node 種別を定義していないため、valid／invalid fixture を一意に作れない。利用者向け exemption 契約を文法として固定すること。
- FR-05 の「全て」と partial-scan の判定根拠が不足している。対象拡張子、symlink、生成ファイル、除外規則、読取不能ファイル、走査中の変更を含む期待ファイル集合の構築方法と、partial-scan を検出する機械的 oracle を明記すること。
- FR-09 は全診断に rule と source location を要求しているが、tool-missing や baseline-missing には該当値が存在せず契約が矛盾する。診断種別ごとの必須・任意フィールド、出力チャネル、機械可読形式、終了コード対応を discriminated schema として定義すること。
- scope-document は baseline を「#1878／#1874 修正後に登録」とする記述と「baseline 確定後に修正」とするシーケンスを併記し、requirements.md は後者を前提に修正前後の減少を要求している。修正前 census、初期 ratchet baseline、修正後 baseline の名称と確定時点を統一し、S-06 の比較対象を一意にすること。
- FR-10 の state／audit byte invariance は、どの永続ファイルとどの失敗点を対象にするか不明であり、失敗診断を audit へ残せるかも判定できない。state 書込、audit 書込、rename 等の失敗注入点ごとに、変更禁止対象と許容される診断副作用を定義すること。
- FR-11 は「全 callsite」と「既存契約上明示的に許可する経路」を列挙していないため、どの caller が即時 not-found、再同期、再試行のいずれを選ぶか実装者が判断できない。callsite ごとの期待 outcome と再試行上限を固定すること。
- NFR-01 の「CI 相当環境」「cold」「warm」に測定プロトコルがなく、15秒基準を再現可能に合否判定できない。実行コマンド、runner 条件、キャッシュ初期状態、試行回数、採用統計量を定義すること。
- NFR-02 は実 corpus の finding が0件の場合に偽陽性率の分母が0となり、合否が未定義である。0件時の扱いと TP／FP 分類証跡の必須 schema・承認主体を明記すること。
- NFR-07 の patch coverage、project coverage -0.02pp、semantic registry 条件は、指定された intent-statement、scope-document、team-practices の明示的な合否境界へ追跡できず、新たな blocking scope に見える。権威ある上流根拠へ追跡可能にするか、本 intent の合否から除外すること。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T02:52:44Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の大半は具体化されたが、検出カタログ、baseline 確定順序、NSD001 判定、診断 schema に実装・検証を一意化できない残存不整合がある。

### Findings

- FR-03 は初期カタログを「少なくとも」として census 後の裁定へ残しており、iteration 1 が要求した閉じた検出集合になっていない。さらに brownfield 証跡では `setCheckbox`／`setStageSuffix` は bare `String.replace` の文字列返却なのに、FR-03 は修正前の #1874 を Result 破棄の `NSD002` と対応付けており、`B_pre - B0` に含める修正前 finding を再現できない。
- scope-document は In Scope で #1878／#1874 修正後に残存 TP を baseline 登録すると定める一方、依存シーケンスでは修正前に「初期ベースラインと免除台帳を確定」し、S-06 も baseline 件数の修正前後比較を要求したままである。requirements.md の evidence-only `B_pre` と post-fix `B0` はこの承認済み上流矛盾を一方的に解釈しただけで、iteration 1 の確定時点統一は未解消である。
- FR-02 はログのみ catch から除外する「明示的 best-effort 契約」の構文または機械判定条件を定義しておらず、FR-08 では `NSD001` を exemption 不可としているため、開発者も QA も許容 catch と違反 catch の境界を一意に実装・fixture 化できない。
- FR-09 の schema は基本形に `message` を含めない一方で全結果に `message` を必須とし、`code` がトップレベルの単一値なのか finding ごとの診断コードなのか、複数違反時に何を返すのかも未定義である。status 別の閉じた discriminated schema と診断コード一覧がなく、CLI 契約を機械検証できない。

## Revision 1 — Request Changes Resolution

2026-08-02T02:57:06Z の人間による Request Changes を受け、Iteration 2 の残存4 finding を次のとおり解消した。reviewer 上限2回には到達済みであるため、本節は新しい reviewer verdict ではなく、再承認 gate における変更証跡である。

- FR-03 の初回 `NSD002` 違反確定カタログを `applyTransition(...): StateResult` の1項目で閉じ、#1874 を bare `String.replace` 由来の `NSD003` へ訂正した。
- Q7 の人間裁定に基づき `scope-document.md` を補正し、修正前 `B_pre` は candidate evidence、修正後 `B0` は初回 committed baseline、S-06 は identity 集合差分と統一した。
- FR-02 の許可 terminal action を3形態に閉じ、best-effort を `kind: "best-effort-skipped"` と非空 reason の直接 return に限定した。log／emit だけの catch は免除不能な違反とした。
- FR-09 を `Pass | Violations | Error` の閉じた schema とし、top-level code、finding code、infrastructure code、複数違反、nullability、exit code を一意に定義した。
