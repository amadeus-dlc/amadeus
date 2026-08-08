# Decisions(ADR)— autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR/NFR/Constraints を各 ADR の Context に接地)、architecture.md / component-inventory.md(既存設計の現在断面 — 患部詳細は re-scan record 正本)。

## ADR-1: birth 同時宣言は「birth directive への搬送+intent-birth 内適用」で実現する

- **Context**: FR-1(ユーザー裁定「birth 同時受理」)。現行は judgment 0(`amadeus-orchestrate.ts:1290-1294`)が birth 前に発火し宣言が必ず失敗する。配置根拠コメント(`:2943-2946`)は「宣言を routing move に相乗りさせない」意図
- **Options**:
  - **Option A — 宣言を birth print directive に搬送し、intent-birth(amadeus-utility.ts)が state 生成直後に C2 canonical 関数で適用**: pros = 適用点が state 生成と同一ツール内で原子的に近い/engine がルーティングを所有し conductor 判断を挟まない/provenance は宣言打鍵の HUMAN_TURN を使える。cons = intent-birth の引数契約が広がる。可逆性 = 中(実装変更自体は引数追加で容易だが、着地後は公開 CLI 契約として利用者・docs・パリティテストが依存するため撤回コストが乗る — 可逆性まとめと同値)
  - **Option B — judgment 0 に birth-latch(宣言を機械ローカルへ保留し、birth 後の次回 next で消化)**: pros = intent-birth 無改変。cons = 保留ファイルという新しい機械ローカル状態(clone 間非共有・回収漏れの新面)/宣言と適用の間に別ターンが挟まり provenance が weaken。可逆性 = 中
- **Decision**: **Option A**。「宣言が routing move に相乗りしない」という既存原則は、birth が routing でなく workflow の創出である点で適用外と整理する(コメント :2943-2946 の改訂を FR-1d が明示要求)
- **Consequences**: intent-birth に `--autonomy` が生え、full は preview 指示の print を返す(fail-closed)。t450×2 のピン改訂(FR-1c)
- **Alternatives Rejected**: Option B(新規機械ローカル状態の導入は NFR-2 の趣旨=負債忌避に反する)。セキュリティ/コンプライアンス影響: provenance 検証は既存のまま(フラグ自体は provenance にならない — 緩和なし)

## ADR-2: 拒否可視化イベントは新設1種 `INTENT_AUTONOMY_HUMAN_REQUIRED` とする(名称は audit-format 命名規約に従い functional-design で最終確定)

- **Context**: FR-2a。`SCOPE_OUT`/`MODE_REQUIRES_HUMAN` は production 消費点ゼロ(finding 2)
- **Options**: (A) 新設1種+reason 属性 / (B) 既存 `INTENT_AUTONOMY_TRANSACTION_COMMITTED` へ拒否も混載
- **Decision**: **A**。transaction イベントは「成立した変更」の replay 正本であり、拒否(非変更)を混ぜると replay 意味論を汚す
- **Consequences**: `amadeus-audit.ts` 登録+`otel/event-registry.ts` mapping+audit-format docs の同期(NFR-4)。emit 失敗は fail-open(stderr 警告)— 可観測性の欠落で workflow を止めない
- **Alternatives Rejected**: B(replay 対象イベントへの非遷移混載)。セキュリティ影響: 属性は kind/stage/reason のみ — 機微情報なし(export 境界の redaction 対象外語彙)

## ADR-3: state 3フィールドの書込は `applyProductionAutonomyMode` が単独所有する

- **Context**: FR-2c。現状 `amadeus-bolt.ts:1075-1081` のみが書き、C13 経由は不更新(finding 5)— Stop hook carve-out が開かない(finding 6)
- **Options**: (A) canonical 関数へ書込を引き上げ、bolt 側は呼出しへ縮約 / (B) C13 側にも同じ書込を複製
- **Decision**: **A**(canonical 1定義 — cid:code-generation:c1-drift-canonical-renderer と同型)
- **Consequences**: audit 先行・state 追従の順序と失敗時挙動(audit 成立済みで state 書込失敗 → 再実行で state へ収束)は cid:functional-design:audit-batch-before-state-atomicity に従い functional-design で failure injection まで固定
- **Alternatives Rejected**: B(書込2箇所は乖離の再生産 — 本 intent が是正しようとしている形そのもの)

## ADR-4: QUESTION_ANSWERED の経路判別は属性追加で行う(イベント新設しない)

- **Context**: FR-3a/3b。全質問の通過点は `amadeus-log.ts:180-187` の1点
- **Options**: (A) 既存イベントへ `Resolution Route` + optional `Decision Id` 属性 / (B) ladder 用の別イベント新設
- **Decision**: **A**。通過点が1点なので属性で判別可能。集計は `Resolution Route` の group-by で足りる
- **Consequences**: schemaVersion は不変(属性追加は後方互換)。検出は after-the-fact 集計(FR-3c — 拒否しない)
- **Alternatives Rejected**: B(同一事象2イベント化は計測述語を分裂させる — FR-4a の教訓)

## ADR-5: 導線パリティは単一テストで全面を検査する(count-free)

- **Context**: FR-5d。`--autonomy` の導線が全面ゼロだった実測(finding 8)
- **Options**: (A) 1テストが面集合を discover して全数検査 / (B) 面ごとに個別テスト
- **Decision**: **A**。面集合は `packages/framework/harness/*/skills/amadeus/SKILL.md` + `*/commands/amadeus.md` の glob で discover し、固定件数を書かない(cid:code-generation:count-comment-sync-on-catalog-change)
- **Consequences**: ハーネス追加時に自動で検査対象が広がる。落ちる実証は1面からの語彙除去で赤を実測
- **Alternatives Rejected**: B(件数・列挙の手書き複製は phases/construction.md の canonical 原則違反)

## 可逆性まとめ

ADR-1(中 — CLI 契約)/ ADR-2(高 — イベント追加)/ ADR-3(高 — 内部再配置)/ ADR-4(高 — 属性追加)/ ADR-5(高 — テスト)。ロックインはない。
