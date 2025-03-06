'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// ファイルの型を定義
interface FileState {
  KJMK: File | null;
  KNJM: File | null;
  ikan: File | null;
  knall: File | null;
}

const MedicalDataProcessor = () => {
  const [files, setFiles] = useState<FileState>({
    KJMK: null,
    KNJM: null,
    ikan: null,
    knall: null
  });
  const [processedData, setProcessedData] = useState<any[] | null>(null);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  // ファイル添付ハンドラー
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      setStatus(`${fileType} ファイルが添付されました: ${file.name}`);
    }
  };

  // ファイル削除ハンドラー
  const handleDeleteFile = (fileType: string) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    setStatus(`${fileType} ファイルが削除されました`);
  };

  // CSVパーサー関数
  const parseCSV = (file: File, options: {
    encoding?: string;
    header?: boolean;
    transformHeader?: (header: string) => string;
  }) => {
    return new Promise<any[]>((resolve, reject) => {
      // ファイル名からエンコーディングを判断
      let defaultEncoding = 'UTF-8';
      if (file.name.includes('KNJM') || file.name.includes('knjm')) {
        defaultEncoding = 'Shift_JIS';
      }
      
      Papa.parse<any>(file, {
        header: options.header !== undefined ? options.header : true,
        skipEmptyLines: true,
        encoding: options.encoding || defaultEncoding,
        transformHeader: options.transformHeader,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  // データ処理関数
  const processData = async () => {
    try {
      setProcessing(true);
      setStatus('データ処理中...');

      // すべてのファイルが添付されていることを確認
      if (!files.KJMK || !files.KNJM || !files.ikan || !files.knall) {
        setStatus('すべてのファイルを添付してください');
        setProcessing(false);
        return;
      }

      // ファイルを解析（Pythonコードと同じエンコーディングを使用）
      console.log('パース開始: D_KJMK.csv');
      const df_KJMK = await parseCSV(files.KJMK, { 
        encoding: 'shift-jis', // Pythonコードと同じエンコーディング
        transformHeader: (header: string): string => header.trim()
      });
      console.log('D_KJMK.csv パース完了:', df_KJMK.length, '件');
      
      console.log('パース開始: D_KNJM.csv');
      const df_KNJM = await parseCSV(files.KNJM, { 
        encoding: 'cp932', // Pythonコードと同じエンコーディング
        transformHeader: (header: string): string => header.trim()
      });
      console.log('D_KNJM.csv パース完了:', df_KNJM.length, '件');
      
      // 各ファイルをパース（Pythonコードと同じエンコーディング）
      console.log('パース開始: ikan.csv');
      const df_ikan = await parseCSV(files.ikan, { 
        encoding: 'cp932', // Pythonコードと同じエンコーディング
        header: false
      });
      console.log('ikan.csv パース完了:', df_ikan.length, '件');
      
      console.log('パース開始: knall.csv');
      const df_knall = await parseCSV(files.knall, { 
        encoding: 'cp932', // Pythonコードと同じエンコーディング
        header: false
      });
      console.log('knall.csv パース完了:', df_knall.length, '件');
      
      console.log('医管患者読み込み完了:', df_ikan.length, '件');
      console.log('来院歴読み込み完了:', df_knall.length, '件');

      // D_KJMKから必要な列を取得（カルテ番号と患者メモ）
      const filteredKJMK = df_KJMK.map(row => ({
        KNJ_KNR_NO: row.KNJ_KNR_NO,
        NAIYO: row.NAIYO
      }));

      // D_KNJMから必要な列を取得（カルテ番号、姓名、KNJ_KNR_NO）
      const filteredKNJM = df_KNJM.map(row => ({
        KNJ_KNR_NO: row.KNJ_KNR_NO,
        KARUTE_NO: row.KARUTE_NO,
        SIMEI: row.SIMEI
      }));

      // ikan.csvのデータ整形（Pythonコードと同じカラム指定）
      const mappedIkan = df_ikan.map((row, index) => {
        if (index === 0) return null; // ヘッダー行をスキップ
        return {
          KARUTE_NO: row[0], // カルテNO
          SIMEI: row[2]      // 氏名
        };
      }).filter(Boolean);
      console.log('ikan.csv 整形完了:', mappedIkan.length, '件');

      // knall.csvのデータ整形（Pythonコードと同じカラム指定）
      const mappedKnall = df_knall.map((row, index) => {
        if (index === 0) return null; // ヘッダー行をスキップ
        return {
          KARUTE_NO: row[0], // カルテNO
          SIMEI: row[2]      // 氏名
        };
      }).filter(Boolean);
      console.log('knall.csv 整形完了:', mappedKnall.length, '件');

      // データ結合処理
      // 患者マスタと患者メモの結合（Pythonコードと同じロジック）
      console.log('データ結合処理開始: 患者マスタと患者メモの結合');
      const df_kanjya = _.chain(filteredKJMK)
        .map(kjmk => {
          const matchingKNJM = filteredKNJM.find(knjm => 
            knjm.KNJ_KNR_NO === kjmk.KNJ_KNR_NO
          );
          if (matchingKNJM) {
            return {
              KARUTE_NO: matchingKNJM.KARUTE_NO,
              SIMEI: matchingKNJM.SIMEI,
              NAIYO: kjmk.NAIYO
            };
          }
          return null;
        })
        .filter(Boolean)
        .uniqBy('KARUTE_NO') // 重複削除（df_kanjya = df_kanjya.drop_duplicates(subset='KARUTE_NO')と同等）
        .value();
      console.log('患者マスタと患者メモの結合完了:', df_kanjya.length, '件');

      // 全ての診療患者（Pythonコードのconcat相当）
      console.log('来院患者と医管算定患者の結合処理開始');
      const df_6 = [...mappedKnall, ...mappedIkan];
      console.log('来院患者と医管算定患者の結合完了:', df_6.length, '件');
      
      // 医管未算定患者の特定（来院したが医管算定されていない患者）
      // Pythonコードのdrop_duplicates(keep=False)相当の処理
      console.log('医管未算定患者の特定処理開始');
      
      // カルテNOでグループ化し、グループサイズが1のみを残す（重複していないもの）
      const karute_counts = _.countBy(df_6, 'KARUTE_NO');
      const df_no_ikan = df_6.filter(item => item && item.KARUTE_NO && karute_counts[item.KARUTE_NO] === 1);
      
      console.log('医管未算定患者特定完了:', df_no_ikan.length, '件');

      // 医管未算定患者と患者メモを持つ患者の結合（Pythonコードのmergeに相当）
      console.log('最終結果の生成開始');
      
      // カルテNOを数値型に変換して一致を確実にする
      const ensureNumber = (val: any): number => {
        if (typeof val === 'number') return val;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };
      
      // KARUTE_NOをすべて数値として扱う
      const df_kanjya_with_numeric = df_kanjya
        .filter(row => row !== null && row !== undefined)
        .map(row => ({
          ...row,
          KARUTE_NO_NUM: ensureNumber(row.KARUTE_NO)
        }));
      
      const df_no_ikan_with_numeric = df_no_ikan
        .filter(row => row !== null && row !== undefined)
        .map(row => ({
          ...row,
          KARUTE_NO_NUM: ensureNumber(row.KARUTE_NO)
        }));
      
      // Pythonのmergeと同様の処理（内部結合）
      const df_comp = df_kanjya_with_numeric
        .filter(kanjya => 
          df_no_ikan_with_numeric.some(no_ikan => 
            no_ikan.KARUTE_NO_NUM === kanjya.KARUTE_NO_NUM
          )
        )
        .map(kanjya => ({
          KARUTE_NO: kanjya.KARUTE_NO,
          SIMEI: kanjya.SIMEI,  // Pythonコードでは_xが付くところ
          NAIYO: kanjya.NAIYO
        }));
        
      console.log('最終結果の生成完了:', df_comp.length, '件');

      setProcessedData(df_comp);
      setStatus('データ処理が完了しました');
      setProcessing(false);
    } catch (error) {
      console.error('データ処理エラー:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '不明なエラーが発生しました';
      setStatus(`エラーが発生しました: ${errorMessage}`);
      setProcessing(false);
    }
  };

  // Excel対応のCSV生成関数
  const generateExcelCSV = (data: any[]) => {
    console.log('CSV生成開始: ブラウザ上での日本語対応');
    
    // Excelが日本語を認識するためのBOM
    const BOM = '\uFEFF';
    
    // ヘッダー行
    let csvContent = BOM + 'カルテNO,氏名,メモ内容\r\n';
    
    // データ行
    data.forEach(row => {
      try {
        // データのパースと無効文字のチェック
        const karute_no = row.KARUTE_NO ? row.KARUTE_NO.toString() : '';
        const simei = row.SIMEI ? row.SIMEI.toString() : '';
        const naiyo = row.NAIYO ? row.NAIYO.toString() : '';
        
        // ダブルクォートで囲み、カンマをエスケープ
        const karute = `"${karute_no.replace(/"/g, '""')}"`;
        const simei_escaped = `"${simei.replace(/"/g, '""')}"`;  // 日本語氏名
        const naiyo_escaped = `"${naiyo.replace(/"/g, '""')}"`;  // メモ内容
        
        csvContent += `${karute},${simei_escaped},${naiyo_escaped}\r\n`;
        
        // デバッグ用
        if (data.length < 5) {
          console.log('行データ:', { カルテNO: karute_no, 氏名: simei, メモ: naiyo });
        }
      } catch (error) {
        console.error('CSV生成エラー:', error, '対象行:', row);
      }
    });
    
    console.log('CSV生成完了:', data.length, '件のデータをCSV化');
    return csvContent;
  };

  // 処理結果をダウンロード
  const handleDownload = () => {
    if (!processedData) {
      setStatus('ダウンロードするデータがありません');
      return;
    }

    try {
      // Excel対応のCSVを生成
      const csvContent = generateExcelCSV(processedData);
      
      // Blobを作成 - 日本語の文字化けを解消するためにUTF-8を使用
      // BOM付きUTF-8でExcelが日本語を認識できるようにする
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      
      // ダウンロード処理
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `医管対象患者_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // ユーザーへの注意事項を表示
      setStatus('ファイルがダウンロードされました。\n\nExcelで開く際の注意: データタブから「テキストファイルから」を選択し、文字コードをUTF-8に指定してください。');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '不明なエラーが発生しました';
      setStatus(`ダウンロード中にエラーが発生しました: ${errorMessage}`);
    }
  };

  // 処理結果を削除
  const handleDeleteResult = () => {
    setProcessedData(null);
    setStatus('処理結果が削除されました');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">医療データ処理システム</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">ファイルのアップロード</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KJMK ファイル */}
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">患者メモ (D_KJMK.csv)</h3>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'KJMK')}
                className="flex-1"
              />
              {files.KJMK && (
                <button
                  onClick={() => handleDeleteFile('KJMK')}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  削除
                </button>
              )}
            </div>
            {files.KJMK && (
              <p className="mt-2 text-sm text-gray-600">{files.KJMK.name}</p>
            )}
          </div>
          
          {/* KNJM ファイル */}
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">患者マスタ (D_KNJM.csv)</h3>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'KNJM')}
                className="flex-1"
              />
              {files.KNJM && (
                <button
                  onClick={() => handleDeleteFile('KNJM')}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  削除
                </button>
              )}
            </div>
            {files.KNJM && (
              <p className="mt-2 text-sm text-gray-600">{files.KNJM.name}</p>
            )}
          </div>
          
          {/* ikan ファイル */}
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">医管算定患者一覧 (ikan.csv)</h3>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'ikan')}
                className="flex-1"
              />
              {files.ikan && (
                <button
                  onClick={() => handleDeleteFile('ikan')}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  削除
                </button>
              )}
            </div>
            {files.ikan && (
              <p className="mt-2 text-sm text-gray-600">{files.ikan.name}</p>
            )}
          </div>
          
          {/* knall ファイル */}
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">来院患者一覧 (knall.csv)</h3>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'knall')}
                className="flex-1"
              />
              {files.knall && (
                <button
                  onClick={() => handleDeleteFile('knall')}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  削除
                </button>
              )}
            </div>
            {files.knall && (
              <p className="mt-2 text-sm text-gray-600">{files.knall.name}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={processData}
          disabled={processing || !files.KJMK || !files.KNJM || !files.ikan || !files.knall}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {processing ? '処理中...' : 'データ処理実行'}
        </button>
        
        <button
          onClick={handleDownload}
          disabled={!processedData}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
        >
          結果をダウンロード
        </button>
        
        <button
          onClick={handleDeleteResult}
          disabled={!processedData}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
        >
          結果を削除
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">ステータス</h2>
        <p className="mb-4">{status}</p>
        
        {processedData && (
          <div>
            <h3 className="font-medium mb-2">処理結果プレビュー ({processedData.length} 件)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">カルテNO</th>
                    <th className="py-2 px-4 border">氏名</th>
                    <th className="py-2 px-4 border">メモ内容</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td className="py-2 px-4 border">{row.KARUTE_NO}</td>
                      <td className="py-2 px-4 border">{row.SIMEI}</td>
                      <td className="py-2 px-4 border">{row.NAIYO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {processedData.length > 10 && (
                <p className="mt-2 text-sm text-gray-600">
                  全 {processedData.length} 件中 10 件を表示しています
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalDataProcessor;
