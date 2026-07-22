const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Error parsing JSON", error);
    return [];
  }
}

async function run() {
  console.log("Fetching main sheet ESTOQUE...");
  const res = await axios.get(url);
  const rows = parseGoogleJSON(res.data);
  console.log(`Total rows fetched: ${rows.length}`);

  let validDateCount = 0;
  let nullDateCount = 0;
  let validSkuLocalCount = 0;
  let validSkuLocalWithNullDateCount = 0;

  const dateCounts = {};

  rows.forEach((r, idx) => {
    if (!r || !r.c) return;
    const dateVal = r.c[0]?.f || r.c[0]?.v || null;
    const sku = r.c[1]?.v || null;
    const local = r.c[3]?.v || null;

    if (dateVal) {
      validDateCount++;
      dateCounts[dateVal] = (dateCounts[dateVal] || 0) + 1;
    } else {
      nullDateCount++;
    }

    if (sku && local) {
      validSkuLocalCount++;
      if (!dateVal) {
        validSkuLocalWithNullDateCount++;
      }
    }
  });

  console.log("\nSummary:");
  console.log(`Rows with valid date: ${validDateCount}`);
  console.log(`Rows with null date: ${nullDateCount}`);
  console.log(`Rows with valid SKU & Local: ${validSkuLocalCount}`);
  console.log(`Rows with valid SKU & Local but null date: ${validSkuLocalWithNullDateCount}`);
  console.log("\nDate distribution:");
  console.log(dateCounts);
}

run().catch(console.error);
