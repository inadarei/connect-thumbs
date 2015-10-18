// var errorhandler = require('errorhandler');
// app.use(errorhandler());

var express = require('express');
var app = express();

var smartCrop = false;

if (process.env.SMARTCROP && process.env.SMARTCROP == 1) {
  console.log("Running content-aware cropping");
  smartCrop = true;
} else {
  console.log("Running simple cropping");
}


var thumbs = require('../index.js');
app.use(thumbs({
  smartCrop: smartCrop,
  useIM: true,
  presets: {irakli: {
    width: 300,
    height: 520,
    quality: 100
  }}}));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});