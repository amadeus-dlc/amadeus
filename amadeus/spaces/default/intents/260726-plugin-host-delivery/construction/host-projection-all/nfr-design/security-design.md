# セキュリティ設計 — U3 host-projection-all

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions

## SEC-U3-1 への設計: OutDirRefusal の plan 段検査

`security-requirements.md` SEC-U3-1 と `business-logic-model.md` フロー 1 の「outDir 安全検査(OutDirRefusal — plan 段で mutation 前拒否)」を、**pure な判定関数+mutation 前の呼出し位置固定**の 2 層で設計する:

```
classifyOutDir(outDir: string, probe: OutDirProbe): OutDirVerdict
  OutDirProbe   … { lstatKind: "missing" | "dir" | "file" | "symlink" | "broken-symlink", isPriorProjection: boolean, isForeign: boolean }
  OutDirVerdict … { kind: "ok" } | { kind: "refused", reason: OutDirRefusal }
  OutDirRefusal … "non-projection-dir" | "foreign" | "file" | "symlink" | "broken-symlink"
```

- **層 1(判定の純粋性)**: `classifyOutDir` は fs に触れない純関数とし、lstat 結果を `OutDirProbe` として引数で受ける(parse-don't-validate — 検査済みであることを `OutDirVerdict` 型で運ぶ)。拒否 5 分類は ADR-5 の拒否集合(component-methods.md C3)と 1:1
- **層 2(呼出し位置の契約)**: 判定は各面の投影ループ先頭(いかなる mkdir / write より前)で行い、`refused` なら当該実行は書込ゼロで exit する。「plan 段で拒否 → mutation」の順序は `reliability-requirements.md` REL-U3-4(アトミック性)と共有する順序契約
- **真正な先行投影ディレクトリの識別**: `isPriorProjection` は投影物に同梱するマーカー(投影 metadata — `reliability-requirements.md` REL-U3-2 の hash 記録と同居)の実在で判定し、マーカーの無い既存ディレクトリは `non-projection-dir` として拒否する(FOREIGN)。両側実測(正当な既存投影で赤くならない)は corpus-sweep-for-new-guards に従い fixture 対照で固定
- **エラー表面**: 拒否時は `OutDirRefusal` reason を 1 行 usage エラーへ写像し、生 ENOTDIR/EEXIST stack を出さない(`business-logic-model.md` エラー処理)。exit 非 0

## SEC-U3-2 への設計: トークン置換の閉じた経路

`security-requirements.md` SEC-U3-2 のとおり、置換は既存 harness-transform の関数呼出しのみとし、新規のテンプレート評価・動的 import・eval 相当を導入しない。設計上の担保: 投影モジュールの import 面を既存 harness-transform+node:fs 系に限定し、レビューで import 一覧を検分する(新規依存ゼロは tech-stack-decisions.md と共有)。

## SEC-U3-3 への設計: 認可・監査面への非干渉

`security-requirements.md` SEC-U3-3 のとおり、U3 の変更面は `scripts/package.ts` 編入セクション+投影モジュールに閉じ、directive contract / state transition / audit invariant のコードへ触れない。検証は既存認可テスト群の green 維持(非干渉の実証)で行い、性能・スケール面(`performance-requirements.md` / `scalability-requirements.md`)の設計も同じ変更面境界内に収まる。

## 非該当カテゴリ

N/A — `security-requirements.md` 非該当カテゴリ(認証情報 / ネットワーク入力)の N/A を参照継承。
