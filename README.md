connect-thumbs
==============

Image thumbnailing middleware for Connect.js

Connect-thumbs implements the boilerplate code for creating thumbnails of large images in a standard, 
Connect.js-complient way, allowing sensible defaults and high degree of customization.

## Installation

    $ npm install connect-thumbs
    
## Usage

    var thumbs = require('connect-thumbs');
    
when configured with defaults, and if you have your node process running at yourdomain.com, a request such as:

    http://yourdomain.com/thumbs/medium/images/aHR0cDovL3VwbG9hZC53aWtpbWVkaWEub3JnL3dpa2lwZWRpYS9jb21tb25zLzYvNjYvRWluc3RlaW5fMTkyMV9ieV9GX1NjaG11dHplci5qcGc=.jpg
    
will display Eisntein's photo from Wikipedia as a width: 300 (and proportionally resized height) thumbnail.

This is because:
 
1. `/thumbs/medium` in the begining of the URL instructs the middleware to use default resizing preset named "medium" 
 which corresponds to proportional resizing to width: 300px.
1. the long, somewhat cryptic code after /images/ is base64-encoded version of the 
 [URL of Einstein's photo on Wikipedia](http://upload.wikimedia.org/wikipedia/commons/6/66/Einstein_1921_by_F_Schmutzer.jpg)
 and connect-middleware uses base64, by default, to encode the ID of the desired image.
 
You can provide an alternative "decoderFn" function, if you would rather use shorter IDs of your photos from your database, 
or UUIDs or whatever else makes sense to you (see below). Custom decoderFn functions must have following signature: 

    function(encodedURL, callback)
    
and must call callback, upon completion, with following syntax:

    callback(err, decodedURLValue);


# Customization 

```
    var thumbs = require('connect-thumbs')({
      "ttl": "92000"
    , "tmpDir": "/tmp/mynodethumbnails"
    , "decodeFn": loadImageUrlFromDbById
    , "allowedExtensions": ['png', 'jpg']
    , "presets": {
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
    });
```

where:

 * ttl - is the duration of cache that set-headers of the resulting thumbnail image will be set to

## License

(The MIT License)

Copyright (c) 2013 Irakli Nadareishvili

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
