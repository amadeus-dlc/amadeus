# 実現可能性と制約の質問

- **モード:** Grill me
- **深度:** Standard

## Q1. Codex ドライバーの正本サーフェス

調査では、ローカルの Codex CLI 0.144.0 は `gpt-5.6-sol` の `ultra` を受理し、現在設定されている `xhigh` とは別の「自動タスク委譲」サーフェスとして公開しています。一方、Responses API の Multi-agent はベータ版で、API キーと SDK に依存する別サーフェスです。Amadeus の既存のローカル認証・設定・worktree 契約を保つには、`codex exec` の Ultra を正本にするのが最小かつ直接的です。

Codex のネイティブドライバーは、どのサーフェスを正本にしますか？

1. **ローカル Codex Ultra（推奨）** — `codex exec` の `ultra` を使用し、事前の能力検査に失敗した明示指定はハードエラーにする
2. **Responses API Multi-agent** — ベータ API を直接呼ぶドライバーを正本にする
3. **両方を同格で提供** — ローカル CLI と Responses API を別々の第一級ドライバーとして提供する
4. **その他** — 自由記述

**回答:** 1

## Q2. Claude Code Agent Teams の非対話実行契約

Agent Teams は現在も実験的機能で、`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が必要です。Claude Code の制約として、チームのネストと in-process teammate のセッション再開はできません。また、Ultra Code の `claude -p --effort ultracode` と異なり、公式文書は Agent Teams の print mode 対応を明示していません。Amadeus の Code Generation は別プロセス実行であるため、「Agent Teams を選んだのに通常サブエージェントへ置換された」状態を成功扱いしない契約が必要です。

Claude Code Agent Teams の明示指定を、どの契約で提供しますか？

1. **ネイティブ実行を能力検査で保証（推奨）** — Amadeus が環境変数を設定して `claude -p` を起動し、実際の Team 起動を検証する。利用不能なら明示指定はハードエラー、`auto` のみ Ultra Code へフォールバックできる
2. **対話セッション限定** — Agent Teams はユーザーの対話セッションでのみ扱い、非対話 Code Generation では選択不可にする
3. **Amadeus が疑似 Team を実装** — 複数の `claude -p` を独自管理し、Agent Teams 相当として扱う
4. **その他** — 自由記述

**回答:** 1

## Q3. `auto` のドライバー選択方針

Claude Code では Agent Teams と Ultra Code の両方が候補になりますが、得意な作業形態が異なります。Agent Teams は teammate 間の直接連携と共有タスクリストが必要な協調作業に向き、Ultra Code はリードが統括する分解・並列実行・収束に向きます。どちらも明示指定では利用可能性を厳密に保証しつつ、`auto` には再現可能な選択規則が必要です。

`AMADEUS_SWARM_DRIVER=auto` は、何を基準にドライバーを選択しますか？

1. **タスク構造に基づく決定的選択（推奨）** — Unit 間の相互調整が必要なら Agent Teams、独立並列・反復収束なら Ultra Codeを選ぶ。選択理由を監査ログへ残す
2. **常に最上位候補を優先** — Claude では Agent Teams を常に先に試し、利用不能な場合だけ Ultra Codeへフォールバックする
3. **ユーザー設定を優先** — `auto` 自体は判断せず、ハーネスごとの設定済みデフォルトを使用する
4. **その他** — 自由記述

**回答:** 1

## Q4. 公開ドライバー名

明示指定は「要求したネイティブ機能が使えなければハードエラー」という契約です。そのため、`ultra` や `native` のようにハーネスごとに意味が変わる名前より、どの製品のどの実行面を要求したかが一意に分かる名前のほうが、設定・診断・監査を同じ語彙で扱えます。

`AMADEUS_SWARM_DRIVER` の公開値は、どの命名方式にしますか？

1. **ハーネス修飾名（推奨）** — `auto | claude-agent-teams | claude-ultracode | codex-ultra | kiro-subagent`
2. **機能の短縮名** — `auto | agent-teams | ultracode | ultra | subagent`
3. **抽象名** — `auto | team | workflow | native | fallback` とし、実体はハーネスごとに解決する
4. **その他** — 自由記述

**回答:** 1

## Q5. `AMADEUS_USE_SWARM` の廃止期限

現在の公開タグは 0.1.x 系です。旧変数と新変数を同時に長く維持すると、各ハーネスの選択表・警告・テストが二重化します。一方、即時削除では既存の CI や利用者設定を予告なく壊します。そのため、0.1.x の互換期間中だけ警告付きで受理し、次の breaking minor である 0.2.0 で削除する境界が明確です。

`AMADEUS_USE_SWARM` は、いつ削除しますか？

1. **0.2.0 で削除（推奨）** — 残りの 0.1.x では deprecation warning 付きで受理し、0.2.0 で完全削除する
2. **0.3.0 まで延長** — 0.2.x でも互換処理を維持し、0.3.0 で削除する
3. **次回リリースで即時削除** — 互換期間を設けず、旧変数をエラーにする
4. **その他** — 自由記述

**回答:** 1

## Q6. 互換期間中の旧 boolean の意味

現行契約では、Claude Code の `AMADEUS_USE_SWARM=1` は Ultra Code、それ以外は subagent floor です。Codex と Kiro では `=1` でもネイティブな方式には切り替わらず、警告付きで各ハーネスの floor を使います。新しい `auto` へ一律変換すると、既存設定の実行方式が互換期間中に変わるため、旧変数が明示されている場合だけ従来のハーネス別挙動を再現するのが安全です。

0.1.x の互換期間中、`AMADEUS_USE_SWARM` をどう解釈しますか？

1. **旧挙動を忠実に再現（推奨）** — `1` とそれ以外を現行どおりハーネス別に解決し、必ず deprecation warning を出す。旧・新変数の同時指定はエラー。旧変数が未設定の場合だけ新しい既定値 `auto` を使う
2. **`1` を `auto` の別名にする** — 旧 `1` でも新しいネイティブドライバー選択を行い、それ以外も既定の `auto` と同じにする
3. **`1` だけ受理する** — 旧 `1` は `auto` へ変換し、`0` など他の明示値はエラーにする
4. **その他** — 自由記述

**回答:** 1

## Q7. ネイティブドライバーの完了証明

コマンド文字列や環境変数だけをテストしても、Claude Code が実際に Team / Workflow を起動したことや、Codex が Ultra で委譲したことは証明できません。一方、認証済み CLI を使う live test だけでは、全選択分岐やエラー契約を安定して網羅できません。そのため、決定的テストと live multi-Unit 実行を組み合わせる必要があります。

この Intent を完了扱いにするため、どの検証水準を必須にしますか？

1. **決定的テスト＋live 収束証明（推奨）** — 全選択表・エラー・監査を自動テストし、Claude Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent の各ドライバーで 2 Unit 以上を実際に起動して収束まで確認する。live 証跡がないドライバーは完了扱いにしない
2. **決定的テストのみ** — コマンド・環境変数・選択表を mock / integration test で検証し、live 実行はリリース後の任意確認にする
3. **live smoke のみ** — 各ドライバーの代表実行だけを確認し、選択表の網羅テストは最小限にする
4. **その他** — 自由記述

**回答:** 1

## Q8. 決定内容の最終確認

ここまでの回答を、次の実現可能性契約として解釈します。

1. Codex の正本はローカル CLI の `codex exec` Ultra とし、Responses API Multi-agent は対象外とする。
2. Claude Agent Teams は `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` を設定したネイティブな別プロセス実行とし、Team の実起動を検証できた場合だけ成功とする。明示指定時は代替せず、利用不能ならハードエラーにする。
3. `auto` は task topology から決定的に選択する。Claude では Unit 間の相互調整が必要なら Agent Teams、独立並列・反復収束なら Ultra Code とし、選択理由を監査する。
4. 公開値は `auto | claude-agent-teams | claude-ultracode | codex-ultra | kiro-subagent` とする。ハーネス不一致の明示指定はハードエラーにする。
5. `AMADEUS_USE_SWARM` は 0.1.x で警告付き互換を維持し、0.2.0 で削除する。
6. 0.1.x では旧変数の現行ハーネス別挙動を忠実に再現する。旧・新変数の同時指定はエラーとし、旧変数未設定時だけ新しい既定値 `auto` を使う。
7. 完了には、全選択表・エラー・監査の決定的テストと、Claude Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent の各ドライバーによる 2 Unit 以上の live 収束証跡を必須とする。

この解釈で実現可能性評価を確定してよいですか？

1. **この内容で確定（推奨）** — 実現可能性評価を作成して次へ進む
2. **一部を修正** — 修正したい項目番号と内容を指定する
3. **グリルを継続** — 未決事項について追加質問を続ける
4. **その他** — 自由記述

**回答:** 1
