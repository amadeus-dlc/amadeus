# NFR Design Questions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1〜P-3)、`../nfr-requirements/security-requirements.md`(S-1〜S-5)、`../nfr-requirements/scalability-requirements.md`(N/A 判定)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-4)、`../nfr-requirements/tech-stack-decisions.md`(既存踏襲)、`../functional-design/business-logic-model.md`(ワークフロー・決定木)。2026-07-17。

## 選挙不要判定(E-OC1 — 判定申告→leader 承認→記入の3段)

**判定**: 全4問 選挙不要(既決導出)。根拠種別(1問1行):

- DQ-1: 上流既決 — performance-requirements P-1〜P-3 が構造契約のみ(数値 SLO なし)と確定済み — キャッシュ・プーリング・async 最適化の設計対象が存在しない(単発 spawn の線形構造)
- DQ-2: 上流既決 — security-requirements S-1〜S-5 で入力検証(fail-closed)・注入面不存在・認証認可 N/A が確定済み — 設計はその配置(reconstruct 境界)の明文化のみ
- DQ-3: 上流既決 — reliability-requirements RL-1〜RL-4 で resilience は「stderr 記録+継続・fail-closed・構造的縮退」と確定済み — circuit breaker・リトライ・ヘルスチェックは対象実体なし(単発処理でリトライは二重実行リスクのみ増)
- DQ-4: 上流既決 — logical-components は components.md C1〜C5+ADR-1 配置の再表現(新規コンポーネント導入なし)。障害ドメイン = 「plugin プロセス空間 vs core hooks サブプロセス vs opencode 本体」の3分離は services.md/ADR-3 既決

**leader 承認**: 2026-07-17T00:35:14Z(agmsg、leader → e3「E-OC1 承認 — nfr-design(1049/U1)」— 全4問既決導出の判定を承認。申告送信は 00:34Z 頃、agmsg-git-evidence-split 準拠)

## 質問

### DQ-1: 性能設計(キャッシュ・async・リソースプーリング)の要否

- 推奨: 導入しない — P-1〜P-3 は構造契約のみで最適化対象の数値目標が存在しない。ToolNameMap は frozen リテラル(ロード時1回構築)でキャッシュ概念自体が不要。YAGNI
- [Answer]: 導入しない — 最適化対象なし(P-1〜P-3 構造契約のみ・frozen リテラル・YAGNI)(既決導出、E-OC1 承認 00:35:14Z)

### DQ-2: セキュリティ設計の配置

- 推奨: 検証は reconstruct 境界に集約(parse-don't-validate)— payload 検証・語彙判定を純関数内で完結し、spawn 層には検証済み値のみ渡す。暗号化・security headers・コンプライアンス統制は対象実体なし(S-4/S-5 の N/A 踏襲)
- [Answer]: reconstruct 境界に検証を集約(parse-don't-validate)— spawn 層へは検証済み値のみ。暗号化・headers・統制は N/A 踏襲(既決導出、同上)

### DQ-3: 信頼性設計(リトライ・circuit breaker・ヘルスチェック)の要否

- 推奨: 導入しない — RL-1〜RL-4 の「記録+継続・fail-closed・構造的縮退」で完結。リトライは advisory な単発イベントに二重実行リスク(audit 二重 emit)のみ持ち込む。circuit breaker・ヘルスチェックは常駐サービス不在につき対象なし
- [Answer]: 導入しない — RL-1〜RL-4 で完結。リトライは audit 二重 emit リスクのみ増、breaker・ヘルスチェックは常駐実体なし(既決導出、同上)

### DQ-4: 論理コンポーネントと障害ドメイン

- 推奨: C1(entrypoint)/C2(lib)/C3(表)/C4(テスト)/C5(manifest+docs)の既決構成を踏襲し、障害ドメインを3分離で明文化: (i) opencode 本体(plugin 例外の影響を受けない — R-1) (ii) plugin プロセス空間(全損時は hooks なし運用へ縮退 — RL-4) (iii) core hooks サブプロセス(非0 exit は伝播しない)。共有リソースは audit シャード(core hooks 側所有・本 unit 変更面外)のみ
- [Answer]: C1〜C5 既決構成踏襲+障害ドメイン3分離(opencode 本体/plugin 空間/core hooks サブプロセス)を明文化。共有リソースは audit シャードのみ(core hooks 側所有・変更面外)(既決導出、同上)
