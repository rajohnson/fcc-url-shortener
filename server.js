require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
var bodyParser = require('body-parser');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/api/shorturl', bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// value is the last value used.
const indexSchema = new mongoose.Schema({
  index: Number
});

let Index = mongoose.model('Index', indexSchema);

function nextIndex(handler) {
  Index.exists({}, (err, exists) => {
    console.log('exists test')
    if(err) {
      console.log(err);
    }
    if(exists !== null) {
      // get value and update
      Index.findOneAndUpdate(
        {}, 
        { $inc: {'index': 1 } },
        {new: true }, 
        (err, value) => {
          handler(value.index);
        }
      )
    } else {
      // create with value 0
      Index.create({index: 1}, (err, result) => {
        if(err) {
          console.log(err);
        }
        handler(result.index)
      });
    }
  })
}

// full is the url provided. short is the short id number assigned.
const urlSchema = new mongoose.Schema({
  full: String,
  short: {type: Number, unique: true, required: true}
});

let Url = mongoose.model('Url', urlSchema);

function getShort(short) {
  // return the full or null if it doesn't exist in db
  Url.findOne({short: short}, (err, result) => {
    if(err) {
      return console.error(err);
    }
    return result.full;
  })
}

function saveUrl(urlString) {
  // save the url and return short it is saved under
  const short = nextIndex();
  const doc = new Url({full: urlString, short: short}, (err, res) => {
    if(err) {
      return console.error(err);
    }
    return short;
  });
}

// endpoint for shorturl
app.post('/api/shorturl', function(req, res) {
  const index = nextIndex((index) => {
    res.json({index: index});
  });
  // const urlValid = true; // todo
  // if(!urlValid) {
  //   res.json({ error: 'invalid url' });
  // } else {
  //   const full = req.body.url;
  //   const short = saveUrl(full);
  //   res.json({original_url: full, short_url: short});
  // }
});

app.get('/api/shorturl/:id', function(req, res) {
  const full = getShort(req.params.id);
  const short = req.params.id;
  if(full) {
    res.json({original_url: full, short_url: short});
  } else {
    res.json({ error: `invalid id ${short}` });
  }
});

// listen
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

