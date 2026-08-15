# Business Logic Model — unit grant-ceremony

## 現状(reality-check)

- `handlePreviewAutonomy`(`amadeus-bolt.ts:1007-1017`)は `previewProductionAutonomyGrant` の結果(`AutonomyGrantPreview`: `intentUuid`/`principalId`/`scope`/`policies`/`displayDigest`/`nonAutoDecidedKinds` — `amadeus-intent-autonomy-production.ts:586-596`)を JSON のまま `console.log` するのみ。貼り付け可能なコマンド文字列の印字は現状ない。
- `handleSetAutonomy`(:1161-1195)は `--confirmed-display-digest` フラグを受け取り `applyProductionAutonomyMode` へ渡す。
- `prepareFullGrantCommand`(`amadeus-intent-autonomy-production.ts:608-636`)は `input.confirmedDisplayDigest !== expectedDisplayDigest` を **:617** で検査し、不一致(未指定の `undefined` を含む)なら `{ ok: false, error: "CONFIRMATION_REQUIRED" }` を返す。full モードの発行/差替(`issue-full`/`replace-full`)経路にのみ存在する。
- `prepareNonFullCommand`(:641-659、semi/none 用)には対応する検証が **一切ない** — `displayDigest` は内部計算されるのみで `input.confirmedDisplayDigest` と比較されない。これは `amadeus-intent-autonomy.ts:363-366`「semi holds no grant scope」というコメントが明言する既存設計(ADR-2 の「semi は grant-less のまま」と整合)であり、本 unit の対象外(Q3)。
- 既存テスト `tests/integration/t435-intent-autonomy-production.integration.test.ts:348-354` が全ゼロのダミー digest による `CONFIRMATION_REQUIRED` 拒否を pin 済み。`confirmedDisplayDigest` 省略(undefined)ケースの pin は grep 実測(同ファイル内 `CONFIRMATION_REQUIRED` 出現箇所を全て確認)の限りでは存在しない。

## 処理フロー

```
[印字改善(Q2)]
handlePreviewAutonomy(args, projectDir)
  ├─ (既存)previewProductionAutonomyGrant() → AutonomyGrantPreview
  ├─ (既存)console.log(JSON.stringify(result.preview))
  └─ [新規] console.log の直後に、貼り付け可能な文字列を追加出力:
       `bun {{HARNESS_DIR}}/tools/amadeus-bolt.ts set-autonomy --mode <mode> ` +
       `--confirmed-display-digest ${preview.displayDigest}` +
       (mode は preview 呼出時に渡された/推定されたモード。既存 JSON 構造は無改変)

[落ちる実証の対象(Q4)— 挙動不変・テスト追加のみ]
applyProductionAutonomyMode({ mode: "full", confirmedDisplayDigest: undefined, ... })
  └─ prepareFullGrantCommand() の :617 比較で undefined !== expectedDisplayDigest
        → { ok: false, error: "CONFIRMATION_REQUIRED" }(既存実装のまま、新規 pin テストのみ追加)
```

## 統合面

- 依存なし(unit-of-work-dependency.md: U11 blockedBy = 空)。`amadeus-bolt.ts` の `preview-autonomy` 区画のみを触り、U1/U6/U8 と同ファイル(直列化制約のみ、意味論的依存なし)。
- `handleGetAutoDecision`(`amadeus-bolt.ts:1111-1131`)の `reviewConfirmationDigest` パターン(プレビュー時に digest を計算し、確定コマンドへそのまま埋め込む様式)を印字文言の参考実装として踏襲する(新規機構は導入しない)。

## エラーパス(fail-closed semantics)

- 印字改善は表示のみの変更であり、`applyProductionAutonomyMode` の判定ロジックには一切触れない(挙動不変 — component-methods.md C12 注記)。
- 相互必須不変量(digest 不一致拒否・省略拒否)は full モードでのみ fail-closed(:617 の比較)。semi/none への拡張は本 unit のスコープ外(Q3 で確定)であり、無申告の拡張はしない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:56Z
- **Iteration:** 1
- **Scope decision:** none

grant-ceremony は reality-check(:617 の digest 比較が full 限定)に基づき ADR-7 の相互必須不変量を full 限定に正しくスコープし、既存 t435 テストとの重複回避も実測済み。

### Findings

- None
