export const dailyPuzzle = {
    // 5x5 Grid Solution
    // '#' represents a black square
    solution: [
        ['#', 'A', 'N', 'T', '#'],
        ['#', 'Z', 'O', 'O', '#'],
        ['M', 'U', 'T', 'T', 'S'],
        ['G', 'R', 'E', 'E', 'K'],
        ['M', 'E', 'S', 'S', 'Y']
    ],

    // The small numbers displayed in the corners of cells
    gridNumbers: [
        [0, 1, 2, 3, 0],
        [0, 4, 0, 0, 0],
        [5, 0, 0, 0, 6],
        [7, 0, 0, 0, 0],
        [8, 0, 0, 0, 0]
    ],

    // Clues mapped with their starting position (row, col)
    clues: {
        across: [
            { number: 1, text: "Bullet ___ (insect known for its painful sting)", row: 0, col: 1 },
            { number: 4, text: "Setting for the children’s book “Good Night, Gorilla”", row: 1, col: 1 },
            { number: 5, text: "Mixed-breed dogs", row: 2, col: 0 },
            { number: 7, text: "Language that gave us the words “democracy” and “philosophy”", row: 3, col: 0 },
            { number: 8, text: "Untidy", row: 4, col: 0 }
        ],
        down: [
            { number: 1, text: "Brilliant shade of blue", row: 0, col: 1 },
            { number: 2, text: "Classroom jottings", row: 0, col: 2 },
            { number: 3, text: "“100%,” in slang", row: 0, col: 3 },
            { number: 5, text: "Longtime movie studio now owned by Amazon", row: 2, col: 0 },
            { number: 6, text: "Chicago W.N.B.A. team", row: 2, col: 4 }
        ]
    }
};