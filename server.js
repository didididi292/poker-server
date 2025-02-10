const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.get("/", (req, res) => {
    res.send("Poker Game Server is running.");
});

const PORT = process.env.PORT || 4000;
const rooms = {};

io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);

    socket.on("createRoom", ({ roomId, mode }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                communityCards: [],
                pot: 0,
                currentTurn: 0,
                mode: mode,
                deck: createDeck(mode),
            };
        }
        socket.join(roomId);
        io.to(roomId).emit("gameState", rooms[roomId]);
    });

    socket.on("joinRoom", ({ roomId }) => {
        if (rooms[roomId]) {
            const player = { id: socket.id, name: `Player ${rooms[roomId].players.length + 1}`, chips: 1000 };
            rooms[roomId].players.push(player);
            socket.join(roomId);
            io.to(roomId).emit("gameState", rooms[roomId]);
        }
    });

    socket.on("action", ({ roomId, action }) => {
        if (rooms[roomId]) {
            // 处理玩家操作 (弃牌、跟注、加注)
            if (action === "fold") {
                rooms[roomId].players.splice(rooms[roomId].currentTurn, 1);
            } else if (action === "call" || action === "raise") {
                rooms[roomId].pot += 100; // 示例逻辑，真实情况要处理下注逻辑
            }

            rooms[roomId].currentTurn = (rooms[roomId].currentTurn + 1) % rooms[roomId].players.length;
            io.to(roomId).emit("gameState", rooms[roomId]);
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected: ", socket.id);
    });
});

const createDeck = (mode) => {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    let values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    if (mode === "shortdeck") values = values.slice(4); // 短牌模式移除 2-5
    
    let deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

