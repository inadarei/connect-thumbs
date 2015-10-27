# connect-thumbs

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Codacy Status][codacy-image]][codacy-url]

Image thumbnailing middleware for Connect.js/Express.js that integrates with content-aware
cropping provided by [Smartcrop.js](https://github.com/jwagner/smartcrop.js/)

Connect-thumbs implements the boilerplate code for creating thumbnails of large images in a standard, 
Connect.js-complient way, allowing sensible defaults and high degree of customization.

## Installation

    $ npm install connect-thumbs --save
    
### Installing Dependencies    

Connect-thumbs can use `GraphicsMagick` or `Imagemagick` for image manipulation 
(see: [Configuration](##configuration)). 

Make sure your system has one of these packages properly installed, 
otherwise you are likely to get the following error: `Error: spawn identify ENOENT`. 

On OS-X you can easily install them with: 

```console
> brew install imagemagick
# and
> brew install graphicsmagick
# if you want webP support:
> brew install imagemagick --with-webp
```

Similarly, there are also APT and YUM repositories you can use for Ubuntu/Debian and 
RedHat/Centos/Fedora respectively.

If you are going to use smart (content-aware) cropping, you will also need to install Cairo. On OS-X you 
can install it with: 

```console
> xcode-select --install
> brew install pkgconfig
> brew install pixman
> brew install libjpeg
> brew install giflib 
> brew install cairo
```

The last step takes a while, and also: make sure everything links properly after each "brew install" and 
that you have the latest brew upgrade.

On other platforms, you can consult: [Cairo documentation](http://cairographics.org/download/).

## Running an Example

If you have all the prerequisites installed you can launch a demo with:

```
> git clone https://github.com/inadarei/connect-thumbs.git
> cd connect-thumbs
> npm install
> npm run example # for simple cropping
> SMARTCROP=1 npm run example # for content-aware cropping
```

And then open your browser at the [following URL](http://localhost:3000/thumbs/irakli/images/aHR0cDovL3d3dy5wdWJsaWNkb21haW5waWN0dXJlcy5uZXQvcGljdHVyZXMvMTAwMDAvdmVsa2EvMTA4MS0xMjQwMzI3MzE3cGMzcS5qcGc=.jpg): 

```
http://localhost:3000/thumbs/irakli/images/aHR0cDovL3d3dy5wdWJsaWNkb21haW5waWN0dXJlcy5uZXQvcGljdHVyZXMvMTAwMDAvdmVsa2EvMTA4MS0xMjQwMzI3MzE3cGMzcS5qcGc=.jpg
```

You can see on the following diagram what simple (on the left), and smart (on the right)
 crops produce compared to the original (center)
 
 ![](https://raw.githubusercontent.com/inadarei/connect-thumbs/master/example/crops-smart.jpg)


Photo Credit: [Andrew Schmidt](http://www.publicdomainpictures.net/view-image.php?image=2514&picture=seagull&large=1) (Public Domain)
    
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

## Configuration

```
    app.use(thumbs({
      "smartCrop" : false
    , "ttl" : 7200
    , "tmpCacheTTL" : 86400
    , "tmpDir" : "/tmp/mynodethumbnails"
    , "decodeFn" : someModule.loadImageUrlFromDbById
    , "allowedExtensions" : ['png', 'jpg']
    , "presets" : {
        small : {
          width: 120
          , quality:.5
        }
        , medium : {
          width: 300
          , quality:.7
        }
        , large : {
          width: 900
          , quality:.85
        }
      }
    }));
```

where:

 * smartCrop - enables experiemntal, content-aware cropping based on: [Smartcrop.js](https://github.com/jwagner/smartcrop.js/).
   This is `false` by default, until Smartcrop.js matures, but will become the default option as soon as
   there is a stable release of that project.
 * useIM - if you have trouble installing GraphicsMagick or prefer ImageMagick for any reason,
   setting this to 'true' will skip using GraphicsMagick and use ImageMagick instead. False by default.
 * ttl - is the client-side cache duration that will be returned in the HTTP headers for the resulting thumbnail.
 * tmpCacheTTL - time (in seconds) to cache thumbnails in temp folder. Defaults to 0 (cache disabled).
 * tmpDir - is the Node-writable temp folder where file operations will be performed. Defaults to: `/tmp/nodethumbnails`. 
   You may want to periodically clean-up that folder.
 * decodeFn - custom decoder function. Defaults to one that decodes base64-encoded full URLs.
 * allowedExtensions - file (path) extensions that connect-thumbs will try to thumbnail. Defaults to: jpg, jpeg, gif and png.
 * presets - json object describing various image presets. You can indicate width, height and quality 
   level for each. Quality adjusts image compression level and its value ranges from 0 to 100 (best).
    
    Currently width is required and it is the only required argument. Expect more flexibility here in 
    the following versions.

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

## Performance and Scalability

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

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/connect-thumbs.svg
[npm-url]: https://npmjs.org/package/connect-thumbs
[travis-image]: https://travis-ci.org/inadarei/connect-thumbs.svg
[travis-url]: https://travis-ci.org/inadarei/connect-thumbs.svg
[codacy-image]: https://api.codacy.com/project/badge/56d8bef2586d43dc8e76034cae022d64
[codacy-url]: https://www.codacy.com/app/irakli/connect-thumbs
