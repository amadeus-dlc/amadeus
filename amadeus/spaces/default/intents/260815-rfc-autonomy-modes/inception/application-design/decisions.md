# Decisions(ADR)— intent 260815-rfc-autonomy-modes

> 各 ADR の Decision は選挙 E-260815-RFC0001-DESIGN(2-0 established ×11、record: `amadeus/spaces/default/elections/260815-e-260815-rfc0001-design/`)またはユーザー裁定(Q6/Q9)が正本。**両票の留保は拘束条件**として Decision に併記する(留保 = 実装契約の一部)。Alternatives Rejected は選挙の非採用 choice。

## ADR-1: 裁定の統一表現と適用範囲(Q1=A 既決 + Q2=B)

- **Context**: 全裁定点へ裁定順序を課すには非一意の表現が要る。ゲートに選択肢を持たせるかは未裁定だった。
- **Decision**: RecommendationOutcome(unique/contested/none)を C1 に新設し梯子全段へ実配線。ゲートは決定的承認のまま(Q2=B)だが、導出器は型を実配線で返し常に unique(approve) — 「選択肢がない」ことを型で表現。red(blocking sensor / NORM_CONFLICT)は既存 fail-closed のまま導出器の contested で表現しない。semi の phase-boundary/WS は裁定順序 1(人間専権)で表現。
- **Consequences**: FR-4「すべての裁定点が裁定順序に従う」を例外規定なしで構成的に満たす。ゲートの将来的な contested 化は型の互換変更のみで可能(可逆性: 高)。
- **Alternatives Rejected**: Q2-A(ゲートを contested 可能に)— ゲートの red は選択でなく前提未成立であり、fail-closed 経路と裁定経路の二重化は D2 類の混在を再生産する(両票の趣旨)。

## ADR-2: semi の効果上限と grant-less 維持(Q4=A)

- **Decision**: semi は grant-less のまま、効果分類へ `advisory-deferral` を新設して認可上限を最小拡張。対象は plugin.json advisories 宣言由来の defer-with-risk **のみ**(構築点で限定)。blocking sensor verdict・ノルム・カバレッジ系の延期には決して適用しない。落ちる実証 2 本(advisory 自動裁定 Green / blocking 系拒否 Red)を必須とする(留保)。
- **Consequences**: FR-15 の効果天井は quality-waiver の一般開放なしで保存。advisory 延期は risk 記録つき再提起可能を不変条件に。
- **Alternatives Rejected**: B(semi へ grant 導入)— HUMAN_TURN 造幣の追加往復が semi の「軽さ」を壊し、実測 172 件クラスの解消目的と逆行。C(quality-waiver のまま個別追加)— 分類の意味論(禁止 5 種)を崩し検査可能性が下がる。

## ADR-3: full の事後検収(Q5=B)

- **Decision**: 完了境界に auto-decision 要約レポートを新設。AUTO_DECIDED 監査レコード + 既存 `list-auto-decisions`(amadeus-bolt.ts — dispatch 登録 :1334、本起草時実測)からの**機械生成のみ**(LLM 計数・散文の混入禁止 — P2)。非 blocking(生成失敗は警告、完了は妨げない)。
- **Alternatives Rejected**: A(新設なし)— 監査列は存在するが「検収点」としての可読提示を欠き、full の説明可能性が下がる。

## ADR-4: 非対話中断の状態設計(Q7=B + Q8=B + Q14=A)

- **Decision**: #1241 の一級 **waiting** 状態を park と別に新設。engine 発行専用(CLI verb なし)。admission は事由オブジェクト(occurrenceId・candidates・derivation transcript・basis fingerprint)へ束縛し、レート制約の鍵 = occurrenceId + basisFingerprint(根拠が実質変化した再到達は正当)。超過はエスカレーションのみ(自動続行分岐なし)。REPAIR_STALLED とは状態・監査イベント・resume 経路を分離し、resume 入口は単一で記録種別により型 dispatch、REPAIR resume は是正証跡必須。park の HUMAN_TURN 会計(1 turn = 1 park)は無改変。park guard(state.ts:1599)は廃棄(FR-3)。3 終端(park/waiting/REPAIR_STALLED)の遷移表をテストで pin。
- **Consequences**: 「止まりたいのに止まれない」(D5)と「full だけ park を失う」(D1)を同時解消。自己 park 脅威(#365/#3016)は構造束縛+レート+監査で遮断。
- **Alternatives Rejected**: Q7-A(park 拡張)— park の人間都合意味論と混ざり誤 resume クラスを生む。Q8-A(束縛のみ)— 反復中断の検知がなく作業回避の余地が残る。Q14-B(統合)— 欠陥終端と健全待ちの混同を型で防げない。

## ADR-5: Stop hook の対話性分岐(Q11=A)

- **Decision**: Stop hook は C3 の実効判定(HUMAN_TURN 造幣パイプライン由来・全消費者と同一ソース)で分岐。対話セッションでは裁定順序 3 到達時(contested/専権)の質問提示・compose 保留でターン返却を許可。非対話は継続強制を維持し waiting へ。transcriptIsConversational(amadeus-stop.ts:569)は補助信号のまま、セッション判定を上書きしない。判定不能は非対話へ fail-closed。carveout 判定は RecommendationOutcome の終端種別に束縛。
- **Alternatives Rejected**: B(mode で全面解除)— 非対話 full の暴走待ち(誰も答えない質問での無限ターン返却)を作り、D10 の「full=無人」同一視を逆向きに再生産。

## ADR-6: §13 の 0 件機械化(Q10=B)

- **Decision**: 0 件確定の唯一根拠は `amadeus-learnings surface` 出力(digest 束縛・監査記録)。0 件時は選定裁定を発火しない。conductor 追加候補は「増やす」方向のみ許可し、disk 上の記録から再導出可能であることを要件に、追加集合も監査へ記録。散文申告は根拠にしない。
- **Alternatives Rejected**: A(surface のみ)— conductor が観測した diary 外の学び(本セッションの実例多数)を落とす構造的欠落。

## ADR-7: grant ceremony(Q15=B)

- **Decision**: preview → set-autonomy の 2 段を維持。preview 出力を 1 画面へ整え、貼り付け可能な `set-autonomy` 完全形(digest 込み)を印字。相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証を本 intent で追加。
- **Alternatives Rejected**: A(1 verb 統合)— 自己確認 digest は「読まずに発効」を型で防げず、確認の実質が形骸化。

## ADR-8: 設定軸の分離と改名(Q17=A 既決 + Q18=A)

- **Decision**: `solo-election.trigger.mode` を廃止し mode 導出(none→manual 相当 / semi・full→auto 相当)。consent 軸 2 キーは `intent-mirror.github.issue.consent` / `finding.github.issue.creation.consent` へ改名(語彙 manual/auto 不変)。両方とも旧キーは LEGACY_KEY_REPLACEMENTS 経路(amadeus-config.ts:706-716)再利用の loud fail(新キー名をエラーへ明示・互換シムなし)。廃止と改名は**同一 PR**で、config registry(:585/:615)・docs・tests・投影を全面同期。同一 PR で全面同期できない事情が出た場合は Q18 を B へ差し戻す(留保 — 設計逸脱として選挙)。
- **Alternatives Rejected**: Q18-B(改名なし)— UI 真実性の契約下で「mode」語彙の二義性が恒久化する。

## ADR-9: contested 頻度予算の検証形(Q19=B)

- **Decision**: 受け入れテストは「機構起因クラス(付録 B の 172 件クラス = phase-gate/WS + 79 件クラス = §13 0 件確認)**および通常進行 fixture** で contested 発火 0 件」で固定。割合閾値は導入しない(fixture 構成で恣意化するため)。contested の発火件数・裁定点クラスは metrics スナップショットの観測項目へ追加し、実測レンジが溜まった後に次 intent が閾値を裁定(c1-threshold-inside-observed-range 準拠)。
- **Alternatives Rejected**: A(<10% を即固定)— 観測レンジ不在の閾値は全緑/全赤の外れ値検出不能クラス。

## ADR-10: マージ委任と WS ゲート(ユーザー裁定 Q6=A / Q9=A)

- **Decision**: マージ委任条件の正本は team.md 常任承認ノルム(必須 CI green ∧ converged:true)のみ。実装は委任実行記録の provenance 機械化(standing ruling 参照 + 実測値)に限定し、新設 config なし。定義者 = ユーザー直接裁定、失効 = ユーザー撤回宣言。WS ゲートは Skeleton Stance に従属(degrade 不発火・greenfield 無退行)。
- **Alternatives Rejected**: 新設 config キー(二重正本)/ 委任廃止(2026-08-15 裁定の巻き戻し = 仕様変更)/ WS の scope 非参照維持(実測 66 件の機構起因停止を温存)。

## ADR-11: presence 封鎖・プロセス系 FR の設計上の位置(FR-12 / FR-13 / FR-14)

- **Context**: FR-12(D7/D8)はコード改修だが選挙質問を要さない(RFC が是正内容を一意に規定 — 検証の追加と fail-open の封鎖であり複数妥当解がない)。FR-13(D6 調査)と FR-14(文書・ノルム同梱)はプロセス成果物。
- **Decision**: FR-12 は C13 として設計に一級で載せる(approve-batch の presence 検証 = 未消費 HUMAN_TURN 要求、gate presence の ledger-不在 fail-closed 化。患部実測: amadeus-bolt.ts:1197-1260 / amadeus-lib.ts:3768〜 の fail-open 注記)。FR-13 は独立調査タスク(実装 Unit と並行可、欠陥なら別 Issue — 本 intent 内で修正しない)。FR-14 は最終段の文書 Unit(全裁定確定後)。C4 の basisFingerprint の算出法(自明摂動でレート制約を回避できない正規化 — 導出過程の正規形 digest)は code-generation への明示入力として申し送る。
- **Consequences**: 全 15 FR に設計上の所有者が存在する(C1〜C13 + プロセス 2 件)。
- **Alternatives Rejected**: FR-12 を C5 に吸収 — 責務が「mode 権限の再定義」と「既存人間ゲートの検証強化」で変更理由が異なり、意図ベースの重複排除に反する。
