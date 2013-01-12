connect-thumbs
==============

Image thumbnailing middleware for Connect.js

Connect-thumbs implements the boilerplate code for creating thumbnails of large images in a standard, 
Connect.js-complient way, allowing sensible defaults and high degree of customization.

## Installation

    $ npm install connect-thumbs
    
*ATTENTION*: in typical web setups, static content such as images is often served by a web-server, never allowing 
requests to *.jpg, *.png etc. to reach Node process. If you want to use connect-thumbs, obviously you must allow
paths to thumbnailed images to pass through to Node. Please add appropriate exception to you web server configuration.

Alternatively, sometimes connect-static is used to serve static content. If you do that, please make sure that 
connect-static fires *after* connect-thumbs does.
    
## Usage

    var thumbs = require('connect-thumbs');
    
when configured with defaults, and if you have your node process running at yourdomain.com, a request such as:

    http://yourdomain.com/thumbs/medium/images/aHR0cDovL3VwbG9hZC53aWtpbWVkaWEub3JnL3dpa2lwZWRpYS9jb21tb25zLzYvNjYvRWluc3RlaW5fMTkyMV9ieV9GX1NjaG11dHplci5qcGc=.jpg
    
will display Einstein's photo from Wikipedia as a width: 300 (and proportionally resized height) thumbnail.

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


# Performance and Scalability

Node.js is very fast, but Imagemagick most certainly is not (and neither may be your customer decodeFn function if it is doing a database 
lookup for every request), so in any production set up it is highly recommended to put thubmnailed URLs behind some sort of
proxy/cache. Good options may be:

- Varnish
- A good CDN such as Amazon's CloudFront
- Pick your own poison.


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

 * ttl - is the cache duration that will be returned in the HTTP headers for the resulting thumbnail
 * tmpDir - is the Node-writable temp folder where file operations will be performed. Defaults to: `/tmp/nodethumbnails`. 
   You may want to periodically clean-up that folder.
 * decodeFn - custom decoder function. Defaults to one that decodes base64-encoded full URLs.
 * allowedExtensions - file (path) extensions that connect-thumbs will try to thumbnail. Defaults to: jpg, jpeg, gif and png.
 * presets - json object describing various image presets. You can indicate width, height and compression level for each. More options to come.

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
