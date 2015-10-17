connect-thumbs
==============

Image thumbnailing middleware for Connect.js

Connect-thumbs implements the boilerplate code for creating thumbnails of large images in a standard, 
Connect.js-complient way, allowing sensible defaults and high degree of customization.

## Installation

    $ npm install connect-thumbs
    
**CAUTION:** Connect thumbs uses Imagemagick. Make sure your system has imagemagick properly installed, otherwise you are likely to get the following error: `Error: spawn identify ENOENT`

## Serving Behind a Web Server
    
*ATTENTION*: in typical web setups, static content such as images is often served by a web-server, never allowing 
requests to *.jpg, *.png etc. to reach Node process. If you want to use connect-thumbs, obviously you must allow
paths to thumbnailed images to pass through to Node. Please add appropriate exception to you web server configuration. 
For Nginx, your configuration may look something like the following:

```
  # Thumbnail processing
  location ^~ /thumbs {
    auth_basic off;

    proxy_pass         http://127.0.0.1:3333;
    proxy_set_header   Host                   $http_host;
    proxy_redirect off;
  }

  #  static content
  location ~* ^.+.(jpg|jpeg|gif|css|png|js|ico|xml)$ {
    # access_log        off;
    expires           15d;
  }
```

Alternatively, sometimes connect-static is used to serve static content. If you do that, please make sure that 
connect-static fires *after* connect-thumbs does.
    
## Connect.js/Express.js Usage

    var thumbs = require('connect-thumbs');
    app.use(thumbs());
    
when configured with defaults, and if you have your node process running at yourdomain.com, a request such as:

    http://yourdomain.com/thumbs/medium/images/aHR0cDovL3VwbG9hZC53aWtpbWVkaWEub3JnL3dpa2lwZWRpYS9jb21tb25zLzYvNjYvRWluc3RlaW5fMTkyMV9ieV9GX1NjaG11dHplci5qcGc=.jpg
    
will display Einstein's photo from Wikipedia as a width: 300 (and proportionally resized height) thumbnail.

This is because:
 
1. `/thumbs/medium` in the begining of the URL instructs the middleware to use default resizing preset named "medium" 
 which corresponds to proportional resizing to width: 300px.
1. the long, somewhat cryptic code after /images/ is base64-encoded version of the 
 [URL of Einstein's photo on Wikipedia](http://upload.wikimedia.org/wikipedia/commons/6/66/Einstein_1921_by_F_Schmutzer.jpg)
 and connect-middleware uses base64, by default, to encode the ID of the desired image.
 
You can provide an alternative `decodeFn` function, if you would rather use shorter IDs of your photos from your database, 
or UUIDs or whatever else makes sense to you (see below). Custom `decodeFn` functions must have following signature: 

    function(encodedURL, callback)
    
and must call callback, upon completion, with following syntax:

    callback(err, decodedURLValue);


# Performance and Scalability

Node.js is very fast, but Imagemagick and over-the-HTTP fetching of the original image most certainly are not. 
Neither may be your custom decodeFn function if it is doing a database lookup for every request. In any 
production setup it is highly recommended to put thubmnailing of images behind some sort of proxy/cache. 
Viable options include:

- Enabling the integrated disk-based cache provided by Connect-Thumbs. You can do this by passing custom `tmpCacheTTL`
configuration variable when initializing Thumbs. This variable is set in seconds and is 0 by default. Setting it 
to values greater than 0 enables caching.
- Put [Varnish](https://www.varnish-cache.org/) in front of the thumbnail URLs
- Use a robust CDN such as [Amazon's CloudFront](http://aws.amazon.com/cloudfront/)
- Pick your own poison.


# Customization 

```
    app.use(thumbs({
      "ttl": 7200
    , "tmpCacheTTL": 86400
    , "tmpDir": "/tmp/mynodethumbnails"
    , "decodeFn": someModule.loadImageUrlFromDbById
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
    }));
```

where:

 * ttl - is the client-side cache duration that will be returned in the HTTP headers for the resulting thumbnail.
 * tmpCacheTTL - time (in seconds) to cache thumbnails in temp folder. Defaults to 0 (cache disabled).
 * tmpDir - is the Node-writable temp folder where file operations will be performed. Defaults to: `/tmp/nodethumbnails`. 
   You may want to periodically clean-up that folder.
 * decodeFn - custom decoder function. Defaults to one that decodes base64-encoded full URLs.
 * allowedExtensions - file (path) extensions that connect-thumbs will try to thumbnail. Defaults to: jpg, jpeg, gif and png.
 * presets - json object describing various image presets. You can indicate width, height and compression level for each. 
   Currently width is required and it is the only required argument. Expect more flexibility here in the following versions.

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
