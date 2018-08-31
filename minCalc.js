/*
This bot takes data from nanopool API to provide information about
profitability for the most popular GPUs (RX470/480 and GTX1060/1070)
mining the biggest cryptocurrencies available in nanopool (ETH, ETC, ZEC, XMR).
The information is available in a telegram bot (telegram.me/CryptoMiningCalculatorBot),
where users can ask for the best mining choice or for a comparation of all of the mining options
for a single GPU series, they also can ask for an invitation to a Telegram channel 
(https://t.me/CryptoMiningCalculator), where information is posted every 12 hours.
*/

var request = require('request-promise')
var TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

//Bot initialization
var token = process.env.TOKEN
var bot = new TelegramBot(token, {polling: true})

var currencies = ['eth', 'etc', 'zec', 'xmr']

//Hashrates for each GPU in each currency
var gpuData = { 
    RX470: [27, 27, 258, 565],
    RX480: [29, 29, 290, 690], 
    GTX1060: [22, 22, 270, 430], 
    GTX1070: [31, 31, 430, 500]
}
var values = []
var count = 0    
var notes = '\n\n- Data is given for one card' +
        '\n- Calculations are based on reasonable values, results may vary due to particular conditions' +
        '\n- Cryptocurrencies compared are: '
var cryptoCurrenciesCompared = 'ETH, ETC, ZEC and XMR'
var choice

//Function to read values from Nanopool API
function updateValues(curr){
    count++
    var flag = 0
    var url1 = 'https://api.nanopool.org/v1/'
    var url2 = '/approximated_earnings/1'
    curr.forEach(function(currency){
        var urlRequest = url1 + currency + url2
        request(urlRequest)
            .then(function (body) {
                values[currency] = JSON.parse(body).data.month.dollars
                console.log('Actualizado', currency, values[currency])
            })
            .catch(function(err){
                console.log('No se pudo actualizar', currency, values[currency])    
            })
            .finally(function(){
                if ((count-1) % 144 == 0 && flag == 0 && values['eth'] && values['etc'] && values['zec'] && values['xmr']){
                    updateGroup()
                    console.log('Grupo actualizado')
                    flag = 1
                }
            })
    })    
}

//Call updateValues every 5 minutes
updateValues(currencies)
setInterval(function(){
    updateValues(currencies)
}, 300000)

//Function to calculate profits for each GPU
function calcProfits(hashrates){
    var profits = []
    var max
    var maxIndex
    hashrates.forEach(function(hash, i){
        profits.push(hash * values[currencies[i]])
    })
    max = Math.max( ...profits )
    maxIndex = profits.indexOf( Math.max( ...profits))
    profits.push(max)
    profits.push(currencies[maxIndex])
    return profits
}

//Function to prepare answer text for best mining choice
function miningChoiceText(profits){
    var toWrite = 'The best choice is ' + profits[profits.length - 1].toUpperCase() + ', expected monthly earnings are: ' 
        + parseFloat(profits[profits.length - 2]).toFixed(2) + '$' + notes + cryptoCurrenciesCompared
    return (toWrite)
}

//Function to prepare answer text for comparation
function compareText(profits){
    var toWrite = 'Expected monthly earnings are:\nETH = ' + parseFloat(profits[0]).toFixed(2) + '$\n'
        + 'ETC = ' + parseFloat(profits[1]).toFixed(2) + '$\n'
        + 'ZEC = ' + parseFloat(profits[2]).toFixed(2) + '$\n'
        + 'XMR = ' + parseFloat(profits[3]).toFixed(2) + '$'
    return (toWrite)
}

//Function to post information to Telegram Channel
function updateGroup(){
    var profits = []
    var groupId = process.env.GROUPID
    var toWrite = ""
    Object.keys(gpuData).forEach(function(card, i){
        profits = calcProfits(gpuData[card])
        toWrite += card + '\n' + compareText(profits) + '\n\n'     
    })
    toWrite += notes + cryptoCurrenciesCompared

    bot.sendMessage(groupId, toWrite)
    console.log('Enviado al canal\n', toWrite)
}

//Bot logic
bot.on('message', (msg) => {
    var profits = []
    var text = '\nJoin our channel at https://t.me/CryptoMiningCalculator to receive updates twice a day!' 
    const chatId = msg.chat.id;
    var keyboards = {
        cards: [
            ['RX470/570', 'RX480/580'], 
            ['GTX1060', 'GTX1070']
        ],
        thanksChannel: [
            ['Thanks! Try another query'],
            ['Join the channel!']
        ],
        options: [
            ['Get the best mining choice (ETH, ETC, ZEC, XMR)'], 
            ['Compare ETH-ETC-ZEC-XMR monthly earnings']
        ]
    }

    var opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: keyboards.thanksChannel
        }   
    }

    switch (msg.text){
        case keyboards.options[0][0]:
            console.log("Consulta de mining choice por: ", msg.from.first_name)
            opts.reply_markup.keyboard = keyboards.cards
            choice = 0
            bot.sendMessage(chatId, "Please select the GPU you're interested in", opts)
            break
        case keyboards.options[1][0]:
            console.log("Consulta de compare por: ", msg.from.first_name)
            opts.reply_markup.keyboard = keyboards.cards
            choice = 1
            bot.sendMessage(chatId, "Please select the GPU you're interested in", opts)
            break       
        case keyboards.cards[0][0]:
            profits = calcProfits(gpuData.RX470)
            if (choice == 0){
                toWrite = miningChoiceText(profits)
            } else {
                toWrite = compareText(profits) + notes + cryptoCurrenciesCompared
            }
            bot.sendMessage(chatId, toWrite, opts)
            break
        case keyboards.cards[0][1]:
            profits = calcProfits(gpuData.RX480)
            if (choice == 0){
                toWrite = miningChoiceText(profits)
            } else {
                toWrite = compareText(profits) + notes + cryptoCurrenciesCompared
            }
            bot.sendMessage(chatId, toWrite, opts)
            break           
        case keyboards.cards[1][0]:
            profits = calcProfits(gpuData.GTX1060)
            if (choice == 0){
                toWrite = miningChoiceText(profits)
            } else {
                toWrite = compareText(profits) + notes + cryptoCurrenciesCompared
            }
            bot.sendMessage(chatId, toWrite, opts)   
            break
        case keyboards.cards[1][1]:
            profits = calcProfits(gpuData.GTX1070)
            if (choice == 0){
                toWrite = miningChoiceText(profits)
            } else {
                toWrite = compareText(profits) + notes + cryptoCurrenciesCompared
            }
            bot.sendMessage(chatId, toWrite, opts)        
            break
        case keyboards.thanksChannel[0][0]:
            opts.reply_markup.keyboard = keyboards.options  
            bot.sendMessage(chatId, 'What would you want to do now?', opts)  
            break
        case keyboards.thanksChannel[1][0]:
            opts.reply_markup.keyboard = keyboards.options
            bot.sendMessage(chatId, text, opts) 
            break   
        default:
            opts.reply_markup.keyboard = keyboards.options
            bot.sendMessage(chatId, "This bot will assist you to make better decissions with your mining RIG. Let's try!", opts)
    }
})
