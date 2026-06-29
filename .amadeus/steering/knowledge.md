# Knowledge

## 背景

- Amadeus DLC 自体を Amadeus の仕組みで開発できるようにする。
- 目的は、Intent 作成後から PR 準備までの手戻りを減らすことである。
- 自己開発では、実行する側の skill、変更対象の skill、example snapshot、検証対象の `.amadeus/` が重なりやすい。

## 前提

- build workspace と target workspace は分ける方針を推奨する。
- target workspace の root `.amadeus/` を自己開発用 steering layer として扱う。
- GitHub Issue を先に作り、Intent 側に Issue URL を記録する。
- 初回導入 Intent の完了条件は Ideation gate passed である。

## 未確認事項

- stage0、stage1、stage2 を `CONTEXT.md` に追加する必要があるか。
- `examples/skill-provenance.json` だけで example snapshot の provenance が足りるか。
- host environment の assets と target artifacts の assets の混入を validator で検出する必要があるか。
- build workspace と target workspace の対応をどの成果物に記録するか。
