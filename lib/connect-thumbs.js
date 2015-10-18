if (!module.parent) { console.log("Please don't call me directly. I am just the main app's minion."); process.exit(1); }

// example:
// http://example.com/thumbs/small/images/hashcode.jpeg

var options = {}
  , pauser
  , ttl
  , tmpCacheTTL
  , tmpDir
  , presets
  , decodeFn
  , regexp  = '';

var mkdirp    = require('mkdirp')
  , moment    = require('moment')
  , async     = require('async')
  , request   = require('request')
  , im        = require('imagemagick')
  , path      = require('path')
  , fs        = require('fs')
  , send      = require('send')
  , pause      = require('pause')
  , crypto    = require('crypto')
  , gm        = require('gm');

// @TODO: make imagemagick configurable in case paths are not defaults
// (maybe they can pass-in the imagemagick instance they want to use)

exports = module.exports = function thumbs(opts) {

  opts = opts || {};
  parseOptions (opts);

  if (opts.useIM) {
    gm = gm.subClass({imageMagick: true});
  }

  return function thumbs(req, res, next) {

    if ('GET' != req.method && 'HEAD' != req.method) return next();
    //pauser = pause(req);

    function resume(runNext) {
      if (runNext) next();

      //pauser.resume();
    }

    var thumbRequestParts = req.originalUrl.match(regexp);
    if (!thumbRequestParts) {
      return resume(true);
    }

    var imagePreset = thumbRequestParts[1];

    if (!presets[imagePreset]) { //non-existent preset requested.
      res.writeHead(400);
      res.end('Invalid Preset')
      return resume(false);
    }

    //console.log("Started thumbnailing: " + req.originalUrl);

    var encodedImageURL = thumbRequestParts[2];

    // Pre-declare variables that will be initialized in the decoder closure
    var filepath, fileStream, modifiedFilePath, preset;
    var senderStream;

    decodeFn(encodedImageURL, function imageURLDecoding(err, decodedImageURL) {

      //-- Start creating and serving a thumbnail
      var targetDir = tmpDir + '/' + imagePreset;
      mkdirp.sync(targetDir); // Make sure tmp directory exists.

      var ext = path.extname(decodedImageURL);

      var hashedName = hash(decodedImageURL); // This is to be safe, in case somebody uses risky encodeFn

      preset = presets[imagePreset];
      filepath = targetDir + '/' + hashedName + ext;
      modifiedFilePath = targetDir + '/' + hashedName + "-" + imagePreset + ext;

      // see if we can serve the file from file cahce, if ttl has not yet expired
      if (tmpCacheTTL > 0) {
        try {
          var stats = fs.statSync(filepath);
          var fileUnix = moment(stats.mtime).unix();
          var nowUnix = moment().unix();
          var diffUnix = nowUnix - fileUnix;

          if (diffUnix < tmpCacheTTL) { // file is fresh, no need to download/resize etc.
            var maxAge = ttl || 0;
            send(req, modifiedFilePath, { maxAge: maxAge })
              .pipe(res);

            return resume(false);
          }
        } catch (err) {
          // no action necessary, just continue with normal flow
        }
      }

      fileStream = fs.createWriteStream(filepath);
      request.get(decodedImageURL).pipe(fileStream);

      fileStream.on("close", function sendFileAfterTransform() {

        var modificationOptions = {
          filepath: filepath
          , dstPath: modifiedFilePath
          , preset: preset
        };

        var postModificationFunction = function (err) {
          if (err) throw err;

          console.log("SRC: " + req.originalUrl);
          console.log("Streaming: " + modifiedFilePath);

          var maxTTLAge = ttl || 0;
          send(req, modifiedFilePath, {maxAge: maxTTLAge})
              //.on("error", function(err) {
              //  console.log("SENDING ERROR!");
              //  console.error(err);
              //})
              .on("stream", function() {
                console.log("Streaming started!");
              })
              .on("end", function() {
                console.log("Streaming ended!");
              })
              //.on("headers", function opa() {
              //  console.log("headers yo");
              //})
              .pipe(res);

          return resume(false);
          //return;
        };

        if (opts.smartCrop) {
          modifyImageSmart(modificationOptions, postModificationFunction);
        } else {
          modifyImage(modificationOptions, postModificationFunction);
        }

      });

    });

  };

};

exports.encodeURL = function(uri, callback) {
  callback(null, new Buffer(url).toString('base64'));
}

exports.decodeURL = function(encodedURL, callback) {
  callback(null, new Buffer(encodedURL, 'base64').toString('ascii'));
}

/**
 * Return cryptographic hash (defaulting to: "sha1") of a string.
 *
 * @param {String} str
 * @param {String} algo - Algorithm used for hashing, defaults to sha1
 * @param {String} encoding - defaults to hex
 * @return {String}
 */
var hash = function(str, algo, encoding) {
  return crypto
    .createHash(algo || 'sha1')
    .update(str)
    .digest(encoding || 'hex');
}

/**
 * Merge user-provided options with the sensible defaults.
 * @param options
 */
var parseOptions = function (options) {

  ttl = options.ttl || (3600 * 24); // cache for 1 day by default.
  tmpCacheTTL = options.tmpCacheTTL || 0; // disabled by default
  decodeFn = options.decodeFn || exports.decodeURL;
  presets  = options.presets || defaultPresets();

  tmpDir   = options.tmpDir || '/tmp/nodethumbnails';

  var rootPath = options.rootPath || '/thumbs';
  if (rootPath[0] === '/') { rootPath = rootPath.substring(1); } // be forgiving to user errors!

  var allowedExtensions = options.allowedExtensions || ['gif', 'png', 'jpg', 'jpeg'];
  for (i=0; i < allowedExtensions.length; i++) {
    // be forgiving to user errors!
    if (allowedExtensions[i][0] === '.') { allowedExtensions[i] = allowedExtensions[i].substring(1); }
  }
  var szExtensions = allowedExtensions.join('|')

  // Example: http://example.com/thumbs/small/images/AB23DC16Hash.jpg
  regexp = new RegExp('^\/' + rootPath.replace(/\//ig, '\\/') +
    '\/([A-Za-z0-9_]+)\/images\/([%\.\-A-Za-z0-9_=\+]+)\.(?:' + szExtensions + ')$', 'i');
};

var defaultPresets = function() {

  return {
    small: {
      width: 120
      , compression:.5
    }
    , medium: {
      width: 300
      , compression:.7
    }
    , large: {
      width: 900
      , compression:.85
    }
  }

}

var modifyImage = function(options, callback) {

  var filepath = options.filepath;
  var dstPath = options.dstPath;
  var preset = options.preset;


  //gm('/path/to/img.png')
  //    .identify(function (err, data) {
  //      if (!err) console.log(data)
  //    });

  im.identify(['-format', '%wx%h', filepath], function(err, dimension){
    if (err) callback(err);

    //console.log('dimension: ' + dimension);
    // dimension: 3904x2622

    var arrDimension = dimension.split("x");
    var origWidth = arrDimension[0];
    var origHeight = arrDimension[1];

    console.log ( "Source: " +  origWidth + " - " + origHeight );

    var targetWidth = preset.width;
    // We could have just omitted height in .resize() but we may need control over this in the future.
    var targetHeight = preset.height || detectedHeight(targetWidth, origWidth, origHeight);

    console.log ( "Target: " + targetWidth + " - " + targetHeight );

    var imOptions = {
      srcPath: filepath
      , dstPath: dstPath
      , width:   targetWidth
      , height:  targetHeight
    };

    if (preset.compression) {
      imOptions.quality = preset.compression;
    }

    //im.resize(imOptions, function(err, stdout, stderr){
    //  callback(err);
    //});

    gm(imOptions.srcPath)
        .resize(imOptions.width)
        //.crop(imOptions.width, imOptions.height, 200, 50)
        .write(imOptions.dstPath, callback);

  });
};

var modifyImageSmart = function(options, callback) {
  var filepath = options.filepath;
  var dstPath = options.dstPath;
  var preset = options.preset;

  im.identify(['-format', '%wx%h', filepath], function(err, dimension){
    if (err) callback(err);

    //console.log('dimension: ' + dimension);
    // dimension: 3904x2622

    var arrDimension = dimension.split("x");
    var origWidth = arrDimension[0];
    var origHeight = arrDimension[1];

    var targetWidth = preset.width;
    // We could have just omitted height in .resize() but we may need control over this in the future.
    var targetHeight = preset.height || detectedHeight(targetWidth, origWidth, origHeight);

    var imOptions = {
      srcPath: filepath
      , dstPath: dstPath
      , width:   targetWidth
      , height:  targetHeight
    };

    if (preset.compression) {
      imOptions.quality = preset.compression;
    }


    var fs = require('fs'),
        Canvas = require('canvas'),
        SmartCrop = require('smartcrop'),
        _ = require('lodash');

    var img = new Canvas.Image();
    var options = {};

    options.canvasFactory = function(w, h) { return new Canvas(w, h) };

    img.src = fs.readFileSync(imOptions.srcPath);
    options.width = imOptions.width;
    options.height = imOptions.height;
    options.dstPath = imOptions.dstPath;
    options.quality = imOptions.compression;

    SmartCrop.crop(img, options, function(result){
      var output = options.dstPath;
      //console.log(JSON.stringify(result, null, '  '));
      console.log(result.topCrop);
      console.log(output);
      if(output && options.width && options.height){
        var canvas = new Canvas(options.width, options.height),
            ctx = canvas.getContext('2d'),
            crop = result.topCrop,
            f = fs.createWriteStream(output);
        ctx.patternQuality = 'best';
        ctx.filter = 'best';
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
        canvas.syncJPEGStream({quality: options.quality}).pipe(f);
        callback(null);
      } else {
        callback ("Couldn't perform smart resize");
      }
    });
  });
};

/**
 * Detect targetHeight for a proportional resizing, when only width is indicated.
 *
 * @param targetWidth
 * @param origWidth
 * @param origHeight
 */
var detectedHeight = function(targetWidth, origWidth, origHeight) {
  return origHeight * targetWidth / origWidth;
}
