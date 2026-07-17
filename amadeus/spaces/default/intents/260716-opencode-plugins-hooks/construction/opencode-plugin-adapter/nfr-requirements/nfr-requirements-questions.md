# NFR Requirements Questions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー・決定木)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、codekb の `technology-stack.md`(brownfield 実測 — Bun/TypeScript/ESM)。2026-07-17。

## 選挙不要判定(E-OC1 — 判定申告→leader 承認→記入の3段)

**判定**: 全5問 選挙不要(既決導出)。根拠種別(1問1行):

- NQ-1: ノルム既決 — observability-setup:c3(timeout は SLO でない)+constants-from-code(実在しない数値帯を発明しない)。plugin は advisory イベントハンドラで利用者向け service/SLI が不存在 — 性能目標は「opencode をブロックしない」構造契約(R-1)のみで、数値 SLO は根拠付き N/A
- NQ-2: 上流既決 — business-rules R-3(payload 欠落 fail-closed)・R-2(未実測語彙不登録)+構造事実(spawn 対象は frozen map の固定 hook ファイル名のみ — payload がコマンドへ流入しない)。credentials/秘密情報の取り扱いなし(構成上不存在)
- NQ-3: 上流既決 — services.md「単発イベント処理・永続化なし・デーモンなし」につきスケーラビリティは根拠付き N/A(ローカル開発ツール、負荷成長の主体なし)
- NQ-4: 上流既決 — AC-2c/ADR-3(advisory 徹底)+R-8(サイレント失敗禁止)で信頼性契約は確定済み — 可用性 SLA/バックアップは対象実体なし(environment-provisioning:c3 の N/A 様式)
- NQ-5: ノルム既決 — project.md Tech Stack(Bun/TypeScript/ESM/Biome/tsc)+Forbidden「runtime dependency を文書化なしに追加しない」。新規依存ゼロ(@opencode-ai/plugin は型参照のみの devDependency 追加可否が唯一の分岐 — ADR-2 の工程0 実測に従属し、型は手書き最小 interface でも充足可)

**leader 承認**: 2026-07-17T00:27:22Z(agmsg、leader → e3「E-OC1 承認 — nfr-requirements(1049/U1)」— 全5問既決導出の判定を承認。申告送信は 00:26Z 頃、agmsg-git-evidence-split 準拠で agmsg 出典を明示)

## 質問

### NQ-1: 性能目標(応答時間・スループット)の設定

- 推奨: 数値 SLO は設けない(根拠付き N/A)— plugin は advisory・単発イベント処理で利用者向け SLI が不存在。性能契約は「opencode の動作をブロックしない」(R-1)の構造充足のみ。実在しない数値帯の発明は constants-from-code 違反
- [Answer]: 数値 SLO なし(根拠付き N/A)— 性能契約は R-1 の構造充足のみ、数値帯の発明はしない(既決導出、E-OC1 承認 00:27:22Z)

### NQ-2: セキュリティ要件の範囲

- 推奨: (i) 境界入力検証 = payload 欠落 fail-closed(R-3)・未登録語彙 reject(R-2) (ii) コマンド注入面なし — spawn 対象は frozen map の固定 hook ファイル名のみで payload 由来文字列をコマンドに流さない (iii) credentials/秘密情報なし(ハードコード禁止は構成上自明) (iv) 新規コンプライアンス要件なし
- [Answer]: 推奨どおり (i)〜(iv) — R-3 fail-closed / R-2 reject / 注入面なし(frozen map 固定 hook 名)/ credentials・新規コンプライアンスなし(既決導出、同上)

### NQ-3: スケーラビリティ要件

- 推奨: 根拠付き N/A — ローカル開発ツールの単発イベント処理(永続化・デーモン・同時多重負荷の主体なし、services.md)。容量計画・スケーリング戦略の対象実体が存在しない
- [Answer]: 根拠付き N/A — 単発イベント処理・永続化なし・負荷成長主体なし(既決導出、同上)

### NQ-4: 信頼性要件(可用性・障害許容)

- 推奨: 可用性 SLA/SLO・バックアップ/DR は対象実体なし(N/A — サービス・永続データなし)。障害許容は既決契約で充足: 全失敗経路 stderr 記録+継続(R-8)、fail-closed(R-3/R-5)、opencode 非ブロック(R-1)— 「plugin 全損でも opencode と core hooks の正しさ不変」(C-2 保存)が最上位の信頼性契約
- [Answer]: SLA/DR は対象実体なし N/A。障害許容は R-1/R-3/R-5/R-8 の既決契約で充足 — plugin 全損でも正しさ不変(C-2 保存)が最上位契約(既決導出、同上)

### NQ-5: 技術スタック選定

- 推奨: 既存スタック踏襲のみ — TypeScript/ESM(Bun 実行、opencode plugin は JS/TS module 形式 C-5)、lint=Biome・型=tsc(既存 CI 面)、テスト=既存 bun ランナー4層。新規 runtime dependency ゼロ(Forbidden 遵守)。@opencode-ai/plugin の型は工程0 実測に従属して (a) devDependency 追加 または (b) 手書き最小 interface のどちらかを実装時判断(いずれも runtime 依存なし — pre-approved 分岐)
- [Answer]: 既存スタック踏襲・新規 runtime 依存ゼロ。@opencode-ai/plugin 型は (a) devDependency (b) 手書き最小 interface の pre-approved 分岐(工程0 実測従属・いずれも runtime 依存なし)(既決導出、同上)
