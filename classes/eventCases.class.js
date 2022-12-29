module.exports = {
	init: function () {
		//sk remove
		// setInterval(() => {
		// 	console.log("sending event");
		// 	io.sockets.emit("res");
		// }, 3000);




		io.sockets.on("connection", function (socket) {
			//sk remove
			// io.sockets.sockets.get();

			// cl("New Socket Connection Made");
			// console.log('socket id', socket.id);
			// socket.join("rest");

			// // io.to("rest").emit('new_user', {});
			let flg = true


			ecClass.BindSocketToEvent(socket);
		});
	},
	getRendomeTimeInterval: function () {
		console.log("call come");
		return _.random(100, 500)
	},
	BindSocketToEvent: function (client) {
		cl("User Bind With Socket");

		client.on('req', function (request) {
			var en = request.en;
			var data = request.data;

			switch (en) {
				case "SP": //user register
				case "LOGIN_PHNO": //user register // intial call come here
				case "RESEND": // resend OTP
				case "VERIFY_OTP": //verify otp
					signupClass[en](request.data, client);
					break;
				case "SG": //start game
				case "PLACE_BET": // place bet
				case "CASH_OUT": //cashout 
				case "CANCEL_BET": //cancel_bet
				case "LG": // Leave Game
					aviatorClass[en](request.data, client);
					break;
				case "DEPOSIT":
				case "WITHDRAWAL":
					cashClass[en](request.data, client);
					break;

				case "TEST":
					console.log("call come test");
					//io.to("rest").emit('res', {});
					// commonClass.sendToRoom("rest", { en: "FLAY", data: { "count": 1 } });
					break;


			}
		});

		client.on('error', function (exc) {
			cl("ignoring exception: " + exc);
		});

		client.on('disconnect', function (disc) {
			cl("User Disconnect ------> ", client.id);
			cl("User Disconnect ------> ", client.uid);
			aviatorClass.LG({}, client);
		});

	}
}