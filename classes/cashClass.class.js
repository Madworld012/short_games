module.exports = {
    WITHDRAWAL: async function (data, client) {
        if (data.uid && parseInt(data.amount) && parseInt(data.amount) > 0) {
            if (parseInt(data.amount) < config.MIN_WITHDRAW) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: 'Please Withdraw Minimum ' + config.MIN_WITHDRAW + ' Rs.' } });
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
                        cd: new Date(),
                        status: "pending"
                    }
                    await db.collection('withdrawal_request').insertOne(withdrawal_data);
                    commonClass.update_cash({ uid: user_data._id.toString(), cash: -parseInt(data.amount), msg: "Withdrawal Request", bonus: false, trans: true });
                    commonClass.sendToAllSocket({ en: "DWN", data: { status: true, name: (user_data.un) ? user_data.un : "Lucky", action: "Withdrawal", amount: parseInt(data.amount) } });
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: true, cash: -parseInt(data.amount), msg: "Withdrawal Request Added, Admin Can Contact you soon !" } });
                } else {
                    console.log("2");
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "Not Enought Cash In Your Cash Wallet !" } });
                }
            } else {
                console.log("3");
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "User Not Found" } });
            }
        } else {
            console.log("4");
            commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "Please Send Proper Data" } });
        }
    },
    DEPOSIT_HISTORY: async function (data, client) {
        if (data.uid) {
            let deposit_history = await db.collection('payment_transection').find({ UID: ObjectId(data.uid.toString()) }, { UID: 1, TXN_AMOUNT: 1, MOBILE_NO: 1, STATUS: 1, CD: 1 }).sort({ cd: -1 }).toArray();
            if (deposit_history && deposit_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: true, deposit_history: deposit_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: false, deposit_history: [] } });
            }
        }
    },
    WITHDRAWAL_HISTORY: async function (data, client) {
        if (data.uid) {
            let withdraw_history = await db.collection('withdrawal_request').find({ uid: ObjectId(data.uid.toString()) }, { uid: 1, amount: 1, mobile_no: 1, status: 1, cd: 1 }).sort({ cd: -1 }).toArray();
            console.log("withdraw_history", withdraw_history);

            if (withdraw_history && withdraw_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: true, withdraw_history: withdraw_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: false, withdraw_history: [] } });
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
    }
}