# Code Generation Plan：B002 skill 置換と整理

対象 Unit: U003 の残り（37 skill）+ U004（整理のうち provenance 非依存分）。

## 変更内容と順序

| # | 変更 | 対象 | 検証方法 |
|---|---|---|---|
| 1 | 上流 37 skill の適応コピー | 上流 `.claude/skills/aidlc-<x>/` → `skills/amadeus-<x>/`（B001 の amadeus-intent-capture と同じ型: frontmatter 改名、質問ステージへ bridge 参照追加、aidlc-* skill 名言及の置換。エンジンパスと stage slug は原文のまま） | 全 SKILL.md が英語で、名前写像が 1 対 1 |
| 2 | 公開入口の置換 | 上流 `aidlc/SKILL.md` を適応して既存 `skills/amadeus/SKILL.md` を置き換える（references/ と templates/ の既存ファイルは B004 の文書改定まで残置）。provenance は staleReason 許容で維持 | エンジン forwarding loop が入口になる |
| 3 | provenance 非参照 skill の削除 | amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming（source、.agents/skills、.claude/skills symlink） | 参照残がない（grep） |
| 4 | 昇格と symlink | 新規 37 + 置換 1 を promote-skill.ts で昇格 | `npm run test:it:promote-skill` green |

## 後送（B004。provenance 制約による）

- 旧 stage skill 19 個（amadeus-ideation-*、amadeus-inception-*、amadeus-construction-*）と amadeus-steering の削除は、examples を新契約で再生成して provenance の参照を切り替えた後に行う。それまで新旧 skill が併存する（移行期の二重構造。raid-log の想定内で、期間は B004 まで）。

## 検証方法（実行は 3.6）

- `npm run test:all`（staleReason 許容で green を維持）
- `npm run test:it:promote-skill`
- 名前写像の 1 対 1 確認（上流 38 skill ↔ amadeus-* 38 skill）
