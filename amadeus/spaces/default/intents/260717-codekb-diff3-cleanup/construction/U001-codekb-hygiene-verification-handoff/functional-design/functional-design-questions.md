# Functional Design Questions — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 質問不要判定

質問は0件。2026-07-17T20:23:01Z、leaderがstanding grant `de2842f3` に基づき質問不要判定を承認した。

- Business logic workflowは、明示ref解決、4 marker語彙の全数走査、最新／履歴H2件数、fix commit祖先性の独立検査、pre-landing handoff、landed main再計測、close eligibilityの順で既決である。
- Domain modelはversion-controlled evidenceの値と状態を表すだけで、新規application entity、schema、database、serviceを導入しない。
- Validationとerror handlingは、測定ref不明、件数不一致、CI / review / sensor / gate証拠不足をすべてfail-closedで停止する既決条件に従う。
- Data flowはgit refとMarkdown本文から件数・verdict・provenanceを導出する一方向の証拠変換であり、外部APIやunit間連携を追加しない。
- UI / frontendはunit scopeに存在しないため、`frontend-components.md` は生成しない。
- Happy path、marker残存、H2不一致、fix commit非祖先、pre-landing証拠不足、main未着地、post-landing再検証失敗は上流成果物で挙動が確定している。

## Ambiguity Analysis

曖昧回答、回答間矛盾、artifact生成に必要な欠落事項は0件。未実施のmain着地とIssue closeは設計上の未決事項ではなく、human / leader所有の後続操作として確定している。本conductorはPR操作、main merge、Issue closeを行わない。

## Decision Provenance

| 項目 | 決定 | 根拠 |
|---|---|---|
| 質問数 | 0 | leader承認 2026-07-17T20:23:01Z、standing grant `de2842f3` |
| Functional design対象 | 既決verification contractの文書化のみ | `requirements.md` FR-1〜FR-5、`component-methods.md` Verification Operation Contracts |
| 新規runtime surface | なし | `components.md` Design Boundary、`services.md` Service Definitions |
| Frontend artifact | 非生成 | UI / frontend componentがunit scopeに存在しない |
