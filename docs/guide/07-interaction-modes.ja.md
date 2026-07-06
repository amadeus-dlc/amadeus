# Interaction Modes（対話モード）

## 4 択のモード

stage が questions ファイル（`<stage>-questions.md`）を作ると、人間には、常にこの順序で 4 通りの答え方が示される。

- **Guide me**：会話の中で、質問をバッチ単位で 1 つずつ確認しながら進める。
- **Grill me**：質問を 1 問ずつ、推奨回答つきで確認する。`amadeus-grilling` のブリッジである（後述の「Grill me と grilling プロトコル」を参照）。
- **I'll edit the file**：questions ファイルへ直接回答を書き込み、書き終えたら conductor に伝える。
- **Chat**：自由に話し合う。conductor は、会話から判断を抽出する。

4 択のどれを選んでも、行き着く先は同じである。
どのモードで答えても、回答は questions ファイルの `[Answer]:` タグへ書き戻され、そのタグが唯一の正となる。
stage の途中でモードを切り替えることもできる。
たとえば Guide me で始め、残りを Chat で終えるといった進め方もできる。
harness ごとの実際の見え方は、[question-rendering annex](../../skills/amadeus/references/question-rendering.md) が定義する。

## Grill me と grilling プロトコル

Grill me を選ぶと、質問の進行は `amadeus-grilling` のブリッジプロトコルに委ねられる。
質問は 1 問ずつ提示し、まとめて出すことはない。
各質問には推奨回答とその理由を添え、conductor は人間の回答を待ってから次の質問へ進む。
これは、[amadeus-grilling skill](../../skills/amadeus-grilling/SKILL.md) が他の場面で従うのと同じ規律である。
既存のコードベースと成果物をまず調べ、人間の判断が本当に必要な点だけを尋ね、必ず推奨回答を添える。

## questions ファイル

各 stage の質問は、`<stage>-questions.md` という 1 個のファイルに、その stage の他の成果物と並べて置く。
各質問は、必要な範囲で選択肢 A から E までを持ち、末尾に必須の最終選択肢 `X. Other (please specify)` を持つ。
その下には、空欄の `[Answer]: ` タグを置く。
どのモードで答えた場合でも、回答はその質問の `[Answer]:` タグに書き込まれる。
会話がどう進んだかにかかわらず、このファイルが常に正である。
タグが 1 つでも空欄のままでは、stage は先へ進まない。

## モードと gate

対話モードの選択は、stage の質問がまだ開いている間に行う。
これは、人間がどう答えるかを決めるだけであり、できあがった成果物を受け入れるかどうかとは別である。
承認 gate は、それとは別の、あとに来る手順である。
stage が成果物を作り終え、reviewer が宣言されている場合はその判断が出たあと、人間は成果物そのものに Approve か Request Changes で答える。
gate 契約の全体は [Lifecycle Contract Overview](../amadeus/lifecycle/overview.ja.md) を参照する。

この 4 択の下にあるプロトコル層（`.agents/amadeus/amadeus-common/protocols/stage-protocol.md`）は、Guide me、I'll edit the file、Chat の 3 つだけを定義する。
harness が Grill me を 2 番目の選択肢として挿入し、人間が実際に目にする 4 択になる。

## 次に読むもの

対話モードは、stage の質問にどう答えるかを扱う。
質問し、成果物を作る側のエージェントは、前章の [Agents](06-agents.ja.md) が扱った。
各章の状態は、ガイドの[目次](index.ja.md)で確認できる。
