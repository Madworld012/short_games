const commonClass = require("./common.class");
let cache = require('../cache/cache');
const { ObjectId } = require("mongodb");
const names = require('../name');

module.exports = {
    /**
        * table status *
        
        * 1 - INIT 
        * 2 - START_BET_TIME
        * 3 - FLAY_PLANE
        * 4 - WAIT_NEW_ROUND
        
        bet_flg - if true user can bet
        cash_out_flg - if true user can cashout his cash
    */
    SG: async function (data, client) {
        if (data.uid) {

            //ALERT if want check user cash

            console.log("in SG game form client event------------------------------");
            let userData = await db.collection('game_users').find({ _id: ObjectId(client.uid.toString()) }).toArray();


            if (userData && userData.length > 0) {

                if (userData[0].isMobileVerified == 0) {
                    commonClass.sendDirectToUserSocket(client, { en: "SG", data: { status: false, msg: "Please Verify Your Mobile NUmber First" } });
                    return false;
                }

                if (userData[0].tblid != "") {
                    console.log("Your Game Already Running please leave first");
                    commonClass.sendDirectToUserSocket(client, { en: "SG", data: { status: false, leave: true, msg: "Please leave from Game first" } });
                    return;
                }

                let wh = { count: { $lte: config.TABLE_USER_SIZE } };
                let tableData = await db.collection('aviator_table').find(wh).toArray();


                if (tableData.length > 0) {

                    await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { is_play: 1, last_game_play: new Date(), tblid: tableData[0]._id.toString() } }, function () { })
                    client.tblid = tableData[0]._id.toString();
                    client.join(tableData[0]._id.toString());
                    commonClass.sendDirectToUserSocket(client, { en: "GTI", data: tableData[0] });
                    await db.collection('aviator_table').updateOne({ _id: ObjectId(tableData[0]._id.toString()) }, { $inc: { count: 1 } }, function () { });

                } else {
                    let in_tableData = {
                        status: "INIT",
                        cd: new Date(),
                        history: [],
                        x: 0,
                        count: 1,
                        bet_flg: false,
                        cash_out_flg: false
                    }

                    let table_id = await db.collection('aviator_table').insertOne(in_tableData);
                    let new_table_data = await db.collection('aviator_table').find({ _id: ObjectId(table_id.insertedId.toString()) }).toArray();
                    if (new_table_data && new_table_data.length > 0) {
                        await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { is_play: 1, last_game_play: new Date(), tblid: new_table_data[0]._id.toString() } }, function () { })
                        client.tblid = new_table_data[0]._id.toString();
                        client.join(new_table_data[0]._id.toString());
                        commonClass.sendDirectToUserSocket(client, { en: "GTI", data: new_table_data[0] });
                        aviatorClass.startGame(new_table_data[0]._id);
                        cl("table_data", new_table_data);
                    } else {
                        cl("Critical error please check server and log", new_table_data);
                    }

                }
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "SG", data: { status: false, msg: "User Not Found Please registerFirst" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "SG", data: { status: false, msg: "Please send User id " } });
        }
    },
    startGame: async function (tblid) {

        if (tblid) {

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(tblid.toString()) }).toArray();

            if (table_data && table_data.length > 0) {
                if (table_data[0].count <= 0) {
                    cl("game over no more player available.")
                    await db.collection('aviator_table').deleteOne({ _id: ObjectId(tblid.toString()) });
                    return false;
                }
            }

            if (table_data && (table_data[0].status == "INIT" || table_data[0].status == "WAIT_NEW_ROUND")) {

                cl("config.BET_TIME", config.BET_TIME);
                var startGameBetTimer = commonClass.AddTime(config.BET_TIME);
                var jobId = randomstring.generate(10);
                console.log("\nStart Bet time");
                await db.collection('aviator_table').updateOne({ _id: ObjectId(table_data[0]._id.toString()) }, { $set: { jobId: jobId, bet_flg: true, cash_out_flg: false, status: "START_BET_TIME" } }, function () { });
                //SBT = start bet time
                commonClass.sendToRoom(tblid.toString(), { en: "SBT", data: { status: true, "time": config.BET_TIME, bet_flg: true, cash_out_flg: false, msg: "Start Your Beting" } });

                schedule.scheduleJob(jobId, new Date(startGameBetTimer), async function () {
                    schedule.cancelJob(jobId);
                    console.log("\nFlying plane Or Stop bet");
                    await aviatorClass.fly_plane(table_data[0]._id.toString());
                });
            } else {
                cl("game already started");
                return false;
            }
        }
    },
    fly_plane: async function (tblid) {
        if (tblid) {
            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(tblid.toString()) }).toArray();
            if (table_data && table_data[0].status == "START_BET_TIME") {
                await db.collection('aviator_table').updateOne({ _id: ObjectId(table_data[0]._id.toString()) }, { $set: { status: "FLAY_PLANE", bet_flg: false, cash_out_flg: true } }, function () { });
                //SF - start fly plne
                commonClass.sendToRoom(tblid.toString(), { en: "SF", data: { status: true, msg: "Start Flay Plane", bet_flg: false, cash_out_flg: true } });
                await aviatorClass.send_fly_event(table_data[0]._id);
            } else {
                cl("\nsome problem in table status");
            }
        }
    },
    send_fly_event: async function (tblid) {

        let cut_out_x_value = await aviatorClass.getRandomFloat();

        console.log("\nNext Cut Out Value ---------------------------", cut_out_x_value);
        //start x value
        let x = 0.99;
        let re_fly = 0;
        async function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        const call = async (cut_out_x_value) => {
            if (x == cut_out_x_value) {
                cache.del(tblid.toString());
                //need to add indexing
                let no_bet_available_data = await db.collection('game_users').find({tblid: tblid.toString(), $or: [{ bet_1:{ $gt: 0 } }, { bet_2:{ $gt: 0 } }] }).toArray();
                let rand_value = _.random(1, 10);
                if(no_bet_available_data && no_bet_available_data.length == 0 && re_fly == 0 && rand_value == 1){
                    console.log("-----------------------------------------start again-------------------------------------------------------");
                    call(_.random(config.FAKE_PLANE_FLAY_MIN_AMOUNT, config.FAKE_PLANE_FLAY_MAX_AMOUNT));
                    re_fly = 1;
                    return;
                }else{
                    await db.collection('aviator_table').updateOne({ _id: ObjectId(tblid.toString()) }, { $set: { bet_flg: false, cash_out_flg: false }, $push: { history: x } }, function () { });
                    aviatorClass.cut_plane({ tblid: tblid, x: x });
                    return false;
                }
            } else {
                await sleep(100 / x);
                x = parseFloat((x + 0.01).toFixed(2));
                commonClass.sendToRoom(tblid.toString(), { en: "FLAY", data: { "count": x } });
                await cache.set(tblid.toString(), JSON.stringify({
                    x: x
                }));
                // console.log("x", x);
                call(cut_out_x_value);
            }
        }
        return await call(cut_out_x_value);
    },
    cut_plane: async function (data) {
        if (data.tblid) {
            cl("\nPlane Cut Out", data.tblid);
            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(data.tblid.toString()) }).toArray();
            if (table_data.length > 0 && table_data[0].status == "FLAY_PLANE") {
                //CP - Cutout plae , stop cutout, wait for start new round
                commonClass.sendToRoom(data.tblid.toString(), { en: "CP", data: { status: true, msg: "Stop Flay Plane Cut Out", bet_flg: false, cash_out_flg: false } });
                var jobId = randomstring.generate(10);

                let update_data = {
                    $set: {
                        jobId: jobId,
                        status: "WAIT_NEW_ROUND",
                        bet_flg: false,
                        cash_out_flg: false
                    }
                }

                if (table_data[0].history.length >= config.STORE_HISTORY) {
                    update_data["$pop"] = { history: -1 }
                }

                await db.collection('aviator_table').updateOne({ _id: ObjectId(table_data[0]._id.toString()) }, update_data, function () { });
                await db.collection('game_users').updateOne({ tblid: table_data[0]._id.toString() }, { $set: { bet_1: 0, bet_2: 0 } }, { multi: true }, function () { });
                var startNewGameTimer = commonClass.AddTime(config.NEW_ROUND_START_TIME);

                if (config.NEW_ROUND_START_TIME > 0) {
                    aviatorClass.sendAutoNotification(table_data[0]._id.toString(), 5);
                }

                cl("\nWait For New Round");
                schedule.scheduleJob(jobId, new Date(startNewGameTimer), async function () {
                    schedule.cancelJob(jobId);
                    aviatorClass.startGame(table_data[0]._id.toString());
                });
            } else {
                return;
            }

        }
    },
    getRandomFloat: async function () {

        let rand_value = _.random(1, 100);
        console.log("rand_value---------------", rand_value)
        let range = await db.collection('range').find({ $and: [{ prob_min: { $lte: rand_value } }, { prob_max: { $gte: rand_value } }] }).toArray();
        console.log("range", range);
        if (range && range.length > 0) {
            range = range[0];
            const str = (Math.random() * (range.max_value - range.min_value) + range.min_value).toFixed(2);
            return parseFloat(str);
        } else {
            console.log("come at else");
            const str = (Math.random() * (2 - 1) + 1).toFixed(2);
            return parseFloat(str);
        }
    },
    PLACE_BET: async function (data, client) {
        console.log("\n User Bet Come", data);
        if (data.uid && data.tblid) {



            if (typeof data.bet_1 == "undefined" || data.bet_1 < 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("1");
                return false;
            }

            if (typeof data.bet_2 == "undefined" || data.bet_2 < 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("2");
                return false;
            }


            if (data.bet_1 <= 0 && data.bet_2 <= 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("3");
                return false;
            }

            if (config.MAX_BET_FLAG && data.bet_1 > 0 && data.bet_1 > config.MAX_BET) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Maximum Bet limit Reached" } });
                cl("4");
                return false;
            }

            if (config.MAX_BET_FLAG && data.bet_2 > 0 && data.bet_2 > config.MAX_BET) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Maximum Bet limit Reached" } });
                cl("5");
                return false;
            }


            let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (!user_data || user_data.length <= 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "User Not Found" } });
                console.log("table or user not found");
                cl("6");
                return false;
            }

            if (typeof user_data[0].tblid == "undefined" || user_data[0].tblid == "") {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                console.log("table Not Found");
                cl("7");
                return false;
            }

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data[0].tblid.toString()) }).toArray();
            if (!table_data || table_data.length <= 0 || table_data[0].bet_flg != true) {
                console.log("table or Bet flar of");
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                cl("8");
                return false;
            }

            let total_bet = 0;
            let update_data = {};
            if (data.bet_1 > 0) {
                cl("9");
                total_bet += data.bet_1;
                update_data['bet_1'] = data.bet_1;
            }

            if (data.bet_2 > 0) {
                cl("10");
                total_bet += data.bet_2;
                update_data['bet_2'] = data.bet_2;
            }

            console.log("total_bet", total_bet);
            if (total_bet > 0 && user_data[0].total_cash >= total_bet) {
                cl("11");
                console.log("total_bet", total_bet);

                // var fCash = ((-total_bet + user_data[0].total_cash) < 0) ? 0 : (-total_bet + user_data[0].total_cash);
                // console.log("fCash", fCash);
                //SK - if flot value gose in big digit
                // let float_value = parseFloat(fCash).toFixed(2);
                // final_chips = parseFloat(float_value);
                // update_data["total_cash"] = fCash;

                commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: -total_bet, msg: "Place Bet" });

                let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { user_data, status: true, total_cash: user_updated_record.value.total_cash, bet_1: user_updated_record.value.bet_1, bet_2: user_updated_record.value.bet_2, msg: "You have Place Bet Successfully" } });
                commonClass.sendToRoom(data.tblid.toString(), { en: "UPDATE_BET", data: { type: "BET", uid: data.uid.toString(), bet: total_bet } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "You Have Not Sufficient Balance" } });
            }
        }
    },
    CASH_OUT: async function (data, client) {
        console.log("\nUser Cashout Come", data)
        console.log('--------------');
        let current_x_value = JSON.parse(await cache.get(client.tblid.toString()));
        console.log("current_x_value", current_x_value);

        if (current_x_value == null) {
            console.log("1");
            commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Already Flay Away Plane...." } });
            return false;
        }

        if (data.uid && data.tblid) {

            if (typeof data.cashout == 'undefined' || data.cashout == "" || data.cashout <= 0) {
                cl("1.1")
                commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Send Proper Data" } });
                return false;
            }

            cl("2");
            let user_data = await db.collection('game_users').find({ _id: ObjectId(client.uid.toString()) }).toArray();

            if (user_data && user_data.length > 0) {

                if (typeof user_data[0].tblid == "undefined" || user_data[0].tblid == "") {
                    commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Table Not Found" } });
                    console.log("table Not Found");
                    cl("2");
                    return false;
                }

                let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data[0].tblid.toString()) }).toArray();

                if (!table_data || table_data.length <= 0 || table_data[0].cash_out_flg != true) {
                    cl("3");
                    commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "You can not cashout this time" } });
                    return false;
                }


                cl("4");
                let update_data = {};
                let win_amount = 0;

                if (data.cashout == 1) {
                    cl("5");
                    if (user_data[0].bet_1 > 0) {
                        cl("current_x_value", current_x_value.x);
                        cl("user_data[0].bet_1", user_data[0].bet_1);
                        win_amount += current_x_value.x * user_data[0].bet_1;
                        update_data["bet_1"] = 0;
                    } else {
                        cl("6");
                        commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "You not Place Any bet" } });
                    }
                } else if (data.cashout == 2) {
                    if (user_data[0].bet_2 > 0) {
                        cl("7");
                        win_amount += current_x_value.x * user_data[0].bet_2;
                        update_data["bet_2"] = 0;
                    } else {
                        cl("8");
                        commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "You not Place Any bet" } });
                    }
                } else {
                    cl("9");
                    commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Please provide proper cashout data" } });
                }

                if (win_amount > 0) {
                    cl("4");
                    cl("win amount =", win_amount)
                    commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: win_amount, msg: "Cash Out" });

                    let user_updated_data = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(client.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
                    commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: true, win_amount: win_amount, total_cash: user_updated_data.value.total_cash } });
                    commonClass.sendToRoom(table_data[0]._id.toString(), { en: "UPDATE_BET", data: { type: "CASHOUT", uid: data.uid.toString(), bet: user_data[0].bet_1 + user_data[0].bet_2, win_amount: win_amount } });
                } else {
                    cl("10");
                    commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Your Winning Price is lessthen 0" } });
                }
            } else {
                cl("11");
                commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "User Or table Not Found" } });
            }
        } else {
            cl("12")
            commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "User Or table Not Found" } });
        }

    },
    CANCEL_BET: async function (data, client) {
        cl("\n User Bet CANCEL_BET Come", data);
        if (data.uid && data.tblid && data.cancel) {

            let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (!user_data || user_data.length <= 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "User Not Found" } });
                console.log("table or user not found");
                cl("2");
                return false;
            }

            if (typeof user_data[0].tblid == "undefined" || user_data[0].tblid == "") {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                console.log("table Not Found");
                cl("2");
                return false;
            }

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data[0].tblid.toString()) }).toArray();
            if (!table_data || table_data.length <= 0 || table_data[0].bet_flg != true) {
                console.log("table or Bet flar of");
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                cl("3");
                return false;
            }

            let update_data = { $set: {} };
            let total_cancel = 0;
            if (data.cancel == 1) {
                update_data.$set['bet_1'] = 0;
                total_cancel += user_data[0].bet_1;
            }

            if (data.cancel == 2) {
                update_data.$set['bet_2'] = 0;
                total_cancel += user_data[0].bet_2;
            }

            cl("update_data", update_data)
            if (total_cancel > 0) {
                let new_user_data = await db.collection('game_users').findOneAndUpdate({
                    _id: ObjectId(user_data[0]._id.toString()),
                }, update_data, { returnDocument: 'after' });

                console.log("new_user_data", new_user_data);
                commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: total_cancel, msg: "Cancel Bet" });
                commonClass.sendDirectToUserSocket(client, { en: "CANCEL_BET", data: { status: true, msg: "Bet Cancel Success" } });

            } else {
                commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, msg: "Your Cancel Amount is lessthen 0" } });

            }

        } else {
            commonClass.sendDirectToUserSocket(client, { en: "CANCEL_BET", data: { status: false, msg: "Missing Data" } });
        }
    },
    LG: async function (data, client) {
        if (client) {
            if (typeof client.uid != "undefined" && client.uid != "" && client.uid != null) {
                let userData = await db.collection('game_users').find({ $or: [{ _id: ObjectId(client.uid.toString()) }, { sck: client.id }] }).toArray();
                if (userData.length > 0 && typeof userData[0].tblid != "undefined" && userData[0].tblid != "") {
                    let tableDate = await db.collection('aviator_table').find({ _id: ObjectId(userData[0].tblid.toString()) }).toArray();
                    if (tableDate.length > 0) {
                        await db.collection('aviator_table').updateOne({ _id: ObjectId(tableDate[0]._id.toString()) }, { $inc: { count: -1 } }, function () { });
                        client.join(tableDate[0]._id.toString());
                    }
                    await db.collection('game_users').updateOne({ _id: ObjectId(userData[0]._id) }, { $set: { sck: "", is_online: 0, lo: new Date(), bet_1: 0, bet_2: 0, tblid: "" } }, function () { })
                } else {
                    await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { sck: "", is_online: 0, lo: new Date(), bet_1: 0, bet_2: 0, tblid: "" } }, function () { })
                }
            } else {
                cl("client.uid is not found");
            }
            cl("userid", client.id);
        } else {
            cl("socket not defined");
        }
    },
    sendAutoNotification: async function (tblid) {
        if (tblid) {
            if (tblid && config.AUTO_WIN_NOTIFICATION) {
                let count = 1;
                let run_count = _.random(1, config.AUTO_WIN_NOTIFICATION_COUNT);
                let myintervaal = setInterval(() => {
                    if (count == run_count) {
                        clearInterval(myintervaal);
                    } else {
                        let rand_value_name = _.random(0, names.length);
                        commonClass.sendToRoom(tblid.toString(), { en: "NOTIFICATION", data: { status: true, name: names[rand_value_name], amount: _.random(config.NOTIFICATION_MIN_WIN_AMOUNT, config.NOTIFICATION_MAX_WIN_AMOUNT) } });
                        console.log("call come", count);
                        count++;
                    }
                }, _.random(400, 500));

            }
        }
    }

}