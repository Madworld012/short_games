module.exports = {
    //AL
    SP: async function (data, client) {
        let wh = {};
        wh.mobile_no = data.mobile_no;
        let userData = await db.collection('game_users').find(wh).toArray();
        if (userData && userData.length > 0) {
            userData = userData[0];

            if (userData.is_block == 1) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, regi: true, msg: "Please Contact Admin you are now block form this game." } });
                return false;
            }
            //last login save 
            //set user data into socket
            signupClass.setUserSocketData(userData, client);
            //send eventy to client
            var send_json = {
                status: true,
                uid: userData._id.toString(),
                un: userData.un,
                total_cash: parseFloat((userData.total_cash + userData.bonus_cash).toFixed(2)),
                bonus_cash: userData.bonus_cash,
                unique_id: userData.unique_id,
                ue: userData.ue,
                pp: userData.pp,
                sound: userData.sound,
                music: userData.music,
                mobile_no: userData.mobile_no
            }
            if (userData.isMobileVerified == 1) {
                commonClass.sendDirectToUserSocket(client, { en: "SP", data: send_json });
                return;
            } else {
                send_json.msg = "Please Verify Your Phone Number First..";
                send_json.status = false;
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, regi: true, msg: "Please verify your Mobile number first, Do login for verify number" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, regi: true, msg: "Please Do Registration First." } });
        }
    },
    //first call this  // Done
    RESEND: function (data, client) {
        if (data.mobile_no != "" && typeof data.mobile_no != "undefined") {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, resp) {
                if (resp != null) {
                    commonClass.SendSMS(data, function (cb_status) {
                        cl("cb_status_________________________", cb_status)
                        if (cb_status.status == 1) {
                            var jid = randomstring.generate(10);
                            var extime = commonClass.AddTime(60);
                            db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                            commonClass.sendDirectToUserSocket(client, { en: "RESEND", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                            schedule.scheduleJob(jid, new Date(extime), function () {
                                schedule.cancelJob(jid);
                                db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                            })
                        }
                    });
                }
            });
        }
    },
    //AL
    getUserDefaultFields: async function (data, client) {
        var unique_id = await commonClass.GetRandomInt(1, 9999999);
        var fields = {
            un: data.name.substr(0, 15),
            unique_id: unique_id,
            reference_user_id: (typeof data.reference_user_id != 'undefined') ? parseInt(data.reference_user_id) : "",
            sck: client.id,//client.id,
            ue: (typeof data.email != 'undefined') ? data.email : "",
            mobile_no: data.mobile_no,
            password: data.password,
            pp: 0,
            sound: true,
            music: true,
            is_deposited: 0,
            isMobileVerified: 0,
            is_block: 0,
            total_cash: 0,
            bonus_cash: 0,
            OTP: 0,
            bet_1: 0,
            bet_2: 0,
            tblid: "",
            country: (data.country_name) ? data.country_name : "India",
            gender: (data.gender) ? data.gender : '', //gender,
            is_play: 0,
            is_online: 0,
            last_game_play: "",
            cd: new Date(),
            ll: new Date()
        }
        return fields;

    },
    //AL
    setUserSocketData: async function (data, client) {
        // try {
        if (data == null || typeof client.id == 'undefined') {
            return false;
        }

        if (data.sck != null && data.sck != '' && data.sck != client.id) {
            commonClass.sendDataToUserSocketId(data.sck, { en: 'NCC', data: { leave: true, logout: true, msg: "You Logged in another device." } });
        }

        client.uid = data._id.toString();
        client.un = data.un.toString();

        await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { sck: client.id, is_online: 1, ll: new Date() } }, function () { })
        // } catch (error) {
        //     console.log("error");
        // }

    },
    //AL
    VERIFY_OTP: function (data, client) {
        if (data && data.mobile_no && data.otp) {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, userdata) {
                cl("VERIFY_LOGIN_MOBILE-----------------------------------------------", userdata)
                if (!err && userdata) {
                    cl("VERIFY_LOGIN_MOBILE------userdata.OTP", userdata.OTP);
                    cl("VERIFY_LOGIN_MOBILE------data.otp", data.otp);
                    cl("VERIFY_LOGIN_MOBILE------userdata.isexpire ", userdata.isexpire);
                    console.log("userdata.isexpire", userdata.isexpire);
                    console.log("userdata.isexpire", userdata.OTP);
                    if (userdata.OTP == data.otp && userdata.isexpire == false) {
                        schedule.cancelJob(userdata.jid);
                        console.log("otp verified");
                        db.collection('game_users').updateOne({ _id: MongoID(userdata._id.toString()) }, { $set: { isMobileVerified: 1, OTP: "" } }, function () { });
                        signupClass.SP(data, client);
                    } else {
                        console.log("----------------1-----------------");
                        commonClass.sendDirectToUserSocket(client, { en: "WOTP", data: { status: false, msg: "OTP is incorrect Or Expire" } });
                    }
                }
            });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "VERIFY_OTP", data: { status: false, msg: "Please send Proper Data" } });
        }

    },
    //AL
    LOGIN: async function (data, client) {

        if (!data.mobile_no || !data.password) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Please send Proper Data" } });
            return false;
        }
        var wh = {};
        wh.mobile_no = data.mobile_no;
        wh.password = data.password;
        var userData = await db.collection('game_users').find(wh).toArray();
        if (userData.length > 0) {
            userData = userData[0];

            if (userData.is_block == 1) {
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, regi: true, msg: "Please Contact Admin you are now block form this game." } });
                return false;
            }

            if (userData.isMobileVerified == 0 && userData.mobile_no != '') {
                var udatac = {};
                udatac.mobile_no = userData.mobile_no;
                var jid = randomstring.generate(10);
                var extime = commonClass.AddTime(60);
                commonClass.SendSMS(udatac, function (cb_status) {
                    if (cb_status.status == 1) {
                        console.log("condition calle");
                        db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) {
                            console.log("call oen otp screen");
                            commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                            schedule.scheduleJob(jid, new Date(extime), function () {
                                schedule.cancelJob(jid);
                                db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                            })
                        })
                    }
                });
            } else {
                signupClass.SP(data, client);
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Phone Number and Passowrd Not Matched" } });
        }
    },
    //AL
    REGISTRATION: async function (data, client) {
        console.log("data", data);
        if (!data || !data.mobile_no || !data.password || !data.name || !data.email) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please send proper data." } });
            return;
        }

        let wh = {};
        wh.mobile_no = data.mobile_no;
        let userData = await db.collection('game_users').find(wh).toArray();
        if (userData && userData.length > 0) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Phone Number Already Registered Please Login." } });
        } else {
            var UserFields = await signupClass.getUserDefaultFields(data, client);
            console.log("UserFields", UserFields);
            let user = await db.collection('game_users').insertOne(UserFields);
            let newUserData = await db.collection('game_users').find(wh).toArray();
            newUserData = newUserData[0];

            await commonClass.update_cash({ uid: newUserData._id.toString(), cash: config.INITIAL_CASH, msg: "Initial Bonus", bonus: true });

            //send sms and other process
            signupClass.setUserSocketData(newUserData, client);
            // if (false) {
            commonClass.SendSMS(data, function (cb_status) {
                if (cb_status.status == 1) {
                    var jid = randomstring.generate(10);
                    var extime = commonClass.AddTime(60);
                    db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                    commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, is_from_pass: false, mobile_no: data.mobile_no, timer: 60 } });
                    schedule.scheduleJob(jid, new Date(extime), function () {
                        schedule.cancelJob(jid);
                        db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                    })
                }
            })
        }
    },
    FORGOT_PASS: async function (data, client) {
        if (!data || !data.mobile_no) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please send proper data." } });
            return;
        }

        var wh = {};
        wh.mobile_no = data.mobile_no;
        var userData = await db.collection('game_users').find(wh).toArray();

        if (userData.length > 0) {
            userData = userData[0];
            var udatac = {};
            udatac.mobile_no = userData.mobile_no;
            var jid = randomstring.generate(10);
            var extime = commonClass.AddTime(60);
            commonClass.SendSMS(udatac, function (cb_status) {
                if (cb_status.status == 1) {
                    db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) {
                        commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, is_from_pass: true, mobile_no: data.mobile_no, timer: 60 } });
                        schedule.scheduleJob(jid, new Date(extime), function () {
                            schedule.cancelJob(jid);
                            db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                        })
                    })
                }
            });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Phone Number Not Found" } });
        }


    },
    VERIFY_CAHNGE_PASS_OTP: function (data, client) {
        if (data && data.mobile_no && data.otp && data.new_password) {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, userdata) {
                cl("VERIFY_LOGIN_MOBILE-----------------------------------------------", userdata)
                if (!err && userdata) {
                    cl("VERIFY_LOGIN_MOBILE------userdata.OTP", userdata.OTP);
                    cl("VERIFY_LOGIN_MOBILE------data.otp", data.otp);
                    cl("VERIFY_LOGIN_MOBILE------userdata.isexpire ", userdata.isexpire);
                    if (userdata.OTP == data.otp && userdata.isexpire == false) {
                        schedule.cancelJob(userdata.jid);
                        console.log("otp verified");
                        db.collection('game_users').updateOne({ _id: MongoID(userdata._id.toString()) }, { $set: { password: data.new_password, isexpire: true, OTP: "" } }, function () { });
                        commonClass.sendDirectToUserSocket(client, { en: "VERIFY_CAHNGE_PASS_OTP", data: { status: true, msg: "Your Password Has Been Changed Please Do login." } });
                    } else {
                        commonClass.sendDirectToUserSocket(client, { en: "WOTP", data: { status: false, msg: "OTP is incorrect Or Expire" } });
                    }
                }
            });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "VERIFY_OTP", data: { status: false, msg: "Please send Proper Data" } });
        }
    },
    CHANGE_PASSWORD: async function (data, client) {
        if (!data || !data.mobile_no || !data.current_password || !data.new_password) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please send proper data." } });
            return;
        }
        let wh = {};
        wh.mobile_no = data.mobile_no;
        wh.password = data.current_password;
        let userData = await db.collection('game_users').find(wh).toArray();
        if (userData && userData.length > 0) {
            db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { password: data.new_password } }, function (err) { });
            commonClass.sendDirectToUserSocket(client, { en: "CHANGE_PASSWORD", data: { status: true, msg: "Your Password Has Been Changed Please Do login." } });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, login: true, restart: true, msg: "Phone Nunmber and Password not Matched!" } });
        }
    },
    //profile data
    PD: async function (data, client) {
        if (!data || !data.uid) {
            commonClass.sendDirectToUserSocket(client, { en: "PD", data: { success: false, msg: "Please send proper data." } });
            return;
        }
        let profileData = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }, { unique_id: 1, un: 1, ue: 1, mobile_no: 1, total_cash: 1, bonus_cash: 1, pp: 1, sound: 1, music: 1 }).toArray();
        if (profileData.length > 0) {
            profileData = profileData[0];
            var send_json = {
                status: true,
                uid: profileData._id.toString(),
                un: profileData.un,
                total_cash: profileData.total_cash + profileData.bonus_cash,
                bonus_cash: profileData.bonus_cash,
                unique_id: profileData.unique_id,
                ue: profileData.ue,
                pp: profileData.pp,
                mobile_no: profileData.mobile_no
            }
            commonClass.sendDirectToUserSocket(client, { en: "PD", data: send_json });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PD", data: { success: false, msg: "User Not Found" } });
        }
    },
    UP: async function (data, client) {
        try {
            if (!data || !data.uid) {
                commonClass.sendDirectToUserSocket(client, { en: "UP", data: { success: false, msg: "Please send proper data." } });
                return;
            }

            delete data.total_cash;
            delete data.bonus_cash;

            let update_data = {};
            if (typeof data.pp != "undefined") {
                update_data['pp'] = data.pp;
            }

            if (typeof data.sound != "undefined") {
                update_data['sound'] = data.sound;
            }

            if (typeof data.music != "undefined") {
                update_data['music'] = data.music;
            }

            if (typeof data.un != "undefined" && data.un) {
                update_data['un'] = data.un;
            }

            let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: update_data }, { returnDocument: 'after' });
            user_updated_record = user_updated_record.value;
            commonClass.sendDirectToUserSocket(client, {
                en: "UP",
                data: {
                    success: true,
                    un: user_updated_record.un,
                    sound: user_updated_record.sound,
                    music: user_updated_record.music,
                    pp: user_updated_record.pp

                }
            });

        } catch (error) {
            console.log("error", error);
        }

    },
    firstDepositReferalBonus: async function (data) {
        if (data) {
            console.log("data", data);
            let amount = data.amount;
            let deposit_user = data.uid;
            let ref_uniq_id = data.ref_uniq_id;

            let user_data = await db.collection('game_users').find({ unique_id: ref_uniq_id }).toArray();
            if (user_data.length > 0) {
                let bonus_amount = amount * config.FIRST_DEPOSIT_REFERAL_BONUS_PER / 100;
                console.log("bonus_amount", bonus_amount);
                if (bonus_amount > 0) {
                    await commonClass.update_cash({ uid: user_data[0]._id.toString(), cash: bonus_amount, msg: "Referal Bonus from user : " + ref_uniq_id, bonus: true });
                }
            } else {
                console.log("user not found");
            }

        }
    }
}