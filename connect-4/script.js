// const apiURL = "http://localhost:80/api/v1";
const apiURL = "https://personlprojectsnk.com/api/v1";

document.addEventListener('DOMContentLoaded', async () => {
    const boardElement = document.getElementById('board');
    const rows = 6;
    const cols = 7;
    let board = [];
    let currentPlayer = 1;
    let playerCanMove = true;

    for (let i = 0; i < 6; i++) {
        let row = [];
        for (let j = 0; j < cols; j++) {
            row.push(0);
        }
        board.push(row);
    }

    // Fetch nums games played from the server
    async function fetchData(url, params={method: "GET", mode: "cors"}) {
        try {
            const response = await fetch(url, params);
            const data = await response.json();
            return data;
        } catch(error) {
            throw error;
            
        }
    }
    
    // Setting up games played stats
    try {
        const pageVisitResponse = await fetchData(apiURL + "/logs/pageVisit", {method: "POST", mode: "cors"});
        console.log("Response", pageVisitResponse);
        if(!pageVisitResponse) {
            const instructionsOverlay = document.getElementById('instructions');
            instructionsOverlay.textContent = `404: Cannot connect to server...`;
        } else {
            const pageViewsElement = document.getElementById('games-played');
            pageViewsElement.textContent = `Visits: ${pageVisitResponse.data.pageVisits}`;
        }
    } catch (error) {
        const instructionsOverlay = document.getElementById('instructions');
        instructionsOverlay.textContent = `404: Cannot connect to server...`;
    }

    async function pingGameStarted(params) {
        function sumArray(a, idx) {
            if (idx === a.length) {
                return 0;
            }
            return Math.abs(a[idx]) + sumArray(a, idx + 1);
        }
        if(sumArray(board[5], 0) == 1) {
            const pageVisitResponse = await fetchData(apiURL + "/logs/gameStarted", {method: "POST", mode: "cors"});
            const pageViewsElement = document.getElementById('games-played');
            if(!pageVisitResponse) {
                pageViewsElement.textContent = `Visits: Loading...`;
            } else {
                pageViewsElement.textContent = `Visits: ${pageVisitResponse.data.pageVisits}`;
            }
        }
    }


    function createBoard() {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                if (row == 0) {
                    cell.addEventListener('click', handleCellClick);
                    cell.style.cursor = 'pointer';
                }
                boardElement.appendChild(cell);
            }
        }
        playerCanMove = true;
    }

    function handleCellClick(event) {
        console.log(playerCanMove);
        if (!playerCanMove) return;
        const col = event.target.dataset.col;
        const emptyRow = getEmptyRow(col);

        if (emptyRow != null) {
            playerCanMove = false;
            dropCoin(emptyRow, col, currentPlayer, () => {
                console.log(board);
            
                let result = checkWin();
                let win = result['win']
                let plyr = result['plyr']
                if (win) {
                    declareWin(plyr);
                    return;
                }

                botMove()
            });
        }
    }

    async function botMove() {
        let botMv = Math.floor(Math.random() * 14);
        displayBotMove(botMv)

        if ((botMv - 7) < 0) {
            const emptyRow = getEmptyRow(botMv);

            if (emptyRow !== null) {
                dropCoin(emptyRow, botMv, -1, () => {
                    let result = checkWin();
                    let win = result['win']
                    let plyr = result['plyr']
                    if (win) {
                        declareWin(plyr);
                        return;
                    }
                });
            }
        }
        else {
            if (board[rows - 1][botMv - 7] == -1) {
                removeCoin(rows - 1, botMv - 7);
            }
            let result = checkWin();
            let win = result['win']
            let plyr = result['plyr']
            if (win) {
                declareWin(plyr);
                return;
            }
        }
        playerCanMove = true;
    }

    function displayBotMove(move) {
        console.log("funccall", move);
        const botmovedisplay = document.getElementById('bot-move');
        if ((move - 7) < 0) {
            botmovedisplay.textContent = `Bot Move: Drop Col -> ${move}`;
        }
        else {
            botmovedisplay.textContent = `Bot Move: Pop Col -> ${move - 7}`;
        }
    }

    function dropCoin(row, col, player, callback) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        const coin = document.createElement('div');
        coin.classList.add('coin', getPlayerColor(player));
        if (row == rows - 1 && player == 1) {
            coin.addEventListener('click', handleCoinClick);
            coin.style.cursor = 'pointer';
        }
        cell.appendChild(coin);
        board[row][col] = player;

        setTimeout(() => {
            coin.style.top = '0';
            if (callback) {
                setTimeout(callback, 500);
            }
        }, 10);
    }

    function handleCoinClick(event) {
        event.stopPropagation();
        const col = event.target.parentElement.dataset.col;
        const row = rows - 1;

        if (board[row][col] == currentPlayer) {
            removeCoin(row, col);
            // setTimeout(botMove, 500);
        }
        else {
            alert("Wrong Selection");
        }
        botMove()
        console.log(board)
    }

    function removeCoin(row, col, callback) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        const coin = cell.querySelector('.coin');

        if (coin) {
            coin.remove();
            for (let r = row; r > 0; r--) {
                board[r][col] = board[r - 1][col];
                const currentCell = document.querySelector(`.cell[data-row="${r}"][data-col="${col}"]`);
                const aboveCell = document.querySelector(`.cell[data-row="${r - 1}"][data-col="${col}"]`);
                currentCell.innerHTML = aboveCell.innerHTML;
            }
        }
        
        // modify to check if last coin is a valid one then only add this
        if (board[rows-1][col] == 1){
            const last_cell = document.querySelector(`.cell[data-row="${rows - 1}"][data-col="${col}"]`);
            const last_coin = cell.querySelector('.coin');
            last_coin.addEventListener('click', handleCoinClick);
            last_cell.style.cursor = 'pointer';
        }

        if (callback) {
            setTimeout(callback, 300);
        }
    }

    function checkWin() {
        let results = {'win': false, 'plyr': 0};
    
        // Check vertical win
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row <= rows - 4; row++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row + 1][col] && 
                    board[row + 1][col] === board[row + 2][col] && 
                    board[row + 2][col] === board[row + 3][col]) {
                    results['win'] = true;
                    results['plyr'] = board[row][col];
                    return results;
                }
            }
        }
    
        // Check horizontal win
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col <= cols - 4; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row][col + 1] && 
                    board[row][col + 1] === board[row][col + 2] && 
                    board[row][col + 2] === board[row][col + 3]) {
                    results['win'] = true;
                    results['plyr'] = board[row][col];
                    return results;
                }
            }
        }
    
        // Check diagonal (bottom-left to top-right) win
        for (let row = 0; row <= rows - 4; row++) {
            for (let col = 0; col <= cols - 4; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row + 1][col + 1] && 
                    board[row + 1][col + 1] === board[row + 2][col + 2] && 
                    board[row + 2][col + 2] === board[row + 3][col + 3]) {
                    results['win'] = true;
                    results['plyr'] = board[row][col];
                    return results;
                }
            }
        }
    
        // Check diagonal (top-left to bottom-right) win
        for (let row = 3; row < rows; row++) {
            for (let col = 0; col <= cols - 4; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row - 1][col + 1] && 
                    board[row - 1][col + 1] === board[row - 2][col + 2] && 
                    board[row - 2][col + 2] === board[row - 3][col + 3]) {
                    results['win'] = true;
                    results['plyr'] = board[row][col];
                    return results;
                }
            }
        }
    
        return results;
    }        

    function getPlayerColor(player) {
        if (player == 1) {
            return 'red'
        }
        else {
            return 'yellow'
        }
    }

    async function declareWin(plyr) {
        const popup = document.getElementById('result');
        const closePopupButton = document.getElementById('close-result');

        const resultHeading = document.querySelector('#result .result-content h2');
        if (plyr === 1) {
            resultHeading.textContent = 'YOU WON! 😊';
        }
        else if (plyr === -1) {
            const botWinsResponse = await fetchData(apiURL + "/logs/botWins", {method: "POST", mode: "cors"});
            const pageViewsElement = document.getElementById('games-played');
            if(!botWinsResponse) {
                pageViewsElement.textContent = `Visits: Loading...`;
            } else {
                pageViewsElement.textContent = `Visits: ${botWinsResponse.data.pageVisits}`;
            }

            resultHeading.textContent = 'BOT WINS!! 🤔';
        }

        winPopup = document.getElementById('result')
        winPopup.style.display = 'flex';

        closePopupButton.addEventListener('click', () => {
            popup.style.display = 'none';
            resetGame();
        });

        window.addEventListener('click', (event) => {
            if (event.target === popup) {
                popup.style.display = 'none';
            }
        });
    }

    function getEmptyRow(col) {
        for (let row = rows - 1; row >= 0; row--) {
            if (board[row][col] == 0) {
                return row;
            }
        }
        return null;
    }

    function resetGame() {
        boardElement.innerHTML = '';
        board.forEach(row => row.fill(0));
        currentPlayer = 1;
        createBoard();
    }

    createBoard();

    const popup = document.getElementById('instructions');
    const instructionsButton = document.getElementById('instructions-button');
    const closePopupButton = document.getElementById('close-instructions');

    instructionsButton.addEventListener('click', () => {
        popup.style.display = 'flex';
    });

    closePopupButton.addEventListener('click', () => {
        popup.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    });

    const resetBtm = document.getElementById('reset-button');

    resetBtm.addEventListener('click', () => {
        resetGame()
    });

    document.getElementById('navbar-toggle').addEventListener('click', function() {
        document.getElementById('navbar-links').classList.toggle('active');
    });
});