let _ = require("underscore")
let array = [1,2,3,4,5,6];

let throttle = _.random(1, 10);

let flag = array.includes(throttle);
console.log("flag",throttle+"-"+flag);