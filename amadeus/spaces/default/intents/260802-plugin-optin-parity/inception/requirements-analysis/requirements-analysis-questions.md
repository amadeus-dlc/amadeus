# Requirements Analysis 質問

## 上流入力

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- GitHub Issue [#2018](https://github.com/amadeus-dlc/amadeus/issues/2018) と独立クロスレビュー2件
- **Mode:** guided

<!-- E-OC1 回答証跡:
leader 承認 2026-08-02T07:34:55Z（audit QUESTION_ANSWERED seq 197、全回答の最終確認「1」）
-->

## Q1. 導入対象の plugin をプロジェクトに記録するか

現行では、plugin の供給元である `plugins/<name>/`、各ハーネスへコピーした導入元ファイル、`compose` コマンドの実行結果は記録されます。一方、「このプロジェクトでは、どの plugin を各ハーネスへ導入するか」は記録されません。そのため、新しい worktree では「plugin を使わない」のか「導入すべき plugin が欠けた」のかを区別できません。

導入対象の plugin 名をプロジェクトに新しく記録するか、各ハーネスへ導入元ファイルを置いて `compose` を実行する現行手順を維持するかを選んでください。セッション開始時の処理は、作業対象の intent が選ばれる前に起動することがあるため、新しく記録するなら project root の設定が最も安定します。

A. 導入対象の plugin 名を `amadeus/config.json` に記録する（推奨）
B. 導入対象の plugin 名を project → space → intent の各設定に記録し、後の設定で上書きする
C. 導入対象の plugin 名だけを持つ別ファイルを project root に追加する
D. 新しい記録は設けず、`plugins/<name>/` の存在自体を導入意思とみなす
E. 各ハーネスの `.amadeus-plugin-src/` に置かれた導入元ファイルを引き続き正本とする
X. Other (please specify)

[Answer]: A. 導入対象の plugin 名を `amadeus/config.json` に記録する（推奨）

## Q2. OpenCode で plugin を自動導入しない現行仕様

Claude、Codex、Cursor、Kimi、Kiro CLI、Kiro IDEには、セッション開始時またはそれに相当するタイミングで `compose --if-stale` を実行する処理があります。OpenCodeにもJavaScript／TypeScript pluginのフックがあり、公式仕様は`session.created`を含むセッションイベントを提供しています。AmadeusのOpenCode用pluginも既に`chat.message`フックを利用していますが、plugin導入処理は呼び出していません。

したがって、OpenCode側の機能制約ではなく、Amadeus側の未配線です。Issue #2018で全ハーネスの挙動を揃えるなら、このOpenCode固有の未配線を修正対象に含めるかを確定します。

A. OpenCodeの公式フックからAmadeusのplugin導入処理を呼び、明示的な`compose`を不要にする（推奨）
B. OpenCodeだけは利用者が明示的に `compose` を実行する仕様を維持し、`doctor` が導入漏れを警告する
C. 配布時に OpenCode だけ plugin を常に同梱する
D. OpenCode は全ハーネスで導入状態を揃える対象から外す
E. `doctor` は警告するが、導入用のコマンドは追加しない
X. Other (please specify)

[Answer]: A. OpenCodeの公式フックからAmadeusのplugin導入処理を呼び、明示的な`compose`を不要にする（推奨）

## Q3. 初回導入時の0件と検査成功を区別する

formal-model-check pluginの導入は、検査対象の仕様ファイルを作る前でも成功する必要があります。導入時点ではpluginのステージを使えるようにするだけで、検査自体は明示的に実行するためです。

問題は、検査対象が0件でも空の内容に対するハッシュ値を作り、検査成功後と同じ「前回から変更なし」を記録できることです。初回導入の正常な0件と、検査を実行できない0件を区別します。

A. 初回導入は成功させる。0件の間は未準備として案内し、検査成功や「変更なし」は記録しない。明示的な検査は対象ファイルが揃うまでエラーにする（推奨）
B. #2018 から外し、別 Issue として起票する
C. 現行どおり、検査対象0件を正常として扱う
D. 未準備の警告は出すが、「前回から変更なし」という記録は許可する
E. formal-model-check 専用の例外として扱う
X. Other (please specify)

[Answer]: A. 初回導入は成功させる。0件の間は未準備として案内し、検査成功や「変更なし」は記録しない。明示的な検査は対象ファイルが揃うまでエラーにする（推奨）

## 裁定の記録

- Q1: A — 導入対象のplugin名をproject rootの`amadeus/config.json`へ記録する。新しいworktreeでも「導入不要」と「導入漏れ」を区別でき、intent選択前のセッション開始処理から読めるため。
- Q2: A — OpenCodeも公式pluginフックからAmadeusのplugin導入処理を呼び、他ハーネスと同じく明示的な`compose`を不要にする。OpenCodeは`session.created`を含むイベントを提供しており、現行の`manual-only`はOpenCodeの機能制約ではなくAmadeus側の未配線だからである。
- Q3: A — pluginの初回導入は検査対象0件でも成功させる。ただし0件の間は未準備として案内し、検査成功や「変更なし」を記録せず、明示的な検査は対象ファイルが揃うまでエラーにする。
- 相矛チェック: 3件は整合する。Q1のproject-level記録を全ハーネスが読み、Q2でOpenCodeを例外にせず、Q3で導入成功と検査成功を分離する。曖昧語・未回答・相互矛盾はない。
