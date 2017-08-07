const Nightmare = require('nightmare');
const bodyParser = require('body-parser');
const storage = require('node-persist');
const _ = require('lodash');

const URL = 'https://bdavidxyz.github.io/ask-the-dude/';
console.log('Welcome to Nightmare scrape\n==========');

storage.initSync({dir:'./my_storage'});

let express = require('express');
let app = express();

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser());

// Handy for local dev and debugging
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});


app.post('/ask', function (request, response, next) {
  console.log('Request to ask a question\n==========');

  // Immediately reply ok, then do the job
  response.status(200).send('OK');

  const question = request.body.question;

  if (question) {

    // !!! Don't forget the instantiation of nightmare on EVERY request
    const nightmare = new Nightmare({ show: false })
    nightmare
      .goto(URL)
      .wait('#ask-input')
      .type('#ask-input', question)
      .click('#ask-button')
      // The dude can take a few seconds to answer...
      .wait('.actual-result') 
      .evaluate(() => $('.actual-result').text().trim())
      .then((result) => {
        if (result === 'error' ) {
          // !!! Don't forget "return" keyword if you reuse nightmare in a promise
          return nightmare
            .wait('#button-quote')
            .click('#button-quote')
            .evaluate(() => $('#quote-text').text().trim())
            .then((random_thought) => {
              storage.setItemSync(question, random_thought); 
            })
        } else {
          storage.setItemSync(question, result); 
        }
      })
      .then(() => {
        console.log('=========\nAll done...');
        return nightmare.end();
      })
      .catch((error) => {
        console.error('an error has occurred: ' + error);
      });
  } else {
    next();
  }
  
});


app.get('/all-questions', function (request, response, next) {
  response.send(_.zipObject(storage.keys(), storage.values()));
  next();
});

app.get('/get-answer-for', function (request, response, next) {
  
  console.log('Requested an answer\n==========');

  if (request.query.q) {
    const q = request.query.q;
    console.log('q is ' + q);
    const final_answer = storage.getItemSync(q);
    console.log('final_answer is ' + final_answer);
    response.status(200).send(final_answer)
    next();
  } else {
    response.status(200).send('please send a q param')
    next();
  }
});


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

