// puzzle-data.js
export const dailyPuzzle = {
    // 5x5 Grid Solution
    // '#' represents a black square
    solution: [
        ['#', '#', 'D', 'A', 'M'],
        ['#', 'M', 'I', 'L', 'E'],
        ['S', 'E', 'V', 'E', 'N'],
        ['I', 'M', 'A', 'X', '#'],
        ['X', 'E', 'S', '#', '#']
    ],

    // The small numbers displayed in the corners of cells
    gridNumbers: [
        [0, 0, 1, 2, 3],
        [0, 4, 0, 0, 0],
        [5, 0, 0, 0, 0],
        [6, 0, 0, 0, 0],
        [7, 0, 0, 0, 0]
    ],

    // Clues mapped with their starting position (row, col)
    clues: {
        across: [
            { number: 1, text: "Beaver's barrier", row: 0, col: 2 },
            { number: 4, text: "5,280 feet", row: 1, col: 1 },
            { number: 5, text: "Lucky number", row: 2, col: 0 },
            { number: 6, text: "Big screen movie format", row: 3, col: 0 },
            { number: 7, text: "Tic-tac-toe marks", row: 4, col: 0 }
        ],
        down: [
            { number: 1, text: "Opera stars", row: 0, col: 2 },
            { number: 2, text: "Jeopardy host Trebek", row: 0, col: 3 },
            { number: 3, text: "___ in Black", row: 0, col: 4 },
            { number: 4, text: "Viral internet image", row: 1, col: 1 },
            { number: 5, text: "Half a dozen", row: 2, col: 0 }
        ]
    }
};