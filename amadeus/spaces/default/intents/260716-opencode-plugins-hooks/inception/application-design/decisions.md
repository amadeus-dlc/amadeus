# Decisions(ADR)— opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、codekb の architecture.md・component-inventory.md(re-scan 鮮度確認済み)、`../practices-discovery/team-practices.md`(live 温存)。

## ADR-1: plugin の配置は `harness/opencode/plugin/` dir 分離(hooks/ 非同居)

- Context: core-copied `hooks/` 配下に置くと authoredExempt(manifest.ts:61、現状 `[]`)への正規表現追加が必須(AC-2e)。
- Decision: `packages/framework/harness/opencode/plugin/` に authored ファイルとして分離し、manifest の harnessFiles で `.opencode/plugins/` へ配布する。
- Consequences: authoredExempt 不変(dist:check の authored/core 区別が単純なまま)。plugin と core hooks の変更理由が分離(変更の制御)。
- Alternatives Rejected: (a) `hooks/` 同居+authoredExempt 追加 — exempt 正規表現は drift guard の検査を狭める方向の変更で、誤 exempt のリスクを持ち込む(Architect 合成 C の比較軸どおり)。(b) emit.ts での動的生成 — 静的ファイルで足りる内容に生成層を挟むのは複雑性のみ増(YAGNI)。

## ADR-2: 配線イベントの初期集合は「一次ソース確定+in-tree 再実測通過」分のみ(機械導出)

- Context: FR-1 AC-1a/1c — 外部実測は当ツリー未検証。
- Decision: 工程0(C3)の in-tree 再実測を通過したイベントのみ C2 に実装。候補優先順: tool.execute.after(audit+sensors)> session 系 > chat.message(mint — AC-3c の fail-closed 条件付き)。
- Consequences: 配線数は実測結果に従属(0 も許容 — 受け入れ境界)。機能単位表は3値(対応/⚠/未対応)で正確。
- Alternatives Rejected: (a) docs 一覧ベースで全イベント配線 — payload 未文書の偽グリーン(C-4 違反)。(b) Cursor の8 target を無条件移植 — opencode に対応イベントが無い target(例 beforeSubmitPrompt 相当)を捏造することになる。

## ADR-3: stop/session 系は advisory 固定(ブロック機能を持たせない)

- Context: core stop hook は exit 2 を出さない(RE 全 hook grep 実証)。ゲート強制はツール所有 emit が正(C-2)。
- Decision: plugin はすべてのフックで opencode の動作をブロックしない(返り値でキャンセル・変更を行わない)。
- Consequences: プラグイン無効環境でも正しさ不変(C-2 保存)。偽の強制力を示唆しない。
- Alternatives Rejected: (a) permission.ask 等での block 実装 — gate 強制の置換に当たり Out 2 違反。(b) core stop hook に exit 2 相当の block 契約を新設して plugin から強制 — core hooks 無改変(AC-2b)違反かつ「hook は補助」(C-2)の逆転で、ハーネス欠落時に正しさが変わる非対称を作る。

## ADR-4: テスト層配置は純関数 = unit / 実 FS・spawn = integration

- Context: サイズ純度ゲート(t-test-size-drift — unit は small 限定、#1048 t230 前例)。
- Decision: C2 純関数テストは unit、一時 dir・spawn を伴うものは integration に `// size:` 宣言付きで配置。
- Consequences: 純度ゲート赤の構造的回避。
- Alternatives Rejected: (a) 全部 integration — 純関数まで重い層に置くと実行コストと患部特定性が悪化。(b) 全部 unit+モック FS — 実 FS・spawn 面のモック化は「テストが実際に読む面」との乖離(injection-surface-verify の逆)を作り、#1048 t230 で実証済みの実 FS 検証価値を失う。

## ADR-5: human-presence(HUMAN_TURN mint)は単経路 chat.message+実測条件付き — 満たせない場合は現行 delegate 運用を維持(scan-notes Architect 合成 C-5 への裁定)

- Context: RE 段の Architect 合成 C-5 が「chat.message 単経路で HUMAN_TURN mint が十分か、AskUserQuestion 相当イベントの二重配線含意を AD で裁定要」と要求。opencode docs 一覧の permission.asked/replied は権限ダイアログでありユーザープロンプト観測ではない(一次ソース実測範囲)。
- Decision: mint 配線は **chat.message 単経路のみ**を候補とし、工程0 の in-tree 再実測で (i) UserMessage の machine 注入マーカー判別可能性 (ii) AskUserQuestion 応答が chat.message を経由するか否か、の両方を確定する。判別不能または経由不明なら **mint 配線を見送り**(AC-3c fail-closed)、その場合の human-presence は**現行 delegate 運用(#671 provenance)を維持** — opencode ハーネスは現状 hooks なしで運用されており、mint 不在は退行ではない(ゲート強制はツール所有 emit が正 — C-2)。
- Consequences: phantom HUMAN_TURN(#708/#755 クラス)の構造的封鎖。「単経路で厳密性を新規に満たす」のではなく「満たせない場合は満たしていない状態を正直に維持する」— 機能単位表は3値で正確。
- Alternatives Rejected: (a) permission.asked/replied を第2経路として二重配線 — payload が権限文脈でありユーザープロンプトの証明にならない(偽 HUMAN_TURN の別経路を増やすだけ)。(b) chat.message を無条件配線しマーカー判別はランタイム警告に留める — fail-open で AC-3c 違反、presence 汚染の再発リスク。
