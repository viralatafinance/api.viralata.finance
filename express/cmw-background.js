"use strict";
const crypto = require("crypto");
const querystring = require("querystring");
const axios = require("axios").default;
const faunadb = require("faunadb"),
  q = faunadb.query;

const FAUNA_DB = process.env.FAUNA_DB;

const client = new faunadb.Client({ secret: FAUNA_DB });

exports.handler = async function (event) {
  const email = event.queryStringParameters["email"];
  const wallet = event.queryStringParameters["wallet"];

  if (!email || !wallet) {
    return;
  }

  let hash = crypto.createHash("md5").update(email).digest("hex");

  let whitelisted = false;
  let voted = false;

  try {
    await client.query(q.Get(q.Match(q.Index("cmw_by_hash"), hash)));
    whitelisted = true;
    voted = true;
  } catch (ex) {}

  if (whitelisted === false) {
    let query = querystring.stringify({ action: "it_epoll_vote_by_form", data: querystring.stringify({ "0c92": req.params.email }), option_id: 225952, poll_id: 939 });
    let result = await axios.post("https://www.cryptomoonwatch.com/wp-admin/admin-ajax.php", query);
    if (result.data.msg == "You Already Voted For This Candidate!") {
      await client.query(q.Create(q.Collection("cmw"), { data: { hash, wallet: req.params.wallet } }));
    }
  }
};
