# Services — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 外部サービス

| サービス | 利用面 | 依存の性格 |
|---|---|---|
| GitHub(gh CLI 経由) | C1: issue create/edit/close(既存)+ issue view(status 新規、read 系) | **optional runtime 依存**(G-1/C-01、ADR-7): 不在・未認証は loud エラー exit 2(status の precondition クラス)/ exit 1(他 verb 既存契約)で当該機能のみ不可。workflow は止めない。トークン非保持(gh keyring 委譲) |

## 内部サービス(モジュール間)

| 提供 | 消費 | 契約 |
|---|---|---|
| C3 config リゾルバ | C4 engine 分岐 | `resolve()` の決定的読取のみ(engine から config への書込なし) |
| C1 mirror ツール | C2 SKILL / C4 print 指令 | CLI 呼出(`bun …/tools/amadeus-mirror.ts <verb>`)。C4 の print 指令が名指すのは sync のみ(C-05) |
| amadeus-lib(activeIntent/intentsDir/recordDirMatches/getField/setOrInsertField) | C1 | 既存 import 維持(移設後もパス解決は `__FILE_DIR` 相対 — no-canonical-direct-execution の注意を実装時に確認) |
| amadeus-state.ts(PHASE_CHECK_REQUIRED_PHASES) | C4 | 境界集合の canonical 1定義を参照(重複定義しない) |

## 非サービス(明示)

- GitHub 以外のトラッカー・transport 抽象化は W-03 で除外
- config への書込 API は提供しない(読取専用機構 — 設定は git 管理の手編集)
