# Memory: application-design

## Interpretations

- 「設計」を、本家コンポーネントの再設計ではなく、当リポジトリへの接合点（配置、結線、検査、配布、文書）の設計と解釈した。C-ENG、C-DEF、C-SEN、C-HOOK のメソッド境界は本家定義をそのまま使う。
- 結線層の実現可能性は上流の stage-protocol で確認した。「questions ファイルが真実源で提示方法は agent の裁量」「decision / answer の監査コマンドが既にある」ため、プロンプト層だけで結線できる（設計判断 2）。
- 本家 stage-protocol の「Autonomy is NEVER inferred」（一度の許可を次ステージへ持ち越さない）は、今夜の包括自動承認と緊張関係にある。今夜は現行 Amadeus 契約下の運用であり、エンジン導入後は本家規範に従う。

## Deviations

- 人間への質問を行わなかった（夜間自律進行の事前指示）。設計に必要な不確定点は上流 clone の実物確認で解消した。

## Tradeoffs

- エンジン無改変（設計判断 1、2）は、追従コスト最小と引き換えに、`.claude/` 配下に本家レイアウトが同居する二層構造（既存の kiro などの開発環境 + aidlc エンジン）を受け入れる。衝突は C001 の名前空間マージで管理する。
- 旧形式 record の検査対象外方式（設計判断 4）は、validator の単純さと引き換えに、旧 record の構造退行を検出しなくなる。完了済みで変更しない前提（D007）なので許容する。

## Open questions

- 上流の agents / rules / scopes / knowledge ディレクトリのコピー範囲（backlog #1）。walking skeleton の動作確認で必要最小集合を確定する。
- `.claude/settings.json` のマージで既存 hook と本家 hook のイベント重複（SessionStart など）が実際に共存できるかは、walking skeleton Bolt の回帰確認で検証する。
- promote-skill.ts が本家型 skill（SKILL.md + 参照ファイル構成）をそのまま扱えるかは Construction で確認する。
