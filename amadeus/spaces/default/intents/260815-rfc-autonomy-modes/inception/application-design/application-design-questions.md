# Application Design — Questions(intent 260815-rfc-autonomy-modes)

> 承認: 2026-08-15T15:57:45Z — 選挙 **E-260815-RFC0001-DESIGN**(fresh 2 voter・blind、run-1、state: recorded、result digest `sha256:06c4a671…c79d77`)。requirements Constraints の設計裁定 11 問を 1 定義・11 question で裁定し、**全問 2-0 established**(GoA 全票 favor 1〜3、abstain 0)。留保矛盾の定型チェック(tally 直後): 両票の留保はすべて同一実装形への加算的制約で**矛盾なし** — runoff 不要。留保は実装契約の一部として decisions.md の各 ADR に拘束条件として転記済み。
> ステージ定型質問(component boundary / 通信様式 / データ所有 / 統合方式)は、この 11 裁定と RFC bound-surfaces から一意に導出されるため独立質問として発問しない(既決事項の再質問回避)。

## 裁定一覧(選挙 record が正本 — `amadeus/spaces/default/elections/260815-e-260815-rfc0001-design/`)

| Q | 裁定 | 要旨 |
|---|---|---|
| Q2 | **B**(2-0) | ゲートは決定的承認のまま。ただし留保により RecommendationOutcome を実配線で返す(常に unique(approve) 固定、red は既存 fail-closed) |
| Q4 | **A**(2-0) | semi grant-less 維持 + 新効果分類 `advisory-deferral` の最小拡張(plugin advisories 宣言由来のみ、blocking 系へ不適用) |
| Q5 | **B**(2-0) | 完了境界に auto-decision 要約レポート(AUTO_DECIDED 監査からの機械生成のみ・非 blocking) |
| Q7 | **B**(2-0) | #1241 の一級 waiting 状態を park と別に新設(engine 発行専用・contested ペイロード格納・park の HUMAN_TURN 会計は無改変) |
| Q8 | **B**(2-0) | 事由の構造化束縛 + レート制約(鍵 = occurrenceId + basis fingerprint、超過はエスカレーション、自動続行分岐なし) |
| Q10 | **B**(2-0) | surface 出力 digest を 0 件確定の唯一根拠に。conductor 追加は「増やす」方向のみ・disk 再導出可能・監査記録 |
| Q11 | **A**(2-0) | Stop hook は対話性で分岐(FR-2 と同一ソースの実効判定、transcript 分類は補助、判定不能は非対話へ fail-closed) |
| Q14 | **A**(2-0) | REPAIR_STALLED と waiting は分離(3 終端の遷移表を pin、resume 入口は 1 つで型 dispatch、REPAIR resume は是正証跡要求) |
| Q15 | **B**(2-0) | grant ceremony 2 段維持(preview 出力へ貼り付け可能な set-autonomy 完全形を印字、相互必須不変量の落ちる実証を追加) |
| Q18 | **A**(2-0) | consent 軸キー改名(`*.consent`)— trigger.mode 廃止と同一 PR、LEGACY_KEY_REPLACEMENTS 経路再利用、全面同期 |
| Q19 | **B**(2-0) | 受け入れは「機構起因クラス + 通常進行 fixture で contested 0 件」で固定。割合閾値なし、発火件数・クラスは metrics 観測項目化 |
