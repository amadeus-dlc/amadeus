# Design Decisions：260704-v2-parity-completion

## 一覧

| # | 判断 | 理由 | 代替案 |
|---|---|---|---|
| 1 | エンジンは本家 `.claude/` レイアウトをそのまま保持する（`tools/`、`aidlc-common/`、`sensors/`、`hooks/` の相対配置を変えない） | エンジンは import.meta 相対でパス解決しており、レイアウト変更はコード改変を招く。無改変が追従コストとパリティを最小にする | Amadeus 流の配置（dev-scripts 配下など）に移す。パス改変が全ツールへ波及するため却下 |
| 2 | 結線層（C-BRIDGE）はプロンプト層だけで実現し、エンジンコードは改変しない | 本家の stage-protocol は「questions ファイルが真実源、提示方法は agent の裁量」であり、一問ずつの対話提示は契約の範囲内。`aidlc-log.ts decision / answer` が DECISION_RECORDED / QUESTION_ANSWERED 相当の監査も既に担う | エンジンに対話モードを実装する。本家改変が増えパリティを損なうため却下 |
| 3 | skill 配置は既存の source → 昇格モデル（`skills/amadeus-*/` → `dev-scripts/promote-skill.ts` → `.agents/skills/` → `.claude/skills/` symlink）を維持する | C001（既存開発環境を壊さない）と既存の promote 検証（test:it:promote-skill）を活かす | 本家同様 `.claude/skills/` 直置き。昇格契約と衝突するため却下 |
| 4 | 旧形式 record の扱いは「`docs/backward-compatibility.md` に列挙した record を validator の検査対象外にする」方式にする | 互換対象の登録手続き（backward-compatibility rules）と一致し、validator に旧形式の解釈ロジックを持ち込まない | 旧形式許容モードを validator に実装する。二重契約の維持コストが高いため却下 |
| 5 | 名前写像と除外リストは `parity-map.json` の単一ファイルで管理する | 意図的差分が 1 箇所に集まり、パリティ検査、文書、レビューが同じ定義を参照できる | 除外を検査スクリプトへハードコード。追従時の見落としを生むため却下 |
| 6 | 必須節定義の単一ソースは C-DEF（stage 定義の frontmatter）とし、sensor と validator の両方がそこから読む | GD004 の「必須節定義は共有」を、定義の複製ではなく参照の共有で実現する | validator 側の定義を正とする。本家追従のたびに手動同期が必要になるため却下 |
| 7 | Operation 系 7 skill は他 skill と同じ適応コピーで追加し、実行条件は C-DEF の stage 定義（CONDITIONAL）に委ねる | D005（完全採用）を、独自の scope 制御を作らずに実現する | Amadeus 独自の Operation 制御を残す。パリティを損なうため却下 |
