const fs = require('fs');
const xlsx = require('xlsx');

function generatePlayers() {
    const players = [];

    // Parse Batsmen
    const batsWorkbook = xlsx.readFile('../archive (1)/Top_100_batsman.xlsx');
    const batsSheet = batsWorkbook.Sheets[batsWorkbook.SheetNames[0]];
    const batsData = xlsx.utils.sheet_to_json(batsSheet);

    batsData.forEach((row, index) => {
        players.push({
            id: `BAT_${index + 1}`,
            name: row['PLAYER'],
            role: 'Batsman',
            country: 'Unknown', // No country in this dataset
            basePrice: [50, 100, 150, 200][Math.floor(Math.random() * 4)], // Random base price in Lakhs
            stats: {
                matches: row['Mat'],
                runs: row['Runs'],
                strikeRate: row['SR'],
                average: row['Avg']
            }
        });
    });

    // Parse Bowlers
    const bowlWorkbook = xlsx.readFile('../archive (1)/Top_100_bowlers.xlsx');
    const bowlSheet = bowlWorkbook.Sheets[bowlWorkbook.SheetNames[0]];
    const bowlData = xlsx.utils.sheet_to_json(bowlSheet);

    bowlData.forEach((row, index) => {
        // Prevent duplicate players (all-rounders)
        const exists = players.find(p => p.name === row['PLAYER']);
        if (!exists) {
            players.push({
                id: `BOWL_${index + 1}`,
                name: row['PLAYER'],
                role: 'Bowler',
                country: 'Unknown',
                basePrice: [50, 100, 150, 200][Math.floor(Math.random() * 4)],
                stats: {
                    matches: row['Mat'],
                    wickets: row['Wkts'],
                    economy: row['Econ'],
                    average: row['Avg']
                }
            });
        } else {
            exists.role = 'All-Rounder';
            exists.stats.wickets = row['Wkts'];
            exists.stats.economy = row['Econ'];
        }
    });

    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync('./data/players.json', JSON.stringify(players, null, 2));
    console.log(`Successfully seeded ${players.length} players into data/players.json`);
}

generatePlayers();
