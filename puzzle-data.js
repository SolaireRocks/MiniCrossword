export const dailyPuzzle = {
    // 7x6 Grid derived from the provided NYT Mini Crossword (Dec 20, 2025)
    solution: [
        ['#', '#', 'T', 'U', 'F', 'T', 'S'],
        ['#', 'R', 'U', 'N', 'L', 'O', 'W'],
        ['M', 'A', 'M', 'D', 'A', 'N', 'I'],
        ['A', 'N', 'T', 'O', 'N', 'Y', 'M'],
        ['I', 'G', 'U', 'E', 'S', 'S', '#'],
        ['D', 'E', 'M', 'S', '#', '#', '#']
    ],

    // The small numbers displayed in the corners of cells
    gridNumbers: [
        [0, 0, 1, 2, 3, 4, 5],
        [0, 6, 0, 0, 0, 0, 0],
        [7, 0, 0, 0, 0, 0, 0],
        [8, 0, 0, 0, 0, 0, 0],
        [9, 0, 0, 0, 0, 0, 0],
        [10, 0, 0, 0, 0, 0, 0]
    ],

    // Clues mapped with their starting position (row, col)
    clues: {
        across: [
            { number: 1, text: "Boston-area university with an elephant mascot", row: 0, col: 2 },
            { number: 6, text: "Be nearly out of stock", row: 1, col: 1 },
            { number: 7, text: "Adams’s successor as New York City mayor", row: 2, col: 0 },
            { number: 8, text: "“Wicked,” for “good”", row: 3, col: 0 },
            { number: 9, text: "“If you say so …”", row: 4, col: 0 },
            { number: 10, text: "Counterparts of Repubs", row: 5, col: 0 }
        ],
        down: [
            { number: 1, text: "Belly, informally", row: 0, col: 2 },
            { number: 2, text: "Fixes with Ctrl+Z", row: 0, col: 3 },
            { number: 3, text: "Custardy desserts", row: 0, col: 4 },
            { number: 4, text: "Awards for Broadway stars", row: 0, col: 5 },
            { number: 5, text: "Complete the first leg of a triathlon", row: 0, col: 6 },
            { number: 6, text: "Place to hone one’s golf swing", row: 1, col: 1 },
            { number: 7, text: "Honey ___ (brand of graham crackers)", row: 2, col: 0 }
        ]
    }
};