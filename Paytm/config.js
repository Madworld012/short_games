require('dotenv').config();
var PaytmConfig = {
  MID : process.env.MID,
  KEY : process.env.KEY,
  WEBSITE: process.env.WEBSITE,
  CALLBACK_URL : process.env.CALLBACK_URL
};
module.exports.PaytmConfig = PaytmConfig;
