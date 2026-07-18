# Design Decisions — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: 後退ガードは handleSetStatus 内に置く(E-SMF-AD Q1=A、2026-07-17T23:45:12Z 開票 3/3)

- **Context**: FR-1d は lock→read→compare→write の順序を必須とし、FR-1e はエンジン RMW 経路の不変を要求する。requirements Open Question 1(設置位置)が設計へ委任されていた。
- **Decision**: `handleSetStatus`(packages/framework/core/tools/amadeus-utility.ts:3666-3690)の本体を `withAuditLock`(amadeus-lib.ts:4266、utility へ import 済み :91)でラップし、ロック内で再 read した state に対し既存 `parseCheckboxes`(ADR-4)で対象 stage の checkbox を判定(`completed`/`awaiting-approval` → 後退)。後退なら書き込みゼロ+stderr advisory+exit 0(FR-1c)。
- **Consequences**: engine と同一ロックドメインに参加するため、ロック保持者間で TOCTOU が閉じる(裁定留保の充足)。setCheckbox は純変換のまま不変で、エンジンの正当な後退遷移(reject の `[R]` 化等)へ構造的に波及しない。hook 呼び出し元(sync-statusline)は無変更(NFR-1)。
- **Alternatives Rejected**: (B) setCheckbox 側 — 共有純変換に後退拒否モードを追加するとエンジン正当後退(reject/revise 等、呼び出し 10〜17 箇所実測 — 開票共通根拠)を巻き込み、呼び出し元全数の挙動再検証が必要。(C) 両方 — 責務重複と検証面の倍加。
- **セキュリティ/コンプライアンス**: 新規入力面・認証情報なし。ロック参加は既存機構の再利用で攻撃面の追加なし。audit 形式に触れない(T5/NFR-5)。

## ADR-2: 後退判定述語は「対象 stage の現 checkbox ∈ {x, ?}」の単一述語(E-OC1 選挙不要判定 — leader 承認 23:43:55Z)

- **Context**: FR-1a は (a) `[x]`/`[?]` → `[-]` の禁止と (b) Current Stage の完了済みステージへの変更禁止の2条件。
- **Decision**: set-status は Current Stage と checkbox を**同一の** `--stage` 引数から書くため、対象 stage の現 checkbox が `x` または `?` なら両条件が同時に成立する — 単一述語で被覆(FR-1a から機械導出)。
- **Consequences**: 判定が1回の read+1関数呼び出しで済み、ステージ順序表への依存を持たない(一般順序機構化 = Out of Scope に接近しない)。
- **Alternatives Rejected**: ステージ順序比較(順序表依存を増やし FR 契約を超える一般化)/ audit 再構成(E-SMF-RA Q2 裁定で state 現在値比較と確定済み — 蒸し返さない)。

## ADR-3: FR-3 修復は実装 PR と別の record チェックポイントコミット(E-SMF-AD Q2=A、同開票 3/3)

- **Context**: R4(feasibility raid-log)が実施単位を設計へ委任。
- **Decision**: `bun .claude/tools/amadeus-state.ts checkbox / set`(fail-closed 実装 #1057 済みの既存 CLI)で audit シャード実測値から復元し、record チェックポイントコミットとして本線へ流す。実装 PR には同梱しない。
- **Consequences**: 実装 PR は code+tests に閉じてレビュー面が明確。修復の検証(A-3 の 18/18 live 実測)は修復コミット後に C3 修正版で実測する順序制約を delivery-planning に引き継ぐ。
- **Alternatives Rejected**: (B) PR 同梱 — 着地は単一になるが record 差分が PR レビューを肥大させ、工程記録は checkpoint で流す team.md Way of Working 既決に反する。

## ADR-4: checkbox 読取は既存 parseCheckboxes の再利用(reviewer M-1 是正で旧案を撤回、2026-07-17)

- **Context**: ガードは対象 stage の現 checkbox 値を読む必要がある。旧案は「既存 lib には setCheckbox(書き側 :3785)しかない」を前提に readCheckboxState 新設としたが、この前提は reviewer の実測で誤り — **export 済みの読み側純関数 `parseCheckboxes(content): CheckboxLine[]`(amadeus-lib.ts:3750)が既存**し、`{slug, state, suffix}` を返す。
- **Decision**: 新設せず `parseCheckboxes(content).find(c => c.slug === stage)?.state` の既習イディオム(nextInScopeStage :5292 内の checkboxStates.find で実使用 — 旧記載「findNextExecuteStage :5322」は関数名誤引用、FD reviewer 実測で是正 2026-07-18)を再利用する。判定は `state ∈ {"completed", "awaiting-approval"}`。
- **Consequences**: 新規コード 0 行・新規 lcov 計測面 0(既計測モジュールの再利用)。「新規機構ゼロ」宣言と真に整合。意図ベースの重複排除(construction ガードレール)遵守。
- **Alternatives Rejected**: (旧案)readCheckboxState 新設 — 既存 parseCheckboxes と責務重複(Reuse Inventory 違反)。handleSetStatus 内 inline regex — parseCheckboxes の語彙と drift しうる。

## ADR-5: handleSetStatus の export+argv パラメータ化(reviewer M-2 是正、NFR-4 写像)

- **Context**: NFR-4 は「handleSetStatus の argv パラメータ化 export(seam-export-handler-amend 既習)」を明示要求。bun --coverage は spawn 子プロセスを計測しない(bun-coverage-spawn-blindspot)ため、C1 中核ロジック(lock→read→compare→write 分岐)の in-process 計測経路が必須。
- **Decision**: `export function handleSetStatus(projectDir, flags)` として export し、in-process unit テストで両側(後退抑止・前進非抑止)を直接駆動する。t145 様式の統合テスト(CLI 並列 spawn)は並行競合の実証に限定する。
- **Consequences**: push 前ローカル lcov で diff 追加行の未カバー 0(local-lcov-pre-push)が構造的に達成可能。
- **Alternatives Rejected**: C2 相当の純関数 export のみ — 「判定ロジックの exported 純関数化だけでは handler 内の呼び出し配線行が未カバーに残る」(seam-export-handler-amend が明示警告するパターン)。

## 横断確認

- 後方互換レイヤー・フォールバック分岐・移行シム: 導入なし(古い無ガード挙動は置き換えて削除 — Forbidden 遵守)。
- adapter・外部契約の先行着地: なし(実装+配線が同一 intent に揃う変更のみ — inception ガードレール N3)。
- 規模: 実装 33-45行+テスト 180-230行(components.md の機械合算、ADR-4 是正で C2 新設 0 化)。既存インフラ再利用のみで新規機構ゼロ(Reuse Inventory 参照)。
- NFR-3(Bun-only): 新規 runtime dependency の追加なし(reviewer m-1 の明示化)。
