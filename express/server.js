"use strict";

const express = require("express");
const path = require("path");
const serverless = require("serverless-http");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const router = express.Router();

require("dotenv").config();

router.get("*", (req, res) => {
  return res.json({
    name: "BITCAO",
    description: req.headers['accept-language'],
    image: "ipfs://QmYD9AtzyQPjSa9jfZcZq88gSaRssdhGmKqQifUDjGFfXm/sleepy.png",
    attributes: {
      bunnyId: "5",
    },
  });
});

app.use(bodyParser.json());
app.use(cors());
app.use("/.netlify/functions/server", router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
