# Security Design — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-F01〜F04)、`../functional-design/domain-entities.md`

## SEC-F01 の実装構造(tar 経路検証)

展開ループの各エントリで、書き出し前に**単一の検証関数**を通す:

```
validateEntry(entry, destRoot): Result<SafePath, FetchError>
  1. entry.type がファイル/ディレクトリ以外(symlink/hardlink/デバイス等)→ err(payload-invalid)
  2. path.normalize(join(destRoot, entry.name)) が destRoot 配下に解決されない → err(payload-invalid)
  3. entry.name が絶対パス or Windows ドライブレター付き → err(payload-invalid)
  return ok(解決済み絶対パス)   # SafePath: 検証済みであることを型で運ぶ(Parse, Don't Validate)
```

- 書き出し関数は `SafePath` のみを受け取る(未検証パスでの書き出しが型レベルで不可能)
- 違反検出時は展開を即中止し、一時ディレクトリごと破棄(部分展開物を残さない)

## SEC-F02〜F04 の実装構造

- ホスト固定: `Http` ポート実装が `api.github.com` / `codeload.github.com` 以外への URL を拒否(リダイレクト追従前に検査)
- 一時領域: `fs.mkdtemp(os.tmpdir() + "/amadeus-setup-")` で実行ごと一意。プロセス終了ハンドラ(finally)で削除
- 入力検証: GitHub API 応答は `Json.parse` → 形状検証を Result で(壊れた応答は resolve エラー、例外を漏らさない)
