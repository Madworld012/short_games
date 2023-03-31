module.exports = {
    WITHDRAWAL: async function (data, client) {
        console.log("WITHDRAWAL", data);
        if (data.uid && parseInt(data.amount) && parseInt(data.amount) > 0) {
            if (parseInt(data.amount) < config.MIN_WITHDRAW) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'Please Withdraw Minimum ' + config.MIN_WITHDRAW + ' Rs.' } });
                return;
            }

            if (parseInt(data.amount) >= config.MAX_WITHDRAW) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'You can Withdraw Maximum ' + config.MAX_WITHDRAW + ' Rs.' } });
                return;
            }

            let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (user_data && user_data.length > 0) {
                user_data = user_data[0];

                if (user_data.total_cash > 0 && user_data.total_cash >= parseInt(data.amount)) {
                    let withdrawal_data = {
                        uid: user_data._id,
                        name: (user_data.un) ? user_data.un : "",
                        email: (user_data.ue) ? user_data.ue : "",
                        mobile_no: user_data.mobile_no,
                        amount: parseInt(data.amount),
                        payment_method: (typeof data.payment_method != 'undefined' && data.payment_method != '') ? data.payment_method : "",
                        cd: new Date(),
                        status: "pending"
                    }
                    await db.collection('withdrawal_request').insertOne(withdrawal_data);
                    commonClass.update_cash({ uid: user_data._id.toString(), cash: -parseInt(data.amount), msg: "Withdrawal Request", bonus: false, trans: true });
                    commonClass.sendToAllSocket({ en: "DWN", data: { status: true, name: (user_data.un) ? user_data.un : "Lucky", action: "Withdrawal", amount: parseInt(data.amount) } });
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: true, cash: -parseInt(data.amount), msg: "Withdrawal Request Added, Admin Can Contact you soon !" } });
                } else {
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "Not Enought Cash In Your Cash Wallet !" } });
                }
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "User Not Found" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "Please Send Proper Data" } });
        }
    },
    DEPOSIT: async function (data, client) {
        console.log("DEPOSIT", data);

        if (typeof data.uid == 'undefined' || typeof data.amount == 'undefined' || typeof data.UTR_CODE == 'undefined') {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'Please send Proper Data' } });
            return;
        }

        if (data.uid && parseInt(data.amount) && data.UTR_CODE && parseInt(data.amount) > 0) {
            if (parseInt(data.amount) < config.MIN_DEPOSIT) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'Please Deposit Minimum ' + config.MIN_WITHDRAW + ' Rs.' } });
                return;
            }

            if (parseInt(data.amount) > config.MAX_DEPOSIT) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'You can Deposit Maximum ' + config.MAX_WITHDRAW + ' Rs.' } });
                return;
            }

            let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (user_data && user_data.length > 0) {
                user_data = user_data[0];

                let deposit_data = {
                    uid: user_data._id,
                    name: (user_data.un) ? user_data.un : "",
                    email: (user_data.ue) ? user_data.ue : "",
                    mobile_no: user_data.mobile_no,
                    amount: parseInt(data.amount),
                    UTR_CODE: data.UTR_CODE,
                    TRA_NO : data.TRA_NO,
                    cd: new Date(),
                    status: "pending"
                }
                await db.collection('deposit_request').insertOne(deposit_data);
                // commonClass.update_cash({ uid: user_data._id.toString(), cash: -parseInt(data.amount), msg: "Withdrawal Request", bonus: false, trans: true });
                // commonClass.sendToAllSocket({ en: "DWN", data: { status: true, name: (user_data.un) ? user_data.un : "Lucky", action: "Withdrawal", amount: parseInt(data.amount) } });
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT", data: { status: true, cash: -parseInt(data.amount), msg: "Deposit Request Added, Admin Will Approve soon !" } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT", data: { status: false, cash: -parseInt(data.amount), msg: "User Not Found" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT", data: { status: false, cash: -parseInt(data.amount), msg: "Please Send Proper Data" } });
        }
    },
    DEPOSIT_HISTORY: async function (data, client) {
        if (data.uid) {
            let deposit_history = await db.collection('deposit_request').find({ uid: ObjectId(data.uid.toString()) }, { uid: 1, amount: 1, mobile_no: 1, status: 1, cd: 1 }).sort({ cd: -1 }).toArray();
            if (deposit_history && deposit_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: true, deposit_history: deposit_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: false, deposit_history: [] } });
            }
        }
    },
    WITHDRAWAL_HISTORY: async function (data, client) {
        if (data.uid) {
            let withdraw_history = await db.collection('withdrawal_request').find({ uid: ObjectId(data.uid.toString()) }, { uid: 1, amount: 1, mobile_no: 1, status: 1, cd: 1, payment_method: 1 }).sort({ cd: -1 }).toArray();
            if (withdraw_history && withdraw_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: true, withdraw_history: withdraw_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: true, withdraw_history: [] } });
            }
        }
    },
    //cash detail
    CD: async function (data, client) {
        if (!data || !data.uid) {
            commonClass.sendDirectToUserSocket(client, { en: "CD", data: { success: false, msg: "Please send proper data." } });
            return;
        }
        let cash_detail = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }, { total_cash: 1, bonus_cash: 1 }).toArray();
        if (cash_detail.length > 0) {
            cash_detail = cash_detail[0];
            var send_json = {
                status: true,
                uid: cash_detail._id.toString(),
                total_cash: cash_detail.total_cash,
                bonus_cash: cash_detail.bonus_cash
            }
            commonClass.sendDirectToUserSocket(client, { en: "CD", data: send_json });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "CD", data: { success: false, msg: "User Not Found" } });
        }
    },
    REFERRAl_DETAILS: async function (data, client) {
        let referral_details = await db.collection('referral_details').find({}).toArray();
        let referalcode = ""
        if (data.uid) {
            let user_refera_code = await db.collection('game_users').find({ _id: ObjectId(data.uid) }).toArray();
            if (user_refera_code.length > 0) {
                referalcode = user_refera_code[0].unique_id;
            }
            if (referral_details.length > 0) {
                delete referral_details[0]._id;
                referral_details[0]["referalcode"] = referalcode;
                commonClass.sendDirectToUserSocket(client, { en: "REFERRAl_DETAILS", data: { status: true, referral_details: referral_details[0] } });
            } else {
                commonClass.sendDirectToUserSocket(client, {
                    en: "REFERRAl_DETAILS", data: {
                        status: true, referral_details: {
                            "line1": "Download the app to share the referral code with your friends from inside the app.",
                            "line2": "Find the Refer & Earn tab at the bottom right corner inside the app",
                            "line3": "Share with friends on whatsapp",
                            "line4": "Rs.100 Bonus Cash when your friend joins Lucky Rocket.",
                            "line5": "Get 25% of your friend's first deposit, up to a maximum of Rs.500 Bonus Cash.",
                            "line6": "Guaranteed benefits of Rs.100 Bonus Cash on signing up and upto Rs.500 on playing on LUCKY ROCKET",
                            "referalcode": referalcode
                        }
                    }
                });
            }

        }
    },
    DEPOSIT_DETAILS: async function (data, client) {
        let referral_details = await db.collection('payment_details').find({}).toArray();
        let upi_details = await db.collection('UPI_dtails').find({}).toArray();

        if (!data.amount || data.amount <= 0) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Please enter proper amount." } });
            return false;
        }

        if (referral_details.length > 0) {
            delete referral_details[0]._id;
            if (upi_details.length > 0) {
                let transection_no = "luckyrocket" + "-" + new Date().valueOf();
                referral_details[0].UPI_ID = upi_details[0].UPI_ID;
                referral_details[0].UPI_NAME = upi_details[0].UPI_NAME;
                referral_details[0].QR_CODE = "http://" + process.env.BASE_URL + "/" + upi_details[0].QR_CODE;
                // referral_details[0].PAY_INTENT = "upi://pay?ver=01&mode=15&am=" + parseInt(data.amount) + "&mam=" + parseInt(data.amount) + "&cu=INR&pa=" + upi_details[0].UPI_ID + "&pn=LuckyRocket+Gaming&mc=5816&tr=" + transection_no + "&tn=topup+wallet&mid=LUCKYROCKET&msid=LUCKYROCKET001-LUCKY&mtid=LUCKYROCKET001-001";
                referral_details[0].PAY_INTENT = "upi://pay?&am=" + parseInt(data.amount) + "&mam=" + parseInt(data.amount) + "&cu=INR&pa=" + upi_details[0].UPI_ID +"";
                referral_details[0].TRA_NO = transection_no;
                
            }
            commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_DETAILS", data: { status: true, referral_details: referral_details[0] } });
        } else {
            commonClass.sendDirectToUserSocket(client, {
                en: "DEPOSIT_DETAILS", data: {
                    status: true, referral_details: {
                        "line1": "Copy The UPI ID or Scan QR code to make payment. | पेमेंट करने के लिए UPI आईडी कॉपी करें या QR कोड स्कैन करें",
                        "line2": "Copy and Paste amount | राशि को कॉपी करें और पेमेंट करें",
                        "line3": "Confirm payment | पेमेंट ऐप में पेमेंट को कन्फर्म करें",
                        "line4": "Copy the UTR after making payment from payment application | पेमेंट करने के बाद UTR को Payment App से कॉपी करें",
                        "line5": "Paste the copied UTR in 'Enter UTR' Field | कॉपी किए गए UTR को निचे Paste करें",
                        "UPI_ID": "payluckyrocket@sbi",
                        "QR_CODE": "http://" + process.env.BASE_URL + "/qr_code.JPG",
                        "UPI_NAME": "LuckyRocket",
                        "PAY_INTENT": "upi://pay?ver=01&mode=15&am=" + parseInt(data.amount) + "&mam=" + parseInt(data.amount) + "&cu=INR&pa=payluckyrocket@sbi&pn=LuckyRocket+Gaming&mc=5816&tr=" + "luckyrocket" + "-" + new Date().valueOf() + "&tn=topup+wallet&mid=KOPAYMENTS001&msid=KOPAYMENTS001-ENTWIK&mtid=KOPAYMENTS001-001",
                        "TRA_NO":"luckyrocket" + "-" + new Date().valueOf()
                    }
                }
            });
        }
    }
}