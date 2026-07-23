# Business Rules — U2-mirror-skill(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## BR-U2-1: ロジック非保持(FR-3 (b))

SKILL 本文が実行するコマンドは `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts <verb>` のみ。gh 直呼び・state 書込・判定ロジックを SKILL 本文に置かない(受け入れ基準の grep 対象)。

## BR-U2-2: 入口は status(FR-3 (c))

Step 1 は必ず status 実行。exit code で分岐案内: 0(clean)→「乖離なし」報告のみ / 1(diverged)→ findings 種別に応じ create(mirror-missing)/ sync(stale・drifted)を案内 / 2(precondition)→ 理由(gh 不在等)と復旧手順を提示。

## BR-U2-3: 実行は人間の指示を得てから(C-05 の SKILL 面)

create/sync/close の実行は診断提示後に人間の選択を得てから行う — SKILL が auto 実行しない(auto は C4 の print 指令経路のみ、かつ sync 限定)。

## BR-U2-4: 運用注記(ADR-5 留保3件の SKILL 本文面)

「create/close は conductor から実行する(**機械強制なし** — 運用合意)」を本文に明記。強制を装う文言(『拒否される』等)禁止。ノルム本文は複製せず team.md の運用合意への参照とする。

## BR-U2-5: close の案内条件(ADR-3、状態機械の確定 — reviewer i1 Major-2 の是正)

close 案内の判定は **stale-status-line finding の内部分岐**として評価する: status の stdout は各 finding の detail に record 側状態(state の Status)を含める(U1 の StatusFinding.detail 契約の範囲 — 新 kind は追加しない)。Step 2 で stale-status-line が提示され、その detail の record 状態が Completed のとき → **close を提案**(sync でなく。close-after-landing 検証がツール側 fail-closed でかかる旨を注記)。record 状態が Completed 以外 → sync を提案。complete かつ乖離なし(exit 0)のケースは Issue も close 済みであることを意味し(close 済み=状態行一致)、案内不要。phase 境界 ask(C4)経路に close は現れない — SKILL/手動が唯一の close 導線。

## BR-U2-6: docs mirror 節の新設(ADR-5 [e6] 留保の担当割当 — reviewer i1 Major-1 の是正)

ADR-5 統合解釈の3配置のうち docs mirror 節は **U2 の担当**とする(現行 docs/ に mirror 節は未存在 — grep 0 件を実測、新設)。docs/guide 配下へミラー運用の節(SKILL の使い方+運用注記)を追加し、注記は BR-U2-4 と同一3条件(機械強制なし明記・強制装い文言禁止・ノルム参照)。対訳ファイル(.md/.ja.md)の同期を含む(docs-language-ownership)。具体ファイルは実装時に既存 docs 構成へ最小追加で選定。
