if (!module.parent) { console.log("Please don't call me directly. I am just the main app's minion."); process.exit(1); }

// example:
// http://example.com/thumbs/small/images/hashcode.jpeg

var options = {}
  , ttl
  , tmpDir
  , presets
  , decodeFn
  , regexp  = '';

var mkdirp    = require('mkdirp')
  , async     = require('async')
  , request   = require('request')
  , im        = require('imagemagick')
  , path      = require('path')
  , fs        = require('fs')
  , send      = require('send')
  , pause      = require('pause')
  , crypto    = require('crypto');

// @TODO: make imagemagick configurable in case paths are not defaults
// (maybe they can pass-in the imagemagick instance they want to use)

exports = module.exports = function thumbs(opts) {

  opts = opts || {};
  parseOptions (opts);

  return function thumbs(req, res, next) {

    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var pauser = pause(req);

    var thumbRequestParts = req.originalUrl.match(regexp);
    if (!thumbRequestParts) {
      pauser.resume();
      return next();
    }

    var imagePreset = thumbRequestParts[1];

    if (!presets[imagePreset]) { //non-existent preset requested.
      res.writeHead(400);
      res.end('Invalid Preset')
      pauser.resume();
      return;
    }

    var encodedImageURL = thumbRequestParts[2];

    // Pre-declare variables that will be initialized in the decoder closure
    var filepath, fileStream, modifiedFilePath, preset;

    decodeFn(encodedImageURL, function imageURLDecoding(err, decodedImageURL) {

      //-- Start creating and serving a thumbnail
      var targetDir = tmpDir + '/' + imagePreset;
      mkdirp.sync(targetDir); // Make sure tmp directory exists.

      var ext = path.extname(decodedImageURL);

      var hashedName = hash(decodedImageURL); // This is to be safe, in case somebody uses risky encodeFn

      preset = presets[imagePreset];
      filepath = targetDir + '/' + hashedName + ext;
      modifiedFilePath = targetDir + '/' + hashedName + "-" + imagePreset + ext;

      fileStream = fs.createWriteStream(filepath);
      request.get(decodedImageURL).pipe(fileStream);

    });

    fileStream.on("close", function() {

      modifyImage({
        filepath: filepath
        , dstPath: modifiedFilePath
        , preset: preset
      }, function(err) {
        if (err) throw err;

        send(req, modifiedFilePath)
          .maxage(ttl || 0)
          .pipe(res);
        pauser.resume();
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

var parseOptions = function (options) {

  ttl = options.ttl || 3600 * 24; // cache for 1 day by default.
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
}

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

    im.resize(imOptions, function(err, stdout, stderr){
      callback(err);
    });

  });
}

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
