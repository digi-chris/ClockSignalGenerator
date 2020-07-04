var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var Gpio = require('onoff').Gpio;
var r1 = new Gpio(20, 'out');
var r2 = new Gpio(21, 'out');

const app = express();
const port = 3000;

var hourHand = 0;
var minHand = 0;

var polarity = false;
var advancing = false;

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/', (req, res) => {
    console.log(req.body.txtHours);
    console.log(req.body.txtMinutes);
    res.send('OK');
    hourHand = parseInt(req.body.txtHours);
    minHand = parseInt(req.body.txtMinutes);
    autoAdvance(true);
});

app.get('/', (req, res) => {
    res.send(`<html>
  <head>
    <title>ClockSignalGenerator</title>
  </head>
  <body>
    <div>${hourHand}:${minHand}</div>
    <form action="/" method="POST">
      Hours: <input name="txtHours" type="text" />
      Minutes: <input name="txtMinutes" type="text" />
      <input type="submit" value="Set" />
    </form>
  </body>
</html>`);
});

app.listen(port, () => console.log('Clock HTTP service running on port ' + port ));

function getLastKnownClockTime() {
    try {
        return JSON.parse(fs.readFileSync('time.json', 'utf8'));
    } catch(e) {
        return { hours: 0, minutes: 0 };
    }
}

var clockTime = getLastKnownClockTime();
hourHand = clockTime.hours;
minHand = clockTime.minutes;

console.log('time.json reports time as:');
console.log(clockTime);

function autoAdvance(checkOnly) {
    advancing = true;
    if (!checkOnly) {
        advance(false);
    }

    var currentHour = new Date().getHours();
    if (currentHour > 11) {
        currentHour = currentHour - 12;
    }

    console.log("Clock reads: " + hourHand + ":" + minHand + " RT: " + currentHour + ":" + new Date().getMinutes());
    if (minHand !== new Date().getMinutes() || currentHour !== hourHand) {
        setTimeout(autoAdvance, 600);
    } else {
        advancing = false;
    }
}

function advance(noReset) {
    polarity = !polarity;
    var value = 0;
    if(polarity) {
        value = 1;
    }
    r1.writeSync(value);
    r2.writeSync(value);

    minHand++;
    if (minHand > 59) {
        minHand = 0;
        hourHand++;
        if (hourHand > 11) {
            hourHand = 0;
        }
    }

    console.log("Clock advancing: " + hourHand + ":" + minHand);

    if (!noReset) {
        setTimeout(() => {
            // This is a safety check, to turn the power off to the
            // clock after sending the signal
            r1.writeSync(1 - value);
        }, 100);
    }

    fs.writeFile(
        'time.json',
        JSON.stringify({ hours: hourHand, minutes: minHand }),
        (err) => { if (err) console.error(err); }
    );
}

//var currentMinutes = new Date().getMinutes();

const keypress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => process.stdin.once('data', data => {
        const byteArray = [...data];
        if (byteArray.length > 0 && byteArray[0] === 3) {
            console.log('^C');
            process.exit(1);
        }
        process.stdin.setRawMode(false);
        resolve();
    }));
}

;(async () => {
    //advance();
    await keypress();
    //advance();
    //await keypress();
    //advance();
})().then(process.exit);

autoAdvance(true);

setInterval(() => {
    var nowMinutes = new Date().getMinutes();
    if (nowMinutes !== minHand && !advancing) {
        advance();
    }
}, 100);

