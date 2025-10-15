require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Delta = require("quill-delta");
const Document = require("./models/Document");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB Atlas connected"))
.catch(err => console.log(err));

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("get-document", async (documentId) => {
    socket.join(documentId);

    let document = await Document.findById(documentId);
    if (!document) {
      document = await Document.create({ _id: documentId, data: new Delta() });
    }

    socket.emit("load-document", { data: document.data });
  });

  socket.on("send-changes", async (delta) => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    for (const room of rooms) {
      let document = await Document.findById(room);
      if (document) {
        const oldDelta = new Delta(document.data.ops);
        const newDelta = new Delta(delta.ops);
        document.data = oldDelta.compose(newDelta);
        await document.save();
        socket.to(room).emit("receive-changes", delta);
      }
    }
  });

  socket.on("save-document", async (data) => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    for (const room of rooms) {
      let document = await Document.findById(room);
      if (document) {
        document.data = data;
        await document.save();
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
