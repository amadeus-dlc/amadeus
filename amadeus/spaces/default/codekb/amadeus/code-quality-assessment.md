# コード品質評価

## 強み

- TypeScript strict、明示的な判別 union、dependency injection seam により、判定と I/O を分離してテストできる。
- CI は typecheck、Biome lint、dist drift、self-install drift、tests、coverage を横断的に検査する。
- Mirror の既存テストは config、CLI、GitHub process 境界、receipt、phase boundary、6ハーネス配布を unit/integration/e2e で覆う。
- receipt parser は不正 JSON、未知 phase/status、重複キーを fail-safe に拒否する。
- `handleClose` は registry と state の二重 landing check、および最終 sync を要求する。
- `gh` 引数は配列で渡され、shell command string を組み立てない。

Developer scan では mirror 関連8テストファイルの146件が成功した。本 synthesis 中にも t232/t257/t265 の検出対象8ファイルを実行し、139件成功・0件失敗を確認した。両者は選択したファイル集合が異なるため、件数は同一の母集団を意味しない。

## 重大な品質リスク

| 優先度 | リスク | 影響 |
|---|---|---|
| Critical | 配布面で `projectDirFromToolsDir()` が誤 root を返す | 誤 record 参照、CLI 不動作 |
| Critical | Issue 番号のみで ownership provenance がない | 外部 Issue の誤 edit/close |
| Critical | create 成功後の state write 失敗が非冪等 | 重複 Issue 作成 |
| High | park/complete/Intent Capture 承認に auto 配線がない | 目標 lifecycle が未成立 |
| High | GitHub 障害が warning/retry state に正規化されない | workflow 停止または未同期の不可視化 |
| High | pending receipt が config 解決に先行 | `off` 契約との衝突 |
| High | non-default space の record path が default 固定候補 | 別 space の state 誤参照 |
| Medium | 巨大 core modules | 変更 blast radius と review 負荷 |
| Medium | docs と生成面が多い | 契約 drift |

## テスト不足

既存テストに加え、次の matrix と異常系が必要である。

- `off | prompt | auto` × `create | sync | close` × Intent Capture/phase/park/complete boundary
- 未指定が `prompt`、旧 boolean が global/space/intent の各 layer で拒否されること
- `auto` の create→phase sync→park sync→final sync→safe close の lifecycle
- provenance 欠落、不一致、外部 Issue link で close が fail-closed になること
- GitHub create 成功→state write 失敗→retry で Issue が1件に収束すること
- 未認証、network、権限、API failure で workflow が継続し、warning と retry が残ること
- pending 中の mode `off` 切替規則
- `.codex/tools` など全配布 layout で project root が正しく解決されること
- non-default space の config、record、receipt、Issue が同じ selector に束縛されること
- core、6 dist、self-install、mirror skill、日英文書の drift 検査

## 保守性評価

`amadeus-mirror.ts` は525行で責務が広いが、今回ただちに transport abstraction へ分割する規模ではない。`amadeus-orchestrate.ts` 3,675行、`amadeus-state.ts` 4,467行、`amadeus-lib.ts` 7,602行は高リスク変更面である。三モード policy を純粋な小型 module または狭い型/関数としてまとめ、各巨大 module には seam 配線だけを置く方が、変更理由の凝集とテスト性を改善する。

後方互換 shim、汎用 tracker port、scheduler、未消費の provenance field は追加しない。新しい state field は status/retry/close guard の少なくとも1つに実際に消費させる。

## 推奨検証順序

1. 現行 green と、Critical 3件の落ちる実証を固定する。
2. config と policy の純粋な決定表を実装する。
3. create 部分成功と provenance の state machine を failure injection で固定する。
4. lifecycle seam と non-blocking retry を統合検証する。
5. package/promote を再生成し、全 drift guard、typecheck、lint、tests、coverage を実行する。
6. 日英文書の mode matrix とコードの decision table を照合する。
