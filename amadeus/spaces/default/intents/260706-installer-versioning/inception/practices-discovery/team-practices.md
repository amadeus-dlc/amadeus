# Team Practices — 260706-installer-versioning（Issue #543）

上流入力: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)（codekb）、Space の既存 memory/team.md

## 本 Intent に適用する実践（確認済み、正 = Space memory）

| 実践 | 内容 | 本 Intent での適用 |
|---|---|---|
| TDD（dev-scripts 規約） | 先に失敗する検証を書き、失敗確認 → 最小実装 → GREEN 後に整理 | installer eval へ新 assertion を先行追加（RED）→ 実装（GREEN）。中断時は遡及 RED 検証（learnings c6） |
| 検証入口 | `npm run test:all` が標準。installer は `test:it:installer` 単独入口あり | PR 前に validator + test:all（パイプなし exit 確認） |
| Bolt 運用 | Bolt 単位の gate。walking skeleton は feature scope で on（practices 未規定 → scope 既定） | delivery-planning で Bolt 分割と skeleton 対象を確定 |
| PR 運用 | draft 作成 → CI green + ボット決着 + 検証記載で ready 化。merge は人間 | 恒常ルールどおり |
| エラー規約（installer 固有） | InstallError + `fix: ...` で次の一手を明示。無言の失敗禁止 | 退避告知・manifest 不在メッセージも同規約（rough-mockups 反映済み） |
| ハッシュ | sha256（parity-baseline / provenance の現役慣行） | 協議 Q2 確定どおり |

## Walking Skeleton

Space の practices（org / team / project）に Walking Skeleton の明文規定はない（scope-dependent）。feature scope の既定により skeleton-on で扱い、最初の Bolt を walking skeleton として人間の個別承認対象にする（team.md「Construction は Bolt を実行単位にし、walking skeleton の Bolt PR は必ず人間が承認する」）。
