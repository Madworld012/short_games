module.exports = {
    WITHDRAWAL: async function (data, client) {
        if (data.uid && parseInt(data.amount) && parseInt(data.amount) > 0) {
            let user_data =await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (user_data && user_data.length > 0) {
                user_data = user_data[0];

                if (user_data.total_cash >= parseInt(data.amount)) {
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
                    console.log("1");
                    commonClass.update_cash({ uid: user_data._id.toString(), cash: -parseInt(data.amount), msg: "Withdrawal Request" });
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: true, cash: -parseInt(data.amount), msg: "Withdrawal Request Added, Admin Can Contact you soon !" } });
                } else {
                    console.log("2");
                    commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL", data: { status: false, cash: -parseInt(data.amount), msg: "Not Enought Cash In YOur Account !" } });
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
            let deposit_history =await db.collection('payment_transection').find({ UID: ObjectId(data.uid.toString()) }, { UID: 1, TXN_AMOUNT: 1, MOBILE_NO: 1, STATUS: 1, CD: 1 }).sort({ cd: -1 }).toArray();
            if (deposit_history && deposit_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: true, deposit_history: deposit_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "DEPOSIT_HISTORY", data: { status: false, deposit_history: [] } });
            }
        }
    },
    WITHDRAWAL_HISTORY: async function (data, client) {
        if (data.uid) {
            let withdraw_history =await db.collection('withdraw_request').find({ uid: ObjectId(data.uid.toString()) }, { UID: 1, TXN_AMOUNT: 1, MOBILE_NO: 1, STATUS: 1, CD: 1 }).sort({ cd: -1 }).toArray();
            if (withdraw_history && withdraw_history.length > 0) {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: true, withdraw_history: withdraw_history } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "WITHDRAWAL_HISTORY", data: { status: false, withdraw_history: [] } });
            }
        }
    },
}