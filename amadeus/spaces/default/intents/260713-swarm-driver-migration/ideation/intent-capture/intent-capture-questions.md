# Intent Capture Questions

**Mode:** Grill me

## Q1. 新しいdriver契約が解決する中心問題

`AMADEUS_USE_SWARM`はClaudeのDynamic Workflow選択に偏り、Codexでは`codex exec`へのloud degradation、Kiroでは実質的なno-opになるため、同じ値でもハーネスごとに意味が異なります。

推奨は、各ハーネスで利用可能な最良driverを`auto`が選び、必要な場合だけ利用者が明示overrideできる契約です。これなら通常利用の簡潔さと、Ultra・Agent Team等の能力を確実に指定する運用を両立できます。

- A. 能力ベースの`auto`を既定にし、明示driver指定をoverrideとして提供する（推奨）
- B. 誤選択を避けるため、利用者に常にdriverの明示指定を要求する
- C. 旧フラグの狭い置換に留め、ハーネスごとの暗黙分岐を維持する
- X. Other（具体的に記述）

[Answer]: A. 能力ベースの`auto`を既定にし、明示driver指定をoverrideとして提供する（推奨） — User input: `1` — 2026-07-13T04:30:02Z — Mode: Grill me

## Q2. 最優先の利用者

この変更には、Amadeusを実行する利用者・チームと、各ハーネスの統合を保守する開発者という二種類の受益者がいます。

推奨は、AmadeusをClaude Code・Codex・Kiroで実行する利用者を第一に置き、ハーネス保守者は第二のステークホルダーとすることです。公開契約を利用者中心に固定し、内部のdriver追加容易性はその契約を支える手段として扱えます。

- A. Amadeusを各ハーネスで実行する利用者・チームを最優先にする（推奨）
- B. driverを追加・保守するハーネス開発者を最優先にする
- C. 両者を同格の最優先ステークホルダーとして扱う
- X. Other（具体的に記述）

[Answer]: A. Amadeusを各ハーネスで実行する利用者・チームを最優先にする（推奨） — User input: `1` — 2026-07-13T04:30:47Z — Mode: Grill me

## Q3. 最優先の成功指標

driverの追加には、選択の確実性、実行性能、拡張容易性という異なる成功軸があります。

推奨は信頼性と追跡可能性を第一にし、同じ能力条件では同じdriverが選ばれ、選択結果とfallbackが監査可能で、silent degradationが起きないことを主要成功指標にすることです。性能と拡張容易性は、その契約を壊さない範囲で改善できます。

- A. 決定的な選択、監査可能性、silent degradation防止を最優先にする（推奨）
- B. Unit並列度、完了時間、token効率などの実行性能を最優先にする
- C. 新しいdriverを少ない変更で追加できる拡張容易性を最優先にする
- X. Other（具体的に記述）

[Answer]: A. 決定的な選択、監査可能性、silent degradation防止を最優先にする（推奨） — 2026-07-13T04:35:08Z — Mode: Grill me

**追加必須条件（User input verbatim）:**

```text
1


Claude Code: Agent Teams, Ultra Code
Codex: Ultra

がきちんと使えること
```

## Q4. `AMADEUS_USE_SWARM`の廃止方法

旧フラグを即時削除すると既存利用者を壊し、恒久aliasにするとboolean由来の曖昧さが残ります。

推奨は段階的廃止です。`AMADEUS_SWARM_DRIVER`を正本として優先し、旧フラグは期限付きで解釈してdeprecationを明示、両方が矛盾する場合はエラーにします。次のbreaking releaseで旧フラグを削除できます。

- A. 期限付き互換期間を設けて警告し、次のbreaking releaseで削除する（推奨）
- B. 新driver導入と同時に旧フラグを即時削除する
- C. 旧フラグを恒久aliasとして維持する
- X. Other（具体的に記述）

[Answer]: A. 期限付き互換期間を設けて警告し、次のbreaking releaseで削除する（推奨） — User input: `1` — 2026-07-13T04:35:51Z — Mode: Grill me

## Q5. 指定driverが利用不能な場合の挙動

利用者がAgent Teams、Ultra Code、Codex Ultraを明示指定したのに別driverへ自動fallbackすると、コマンド自体は成功しても要求した能力を使った保証がなくなります。一方、`auto`は環境差を吸収するための選択なので、安全なfallbackに価値があります。

推奨は、明示driver指定では利用不能をhard errorにし、`auto`の場合だけ監査付きのloud degradationを許可することです。

- A. 明示指定はhard error、`auto`だけ監査付きfallbackを許可する（推奨）
- B. 明示指定でも警告後に利用可能なdriverへfallbackする
- C. `auto`を含め、最適driverが利用不能なら常にhard errorにする
- X. Other（具体的に記述）

[Answer]: A. 明示指定はhard error、`auto`だけ監査付きfallbackを許可する（推奨） — User input: `1` — 2026-07-13T04:36:57Z — Mode: Grill me

## Q6. Claude Codeの`auto`選択原則

Agent Teamsは少数の長時間peerが共有taskと相互通信で協調する方式、Ultra Codeはスクリプトが多数のsubagentと反復・分岐を制御する方式です。どちらかを常に優先すると、Unit構造とdriver特性が合わない場合があります。

推奨はtask topologyで選ぶことです。Unit間の議論・動的調整が重要ならAgent Teams、独立Unitの大量fan-out・反復可能な収束処理ならUltra Codeを選択します。

- A. task topologyに応じてAgent TeamsとUltra Codeを選ぶ（推奨）
- B. 利用可能なら常にAgent Teamsを優先する
- C. 利用可能なら常にUltra Codeを優先する
- X. Other（具体的に記述）

[Answer]: A. task topologyに応じてAgent TeamsとUltra Codeを選ぶ（推奨） — User input: `1` — 2026-07-13T04:38:07Z — Mode: Grill me

## Q7. Grillingの継続確認

Standard depthの目安に到達しました。中心問題、対象利用者、成功指標、必須native能力、旧フラグ移行、fallback、Claude Code内のdriver選択原則を一通り決定できています。

- A. 合意内容の要約へ進む（推奨）
- B. さらに質問を続ける
- X. Other（具体的に記述）

[Answer]: A. 合意内容の要約へ進む（推奨） — User input: `1` — 2026-07-13T04:38:50Z — Mode: Grill me

## Q8. 合意内容の最終確認

全決定を要約し、曖昧さと矛盾がないことを確認しました。この理解をIntent Capture成果物の生成基準として確定するかを選択します。

- A. はい、合意内容を確定する（推奨）
- B. 修正したい項目がある
- X. Other（具体的に記述）

[Answer]: A. はい、合意内容を確定する（推奨） — User input: `1` — 2026-07-13T04:39:48Z — Mode: Grill me

## Q9. Learnings候補の保存

Intent固有の契約として成果物には保存済みです。次回以降の全project workflowにも適用する永続practiceとして保存する候補を選択します。

- 0. 永続practiceには保存しない（推奨）
- 1. native swarm能力を完了条件として扱う
- 2. explicit指定を能力保証として扱う
- 3. boolean互換性を即時削除せず期限付きで残す
- 4. Claudeのnative方式を一律優先にしない
- X. Other（保存候補とscopeを具体的に記述）

[Answer]: 0. 永続practiceには保存しない（推奨） — User input: `学習は0` — 2026-07-13T04:55:36Z

## Q10. 次回に向けた追加事項

今回のmemoryにない追加のInterpretation、Deviation、Tradeoff、Open questionがあるかを確認します。

- 0. 追加なし（推奨）
- X. 追加内容を自由記述

[Answer]: 0. 追加なし（推奨） — User input: `1` — 2026-07-13T04:56:04Z
