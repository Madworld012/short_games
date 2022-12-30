config = module.exports = require("./config.json");

express = module.exports = require('express');
schedule = module.exports = require('node-schedule');
_ = module.exports = require('underscore');
moment = module.exports = require("moment");

randomstring = module.exports = require("randomstring");
const http = require('http');
const https = require('https');
const mongod = require('mongodb');
ObjectId = module.exports = require('mongodb').ObjectId;
const path = require('path');


//Mongo Connection
var MongoClient = mongod.MongoClient;
MongoID = module.exports = mongod.ObjectId;

//start server
/*
	node .\aviator_server.js 192.168.0.12 3030
*/


cl = module.exports = function (arr) {
	try {
		if (config.DEBUG) {
			var str = '';
			for (var i = 0; i < arguments.length; i++) {
				str += ' ';
				if (typeof arguments[i] == 'undefined' || arguments[i] == null)
					str += '';
				else if (typeof arguments[i] == 'object')
					str += JSON.stringify(arguments[i]);
				else if (typeof arguments[i] == 'string')
					str += arguments[i];
				else if (typeof arguments[i] == 'number')
					str += arguments[i];
				else if (typeof arguments[i] == 'boolean')
					str += Number(arguments[i]);
				else if (typeof arguments[i] == 'undefined')
					str += 'undefined';
				else if (arguments[i] == null)
					str += 'null';
			}
			console.log(str);
		}
	} catch (e) {
		console.log("csl : Exception : ", e);
	}
};

cl(config.NAME);
let SERVER_PORT = process.argv[2];


app = module.exports = express();

socketIO = require('socket.io');
if (typeof config.MODE != "undefined" && config.MODE == "DEV") {
	var server = http.createServer(app);
} else {
	var server = http.createServer(app);

	// var httpsOptions = { key: fs.readFileSync('certificate/server.key'), cert: fs.readFileSync('certificate/final.crt') };
	// var server = https.createServer(httpsOptions, app);
}
io = module.exports = socketIO(server, { 'origins': '*:*', 'pingTimeout': 7000, 'pingInterval': 10000 });
server.listen(SERVER_PORT);

app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({extended:false}));
app.use(express.json({ extended: false }))
app.set('view engine', 'ejs');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');


//all class exports
rdsOpsNew = module.exports = require('./cache/redis_pub_sub.js');
ecClass = module.exports = require("./classes/eventCases.class.js");
signupClass = module.exports = require("./classes/signup.class.js");
commonClass = module.exports = require("./classes/common.class.js"); //common functions
aviatorClass = module.exports = require("./classes/aviator.class.js"); //common functions
disconnectUserClass = module.exports = require("./classes/disconnectUser.class.js"); //common functions
urlHandler = require('./classes/urlHandler.class.js');


let DB_Name = "";
if (typeof config.MODE != "undefined" && config.MODE == "DEV") {
	var databaseConnectionString = config.DATABASE_DEV; // Connect Mongoose to DB
	DB_Name = config.DB_NAME_DEV;
} else {
	console.log("call come here");
	var databaseConnectionString = config.DATABASE_LIVE; // Connect Mongoose to DB
	DB_Name = config.LIVE_DB_NAME;
}

MongoClient.connect(databaseConnectionString, { useUnifiedTopology: true, useNewUrlParser: true }, async function (error, database) {
	databaseConnectionString = null;
	if (error) {
		console.log("Mongo Error", error);
	}
	else {

		console.log("\nDatabase connected......");
		console.log("\nServer Started On......", SERVER_PORT, "\n");

		db = module.exports = database.db(DB_Name);
		rdsOpsNew.initRedisPublisher();
		rdsOpsNew.initRedisSubscriber();

		db.collection('aviator_table').deleteMany();
		//SK - need to update user data when server restart.
		// db.collection('game_users').deleteMany();

		urlHandler.BindWithCluster(app);
		ecClass.init();
	}
});