const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waiting = null;

io.on("connection", socket => {

  socket.on("join", () => {
    if (waiting) {
      socket.partner = waiting.id;
      waiting.partner = socket.id;

      socket.emit("matched", waiting.id);
      waiting.emit("matched", socket.id);

      waiting = null;
    } else {
      waiting = socket;
    }
  });

  socket.on("offer", data => {
    io.to(data.to).emit("offer", {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on("answer", data => {
    io.to(data.to).emit("answer", data);
  });

  socket.on("ice", data => {
    io.to(data.to).emit("ice", data);
  });

});

http.listen(3000, () => console.log("Server running"));
