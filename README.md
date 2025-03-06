# 医療データ処理システム

このアプリケーションは、医療機関で使用される複数のCSVファイルを処理し、医管未算定患者の情報を抽出するためのシステムです。

## 機能

- 複数のCSVファイル（患者メモ、患者マスタ、医管算定患者一覧、来院患者一覧）をアップロード
- データの処理と分析
- 結果のCSVダウンロード
- 処理結果のプレビュー表示

## 技術スタック

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- PapaParse (CSVパーサー)
- Lodash (ユーティリティ関数)

## 使用方法

1. 必要なパッケージをインストール:

```bash
npm install
# または
yarn install
```

2. 開発サーバーを起動:

```bash
npm run dev
# または
yarn dev
```

3. ブラウザで http://localhost:3000 にアクセス

4. 各CSVファイルをアップロードし、「データ処理実行」ボタンをクリックして処理を開始

5. 処理が完了したら、「結果をダウンロード」ボタンでCSVファイルをダウンロード可能

## 入力ファイル形式

- **D_KJMK.csv**: 患者メモ情報 (Shift-JIS エンコード)
- **D_KNJM.csv**: 患者マスタ情報 (CP932 エンコード)
- **ikan.csv**: 医管算定患者一覧 (CP932 エンコード)
- **knall.csv**: 来院患者一覧 (CP932 エンコード)

## 出力ファイル

- **thismonth.csv**: 医管未算定患者の情報（カルテ番号、氏名、メモ内容）
# Medical-Data-Processing
# Medical-Data-Processing
# Medical-Data
# Medical-Data
# Medical-Data
# Medical-Data
# Medical-Data
