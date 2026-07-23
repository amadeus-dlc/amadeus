# Business Logic Model — U3 team-launcher-promotion

> 上流入力(consumes 全数): unit-of-work(U3 定義)、unit-of-work-story-map(FR-3/4/8 トレース)、requirements(FR-3/FR-4/FR-8)、components(C4/C5)、component-methods(C4/C5 契約)、services(外部サービス境界)

## 移動ロジック(FR-3a/3b)

- git mv 3ファイル: `scripts/{team-up.sh,team-msg.sh,team-up-codex-safety-wait.ts}` → `packages/framework/core/tools/`(scripts/ 側削除 — U1 重複不変量が残置を自動検出)
- パス導出の修正: `SAFETY_WAIT_HELPER="$REPO/scripts/team-up-codex-safety-wait.ts"`(team-up.sh:57 正本直読実測)→ `"$(dirname "$0")/team-up-codex-safety-wait.ts"`(配布コピー内相対)。他の `$REPO/scripts/` 前提出現は実装時に repo 全域 grep で全数棚卸し(cid:enumeration-reverify-at-implementation)
- 再生成: `bun scripts/package.ts` + `bun run promote:self` で全6 dist+self-install 5面へ投影(coreDirs tools 既存機構 — 配線ゼロ)

## prerequisite 検査(FR-3c/3d)

```
require_prerequisites()  # team-up.sh 冒頭で main 処理前に呼ぶ bash 関数
```

- herdr / agmsg の PATH 検査(`command -v herdr` / agmsg は AGMSG_ROOT 配下の send.sh 実在 — 既定 `$HOME/.agents/skills/agmsg`、env override 尊重)
- 不在 → stderr へ「不在ツール名+公式入手先(herdr.dev / agmsg 公式)+docs 参照」を出力し `exit 1`
- OS 検査: `uname -s` が Darwin / Linux 以外 → 非対応 loud エラー `exit 1`(FR-3d)
- 既存 env 契約(HERDR / AGMSG_ROOT / AGMSG_SEND / AGMSG_HISTORY / TEAM_MSG / TEAM_*)は不変(NFR-2、FR-8a/8b — 検査は追加のみ)

## doctor advisory(FR-4)

- 検出ロジックは TypeScript の exported 純関数系 seam(`detectTeamPrerequisites(env, pathProbe): PrereqStatus[]`)として amadeus-utility.ts の doctor 節へ追加 — in-process import でテスト駆動(NFR-3 の spawn 盲点回避、cid:seam-export-handler-amend)
- 表示: `Team Mode prerequisites:` 節+ツール別1行(`herdr: <path>` or `herdr: not found (see docs/guide team mode)`)
- doctor の exit code へ**不影響**(advisory — 検出結果は表示のみ、既存 verdict 集計に加算しない)

## Should 面の搬送(FR-3e)

--codex / --instance / -c / サイズ指定 / spawn 系はコード不変で搬送。既存テスト(t-team-msg / t-team-up-codex-resume.serial / t-team-up-msg-backend / t-team-up-codex-safety-wait+fixtures / t245 unit+integration)の green 維持が受け入れ(新規 E2E 保証なし)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:16:02Z
- **Iteration:** 1
- **Scope decision:** none

FR-3/4/8 の独立再列挙で FR-8c 以外全数カバー確認。NFR-2/NFR-3 整合・判別 union 妥当・frontend-components 不在正当。Minor2件(FR-8c 明示欠落 → BR-8 追加 / BR-7 の機械ガード化 → 整合テスト明記)— conductor 即時反映済み

### Findings

- Minor1: FR-8c の明示記述欠落 → BR-8 追加で是正(反映済み)
- Minor2: BR-7 の同期がレビュー依存 → code-generation 段の集合一致 assert を明記(反映済み)
