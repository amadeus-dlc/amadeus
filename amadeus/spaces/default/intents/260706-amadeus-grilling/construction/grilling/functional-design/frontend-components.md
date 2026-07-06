# Frontend Components — Amadeus Grilling 統合

**Intent**: Amadeus Grilling 統合 / **Stage**: functional-design (3.1)
**Upstream**: `../../inception/requirements-analysis/requirements.md`。GUI を持たないフレームワークのため、本書の「フロントエンド」は**ユーザーと接する対話サーフェス**(構造化質問・端末出力・スキル起動面)を指す。レンダリングは各ハーネスの question-rendering annex に委譲し、annex は変更しない(OQ-1 検証済み)。

## C-1: モード選択サーフェス(Grill me エントリ)

stage-protocol Step 2 のモード選択 ```question``` ブロックに第4選択肢を追加する。

```question
prompt: "[N]問の質問を作成しました(`[file path]`)。どの方式で回答しますか?"
header: Questions
multiSelect: false
options:
  - label: Guide me
    description: ここで対話的に回答していく
  - label: Grill me
    description: 1問ずつ深掘り — 推奨案つきで、共通理解に達するまで問い続けます{Construction/Operation では末尾に「(このフェーズでは例外的な利用です)」}
  - label: I'll edit the file
    description: 質問ファイルを直接編集する
  - label: Chat
    description: 自由に議論して決定事項を抽出する
```

- 表示順は既存3モードの間(Guide me の直後)— 対話系→ファイル系→自由系の並び。
- フェーズ条件つき注記(BR-W1)はプロトコル prose で指定し、レンダリングは annex の既存マッピングに乗る。

## C-2: grilling 質問サーフェス(1問提示)

1質問=1スペックブロック。annex の既存フィールドマッピング(prompt/header/multiSelect/options)をそのまま使う。

```question
prompt: "Q[n]. [質問文]。[推奨の根拠を1〜2文]"
header: "[論点の短いラベル]"
multiSelect: false
options:
  - label: "[推奨案の要約](推奨)"
    description: "[推奨案の説明]"
  - label: "[代替案B]"
    description: "[説明]"
  - label: "[代替案C]"
    description: "[説明]"
```

- **不変条件**: 1呼び出し1質問(BR-D1)。選択肢は2〜4(annex の上限内)。「Other」はハーネスのビルトインまたは annex 規定の明示オプション(既存契約のまま)。
- 推定確認(kind=estimate-confirm)の変形: prompt に「調査の結果、〜と推定します(確度: 高/中/低)」を含め、options は「はい、その前提で進めて(推奨)」/「いいえ、違う(→ 通常質問に降格)」の2択。

## C-3: 継続確認サーフェス(depth 目安到達時)

```question
prompt: "depth 目安([N]問)に達しました。ここまでで主要論点は[充足状況の1文]。続けますか?"
header: 継続確認
multiSelect: false
options:
  - label: "サマリへ進む(推奨)"
    description: 合意サマリを確認して終了する
  - label: "続けて"
    description: さらに深掘りを続ける
```

「done」はこのサーフェスに限らず、対話中いつでもテキストで受け付ける(BR-D6)。

## C-4: 合意サマリサーフェス(終了確認)

端末に全決定事項の表(質問→決定)を表示した直後に提示する:

```question
prompt: "以上が合意事項の全量です。この理解で確定してよいですか?"
header: 共通理解
multiSelect: false
options:
  - label: "はい、確定(推奨)"
    description: workflow: 成果物生成へ / standalone: 終了
  - label: "修正したい"
    description: 修正箇所を指定(該当回答を更新してサマリを再提示)
```

確定選択まで生成フローへ遷移しない(AC-4.3)。

## C-5: スキル起動サーフェス(/amadeus-grilling)

- **frontmatter**(read-only セッションスキルの既存契約): `name: amadeus-grilling` / `description: <対象を1問ずつ深掘りする…>` / `argument-hint: "<file-or-topic>"` / `user-invocable: true` / `classification: read-only`
- 引数あり: その対象で Investigate から開始。引数なし: 「何を深掘りしますか?」を最初の1問として提示(BR-S2)。
- 終了時: 端末にサマリ表示。「サマリを <path> に保存して」の明示要求時のみ Write(BR-S3)。

## ハーネス別の描画(annex 委譲 — 変更なし)

| ハーネス | C-1〜C-4 の描画 | 根拠 |
|---|---|---|
| claude | AskUserQuestion ツール(1:1 マッピング、ビルトイン Other) | 既存 annex |
| codex / kiro / kiro-ide | 各 annex の既存規定(番号付きテキスト等) | 既存 annex |

スペックブロックはハーネス中立(C-1〜C-4 とも)。annex への変更は不要 — これが OQ-1 の設計上の帰結であり、NFR-2(パリティ)の実現手段。
