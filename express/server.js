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

  let hash = crypto.createHash("md5").update(req.params.email).digest("hex");

  let whitelisted = false;
  try {
    await client.query(q.Get(q.Match(q.Index("cmw_by_hash"), hash)));
    whitelisted = true;
  } catch (ex) {}

  if (!whitelisted) {
    await client.query(q.Create(q.Collection("cmw"), { data: { hash, wallet: req.params.wallet } }));
  }

  return res.json({ whitelisted });
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
