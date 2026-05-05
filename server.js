const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// ✅ FIX (Not Found problem solve)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

let waitingUser = null;

io.on("connection", socket => {

  socket.on("join", () => {
    if (waitingUser) {
      socket.partner = waitingUser.id;
      waitingUser.partner = socket.id;

      socket.emit("matched", waitingUser.id);
      waitingUser.emit("matched", socket.id);

      waitingUser = null;
    } else {
      waitingUser = socket;
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

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
  });

});

http.listen(3000, () => console.log("Server running"));
