const xlsx = require('xlsx');

function checkFile(file) {
    console.log(`\n--- Checking ${file} ---`);
    const workbook = xlsx.readFile(`../archive (1)/${file}`);
    const sheetNames = workbook.SheetNames;
    sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\nColumns for ${sheetName}:`);
        console.log(json[0]);
    });
}

checkFile('Top_100_batsman.xlsx');
checkFile('Top_100_bowlers.xlsx');
