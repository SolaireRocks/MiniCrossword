// puzzle-data.js
export const dailyPuzzle = {
    // 5x5 Grid Solution
    // '#' represents a black square
    solution: [
        ['#', '#', 'T', 'A', 'J'],
        ['#', 'S', 'A', 'L', 'E'],
        ['V', 'I', 'P', 'E', 'R'],
        ['O', 'Z', 'A', 'R', 'K'],
        ['W', 'E', 'S', 'T', '#']
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
            { number: 1, text: "___ Mahal", row: 0, col: 2 },
            { number: 4, text: "“Everything must go!” event", row: 1, col: 1 },
            { number: 5, text: "Deadly snake with fangs that fold upward", row: 2, col: 0 },
            { number: 6, text: "Netflix crime drama set in the mountains of Missouri", row: 3, col: 0 },
            { number: 7, text: "W, on a map", row: 4, col: 0 }
        ],
        down: [
            { number: 1, text: "Spanish small plates", row: 0, col: 2 },
            { number: 2, text: "Ding on a phone, e.g.", row: 0, col: 3 },
            { number: 3, text: "Meanie face", row: 0, col: 4 },
            { number: 4, text: "Shoebox number", row: 1, col: 1 },
            { number: 5, text: "Oath", row: 2, col: 0 }
        ]
    }
};