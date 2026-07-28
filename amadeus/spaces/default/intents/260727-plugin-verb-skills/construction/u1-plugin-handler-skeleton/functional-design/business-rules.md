# Business Rules — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): requirements.md(FR-2a〜2d)、components.md(C2)、component-methods.md(usage 三重定義)、services.md(exit code 規約)、unit-of-work.md(U1 完了条件)、unit-of-work-story-map.md(GWT)

## BR-U1-1: 委譲の透明性

utility ハンドラは verb 以降の引数を無加工で plugin CLI へ渡し、stdout/stderr/exit code を無加工で返す。utility 側に verb 語彙・usage 判定・出力整形を持たない。

## BR-U1-2: usage 三重定義の同一変更同期(FR-2b)

`plugin` verb の追加は次の3面を同一コミットで更新する(実装時に3面を grep で再列挙 — enumeration-reverify-at-implementation):
1. default die の Usage 文字列(amadeus-utility.ts:6033、起草時再実測済み)
2. HELP_TEXT_TAIL の Utilities ブロック(:216-252、awk で終端実測済み)
3. t67 の pin 期待値

## BR-U1-3: 薄い dispatch(R2 の手当)

case 本体は委譲関数1呼び出しに留める。匿名関数の追加はゼロ(complexity-baseline-ordinal)。判定ロジックが生まれる場合は exported 純関数化して in-process seam で被覆する。

## BR-U1-4: テスト契約(FR-2d — component-methods.md C2 の「unit(in-process、spawn は seam 注入)」確約に準拠)

- 委譲配線: `PluginDelegateDeps.spawn` fake で、構成コマンド配列(`["bun", <tools>/amadeus-plugin.ts, ...rest]`)と rest 無加工透過を **unit 層**でピン
- exit 伝播: fake spawn に 0/1/2 を返させ、handlePluginDelegate が各値を保存して返すことを **unit 層**でピン(spawn 実行なし = in-process、fs-tests-integration-first と両立)
- 実 spawn の縦断確認: 実 plugin CLI への委譲1本(status)を integration 層に置く(委譲実体の smoke — unit fake の相殺盲点を塞ぐ)
- t67: usage 2面の同期後 green

## BR-U1-5: skeleton 境界

U1 では plugin CLI 本体・スキル・runner-gen・docs に触れない(それぞれ U2/U3/U4 の面)。dist×7+self-install の再生成と drift check green は U1 単独で完結する。
