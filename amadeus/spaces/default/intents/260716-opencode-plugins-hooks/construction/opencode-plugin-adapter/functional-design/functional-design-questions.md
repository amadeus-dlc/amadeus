# Functional Design Questions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR→U1 全数)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、`../../../inception/application-design/components.md`(C1〜C5)、`../../../inception/application-design/component-methods.md`(reconstruct/toolNameFor/runPlugin 契約)、`../../../inception/application-design/services.md`(新規サービスなし・spawn 境界 advisory)。2026-07-17。

## 選挙不要判定(E-OC1 — 判定申告→leader 承認→記入の3段)

**判定**: 全5問 選挙不要(既決導出)。根拠種別(1問1行):

- FDQ-1: 上流既決 — component-methods.md の公開シグネチャ(reconstruct/toolNameFor/runPlugin)+AC-2a「cursor-lib reconstruct 同型」で戻り値様式は cursor 既習様式に固定済み(citation-semantics-check は AD レビュー済)
- FDQ-2: 上流既決 — ADR-2 で配線集合は工程0 in-tree 再実測の通過分のみ・候補優先順も確定済み(CoreCall の具体値は ⚠ 実装時確定 — 本ステージで先取りしない)
- FDQ-3: 上流既決 — ADR-5 で mint 経路は chat.message 単経路+fail-closed(判別不能なら見送り・delegate 運用維持)が裁定済み
- FDQ-4: 上流既決 — component-methods.md でエッジ(payload 欠落 → error、未登録語彙 → advisory reject)の契約確定済み、テスト2系は AC-3a 既決
- FDQ-5: 上流既決 — services.md「新規サービスなし」+ U1 に UI なし(CLI/plugin のみ)につき frontend-components は該当なし根拠の明記で充足(CONDITIONAL 成果物)

**leader 承認**: 2026-07-17T00:11:22Z(agmsg、leader → e3「E-OC1 承認 — functional-design(1049/U1)」— 全5問既決導出の判定を承認。申告送信は 00:09Z 頃、agmsg-git-evidence-split 準拠で agmsg 出典を明示)

## 質問

### FDQ-1: reconstruct の戻り値様式(Result 表現)

- 推奨: cursor-lib `reconstruct` 同型(`Reconstruction | { error: string }`)を維持 — AC-2a の「同型」契約に従い新様式を発明しない。project.md の判別ユニオン Result 原則は「error フィールド有無で判別可能なユニオン」として充足
- [Answer]: cursor-lib reconstruct 同型(Reconstruction | { error: string })を維持 — AC-2a 同型契約に従い新様式を発明しない(既決導出、E-OC1 承認 00:11:22Z)

### FDQ-2: 配線イベント集合と CoreCall 構造の確定時期

- 推奨: 本ステージでは確定しない — ADR-2 どおり工程0(C3)の in-tree 再実測通過分のみを実装対象とし、設計は「候補優先順+3値表様式」の枠組みまでを固定(⚠ 行の確定条件は実装時実測)
- [Answer]: 本ステージでは確定しない — ADR-2 どおり工程0 通過分のみ実装対象、⚠ 行の確定条件は実装時実測(既決導出、同上)

### FDQ-3: machine 注入マーカー判定の所在

- 推奨: ランタイム判定ではなく工程0 の設計判断で充足(ADR-5・component-methods 注記どおり)— 判別不能なら mint 配線自体を見送り(fail-closed)、reconstruct に「マーカー検査分岐」を実装しない
- [Answer]: 工程0 の設計判断で充足(ADR-5)— reconstruct にマーカー検査のランタイム分岐を実装しない、判別不能なら mint 配線見送り(fail-closed)(既決導出、同上)

### FDQ-4: エラー処理・エッジケースの分類

- 推奨: (i) payload 欠落フィールド → `{ error }`(fail-closed・呼び出し元で stderr 記録) (ii) 未登録 tool 語彙 → advisory reject(undefined 返却で配線せず) (iii) spawn 失敗・hook 非0 exit → stderr 記録+継続(advisory、opencode をブロックしない)。いずれも既決契約の転記
- [Answer]: (i) payload 欠落 → { error } fail-closed (ii) 未登録語彙 → advisory reject (iii) spawn 失敗・非0 exit → stderr 記録+継続。既決契約の転記(既決導出、同上)

### FDQ-5: frontend-components の扱い

- 推奨: 該当なし — U1 に UI なし(opencode プロセス内イベントハンドラ+subprocess spawn のみ)。frontend-components.md は該当なし根拠を明記した最小成果物として生成(CONDITIONAL 宣言の充足様式)
- [Answer]: 該当なし — U1 に UI なし。frontend-components.md は該当なし根拠を明記した最小成果物として生成(既決導出、同上)
