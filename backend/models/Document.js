const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  _id: String,               // documentId
  data: { type: Object, default: { ops: [] } } // Quill Delta
});

module.exports = mongoose.model("Document", DocumentSchema);
