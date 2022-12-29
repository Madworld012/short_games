_ = module.exports = require('underscore');
// let x = 0;

// let a = 0;
// let b = 0;
// let c = 0;
// let d = 0;

// let id = setInterval(() => {
//     x += 1;
//     if (x == 100) {
//         clearInterval(id);
//         console.log("a = ",a);
//         console.log("b = ",b);
//         console.log("c = ",c);
//         console.log("d = ",d);
//         return false;
//     }
//     let value = _.random(1, 100);

//     // let range = db.collection('range').find({$and:[{prob_min:{$lte:86}},{prob_max:{$gte:86}}]})

//     if(0 <= value && 80 >= value){
//         // console.log("min 1 max 5");
//         a += 1;
//     }else if(81 <= value && 85 >= value){
//         // console.log("min 1 max 5");
//         b += 1;
//     }else if(86 <= value && 95 >= value){
//         // console.log("min 1 max 5");
//         c += 1;
//     }else if(96 <= value && 100 >= value){
//         d += 1;
//         // console.log("min 1 max 5");
//     }

//     // console.log("value",value);

// }, 10);



// setInterval(() => {
//     // let value = (_.random(1, 2) / 1).toFixed(2);
//     let value = (Math.random() * (2 - 1) + 1).toFixed(2);
//     // let value = _.random(1, 2);
//     // let value = Math.random()

//     console.log(parseFloat(value));
//     if(parseFloat(value) <= 1.5){
//         console.log("-----------------------------------",parseFloat(value))
//     }
// }, 100);

// const str = (Math.random() * (range.max_value - range.min_value) + range.min_value).toFixed(2);


// setInterval(() => {
//     const str = (Math.random() * (2 - 1) + 1).toFixed(2);
//     console.log("str", str);
//     if(str == "1.00"){
//         console.log("-------------------------------------",str);
//     }
// }, 100);



// let a = -1;

// if(!a){
//     console.log("------");
// }
// console.log("a",a);

// let balance = -1.501000001;
// let total_cash = 1.522000002;

// var final_cash = (((balance + total_cash) < 0) ? 0 : balance + total_cash).toFixed(2);

// console.log("final_cash",parseFloat(final_cash));

// setInterval(() => {
//     const str = (Math.random() * (1.5 - 1) + 1).toFixed(2);

//     console.log(str)   
//     if(str == 1.00) {
//         console.log("-----------------------",str);
//     }
// }, 50);


let count = 1;
let run_count = 6;

let myintervaal = setInterval(() => {
    if(count == run_count){
        clearInterval(myintervaal);
    }else{
        console.log("call come",count);
        count++;
    }
},  _.random(300, 500));