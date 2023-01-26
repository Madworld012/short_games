const commonClass = require("./common.class");
let cache = require('../cache/cache');
const { ObjectId } = require("mongodb");
const names = require('../name');
const Queue = require('bull');
const opts = require('../cache/bullOpts');
const autoCut = new Queue('auto-cut', opts);

// let tblid = "63bd0c4318fbe31071588f78";
// cache.delWildcard("auto_"+tblid+"_*_*", function () { });

autoCut.process(async (job, done) => {
    try {
        console.log("reply", job.data);
        const { reply } = job.data;
        console.log("call come in bull process", reply);

        for (let i = 0; i < reply.length; i++) {
            const key = reply[i];
            console.log("key", key);
            let user_data = key.split("_");
            let tblid = user_data[1];
            let uid = user_data[2];
            let x = user_data[3];
            let bet_data = user_data[4];

            // await aviatorClass.AUTO_CASH_OUT({ uid: uid, tblid: tblid, x: { x: parseFloat(x) }, cashout: bet_data, auto: true }, { uid: uid, tblid: tblid })
            await aviatorClass.CASH_OUT({ uid: uid, tblid: tblid, x: { x: parseFloat(x) }, cashout: bet_data, auto: true }, { uid: uid, tblid: tblid })
        }

        done();
    } catch (error) {
        Promise.reject(error);
    }
});

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
            if (client.uid) {
                console.log("in SG game form client event------------------------------");
                let userData = await db.collection('game_users').find({ _id: ObjectId(client.uid.toString()) }).toArray();


                if (userData && userData.length > 0) {
                    userData = userData[0];
                    if (userData.isMobileVerified == 0) {
                        commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Please Verify Your Mobile NUmber First" } });
                        return false;
                    }

                    if (userData.tblid != "") {
                        console.log("Your Game Already Running please leave first");
                        aviatorClass.LG({}, client);
                        commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, msg: "Please leave from Game first" } });
                        return;
                    }

                    let wh = { count: { $lte: config.TABLE_USER_SIZE } };
                    let tableData = await db.collection('aviator_table').find(wh).toArray();


                    if (tableData && tableData.length > 0) {
                        tableData = tableData[0];
                        await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { is_play: 1, last_game_play: new Date(), tblid: tableData._id.toString() } }, function () { })
                        client.tblid = tableData._id.toString();
                        client.join(tableData._id.toString());
                        tableData["total_cash"] = userData.total_cash;

                        if (tableData.status == "START_BET_TIME") {
                            tableData["bet_time"] = parseInt(config.BET_TIME) - commonClass.GetTimeDifference(tableData.sbt, new Date(), 'second');
                        }

                        if (tableData.status == "WAIT_NEW_ROUND") {
                            tableData.x = tableData.history[tableData.history.length - 1];
                        }

                        if (tableData.history.length <= 15) {
                            let table_o_history = tableData.history.reverse();
                            tableData.history = table_o_history.concat(tableData.f_history.reverse());
                        }
                        commonClass.sendDirectToUserSocket(client, { en: "GTI", data: tableData });
                        await db.collection('aviator_table').updateOne({ _id: ObjectId(tableData._id.toString()) }, { $inc: { count: 1 } }, function () { });
                    } else {
                        let in_tableData = {
                            status: "INIT",
                            cd: new Date(),
                            history: [],
                            f_history: commonClass.getRandomeHistory(25),
                            x: 0,
                            count: 1,
                            bet_flg: false,
                            cash_out_flg: false
                        }


                        let table_id = await db.collection('aviator_table').insertOne(in_tableData);
                        let new_table_data = await db.collection('aviator_table').find({ _id: ObjectId(table_id.insertedId.toString()) }).toArray();
                        if (new_table_data && new_table_data.length > 0) {
                            new_table_data = new_table_data[0];
                            await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { is_play: 1, last_game_play: new Date(), tblid: new_table_data._id.toString() } }, function () { })
                            client.tblid = new_table_data._id.toString();
                            client.join(new_table_data._id.toString());
                            console.log("userData.total_cash----------------------------------------------------------------------", userData.total_cash);
                            new_table_data["total_cash"] = userData.total_cash;
                            new_table_data.history = new_table_data.f_history.reverse();
                            commonClass.sendDirectToUserSocket(client, { en: "GTI", data: new_table_data });
                            aviatorClass.startGame(new_table_data._id);
                            if (config.DEPO_WITH_AUTO_WIN_NOTIFICATION) {
                                aviatorClass.startDepositwithdrawNoti(new_table_data._id);
                            }
                            cl("table_data", new_table_data);
                        } else {
                            cl("Critical error please check server and log", new_table_data);
                        }

                    }
                } else {
                    commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "User Not Found Please Register First" } });
                }
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "User Not Found Please Register First" } });
        }
    },
    startGame: async function (tblid) {

        if (tblid) {

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(tblid.toString()) }).toArray();

            if (table_data && table_data.length > 0) {
                if (table_data[0].count <= 0) {
                    cl("game over no more player available.")
                    let today = moment().format("DD/MM/YYYY");
                    await db.collection('daily_table_history').insertOne({ cd: today, history: table_data[0].history });
                    await db.collection('aviator_table').deleteOne({ _id: ObjectId(tblid.toString()) });
                    return false;
                }
            }

            if (table_data && (table_data[0].status == "INIT" || table_data[0].status == "WAIT_NEW_ROUND")) {

                cl("config.BET_TIME", config.BET_TIME);
                var startGameBetTimer = commonClass.AddTime(config.BET_TIME);
                var jobId = randomstring.generate(10);
                console.log("\nStart Bet time");
                await db.collection('aviator_table').updateOne({ _id: ObjectId(table_data[0]._id.toString()) }, { $set: { jobId: jobId, sbt: new Date(), bet_flg: true, cash_out_flg: false, status: "START_BET_TIME" } }, function () { });
                //SBT = start bet time
                commonClass.sendToRoom(tblid.toString(), { en: "SBT", data: { status: true, time: config.BET_TIME, bet_flg: true, cash_out_flg: false, msg: "Start Your Beting" } });

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
            if (table_data && table_data.length > 0) {
                if (table_data[0].status == "START_BET_TIME") {
                    await db.collection('aviator_table').updateOne({ _id: ObjectId(table_data[0]._id.toString()) }, { $set: { status: "FLAY_PLANE", bet_flg: false, cash_out_flg: true } }, function () { });
                    //SF - start fly plne
                    commonClass.sendToRoom(tblid.toString(), { en: "SF", data: { status: true, msg: "Start Flay Plane", bet_flg: false, cash_out_flg: true } });
                    await aviatorClass.send_fly_event(table_data[0]._id);
                }
                else {
                    cl("\nsome problem in table status in playing table", table_data);
                }
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
                cache.delWildcard("auto_" + tblid.toString() + "_*", function () { });

                //need to add indexing
                let no_bet_available_data = await db.collection('game_users').find({ tblid: tblid.toString(), $or: [{ bet_1: { $gt: 0 } }, { bet_2: { $gt: 0 } }] }).toArray();
                let rand_value = _.random(1, config.FAKE_PLANE_START_STOP_MAX_AMOUNT);
                if (no_bet_available_data && no_bet_available_data.length == 0 && re_fly == 0 && rand_value == 1) {
                    console.log("-----------------------------------------start again-------------------------------------------------------");
                    call(_.random(config.FAKE_PLANE_FLAY_MIN_AMOUNT, config.FAKE_PLANE_FLAY_MAX_AMOUNT));
                    re_fly = 1;
                    return;
                } else {
                    await db.collection('aviator_table').updateOne({ _id: ObjectId(tblid.toString()) }, { $set: { bet_flg: false, cash_out_flg: false }, $push: { history: x } }, function () { });
                    aviatorClass.cut_plane({ tblid: tblid, x: x });
                    return false;
                }
            } else {

                // await sleep(100 / x);
                await sleep((x > 20) ? 5 : 100 / x);
                x = parseFloat((x + 0.01).toFixed(2));
                commonClass.sendToRoom(tblid.toString(), { en: "FLAY", data: { x: x } });

                aviatorClass.autoCutUser(tblid.toString(), x);
                await cache.set(tblid.toString(), JSON.stringify({
                    x: x
                }));
                // console.log("x", x);
                call(cut_out_x_value);
            }
        }
        return await call(cut_out_x_value);
    },
    autoCutUser: async function (tbid, x) {
        //key - auto_tbld_uid_xvalue_betbutton
        let reply = await cache.keys("auto_" + tbid.toString() + "_*_" + x + "_*");
        if (reply.length > 0) {
            console.log("data found", reply);
            autoCut.add({ reply }, {
                removeOnComplete: true,
                removeOnFail: true
            });
        }
    },
    cut_plane: async function (data) {
        if (data.tblid) {
            cl("\nPlane Cut Out", data.tblid);
            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(data.tblid.toString()) }).toArray();
            if (table_data.length > 0 && table_data[0].status == "FLAY_PLANE") {
                //CP - Cutout plae , stop cutout, wait for start new round
                commonClass.sendToRoom(data.tblid.toString(), { en: "CP", data: { status: true, msg: "Stop Flay Plane Cut Out", x: data.x, bet_flg: false, cash_out_flg: false } });
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

                // if (config.NEW_ROUND_START_TIME > 0) {
                //     aviatorClass.sendAutoNotification(table_data[0]._id.toString(), 5);
                // }

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
        if (config.RANGE_MAX_COUNT && config.RANGE_MAX_COUNT > 10) {
            rand_value = _.random(1, config.RANGE_MAX_COUNT);
        }

        console.log("rand_value---------------", rand_value)
        let range = await db.collection('range').find({ $and: [{ prob_min: { $lte: rand_value } }, { prob_max: { $gte: rand_value } }] }).toArray();
        console.log("range", range);
        if (range && range.length > 0) {
            range = range[0];
            const str = (Math.random() * (range.max_value - range.min_value) + range.min_value).toFixed(2);
            return parseFloat(str);
        } else {
            console.log("\n **-*-*-*-**-*-*-*-*-*-**-*-*-**-*--**-*-*-* Critical log Check Range Table -*-*--*-*-*-*-*-*-*-**-*-*-*-*-*-*-*-*-*-*");
            const str = (Math.random() * (2 - 1) + 1).toFixed(2);
            return parseFloat(str);
        }
    },
    PLACE_BET: async function (data, client) {
        if (data.uid && data.tblid) {

            if (typeof data.bet1.bet_1 == "undefined" || parseFloat(data.bet1.bet_1) < 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "Please Send Proper Bet value" } });
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("1");
                return false;
            }

            if (typeof data.bet2.bet_2 == "undefined" || parseFloat(data.bet2.bet_2) < 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("2");
                return false;
            }


            if (parseFloat(data.bet1.bet_1) <= 0 && parseFloat(data.bet2.bet_2) <= 0) {
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Please Send Proper Bet value" } });
                cl("3");
                return false;
            }

            if (config.MAX_BET_FLAG && parseFloat(data.bet1.bet_1) > 0 && parseFloat(data.bet1.bet_1) > config.MAX_BET) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Maximum Bet limit Reached" } });
                cl("4");
                return false;
            }

            if (config.MAX_BET_FLAG && parseFloat(data.bet2.bet_2) > 0 && parseFloat(data.bet2.bet_2) > config.MAX_BET) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Maximum Bet limit Reached" } });
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
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, msg: "User Not Found Please Register First" } });
                console.log("table Not Found");
                cl("7");
                return false;
            }

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data[0].tblid.toString()) }).toArray();
            if (!table_data || table_data.length <= 0 || table_data[0].bet_flg != true) {
                console.log("table or Bet flar of");
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, msg: "Table Not Found" } });
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                cl("8");
                return false;
            }

            let total_bet = 0;
            let update_data = {};
            if (data.bet1.is_bet_1 == true && parseFloat(data.bet1.bet_1) > 0) {
                cl("9");
                total_bet += parseFloat(data.bet1.bet_1);
                update_data['bet_1'] = parseFloat(data.bet1.bet_1);
            }

            if (data.bet2.is_bet_2 == true && parseFloat(data.bet2.bet_2) > 0) {
                cl("10");
                total_bet += parseFloat(data.bet2.bet_2);
                update_data['bet_2'] = parseFloat(data.bet2.bet_2);
            }

            console.log("total_bet", total_bet);
            if (total_bet > 0 && user_data[0].total_cash >= total_bet) {
                cl("11");

                if (data.bet1.is_bet_1 == true && data.bet1.auto_1 == true && parseFloat(data.bet1.auto_1_x) > 0) {
                    console.log("call come in set 1");
                    await cache.set("auto_" + user_data[0].tblid.toString() + "_" + user_data[0]._id.toString() + "_" + parseFloat(data.bet1.auto_1_x) + "_1", JSON.stringify({
                        x: data.bet1.auto_1_x,
                        bet_1 : parseFloat(data.bet1.bet_1)
                    }));
                }

                if (data.bet2.is_bet_2 == true && data.bet2.auto_2 == true && parseFloat(data.bet2.auto_2_x) > 0) {
                    console.log("call come in set 2");
                    await cache.set("auto_" + user_data[0].tblid.toString() + "_" + user_data[0]._id.toString() + "_" + parseFloat(data.bet2.auto_2_x) + "_2", JSON.stringify({
                        x: data.bet2.auto_2_x,
                        bet_2 :parseFloat(data.bet2.bet_2)
                    }));
                }

                //cache.delWildcard("cache_*", function () { });

                console.log("total_bet", total_bet);
                await commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: -total_bet, msg: "Place Bet" });

                let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
                commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: true, bet: data, total_cash: user_updated_record.value.total_cash, bet_1: user_updated_record.value.bet_1, bet_2: user_updated_record.value.bet_2, msg: "You have Place Bet Successfully" } });
                // commonClass.sendToRoom(data.tblid.toString(), { en: "UPDATE_BET", data: { type: "BET", uid: data.uid.toString(), bet: total_bet } });
            } else {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "You Have Not Sufficient Balance" } });
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "You Have Not Sufficient Balance" } });
            }
        }
    },
    CASH_OUT: async function (data, client) {
        console.log("\nUser Cashout Come", data);
        console.log('--------------');
        let current_x_value = JSON.parse(await cache.get(client.tblid.toString()));
        if (data.auto) {
            console.log('--------in------', data.x);
            current_x_value = data.x;
        }
        console.log("current_x_value", current_x_value);

        if (data.uid) {

            cl("2");
            let user_data = await db.collection('game_users').find({ _id: ObjectId(client.uid.toString()) }).toArray();

            if (user_data && user_data.length > 0) {
                user_data = user_data[0];
                if (current_x_value == null) {
                    console.log("1");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "Already Flay Away Plane...." } });
                    // commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "Already Flay Away Plane...." } });
                    // commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, x: 0, msg: "Already Flay Away Plane...." } });
                    return false;
                }

                if (typeof user_data.tblid == "undefined" || user_data.tblid == "") {
                    // commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, x: 0, msg: "Table Not Found" } });
                    console.log("table Not Found");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "Table Not Found" } });

                    cl("2");
                    return false;
                }

                let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data.tblid.toString()) }).toArray();

                if (!table_data || table_data.length <= 0 || table_data[0].cash_out_flg != true) {
                    cl("3");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, msg: "You can not cashout this time" } });
                    // commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, x: 0, msg: "You can not cashout this time" } });
                    return false;
                }


                cl("4");
                let update_data = {};
                let win_amount = 0;

                if (data.cashout == 1) {
                    cl("5");
                    if (user_data.bet_1 > 0) {
                        if (data.auto) {
                            cache.delWildcard("auto_" + user_data.tblid.toString() + "_" + user_data._id.toString() + "_" + parseFloat(current_x_value.x) + "_1", function () { });
                        }

                        cl("current_x_value", current_x_value.x);
                        cl("user_data[0].bet_1", user_data.bet_1);
                        win_amount += current_x_value.x * user_data.bet_1;
                        update_data["bet_1"] = 0;
                    } else {
                        cl("6");
                        commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "You not Place Any bet" } });
                        return;
                    }
                } else if (data.cashout == 2) {
                    if (user_data.bet_2 > 0) {
                        cl("7");
                        if (data.auto) {
                            cache.delWildcard("auto_" + user_data.tblid.toString() + "_" + user_data._id.toString() + "_" + parseFloat(current_x_value.x) + "_2", function () { });
                        }

                        win_amount += current_x_value.x * user_data.bet_2;
                        update_data["bet_2"] = 0;
                    } else {
                        cl("8");
                        commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "You not Place Any bet" } });
                        return;
                    }
                } else {
                    cl("9");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "Please provide proper cashout data" } });
                    return false;
                }

                if (win_amount && win_amount > 0) {
                    cl("4");
                    cl("win amount =", win_amount)
                    commonClass.update_cash({ uid: user_data._id.toString(), cash: win_amount, msg: "Cash Out" });

                    let user_updated_data = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(client.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: true, cashout: data.cashout, x: current_x_value.x, win_amount: win_amount, total_cash: user_updated_data.value.total_cash } });
                    // commonClass.sendToRoom(table_data[0]._id.toString(), { en: "UPDATE_BET", data: { type: "CASHOUT", uid: data.uid.toString(), bet: user_data.bet_1 + user_data.bet_2, win_amount: win_amount } });
                } else {
                    cl("10");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "Your Winning Price is lessthen 0" } });
                    return;
                }
            } else {
                cl("11");
                commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "User Or table Not Found" } });
                // commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, msg: "User Or table Not Found" } });
                return;
            }

        } else {
            commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "User Or table Not Found" } });
            return;
        }
    },
    AUTO_CASH_OUT: async function (data, client) {
        console.log("\nUser Cashout Come", data);
        console.log('--------------');
        let current_x_value = JSON.parse(await cache.get(client.tblid.toString()));
        if (data.auto) {
            console.log('--------in------', data.x);
            current_x_value = data.x;
        }
        console.log("current_x_value", current_x_value);

        if (data.uid) {

            cl("2");
            let user_data = await db.collection('game_users').find({ _id: ObjectId(client.uid.toString()) }).toArray();

            if (user_data && user_data.length > 0) {
                user_data = user_data[0];
                if (current_x_value == null) {
                    console.log("1");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "Already Flay Away Plane...." } });
                    return false;
                }

                if (typeof user_data.tblid == "undefined" || user_data.tblid == "") {
                    console.log("table Not Found");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "Table Not Found" } });

                    cl("2");
                    return false;
                }

                let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data.tblid.toString()) }).toArray();

                if (!table_data || table_data.length <= 0 || (table_data[0].cash_out_flg != true && data.auto != true)) {
                    cl("3");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, msg: "You can not cashout this time" } });
                    // commonClass.sendDirectToUserSocket(client, { en: "CASH_OUT", data: { status: false, x: 0, msg: "You can not cashout this time" } });
                    return false;
                }
                if(table_data[0].history.length > 0){
                    last_x_value = table_data[0].history[table_data[0].history.length-1];
                    console.log("last_x_value",last_x_value);
                    if(last_x_value == current_x_value.x){
                        console.log("please give money to auto user");
                    }
                }



                cl("4");
                let update_data = {};
                let win_amount = 0;

                if (data.cashout == 1) {
                    cl("5");
                    if (user_data.bet_1 > 0) {
                        if (data.auto) {
                            cache.delWildcard("auto_" + user_data.tblid.toString() + "_" + user_data._id.toString() + "_" + parseFloat(current_x_value.x) + "_1", function () { });
                        }

                        cl("current_x_value", current_x_value.x);
                        cl("user_data[0].bet_1", user_data.bet_1);
                        win_amount += current_x_value.x * user_data.bet_1;
                        update_data["bet_1"] = 0;
                    } else {
                        cl("6");
                        commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "You not Place Any bet" } });
                        return;
                    }
                } else if (data.cashout == 2) {
                    if (user_data.bet_2 > 0) {
                        cl("7");
                        if (data.auto) {
                            cache.delWildcard("auto_" + user_data.tblid.toString() + "_" + user_data._id.toString() + "_" + parseFloat(current_x_value.x) + "_2", function () { });
                        }

                        win_amount += current_x_value.x * user_data.bet_2;
                        update_data["bet_2"] = 0;
                    } else {
                        cl("8");
                        commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "You not Place Any bet" } });
                        return;
                    }
                } else {
                    cl("9");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "Please provide proper cashout data" } });
                    return false;
                }

                if (win_amount && win_amount > 0) {
                    cl("4");
                    cl("win amount =", win_amount)
                    commonClass.update_cash({ uid: user_data._id.toString(), cash: win_amount, msg: "Cash Out" });

                    let user_updated_data = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(client.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: true, cashout: data.cashout, x: current_x_value.x, win_amount: win_amount, total_cash: user_updated_data.value.total_cash } });
                    // commonClass.sendToRoom(table_data[0]._id.toString(), { en: "UPDATE_BET", data: { type: "CASHOUT", uid: data.uid.toString(), bet: user_data.bet_1 + user_data.bet_2, win_amount: win_amount } });
                } else {
                    cl("10");
                    commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, cashout: data.cashout, msg: "Your Winning Price is lessthen 0" } });
                    return;
                }
            } else {
                cl("11");
                commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "User Or table Not Found" } });
                // commonClass.sendDataToUserSocketId(user_data.sck, { en: "CASH_OUT", data: { status: false, x: 0, msg: "User Or table Not Found" } });
                return;
            }

        } else {
            commonClass.sendDataToUserSocketId(user_data.sck, { en: "PUP", data: { status: false, leave: true, msg: "User Or table Not Found" } });
            return;
        }
    },
    CANCEL_BET: async function (data, client) {
        cl("\n User Bet CANCEL_BET Come", data);
        if (data.uid && data.tblid && data.cancel) {

            let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();
            if (!user_data || user_data.length <= 0) {
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "User Not Found" } });
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "User Not Found" } });
                console.log("table or user not found");
                cl("2");
                return false;
            }

            if (typeof user_data[0].tblid == "undefined" || user_data[0].tblid == "") {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, msg: "Table Not Found" } });
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                console.log("table Not Found");
                cl("2");
                return false;
            }

            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(user_data[0].tblid.toString()) }).toArray();
            if (!table_data || table_data.length <= 0 || table_data[0].bet_flg != true) {
                console.log("table or Bet flar of");
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, leave: true, logout: true, msg: "Table Not Found" } });
                // commonClass.sendDirectToUserSocket(client, { en: "PLACE_BET", data: { status: false, msg: "Table Not Found" } });
                cl("3");
                return false;
            }

            let update_data = { $set: {} };
            let total_cancel = 0;
            if (data.cancel == 1) {
                update_data.$set['bet_1'] = 0;
                total_cancel += user_data[0].bet_1;
                cache.delWildcard("auto_" + user_data[0].tblid.toString() + "_" + user_data[0]._id.toString() + "_*_1", function () { });
            }

            if (data.cancel == 2) {
                update_data.$set['bet_2'] = 0;
                total_cancel += user_data[0].bet_2;
                cache.delWildcard("auto_" + user_data[0].tblid.toString() + "_" + user_data[0]._id.toString() + "_*_2", function () { });
            }

            cl("update_data", update_data)
            if (total_cancel > 0) {
                let new_user_data = await db.collection('game_users').findOneAndUpdate({
                    _id: ObjectId(user_data[0]._id.toString()),
                }, update_data, { returnDocument: 'after' });

                console.log("new_user_data", new_user_data);
                commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: total_cancel, msg: "Cancel Bet" });
                commonClass.sendDirectToUserSocket(client, { en: "CANCEL_BET", data: { status: true, msg: "Bet Cancel Success", cancel: data.cancel } });

            } else {
                commonClass.sendDirectToUserSocket(client, { en: "CANCEL_BET", data: { status: false, msg: "Your Cancel Amount is lessthen 0", cancel: data.cancel } });
            }

        } else {
            commonClass.sendDirectToUserSocket(client, { en: "CANCEL_BET", data: { status: false, msg: "Missing Data", cancel: data.cancel } });
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
                        client.leave(tableDate[0]._id.toString());
                        commonClass.sendDirectToUserSocket(client, { en: "LG", data: { status: true, msg: "Leave game" } });
                    }
                    await db.collection('game_users').updateOne({ _id: ObjectId(userData[0]._id) }, { $set: { bet_1: 0, bet_2: 0, tblid: "", is_play: 0 } }, function () { })
                } else {
                    await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { bet_1: 0, bet_2: 0, tblid: "", is_play: 0 } }, function () { })
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
                        commonClass.sendToRoom(tblid.toString(), { en: "NOTIFICATION", data: { status: true, name: _.sample(names), amount: _.random(config.NOTIFICATION_MIN_WIN_AMOUNT, config.NOTIFICATION_MAX_WIN_AMOUNT) } });
                        console.log("call come", count);
                        count++;
                    }
                }, _.random(400, 500));

            }
        }
    },
    HISTORY: async function (data, client) {
        if (data.tblid && data.uid) {
            let history_data = await db.collection('aviator_table').find({ _id: ObjectId(data.tblid.toString()) }, { history: 1 }).toArray();
            if (history_data && history_data.length > 0) {
                history_data = history_data[0];
                if (history_data.history.length <= 15) {
                    history_data.history = history_data.f_history.concat(history_data.history);
                }
                commonClass.sendDirectToUserSocket(client, { en: "HISTORY", data: { status: true, table_history: history_data.history.reverse(), msg: "You Have Not Sufficient Balance" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "HISTORY", data: { status: false, table_history: [], msg: "Table Not found." } });
        }
    },
    startDepositwithdrawNoti: async function (tblid) {
        if (tblid) {
            console.log("call come noti noti noti");
            let table_data = await db.collection('aviator_table').find({ _id: ObjectId(tblid.toString()) }).toArray();
            if (table_data.length > 0) {
                let interval_id = setInterval(async () => {
                    console.log("start interval cll come-------------------");
                    let table_data = await db.collection('aviator_table').find({ _id: ObjectId(tblid.toString()) }).toArray();
                    if (table_data.length > 0) {
                        let min_amount = (config.DEPO_WITH_NOTIFICATION_MIN_VALUE) ? config.DEPO_WITH_NOTIFICATION_MIN_VALUE : 1;
                        let max_amount = (config.DEPO_WITH_NOTIFICATION_MAX_VALUE) ? config.DEPO_WITH_NOTIFICATION_MAX_VALUE : 10;
                        let final_amount = _.random(min_amount, max_amount) * 100;
                        if (final_amount == 0) {
                            final_amount = 1000;
                        }
                        //dwn deposit withdraw notification
                        commonClass.sendToRoom(tblid.toString(), { en: "DWN", data: { status: true, name: _.sample(names), action: _.sample(["Deposited", "Withdrawal"]), amount: final_amount } });

                    } else {
                        clearInterval(interval_id);
                        console.log("clear time out");
                    }
                }, _.random(1, config.DEPO_WITH_TIME_MAX_INTERVAL) * 20 * 1000);
            }
        }
    },
    DWN_LIST: async function (data, client) {
        let list = [];
        let min_amount = (config.DEPO_WITH_NOTIFICATION_MIN_VALUE) ? config.DEPO_WITH_NOTIFICATION_MIN_VALUE : 1;
        let max_amount = (config.DEPO_WITH_NOTIFICATION_MAX_VALUE) ? config.DEPO_WITH_NOTIFICATION_MAX_VALUE : 10;
        for (let i = 0; i < 10; i++) {
            let final_amount = _.random(min_amount, max_amount) * 100;
            if (final_amount == 0) {
                final_amount = 1000;
            }
            //dwn deposit withdraw notification
            list.push({ name: _.sample(names), action: _.sample(["Deposited", "Withdrawal"]), amount: final_amount });
        }
        console.log("list", list);
        commonClass.sendDirectToUserSocket(client, { en: "DWN_LIST", data: { status: true, list: list } });
    }
}