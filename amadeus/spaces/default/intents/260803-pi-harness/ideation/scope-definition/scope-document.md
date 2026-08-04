# Scope Document — 260803-pi-harness

## 目的と境界の根拠

上流の`intent-statement`は、Pi Coding AgentでskillとBun製エンジンが部分動作する一方、extension lifecycle、監査、human gate、doctor、subagent、配布契約が欠けている問題を定義した。本workflowでは`feasibility-assessment`と`constraint-register`がskipされているため、未生成の内容は根拠として補完せず、実測済みのPi 0.83.0 surfaceとユーザー回答だけを境界根拠にする。

最小価値単位は「Pi上でAmadeusを起動できること」ではなく、導入から監査可能なworkflow、承認、subagent、診断、更新可能な配布、継続検証までが一続きに成立することとする。したがって、adapterだけを先行公開する縮退版は正式対応と呼ばない。

## In Scope（Must）

| ID | proto-capability | 内容 | 完了証拠 |
|---|---|---|---|
| M1 | Piハーネス定義 | Pi用manifest、orchestrator skill、question-rendering annex、project trust/onboarding、標準session skills、stage runnersを手書きソースとして追加する | manifest/schemaテスト、生成物構造テスト |
| M2 | Extension lifecycle adapter | Pi 0.83.0のsession、input、agent、tool、compaction eventをAmadeusの監査・状態同期・sensor・停止/継続契約へ正規化する | captured fixtureを使うadapter契約テスト |
| M3 | Human gateと継続制御 | Pi extension UIまたは入力eventを使い、質問・承認・presence mint・agent settled後の継続を監査可能にする | human-turn、gate、stop/continueの縦断テスト |
| M4 | 全subagent経路 | support/reviewer agentとConstruction swarmを、子PiプロセスまたはSDK sessionを用いるPiネイティブdriverで実行する | role、親子関係、終了状態、失敗伝播、swarm resolveのテスト |
| M5 | Pi専用doctor | Pi版、project trust、skill、extension、Bun、配布物、subagent driverを検査し、Codex固有要件を要求しない | 正常系・欠落系・旧版系のdoctorテスト |
| M6 | Setup CLI導入 | 既存setup CLIに`--harness pi`を追加し、Pi生成物と必要設定をプロジェクトへ冪等配置する | fresh/update/idempotent installテスト |
| M7 | Pi Package導入 | setup CLIと同一の生成物をPi Packageとしてlocal/git sourceから`pi install -l`可能にする | package manifest、resource discovery、両経路parity、実機installテスト |
| M8 | 決定的生成と配布 | `dist/pi/`生成、package check、promote-self、CI change detection、ハーネス列挙へPiを参加させる | drift guardと全ハーネス回帰テスト |
| M9 | Dogfoodとlive journey | セルフインストール後のTUIでskill、extension、gate、doctor、subagentを実走し、`pi -p`またはRPCのopt-in journeyを1本以上追加する | 手動検証記録とlive test green |
| M10 | 文書 | 利用者向け前提・導入・trust・起動・制約・診断と、保守者向けPi adapter・package・test構造を記述する | 文書リンク検査と成果物レビュー |

## Out of Scope（Won't）

| ID | 除外項目 | 理由・将来条件 |
|---|---|---|
| W1 | `@earendil-works/pi-agent-core`単体を使う独立SDK埋め込みAPI | 今回の顧客体験はPi Coding Agent CLIハーネス。別の公開APIと利用者像を要する |
| W2 | Pi 0.83.0未満の互換性保証 | 必要event surfaceを未検証。適合テストで証明できた版だけ将来フロアを下げる |
| W3 | 公開npm registryへの実公開 | release-ready生成物まではMust。公開操作は資格情報・リリース承認を伴う外部境界のため通常リリースへ委ねる |
| W4 | Pi本体、Agent Core、provider/model実装の変更 | Amadeusのハーネスadapter境界を越えるため |
| W5 | Pi固有の汎用plan mode、todo、MCP、permission system | Amadeus正式対応に不要なPi一般機能。必要なら独立intentで扱う |
| W6 | Pi以外の既存ハーネスの挙動変更 | 回帰修正を除き、Pi対応による別ハーネスの契約変更は認めない |
| W7 | cloud deploymentや常駐サービス | 本プロジェクトは短命なBun CLIとローカルハーネス統合で完結する |

## 依存関係と実装順序

| 順位 | Slice | 依存 | 先に証明する仮説 |
|---|---|---|---|
| 1 | Walking skeleton: M1 + M2最小 + M3最小 | なし | Pi eventから監査・HUMAN_TURN・agent settled後継続まで縦断できる |
| 2 | Adapter完全化: M2 + M5骨格 | Slice 1 | 必要eventを取りこぼさず、Pi固有診断で失敗を説明できる |
| 3 | Subagent: M4 | Slice 1-2 | 子Pi実行をrole付きで追跡し、失敗を親へ決定的に戻せる |
| 4 | 二重配布: M6 + M7 + M8 | Slice 1-3 | setupとPi Packageが同一内容を再現し、更新してもdriftしない |
| 5 | 実機保証: M9 | Slice 1-4 | TUIと非対話経路で公開契約が実際に成立する |
| 6 | 文書確定: M10 | Slice 1-5 | 実測済み手順だけで利用者が導入・診断できる |

順序はwalking-skeleton-first、risk-first、dependency-firstを併用する。最大の未知であるPi eventと継続制御を最初に潰し、その後にsubagentと配布面を積み上げる。

## バリューストリーム

| Step | 利用者の行動 | Amadeusが提供する価値 | 品質フィードバック |
|---|---|---|---|
| 1. 選択 | setup CLIまたは`pi install -l`を選ぶ | どちらでも同一のPiハーネスを取得できる | parity・installテスト |
| 2. Trust/導入 | project-local resourceを承認する | Pi標準のtrust境界内でskillとextensionが有効になる | doctorのtrust/resource検査 |
| 3. 起動 | `/skill:amadeus`を実行する | 共通の決定論エンジンがPi上でworkflowを開始する | session/input audit |
| 4. 判断 | 質問・承認ゲートへ回答する | human presenceを証明し、勝手にゲートを越えない | gate・HUMAN_TURN契約テスト |
| 5. 実行 | support agent・reviewer・swarmを使う | Pi上でも役割分離と並列Constructionを利用できる | subagent追跡・失敗伝播テスト |
| 6. 診断 | doctorを実行する | Pi固有の不足を修正可能な形で特定できる | negative fixtureテスト |
| 7. 維持 | 更新・再生成する | 配布物のdriftを検知し、全ハーネスの互換性を保つ | package check・CI回帰・live journey |

## 制約・前提・変更管理

- Pi Coding Agent 0.83.0を最低対応版の初期値とする
- Pi Packageとproject-local extensionは任意コードを実行するため、Piのproject trust境界を迂回しない
- Bun-onlyの短命CLI構成を維持し、常駐プロセスやデータベースを追加しない
- `dist/`は生成物であり手編集しない。手書きソースから再生成して同期する
- 既存ハーネスの決定性、audit schema、state machineをPiの都合で分岐させない
- ハードデッドラインはない。Mustを削る提案、npm実公開の追加、最低版変更はscope changeとして本承認者へ戻す

## Definition of Done

1. M1〜M10がすべて受け入れ証拠を持ち、W1〜W7を意図せず取り込んでいない
2. Pi向け決定的テスト、関連する全ハーネス回帰、package/promote drift guardがgreen
3. setup CLIとPi Packageのfresh/update/local/git導入およびparityが検証済み
4. TUI dogfoodでskill、extension、human gate、doctor、support/reviewer、Construction swarmが成功
5. opt-in live journeyがローカルPi実機でgreen
6. 利用者・保守者文書が実測結果と一致し、Pi Coding AgentとAgent Core単体対応を混同しない

## スコープ対タイムライン検証

ハードデッドラインはなく、品質ゲートを優先する。Mustは「正式対応」を成立させる一続きの契約であり、adapter、subagent、二重配布、doctor、実機検証のいずれかを削ると、Intentで承認された顧客価値または成功指標を満たさない。現時点の回答間に矛盾はない。
