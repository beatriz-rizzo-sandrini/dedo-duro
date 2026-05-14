import { useState, useEffect } from 'react';

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON do Google Sheets", error);
    return [];
  }
}

export function useGoogleSheets(sheetName) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`);
        const text = await response.text();
        const rows = parseGoogleJSON(text);
        setData(rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sheetName]);

  return { data, loading, error };
}

export function useMultipleGoogleSheets(sheetNames) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const results = await Promise.all(
          sheetNames.map(async (name) => {
            const response = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${name}`);
            const text = await response.text();
            const rows = parseGoogleJSON(text);
            return { name, rows };
          })
        );

        const combinedData = {};
        results.forEach((res) => {
          combinedData[res.name] = res.rows;
        });

        setData(combinedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [JSON.stringify(sheetNames)]);

  return { data, loading, error };
}