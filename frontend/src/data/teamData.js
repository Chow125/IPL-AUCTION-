// IPL Team definitions with colors and abbreviations
export const IPL_TEAMS = {
    CSK: {
        name: 'Chennai Super Kings',
        short: 'CSK',
        primary: '#F9CD05',
        secondary: '#0081E9',
        textColor: '#0A1F44',
        emoji: '🦁',
    },
    MI: {
        name: 'Mumbai Indians',
        short: 'MI',
        primary: '#005DA0',
        secondary: '#D1AB3E',
        textColor: '#fff',
        emoji: '🔵',
    },
    RCB: {
        name: 'Royal Challengers Bengaluru',
        short: 'RCB',
        primary: '#EC1C24',
        secondary: '#2B2A29',
        textColor: '#fff',
        emoji: '🔴',
    },
    KKR: {
        name: 'Kolkata Knight Riders',
        short: 'KKR',
        primary: '#3A225D',
        secondary: '#F0B80B',
        textColor: '#F0B80B',
        emoji: '💜',
    },
    DC: {
        name: 'Delhi Capitals',
        short: 'DC',
        primary: '#17479E',
        secondary: '#EF1C25',
        textColor: '#fff',
        emoji: '🔷',
    },
    PBKS: {
        name: 'Punjab Kings',
        short: 'PBKS',
        primary: '#ED1B24',
        secondary: '#A7A9AC',
        textColor: '#fff',
        emoji: '🦅',
    },
    RR: {
        name: 'Rajasthan Royals',
        short: 'RR',
        primary: '#E8196D',
        secondary: '#254AA5',
        textColor: '#fff',
        emoji: '💗',
    },
    SRH: {
        name: 'Sunrisers Hyderabad',
        short: 'SRH',
        primary: '#F26522',
        secondary: '#000000',
        textColor: '#fff',
        emoji: '🌅',
    },
    GT: {
        name: 'Gujarat Titans',
        short: 'GT',
        primary: '#1C1C1C',
        secondary: '#0B4EA2',
        textColor: '#C8A951',
        emoji: '⚡',
    },
    LSG: {
        name: 'Lucknow Super Giants',
        short: 'LSG',
        primary: '#A72056',
        secondary: '#FFCC00',
        textColor: '#fff',
        emoji: '🐝',
    },
    INTL: {
        name: 'International',
        short: 'INTL',
        primary: '#2a3a4a',
        secondary: '#7a8599',
        textColor: '#aaa',
        emoji: '🌍',
    },
};

// Player name → IPL team mapping (based on most famous IPL association)
const PLAYER_TEAM_MAP = {
    // CSK
    'MS Dhoni':             'CSK',
    'Suresh Raina':         'CSK',
    'Ravindra Jadeja':      'CSK',
    'Ambati Rayudu':        'CSK',
    'Dwayne Bravo':         'CSK',
    'Faf du Plessis':       'CSK',
    'Shane Watson':         'CSK',
    'Murali Vijay':         'CSK',
    'Subramaniam Badrinath':'CSK',
    'Imran Tahir':          'CSK',

    // MI
    'Rohit Sharma':         'MI',
    'Kieron Pollard':       'MI',
    'Suryakumar Yadav':     'MI',
    'Jasprit Bumrah':       'MI',
    'Hardik Pandya':        'MI',
    'Krunal Pandya':        'MI',
    'Quinton de Kock':      'MI',
    'Ishan Kishan':         'MI',
    'Ambati Rayudu':        'MI',
    'Lasith Malinga':       'MI',

    // RCB
    'ViratKohli':           'RCB',
    'Virat Kohli':          'RCB',
    'AB de Villiers':       'RCB',
    'Chris Gayle':          'RCB',
    'Yuvraj Singh':         'RCB',
    'Washington Sundar':    'RCB',
    'Dinesh Karthik':       'RCB',
    'Shane Watson':         'RCB',
    'Dale Steyn':           'RCB',

    // KKR
    'Gautam Gambhir':       'KKR',
    'Andre Russell':        'KKR',
    'Sunil Narine':         'KKR',
    'Robin Uthappa':        'KKR',
    'Jacques Kallis':       'KKR',
    'Brendon McCullum':     'KKR',
    'Chris Lynn':           'KKR',
    'Dinesh Karthik':       'KKR',
    'Kuldeep Yadav':        'KKR',
    'Rinku Singh':          'KKR',
    'Shreyas Iyer':         'KKR',

    // DC
    'Rishabh Pant':         'DC',
    'Shikhar Dhawan':       'DC',
    'David Warner':         'DC',
    'Ajinkya Rahane':       'DC',
    'Prithvi Shaw':         'DC',

    // PBKS
    'KL Rahul':             'PBKS',
    'David Miller':         'PBKS',
    'Hashim Amla':          'PBKS',
    'Chris Gayle':          'PBKS',
    'Glenn Maxwell':        'PBKS',
    'Mandeep Singh':        'PBKS',

    // RR
    'Sanju Samson':         'RR',
    'Jos Buttler':          'RR',
    'Shane Watson':         'RR',
    'Steve Smith':          'RR',
    'Ben Stokes':           'RR',
    'Rahul Dravid':         'RR',
    'Shane Warne':          'RR',
    'Yusuf Pathan':         'RR',
    'Dwayne Smith':         'RR',

    // SRH
    'David Warner':         'SRH',
    'Kane Williamson':      'SRH',
    'Wriddhiman Saha':      'SRH',
    'Bhuvneshwar Kumar':    'SRH',
    'Rashid Khan':          'SRH',
    'Vijay Shankar':        'SRH',
    'Manish Pandey':        'SRH',

    // GT
    'Hardik Pandya':        'GT',
    'Shubman Gill':         'GT',
    'Rashid Khan':          'GT',
    'Mohammed Shami':       'GT',
    'David Miller':         'GT',
    'Wriddhiman Saha':      'GT',

    // LSG
    'KL Rahul':             'LSG',
    'Quinton de Kock':      'LSG',
    'Krunal Pandya':        'LSG',
    'Ravi Bishnoi':         'LSG',
    'Deepak Hooda':         'LSG',
    'Marcus Stoinis':       'LSG',

    // International (no primary IPL team)
    'Mahela Jayawardene':   'INTL',
    'Kumar Sangakkara':     'INTL',
    'Adam Gilchrist':       'INTL',
    'Brad Hodge':           'INTL',
    'Shaun Marsh':          'INTL',
    'Aaron Finch':          'INTL',
    'JP Duminy':            'INTL',
    'Sourav Ganguly':       'INTL',
    'Sachin Tendulkar':     'INTL',
    'Virender Sehwag':      'INTL',
};

/**
 * Get the IPL team for a player name.
 * Returns the team object from IPL_TEAMS, or a generic "Unknown" team.
 */
export function getPlayerTeam(playerName) {
    const teamCode = PLAYER_TEAM_MAP[playerName];
    if (teamCode && IPL_TEAMS[teamCode]) return { code: teamCode, ...IPL_TEAMS[teamCode] };

    // Fuzzy fallback: try matching by first word of name
    const firstName = playerName?.split(' ')[0];
    for (const [name, code] of Object.entries(PLAYER_TEAM_MAP)) {
        if (name.startsWith(firstName) && IPL_TEAMS[code]) {
            return { code, ...IPL_TEAMS[code] };
        }
    }

    return { code: 'INTL', ...IPL_TEAMS.INTL };
}
