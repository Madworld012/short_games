const { ObjectId } = require("mongodb");

module.exports = {
    disconnectUser: async function (client) {
        if (client) {
            console.log("in rejoin function");
            if (typeof client.uid != "undefined" && client.uid != "" && client.uid != null) {
                // let userData = await db.collection('game_users').find({ $or: [{ _id: ObjectId(client.uid.toString()) }, { sck: client.id }] }).toArray();
                let userData = await db.collection('game_users').find({ sck: client.id }).toArray();
                if (userData.length > 0 && typeof userData[0].tblid != "undefined" && userData[0].tblid != "") {
                    let tableDate = await db.collection('aviator_table').find({ _id: ObjectId(userData[0].tblid.toString()) }).toArray();
                    if (tableDate.length > 0) {
                        await db.collection('aviator_table').updateOne({ _id: ObjectId(tableDate[0]._id.toString()) }, { $inc: { count: -1 } }, function () { });
                        client.leave(tableDate[0]._id.toString());
                       
                        let jobId = randomstring.generate(10);

                        await db.collection('game_users').updateOne({ _id: ObjectId(userData[0]._id) }, { $set: { rejoin_id: jobId } }, function () { })
                        let startGameBetTimer = commonClass.AddTime(config.REJOIN_TIME);

                        schedule.scheduleJob(jobId, new Date(startGameBetTimer), async function () {
                            schedule.cancelJob(jobId);
                            console.log("\nFlying plane Or Stop bet");
                            await db.collection('game_users').updateOne({ _id: ObjectId(userData[0]._id) }, { $set: { sck: "", is_online: 0, is_play: 0, rejoin_id: "", bet_1: 0, bet_2: 0, tblid: "" } }, function () { })
                        });

                    }
                    await db.collection('game_users').updateOne({ _id: ObjectId(userData[0]._id) }, { $set: { sck: "", is_online: 0, lo: new Date(), bet_1: 0, bet_2: 0, tblid: "" } }, function () { })
                } else {
                    await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { sck: "", is_online: 0, is_play: 0, lo: new Date(), bet_1: 0, bet_2: 0, tblid: "" } }, function () { })
                }
            } else {
                cl("client.uid is not found");
            }
            cl("userid", client.id);
        } else {
            cl("socket not defined");
        }
    }
}