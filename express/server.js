"use strict";

const express = require("express");
const serverless = require("serverless-http");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const router = express.Router();
const Web3 = require("web3");
const crypto = require("crypto");
const factoryAbi = require("./factory.json");
const querystring = require("querystring");
const axios = require("axios").default;
const faunadb = require("faunadb"),
  q = faunadb.query;

require("dotenv").config();

const NETWORK_URL = process.env.NETWORK_URL_MAINNET || process.env.NETWORK_URL_DEV_MAINNET;
const NETWORK_URL_TESTNET = process.env.NETWORK_URL_TESTNET || process.env.NETWORK_URL_DEV_TESTNET;
const FAUNA_DB = process.env.FAUNA_DB;

const FACTORY_ADDR_MAINNET = "0xd7eC2C74808c1f15AdC9028E092A08D5d446b364";
const FACTORY_ADDR_TESTNET = "0xd7eC2C74808c1f15AdC9028E092A08D5d446b364";

const web3 = new Web3(NETWORK_URL);
const web3testnet = new Web3(NETWORK_URL_TESTNET);

const client = new faunadb.Client({ secret: FAUNA_DB });

router.get("/cmw/:email/:wallet", async (req, res) => {
  if (!req.params.email || !req.params.wallet) {
    return res.json("invalid call");
  }
  const fullstring = req.params.email.toLowerCase().toString();
  let hash = crypto.createHash("md5").update(fullstring).digest("hex");

  let whitelisted = false;
  let voted = false;
  let err = null;
  try {
    await client.query(q.Get(q.Match(q.Index("cmw_by_hash"), hash)));
    whitelisted = true;
    voted = true;
  } catch (ex) {}

  if (!whitelisted) {
    try {
      let query = querystring.stringify({ action: "it_epoll_vote_by_form", data: querystring.stringify({ "0c92": req.params.email }), option_id: 225952, poll_id: 939 });
      const cmwResult = await axios.post("https://www.cryptomoonwatch.com/wp-admin/admin-ajax.php", query);

      if (cmwResult && cmwResult.data) {
        if (cmwResult.data.msg == "You Already Voted For This Candidate!") {
          voted = true;
          await client.query(q.Create(q.Collection("cmw"), { data: { hash, wallet: req.params.wallet } }));
          whitelisted = true;
        } else {
          voted = false;
        }
      }
    } catch (ex) {
      err = ex.message;
    }
  }
  res.json({ whitelisted, voted, err });
});

router.get("/testnet/nft/:id", async (req, res) => {
  const factoryContract = new web3testnet.eth.Contract(factoryAbi, FACTORY_ADDR_TESTNET);
  const { edition, collectibleNo } = await factoryContract.methods.collectibleInfo(req.params.id).call();
  return res.json({
    name: edition.name,
    description: edition.description,
    image: edition.uri,
    attributes: {
      collectibleNo,
      limit: edition.limit,
    },
  });
});

router.get("/nft/:id", async (req, res) => {
  return res.json(req.params.id);
});

app.use(bodyParser.json());
app.use(cors());
app.use("/.netlify/functions/server", router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
