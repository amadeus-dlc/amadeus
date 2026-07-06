# Requirements：260705-engine-installer

## Intent 分析

### 目的

Issue #451（エンジンの copy 配布を成立させるインストーラ）を実装する。達成したい状態は次の 3 点である。

1. 正準のインストール手順が 1 コマンド（`bun run scripts/amadeus-install.ts --target <workspace>`、npm script `amadeus:install`）で実行できる。
2. インストール先 workspace（node_modules なし、bun cache 冷、オフライン）で全ツールと全 hook が module load 時に落ちずに動作することが、専用 eval（`test:all` 組み込み）で継続検証される。
3. #441（OTel 計装基盤）の受け入れ条件が、本 Intent の成果（正準手順 + eval）で再現可能に検証できる。

### 上流の位置づけ

- 設計論点 6 件の正は grilling 転記コメント（https://github.com/amadeus-dlc/amadeus/issues/451#issuecomment-4887231697 ）であり、Ideation の decision-log（D1〜D9）に台帳化済みである。
- 残実装判断 3 件（O1〜O3）は本ステージのピア協議（回答 3 件全員一致）で確定した（requirements-analysis-questions.md Q1〜Q3 = A）。
- コードベース知識は既存の `aidlc/spaces/default/codekb/amadeus/`（参照台帳 stub 経由、既知デルタ = PR #489 明記）と、feasibility の実測（エンジン 7 dir、symlink 7 entry、hooks 配線 11 entry）を参照する。
- チームの働き方（team-practices）は practices-discovery の成果物（TDD、隔離 eval 前例、DR-1〜5）に従う。

## 機能要求

### FR-1: インストーラ本体（`scripts/amadeus-install.ts`、D4 = リポジトリ内 TS スクリプトの具体化）

- FR-1.1: CLI は `--target <workspace>` を必須引数とし、非対話・1 コマンドで完結する（D8）。実行冒頭に事前チェックを行い、target が存在しない・ディレクトリでない・書き込み不可の場合は何も変更せずエラー終了する（このときの回復案内は `--target` の指定修正である）。工程実行中の失敗時は、失敗工程・原因・回復方法（原因解消後の再実行で収束する旨）を stderr に出す。
- FR-1.2: エンジン `.agents/amadeus/` 一式（7 dir: agents、amadeus-common、hooks、knowledge、scopes、sensors、tools）を配布元から対象 workspace へ全置換コピーする（D1、D5）。
- FR-1.3: amadeus* skills 2 系統（`.claude/skills/amadeus*`、`.agents/skills/amadeus*`）を全置換コピーする（D1）。amadeus* 以外の利用者の skills には触れない。
- FR-1.4: `AMADEUS.md` を、宣言的な節除去リストに基づき本体開発前提の節を除去した利用者向け内容へ変換して配置する（Q2 = A）。単一ソースは repo の `AMADEUS.md` とする。
- FR-1.5: `.claude/` 配下の 7 entry を相対 symlink（`.claude/agents → ../.agents/amadeus/agents` 等）として再作成する（D3）。既存が symlink なら張り直し、symlink 以外の実体（dir / file）が存在する場合は上書きせずエラーで中断し、対象と回復方法を案内する（R-2 の安全側処置）。
- FR-1.6: 対象 workspace の `.claude/settings.json` へ hooks 配線のみを冪等マージする（Q3 = A）。重複排除キーは matcher + command、既存 hooks の順序は保持、env / permissions 等には一切触れない。settings.json 不在時は hooks のみの最小 JSON を新規作成する。既存 settings.json が JSON として解析できない場合は、上書き・新規作成へフォールバックせず、対象ファイルと回復方法を案内してエラー中断する（R-3。利用者の設定を破壊しない）。
- FR-1.7: 配置直後に軽量スモーク（doctor 相当の起動チェック）を自動実行し、結果を表示する（D6）。
- FR-1.8: 再実行は冪等である（D5）。全置換対象（エンジン、skills、AMADEUS.md）と symlink（FR-1.5 の正常系）は同一結果に収束し、マージ対象（settings.json）は重複を生まない。FR-1.5 / FR-1.6 のエラー中断にロールバックは要求しない: 中断時点までに適用済みの工程はそのまま残る（各工程は冪等のため、原因を解消して再実行すれば全体が収束する）。中断が保証するのは「衝突した対象そのもの（既存実体、解析不能な settings.json）を変更しないこと」である。FR-1.1 の事前チェック失敗だけは工程開始前のため、対象 workspace に何も変更が生じない。
- FR-1.9: 対象 workspace の `aidlc/` には作成も変更もしない（D5、CON-1）。
- FR-1.10: 配布対象の列挙（エンジン dir、skills glob、symlink 一覧、除去節リスト、dev 参照パターン）は 1 箇所のマニフェスト定数に集約する（R-1 の緩和）。
- FR-1.11: `package.json` の scripts へ `amadeus:install`（`bun run scripts/amadeus-install.ts` の入口）を登録する（Q1 = A。CON-8: 追記型接触）。

### FR-2: 専用 eval（`dev-scripts/evals/installer/check.ts`、`test:it:installer`）

- FR-2.1: 一時ディレクトリへ実インストールを実行する（fixture ではなく実スクリプト駆動）。
- FR-2.2: node_modules なし・bun cache 冷・オフライン相当（ネットワークアクセスを要さない実行方法）で、インストール先の全 tools + 全 hooks を module load 駆動し、落ちないことを検証する（受け入れ条件 2、A-1 の最終確定）。
- FR-2.3: 再実行の冪等性を検証する（2 回実行して結果が収束し、settings.json に重複が生まれない）。
- FR-2.4: `test:it:installer` として `package.json` に登録し、`test:it:all` の連鎖へ組み込む（CON-8: 追記型接触）。
- FR-2.5: マニフェストと配布元の実レイアウトの一致を検査する（並行 Intent によるレイアウト変更の検知 = R-1）。
- FR-2.6: AMADEUS.md 変換の双方向検査を行う: (負方向) 生成結果に dev 参照パターンが残らないこと、(正方向) 除去リストの見出しが原本に実在すること（Q2 補足）。
- FR-2.7: settings.json マージの実ファイル駆動検証を行う: 既存設定を持つ fixture へのマージ後、JSON として再読込でき、非対象キー（env / permissions 等）が不変であり、既存 hooks 配列の順序が保持されていること（Q3 補足）。
- FR-2.8: 一時ディレクトリは成功時も失敗時も片付ける（DR-3）。
- FR-2.9: エラー中断パスの非破壊性を検証する: (a) symlink 位置に非 symlink 実体が存在する fixture でエラー終了し、衝突した既存実体が変更されないこと（FR-1.5）、(b) 解析不能な settings.json を持つ fixture でエラー終了し、同ファイルが変更されないこと（FR-1.6）。検証対象は衝突対象の無傷性と、原因解消後の再実行での収束（FR-1.8）、および stderr に対象 path・原因・fix 案内が含まれること（interaction-spec の出力規約）であり、中断時点までの適用済み工程の残存は仕様どおりとして扱う。
- FR-2.10: FR-1.1 の事前チェックを検証する: target 不在・非ディレクトリ・書き込み不可の 3 パターンで exit 1 で終了し、stderr に reason（interaction-spec の文言表）と `--target` 修正の案内が含まれ、対象 workspace（作成可能な場合）に何も変更が生じないこと。
- FR-2.11: 非対象資産の不変を検証する: amadeus* 以外の既存 skills（`.claude/skills/`、`.agents/skills/` 配下）がインストール前後でバイト単位に無傷であること（FR-1.3。user-stories ステージ発の追補、US-3）。
- FR-2.12: スモークの偽陽性回帰を検証する: インストーラの実行元 cwd に `.claude` が存在する状態で、壊れた target に対しスモークが fail する（= doctor が実行元でなく target を検査している）こと（FR-1.7。Construction functional-design ステージ発の追補、O-2 の確定に伴う再発防止）。
- FR-2.13: `aidlc/` の不可侵を検証する: 既存の `aidlc/` 記録を持つ fixture でインストール前後にバイト単位で不変であること（FR-1.9、CON-1。Construction nfr-requirements ステージ発の追補、SEC-3 の動的検証。B002（hardening）に割り当てる）。

### FR-3: README の利用者向け導入手順

- FR-3.1: 導入コマンド、インストール内容（フルセットの一覧）、導入後の検証手順（doctor と amadeus-validator の実行方法）、更新（再実行）の規約を README に記載する（受け入れ条件 4、D6 の README 層）。

### FR-4: Codex 配置の検証項目

- FR-4.1: Codex は `.agents/` 配置のみで成立する（追加配線なし）ことを、eval の検証項目（インストール先の `.agents/` 完全性検査）として担保する（D2）。

## 非機能要求

- NFR-1: インストーラと eval は Bun + TypeScript で実装し、TDD（先に失敗する eval → 失敗確認 → 最小実装）で進める（DR-1、CON-5）。
- NFR-2: 外部依存（npm パッケージ）を追加しない。Bun / node 標準 API だけで実装する（オフライン前提との整合）。
- NFR-3: 成果物文書は日本語で書き、japanese-tech-writing の規範に従う。機械可読ラベルとコード内コメントは既存 dev-scripts の慣行（英語）に合わせる。
- NFR-4: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する（受け入れ条件、ディスパッチ作業指示 7）。
- NFR-5: 各成果物文書は H2 見出し 2 個以上を持つ（required-sections sensor）。

## 制約

constraint-register（CON-1〜10）を全面適用する。特に本ステージ以降で効くもの:

- C-1: `aidlc/` 不可侵（CON-1）。
- C-2: settings.json は hooks 限定マージ（CON-2、Q3 = A）。
- C-3: インストーラはエンジンレイアウトを読むだけで書き換えない（CON-7）。
- C-4: `package.json` scripts と eval は追記型接触として union 解消可能に保つ（CON-8）。
- C-5: Windows の symlink は対象外（CON-9）。
- C-6: merge は人間が行う（CON-10）。

## 前提

- A-1: エンジンの hooks / tools は env 非依存で module load できる（feasibility 一次調査 + engineer1 の現物裏取り。FR-2.2 で最終確定）。
- A-2: 配布元（clone した本リポジトリ）の `.agents/amadeus/` は正であり、インストーラはこれを読むだけでよい（CON-7）。

## スコープ外

- bunx / npm 公開、dist 生成物、Windows 対応、`.agents/rules/` 配布、#441 本体、エンジン・validator の変更（intent-backlog BL-1〜4、scope-document）。

## 未解決事項

- O-1: マニフェストの具体形（定数の構造）と AMADEUS.md 節除去リストの初期内容は functional-design で確定する。
- O-2: スモーク（doctor 相当）の実行方法（インストール先での起動コマンド）は functional-design で確定する。
