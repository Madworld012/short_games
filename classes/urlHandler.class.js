const paytmConfig = require("../Paytm/config");
const paytmCheckSum = require("../Paytm/checksum");

const https = require("https");
let fs = require('graceful-fs');

module.exports = {

    BindWithCluster: function (app) {
        const path = require('path');

        app.get('/gcf', function (req, res) {
            console.log("req.query-----------------------------------------------", req.query.k);
            let key = moment().format("DDMMYYYY");
            console.log(key);
            if (req.query.k === key.toString()) {
                res.render('config.html');
            } else {
                res.send('Reva Dyo Ne Bhai');
            }
        });

        app.get("/", (req, res) => {
            res.render('game.html');
        });

        app.get('/p', function (req, res) {
            res.send('ok');
        });

        app.get('/gc', function (req, res) {

            var key = req.query.id;
            if (!key) {
                res.send("unAutorized Access");
                return
            }

            if (key == "tyxdryrydrtxuxtdrutrdutrdutdrurdtu") {
                res.json(config);
            } else {
                res.send('Unauthorized Access.');
            }
        });

        app.post('/sc', function (req, res) {
            var key = req.query.id;
            if (typeof key == 'undefined' && key.length == "") {
                res.send("Failed");
                return false;
            }

            if (req.body && !commonClass.isJsonValid(JSON.stringify(req.body.config))) {
                res.send('Invalid Json');
                return;
            }

            config = JSON.parse(req.body.config)
            if (key == "tyxdryrydrtxuxtdrutrdutrdutdrurdtu") {
                fs.writeFile("./config.json", JSON.stringify(config, undefined, 4), function (err) {
                    res.send(config);
                });
            } else {
                res.send("Bhai no aavde to revadyo ne");
            }
        });

        // app.get('/paynow', (req, res) => {
        //     res.render("paynow.html");
        // });

        app.post("/paynow", async (req, res) => {
            // Route for making payment
            console.log("data", req.body);

            if (!req.body.amount && req.body.amount <= 0) {
                console.log("please send proper amount");
                res.send('Payment failed');
                return false;
            }

            if (!req.body.uid) {
                console.log("please send userid");
                res.send('Payment failed');
                return false;
            }

            if (config.IS_DEPOSIT == true) {
                if (req.body.amount >= config.MIN_DEPOSIT) {

                    if (req.body && req.body.uid) {
                        let userData = await db.collection('game_users').find({ _id: ObjectId(req.body.uid) }).toArray();
                        console.log("user data ", userData);
                        if (userData && userData.length > 0) {
                            userData = userData[0];

                            var paymentDetails = {
                                amount: req.body.amount.toString(),
                                customerId: (userData.un) ? userData.un : config.GAME_NAME,
                                customerEmail: (userData.ue) ? userData.ue : config.GAME_EMAIL,
                                customerPhone: userData.mobile_no
                            }
                            if (!paymentDetails.amount || !paymentDetails.customerId || !paymentDetails.customerEmail || !paymentDetails.customerPhone) {
                                res.status(400).send('Payment failed')
                            } else {
                                let ORDER_ID = 'ORDT_' + new Date().getTime();
                                var params = {};
                                params['MID'] = paytmConfig.PaytmConfig.MID;
                                // params['WEBSITE'] = paytmConfig.PaytmConfig.WEBSITE;
                                params['CHANNEL_ID'] = 'WEB';
                                params['INDUSTRY_TYPE_ID'] = 'Retail';
                                params['ORDER_ID'] = ORDER_ID;
                                params['CUST_ID'] = paymentDetails.customerId;
                                params['TXN_AMOUNT'] = paymentDetails.amount;
                                params['CALLBACK_URL'] = paytmConfig.PaytmConfig.CALLBACK_URL;
                                params['EMAIL'] = paymentDetails.customerEmail;
                                params['MOBILE_NO'] = paymentDetails.customerPhone;

                                let store_payment_data = {
                                    "UID": userData._id,
                                    "ORDER_ID": ORDER_ID,
                                    "MID": paytmConfig.PaytmConfig.MID,
                                    "CUST_ID": paymentDetails.customerId,
                                    "TXN_AMOUNT": paymentDetails.amount,
                                    "CALLBACK_URL": paytmConfig.PaytmConfig.CALLBACK_URL,
                                    "EMAIL": paymentDetails.customerEmail,
                                    "MOBILE_NO": userData.mobile_no,
                                    "tra_status": "pending",
                                    "CD": new Date()
                                }

                                let insert_status = await db.collection('payment_transection').insertOne(store_payment_data);

                                if (insert_status.acknowledged) {
                                    console.log("------------------------------------");
                                    paytmCheckSum.genchecksum(params, paytmConfig.PaytmConfig.KEY, function (err, checksum) {
                                        // var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
                                        var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

                                        var form_fields = "";
                                        for (var x in params) {
                                            // form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
                                            form_fields += `<input type='hidden' name='${x}' value='${params[x]}' >`;
                                        }
                                        // form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";
                                        form_fields += `<input type='hidden' name='CHECKSUMHASH' value='${checksum}' >`;
                                        // console.log("--txn_url",txn_url)
                                        // res.writeHead(200, { 'Content-Type': 'text/html' });
                                        // console.log('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
                                        let htmlData = `<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method='post' action='${txn_url}' name='f1'> ${form_fields}</form><script type='text/javascript'>document.f1.submit();</script></body></html>`;
                                        res.send({ status: true, html: htmlData });
                                        //  console.log("---params res write head?>>>>>>>>>>>>>>>>>>>")
                                        // res.end();
                                    });
                                } else {
                                    console.log("transection not storeed");
                                    let msg = "Somthing Not Proper Please Try Again Later.";
                                    let htmlData = `<html><head><body><h2>'${msg}'</h2></body></html>`;
                                    res.send({ status: false, html: htmlData });
                                }
                            }
                        } else {
                            console.log("user not found");
                            res.send({ status: false });
                        }
                    }
                } else {
                    let msg = 'Please deposite minimum ' + config.MIN_DEPOSIT + ' rs.';
                    let htmlData = `<html><head><body><h2>'${msg}'</h2></body></html>`;
                    res.send({ status: false, html: htmlData });
                }
            } else {
                console.log("deposite not available for now");
                res.send({ status: false });
            }
        });

        app.post("/callback", (req, res) => {
            // Route for verifiying payment
            console.log("--calllback function=------", req.body);

            var body = req.body;

            console.log("call come end");

            var html = "";
            var post_data = body;

            // received params in callback
            console.log('Callback Response: ', post_data, "\n");


            // verify the checksum
            var checksumhash = post_data.CHECKSUMHASH;
            // delete post_data.CHECKSUMHASH;
            var result = paytmCheckSum.verifychecksum(post_data, paytmConfig.PaytmConfig.KEY, checksumhash);
            console.log("Checksum Result => ", result, "\n");


            // Send Server-to-Server request to verify Order Status
            var params = { "MID": paytmConfig.PaytmConfig.MID, "ORDERID": post_data.ORDERID };

            paytmCheckSum.genchecksum(params, paytmConfig.PaytmConfig.KEY, function (err, checksum) {
                console.log("--checksum", checksum)
                params.CHECKSUMHASH = checksum;
                post_data = 'JsonData=' + JSON.stringify(params);


                var options = {
                    //hostname: 'securegw-stage.paytm.in', // for staging
                    hostname: 'securegw.paytm.in', // for production
                    port: 443,
                    path: '/merchant-status/getTxnStatus',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': post_data.length
                    }
                };
                // Set up the request
                var response = "";
                var post_req = https.request(options, function (post_res) {

                    post_res.on('data', function (chunk) {
                        response += chunk;
                    });

                    post_res.on('end', async function () {
                        console.log('S2S Response: ', response, "\n");

                        var _result = JSON.parse(response);
                        if (_result.STATUS == 'TXN_SUCCESS') {
                            let payment_record = await db.collection('payment_transection').findOneAndUpdate({ ORDER_ID: _result.ORDERID, tra_status: 'pending' },
                                {
                                    $set: {
                                        tra_status: "success",
                                        TXNID: _result.TXNID,
                                        BANKTXNID: _result.BANKTXNID,
                                        STATUS: _result.STATUS,
                                        TXNTYPE: _result.TXNTYPE,
                                        GATEWAYNAME: _result.GATEWAYNAME,
                                        RESPCODE: _result.RESPCODE,
                                        RESPMSG: _result.RESPMSG,
                                        BANKNAME: _result.BANKNAME,
                                        PAYMENTMODE: _result.PAYMENTMODE,
                                        REFUNDAMT: _result.REFUNDAMT,
                                        TXNDATE: _result.TXNDATE
                                    }
                                }, { returnOriginal: false });
                            if (payment_record.value) {
                                console.log("payment_record-----------------------------------------------------", payment_record);
                                commonClass.update_cash({ uid: payment_record.value.UID.toString(), cash: parseInt(_result.TXNAMOUNT), msg: "Deposite Money", bonus: false, trans: true });
                                let user_data = await db.collection('game_users').find({ _id: ObjectId(payment_record.value.UID.toString()) }).toArray();
                                if (user_data.length > 0 && user_data[0].reference_user_id && user_data[0].is_deposited == 0) {
                                    signupClass.firstDepositReferalBonus({ uid: user_data[0]._id, ref_uniq_id: user_data[0].reference_user_id, amount: parseInt(_result.TXNAMOUNT) });
                                }

                                if (user_data.length > 0 && user_data[0].is_deposited == 0) {
                                    signupClass.firstDepositBonus({ uid: user_data[0]._id, amount: parseInt(_result.TXNAMOUNT) });
                                }
                                await db.collection('game_users').updateOne({ _id: ObjectId(user_data[0]._id.toString()) }, { $set: { is_deposited: 1 } }, function () { })
                                commonClass.sendToAllSocket({ en: "DWN", data: { status: true, name: (user_data[0].un) ? user_data[0].un : "Lucky", action: "Deposited", amount: parseInt(_result.TXNAMOUNT) } });
                                commonClass.sendDataToUserId(payment_record.value.UID.toString(), { en: "DEPOSIT_RES", data: { success: true, msg: "Your transaction is successfull." } })
                            }
                            res.send('Payment Sucess Perss Back Button For Enjoy Game.');
                        } else {
                            let payment_record = await db.collection('payment_transection').findOneAndUpdate({ ORDER_ID: _result.ORDERID, tra_status: 'pending' },
                                {
                                    $set: {
                                        tra_status: "fail",
                                        TXNID: _result.TXNID,
                                        BANKTXNID: _result.BANKTXNID,
                                        STATUS: _result.STATUS,
                                        TXNTYPE: _result.TXNTYPE,
                                        GATEWAYNAME: _result.GATEWAYNAME,
                                        RESPCODE: _result.RESPCODE,
                                        RESPMSG: _result.RESPMSG,
                                        BANKNAME: _result.BANKNAME,
                                        PAYMENTMODE: _result.PAYMENTMODE,
                                        REFUNDAMT: _result.REFUNDAMT,
                                        TXNDATE: _result.TXNDATE
                                    }
                                }, { returnOriginal: false });
                            console.log("payment transection fail please check details-------------------------");
                            res.send('payment failed');
                        }
                    });
                });

                // post the data
                post_req.write(post_data);
                post_req.end();
            });
        });


        app.post("/approve_deposite", async (req, res) => {
            // Route for verifiying payment
            console.log("--calllback function=------", req.body);
            let data = req.body;
            console.log("data", data._id);
            if (typeof data._id != "undefined" && data._id) {
                let deposit_details = await db.collection('deposit_request').find({ _id: ObjectId(data._id.toString()) }, { uid: 1, amount: 1, mobile_no: 1, status: 1, cd: 1 }).sort({ cd: -1 }).toArray();
                console.log("deposit_details", deposit_details);
                if (deposit_details.length > 0) {
                    deposit_details = deposit_details[0];
                    if (deposit_details.status === "pending") {
                        commonClass.update_cash({ uid: deposit_details.uid.toString(), cash: parseInt(deposit_details.amount), msg: "Deposite Money From UTR", bonus: false, trans: true });
                        await db.collection('game_users_b').insertOne({ uid: deposit_details.uid.toString(), cash: parseInt(deposit_details.amount), date:new Date() })
                        let user_data = await db.collection('game_users').find({ _id: ObjectId(deposit_details.uid.toString()) }).toArray();
                        if (user_data.length > 0 && user_data[0].reference_user_id && user_data[0].is_deposited == 0) {
                            console.log("call come here");
                            signupClass.firstDepositReferalBonus({ uid: user_data[0]._id, ref_uniq_id: user_data[0].reference_user_id, amount: parseInt(deposit_details.amount) });
                        }

                        if (user_data.length > 0 && user_data[0].is_deposited == 0) {
                            signupClass.firstDepositBonus({ uid: user_data[0]._id, amount: parseInt(deposit_details.amount) });
                        }

                        await db.collection('game_users').updateOne({ _id: ObjectId(user_data[0]._id.toString()) }, { $set: { is_deposited: 1 } }, function () { })
                        await db.collection('deposit_request').updateOne({ _id: ObjectId(deposit_details._id.toString()) }, { $set: { status: "Approved" } }, function () { })

                        commonClass.sendToAllSocket({ en: "DWN", data: { status: true, name: (user_data[0].un) ? user_data[0].un : "Lucky", action: "Deposited", amount: parseInt(deposit_details.amount) } });
                        commonClass.sendDataToUserId(deposit_details.uid.toString(), { en: "DEPOSIT_RES", data: { success: true, msg: "Your Money Added into your account" } })
                        res.send({ msg: "Done", flg: true })
                    } else {
                        console.log("no any pending request");
                    }
                }
            }
        });

        app.post("/selectServer", decryptData, (req, res) => {
            try {
                cl("in choose server", req.body);
                if (typeof req.body.v == undefined || req.body.v == "" || req.body.v == null) {
                    commonClass.response(res, {
                        msg: "not proper data"
                    });
                    return false;
                }

                let config_data = config;

                let app_config_data = {
                    VM: config_data.VERSION_MESSAGE,
                    DU: config_data.DOWNLOAD_URL,
                    VERSION_TITLE: config_data.VERSION_TITLE,
                    FVP: (parseInt(req.body.v) < parseInt(config_data.FORCE_VERISON_CODE) && config_data.FORCE_VERSION_POPUP) ? true : false,
                    SVP: (parseInt(req.body.v) < parseInt(config_data.CURRENT_VERISON_CODE) && config_data.DISPLAY_VERSION_POPUP) ? true : false,
                    SHOW_ADS: config_data.SHOW_ADS,
                    PAY_BUTTON_FLAG: config_data.PAY_BUTTON_FLAG,
                    MM: config_data.MM, // maintenance flag
                    MM_T: config_data.MM_T, // maintenance time second
                    BASE_URL: process.env.BASE_URL,
                    MIN_DEPOSIT: config.MIN_DEPOSIT,
                    MAX_DEPOSIT: config.MAX_DEPOSIT,
                    MIN_WITHDRAW: config.MIN_WITHDRAW,
                    MAX_WITHDRAW: config.MAX_WITHDRAW,
                    POLICY_TEXT: config.POLICY_TEXT,
                    REJOIN_MSG: config.REJOIN_MSG,
                    MAX_BET: config.MAX_BET,
                    MAX_BET_FLAG: config.MAX_BET_FLAG,
                    POLICY_URL: config.POLICY_URL,
                    TERM_CONDITION_URL: config.TERM_CONDITION_URL,
                    FIRST_DEPOSIT_REFERAL_BONUS_PER: config.FIRST_DEPOSIT_REFERAL_BONUS_PER,

                    COMING_SOON_PAGE: config.COMING_SOON_PAGE,
                    ADD_CASH_BTN_FLAG: config.ADD_CASH_BTN_FLAG,
                    PROFILE_TRANSECTION_FLAG: config.PROFILE_TRANSECTION_FLAG,
                    ADD_CHIPS_PLUSE_BTN_FLAG: config.ADD_CHIPS_PLUSE_BTN_FLAG,

                    COMING_SOON_PAGE_2: config.COMING_SOON_PAGE_2,
                    ADD_CASH_BTN_FLAG_2: config.ADD_CASH_BTN_FLAG_2,
                    PROFILE_TRANSECTION_FLAG_2: config.PROFILE_TRANSECTION_FLAG_2,
                    ADD_CHIPS_PLUSE_BTN_FLAG_2: config.ADD_CHIPS_PLUSE_BTN_FLAG_2,

                    COMING_SOON_PAGE_3: config.COMING_SOON_PAGE_3,
                    ADD_CASH_BTN_FLAG_3: config.ADD_CASH_BTN_FLAG_3,
                    PROFILE_TRANSECTION_FLAG_3: config.PROFILE_TRANSECTION_FLAG_3,
                    ADD_CHIPS_PLUSE_BTN_FLAG_3: config.ADD_CHIPS_PLUSE_BTN_FLAG_3,

                    MORE_INQUIRY_LINK : config.MORE_INQUIRY,
                    OFFER_BANNER_LINK: config.OFFER_BANNER
                };
                commonClass.response(res, app_config_data);
            } catch (error) {
                commonClass.response(res, {
                    msg: "not proper data"
                });
            }

        })

        function decryptData(req, res, next) {
            try {
                console.log("call come");
                if (Object.keys(req.body).length > 0) {
                    console.log("-------");
                    req.body = commonClass.Dec(req.body.data);
                    if (typeof req.body == 'string') {
                        req.body = JSON.parse(req.body);
                    }
                }
                next();
            } catch (e) {
                console.log(e);
                commonClass.response(res, { status: false, data: {} });
            }

        }

    }
}