# Domain Entities — upstream-sync

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 取り込み対象の分類表（上流 16 ファイル → ローカル対応）

| 上流（dist/claude/.claude/） | ローカル | 分類 |
|---|---|---|
| tools/aidlc-runner-gen.ts | .agents/amadeus/tools/amadeus-runner-gen.ts | 機械的再コピー（例外リスト外） |
| tools/aidlc-version.ts | .agents/amadeus/tools/amadeus-version.ts | 機械的再コピー（例外リスト外） |
| tools/aidlc-graph.ts | .agents/amadeus/tools/amadeus-graph.ts | 例外維持ファイルの統合（validateGrid / validate-grid verb 追加） |
| tools/aidlc-utility.ts | .agents/amadeus/tools/amadeus-utility.ts | 例外維持ファイルの統合（detect --json / recompose verb 追加） |
| tools/aidlc-orchestrate.ts | .agents/amadeus/tools/amadeus-orchestrate.ts | 例外維持ファイルの統合（compose dispatch、Branch 4c/8） |
| tools/aidlc-lib.ts | .agents/amadeus/tools/amadeus-lib.ts | 例外維持ファイルの統合（setStageSuffix 追加） |
| tools/aidlc-state.ts | .agents/amadeus/tools/amadeus-state.ts | 例外維持ファイルの統合 |
| tools/aidlc-jump.ts | .agents/amadeus/tools/amadeus-jump.ts | 例外維持ファイルの統合（effective plan 解決） |
| tools/aidlc-audit.ts | .agents/amadeus/tools/amadeus-audit.ts | 例外維持ファイルの統合（RECOMPOSED 登録） |
| hooks/aidlc-stop.ts | .agents/amadeus/hooks/amadeus-stop.ts | 例外維持ファイルの統合（tier-2b compose-pending carve-out） |
| knowledge/aidlc-shared/audit-format.md | .agents/amadeus/knowledge/amadeus-shared/audit-format.md | 合流統合（Registry 70 → 71、RECOMPOSED 追記） |
| skills/aidlc/SKILL.md | skills/amadeus/SKILL.md → 昇格先 | 例外相当の統合（composer conductor block を当方適応版へ追記。挿入位置は「New work while an intent is active」節の末尾と「GitHub Issue references」節の間 = 上流と同じ相対位置） |
| CLAUDE.md | CLAUDE.md（配布 shell 側の該当文） | 参照面の適応（/aidlc compose の 1 文。MANIFEST removeBlocks 非接触を確認） |
| agents/aidlc-composer-agent.md | .agents/amadeus/agents/amadeus-composer-agent.md | 新規適応コピー（agent 14 個目） |
| knowledge/aidlc-composer-agent/composing.md | .agents/amadeus/knowledge/amadeus-composer-agent/composing.md | 新規適応コピー |
| skills/aidlc-compose/SKILL.md | skills/amadeus-compose/ → .agents/skills/amadeus-compose/ | 新規適応コピー（packaging skill、promote 経由） |

分類の意味は [business-logic-model.md](business-logic-model.md) の手順 3 を参照。「例外維持ファイルの統合」は、統合後に上流と内容一致へ戻せた場合に engineFileExceptions から解除する（R006）。

## パリティ基準のエンティティ

| エンティティ | 場所 | 今回の変更 |
|---|---|---|
| parity-baseline.json | dev-scripts/data/ | baselineCommit fde1e1af → b67798c3、engineFiles の sha256 全再生成（R001） |
| parity-map.json nameMappings / relocations | dev-scripts/data/ | 原則不変。compose 関連の新規トークンが写像不足なら追加 |
| parity-map.json engineFileExceptions | dev-scripts/data/ | 整理（解除候補の判定 + engineer3 の #507 5 ファイル追記との整合。R006） |
| parity-map.json missingSkillExceptions | dev-scripts/data/ | amadeus-compose 追加までの一時期のみ使用しない（同一 PR 内で skill を追加するため不要見込み） |

## 検証エンティティ

parity:check（バイト一致）、test:all（標準検証）、test:it:installer（MANIFEST 整合）、AmadeusValidator（record 構造）、stage-catalog.md（skill 序数の参照集合）。
